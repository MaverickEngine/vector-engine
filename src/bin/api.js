import { createHash } from "crypto";
import { fastify } from "fastify";
import { fastifyCors } from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { init as recommend_init, similar, qdrant_search } from "../libs/recommend.js";
import { get, set, clear_keys, redis } from "../libs/cache.js";
import JXPHelper from "jxp-helper";
import { vectorize_one } from "../libs/vectorize_one.js";
import {
    createStartupContext,
    formatListenUrl,
    printBanner,
    printBooting,
    printReady,
} from "../libs/startup.js";
import { config } from "dotenv";
config();

const JXP_SERVER = process.env.JXP_SERVER || "http://localhost:8080";
const JXP_API_KEY = process.env.JXP_API_KEY || "1234";
const jxp = new JXPHelper({ server: JXP_SERVER, apikey: JXP_API_KEY });

const MAX_SEARCH_WORDS = parseInt(process.env.MAX_SEARCH_WORDS || "100", 10);
const MAX_SEARCH_CHARS = parseInt(process.env.MAX_SEARCH_CHARS || "800", 10);
const RATE_LIMIT_TIME_WINDOW = process.env.RATE_LIMIT_TIME_WINDOW || "1 minute";

// trustProxy so rate-limit (and req.ip) use the client IP from X-Forwarded-For
// when we sit behind a reverse proxy, instead of the proxy's address.
export const app = fastify({ trustProxy: true });

const port = process.env.PORT || 8001;
const host = process.env.HOST || "0.0.0.0";
const isTest = process.env.NODE_ENV === "test";

await app.register(fastifyCors, {
    origin: true,
    credentials: true,
});

await app.register(rateLimit, {
    global: true,
    max: async () => parseInt(process.env.RATE_LIMIT_MAX || "30", 10),
    timeWindow: RATE_LIMIT_TIME_WINDOW,
    // Use Redis in production so limits are shared across processes; in-memory in tests.
    ...(isTest ? {} : { redis }),
    nameSpace: "vector-engine-rate-limit-",
    skipOnError: true,
});

const KEY_PREFIX = "qdrant-cache";

function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

function hashQuery(query) {
    return createHash("sha256").update(query).digest("hex").slice(0, 16);
}

function validateSearchQuery(query) {
    if (typeof query !== "string") {
        return { error: "Query is required" };
    }
    const normalized = query.trim();
    if (!normalized) {
        return { error: "Query is required" };
    }
    if (normalized.length > MAX_SEARCH_CHARS || countWords(normalized) > MAX_SEARCH_WORDS) {
        return {
            error: `Query exceeds maximum of ${MAX_SEARCH_WORDS} words or ${MAX_SEARCH_CHARS} characters`,
        };
    }
    return { query: normalized };
}

function buildSearchCacheKey(query, { limit, previous_days, section, tag, date_start, date_end, author }) {
    const queryHash = hashQuery(query.toLowerCase());
    return [
        KEY_PREFIX,
        "search",
        queryHash,
        limit,
        previous_days,
        section ?? "",
        tag ?? "",
        date_start ?? "",
        date_end ?? "",
        author ?? "",
    ].join("-");
}

async function handleSearch(res, query, limit, options) {
    const validation = validateSearchQuery(query);
    if (validation.error) {
        return res.status(400).send({ error: validation.error });
    }

    const normalizedQuery = validation.query;
    const key = buildSearchCacheKey(normalizedQuery, { limit, ...options });
    const cached = await get(key);
    if (cached) {
        return res.send(cached);
    }

    const result = await qdrant_search(normalizedQuery, limit, options);
    await set(key, result);
    return res.send(result);
}

async function find_article_by_post_id(post_id, fields = ["_id"]) {
    const article = (await jxp.get("article", {
        "filter[post_id]": post_id,
        fields: fields.join(","),
    })).data;
    if (article.length === 0) {
        return null;
    }
    return article[0];
}

async function find_article_by_revengine_id(revengine_id, fields = ["_id"]) {
    const article = (await jxp.getOne("article", revengine_id, { fields: fields.join(",") })).data;
    if (!article) {
        return null;
    }
    return article;
}

app.get("/similar/:id", async (req, res) => {
    const limit = req.query.limit || 5;
    const previous_days = req.query.previous_days || 30;
    const key = `${KEY_PREFIX}-similar-v2-${req.params.id}-${limit}-${previous_days}`;
    const cached = await get(key);
    // let cached = false;
    if (cached) {
        res.send(cached);
        return;
    }
    const { id } = req.params;
    let _id = id;
    if (Number.isInteger(id * 1)) {
        const article = await find_article_by_post_id(id);
        if (article) {
            _id = article._id;
        } else {
            res.status(404).send("Article not found");
            return;
        }
    }
    // console.log(`Similar articles for ${_id}`);
    const articles = await similar(_id, { limit, previous_days }).catch(err => {
        console.error(err);
        res.status(500).send(err);
    });
    const article_post_ids = articles.map(article => article.payload.post_id);
    const query = [
        {
            "$match": {
                post_id: {
                    $in: article_post_ids
                },
                // status: "publish"
            }
        },
        {
            "$project": {
                post_id: 1,
                title: 1,
                url: 1,
                urlid: 1,
                type: 1,
                author: 1,
                date_published: 1,
                sections: 1,
                excerpt: 1,
                img_full: 1,
                img_thumbnail: 1,
                status: 1,
                custom_section_label: 1,
            }
        }
    ]
    const api_articles = (await jxp.aggregate("article", query)).data;
    // console.log(api_articles);
    for (let api_article of api_articles) {
        const article = articles.find(article => article.payload.post_id === api_article.post_id);
        api_article.score = article.score;
        api_article.url = article.payload.url;
    }
    api_articles.sort((a, b) => b.score - a.score);

    res.send(api_articles);
    await set(key, api_articles);
});

app.post("/similar", async (req, res) => {
    // console.log(req.body);
    const { post_id, revengine_id, limit = 5, history = [], previous_days = 30 } = req.body;
    let _id = req.body.revengine_id;
    if (!post_id && !revengine_id) {
        res.status(400).send("post_id or revengine_id is required");
    }
    // History is per-reader; include a stable hash so one user's history isn't served to another.
    const historyKey = history.length
        ? hashQuery([...history].map(String).sort().join(","))
        : "none";
    // Bust pre-groups-fix caches that stored under-filled chunk-duplicate results.
    const key = `${KEY_PREFIX}-similar_post-v2-${post_id}-${limit}-${previous_days}-${historyKey}`;
    const cached = await get(key);
    // let cached = false;
    if (cached) {
        res.send(cached);
        return;
    }
    let article;
    if (post_id) {
        if (Number.isInteger(post_id * 1)) {
            article = await find_article_by_post_id(post_id);
            if (article) {
                _id = article._id;
            } else {
                res.status(404).send("Article not found");
                return;
            }
        }
    } else {
        article = await find_article_by_revengine_id(_id);
    }
    const result = await similar(_id, { limit: parseInt(limit), history, previous_days: parseInt(previous_days) }).catch(async err => {
        console.error(err);
        res.status(500).send(err);
        if (article) {
            await vectorize_article(article._id);
        }
        return [];
    });
    if (result.length === 0) {
        console.log("No similar articles found for ", _id);
        res.send([]);
        if (article) {
            await vectorize_article(article._id);
        }
        return;
    }
    const article_post_ids = result.map(article => article.payload.post_id);
    const query = [
        {
            "$match": {
                post_id: {
                    $in: article_post_ids
                },
                // status: "publish"
            }
        },
        {
            "$project": {
                post_id: 1,
                title: 1,
                url: 1,
                urlid: 1,
                type: 1,
                author: 1,
                date_published: 1,
                sections: 1,
                excerpt: 1,
                img_full: 1,
                img_thumbnail: 1,
                status: 1,
                custom_section_label: 1,
            }
        }
    ]
    const api_articles = (await jxp.aggregate("article", query)).data;
    for (let api_article of api_articles) {
        const article = result.find(article => article.payload.post_id === api_article.post_id);
        api_article.score = article.score;
        api_article.url = article.payload.url;
    }
    api_articles.sort((a, b) => b.score - a.score);
    await set(key, api_articles);
    res.send(api_articles);
});

const vectorize_article = async (article_id) => {
    const fields = ["_id", "post_id", "tags", "sections", "url", "author", "date_published", "date_modified", "title", "excerpt", "content", "urlid", "custom_section_label", "img_thumbnail", "type", "status"];
    const article = await find_article_by_revengine_id(article_id, fields);
    if (!article) {
        console.log("Article not found ", article_id);
        return;
    }
    console.log("Vectorizing article ", article._id, article.post_id, article.title);
    const result = await vectorize_one(article);
    return result;
}

app.post("/vectorize", async (req, res) => {
    const { post_id, revengine_id } = req.body;
    if (!post_id && !revengine_id) {
        res.status(400).send("post_id or revengine_id is required");
    }
    if (post_id && revengine_id) {
        res.status(400).send("post_id and revengine_id are mutually exclusive");
    }
    let article_id = revengine_id;
    if (post_id) {
        const article = await find_article_by_post_id(post_id, ["_id"]);
        article_id = article._id;
        if (!article_id) {
            res.status(404).send("Article not found");
            return;
        }
    }
    const result = await vectorize_article(article_id);
    res.send(result);
});

app.get("/search/:query", async (req, res) => {
    const { query } = req.params;
    const limit = req.query.limit || 5;
    const options = {
        previous_days: req.query.previous_days || 30,
        section: req.query.section || null,
        tag: req.query.tag || null,
        date_start: req.query.date_start || null,
        date_end: req.query.date_end || null,
        author: req.query.author || null,
    };
    return handleSearch(res, query, limit, options);
});

app.post("/search", async (req, res) => {
    if (!req.body) {
        return res.status(400).send({ error: "Request body is missing" });
    }

    const {
        query = '',
        limit = 5,
        previous_days = 30,
        section = null,
        tag = null,
        date_start = null,
        date_end = null,
        author = null
    } = req.body;

    return handleSearch(res, query, limit, {
        previous_days,
        section,
        tag,
        date_start,
        date_end,
        author,
    });
});

app.get("/clear_cache", async (req, res) => {
    await clear_keys(KEY_PREFIX);
    res.send({ success: true });
});

export async function init() {
    await recommend_init();
}

async function main() {
    if (isTest) {
        await init();
        return;
    }

    const startupCtx = createStartupContext();
    printBanner(startupCtx);
    printBooting(startupCtx);

    await init();
    await app.listen({ port, host });

    printReady({
        ...startupCtx,
        url: formatListenUrl(host, port),
        startedAt: new Date(),
    });
}

export async function close() {
    // await recommend_close();
    if (!isTest) {
        await app.close();
    }
}

main();
