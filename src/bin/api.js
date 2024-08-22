import { fastify } from "fastify";
import { fastifyCors } from "@fastify/cors";
import { init as recommend_init, similar, close as recommend_close } from "../libs/recommend.js";
import { get, set } from "../libs/cache.js";
import JXPHelper from "jxp-helper";
import { vectorize_one } from "../libs/vectorize_one.js";
import { config } from "dotenv";
config();

const JXP_SERVER = process.env.JXP_SERVER || "http://localhost:8080";
const JXP_API_KEY = process.env.JXP_API_KEY || "1234";
const jxp = new JXPHelper({ server: JXP_SERVER, apikey: JXP_API_KEY });

export const app = fastify();

app.register(fastifyCors, {
    origin: true,
    credentials: true,
});

const port = process.env.PORT || 8001;
const host = process.env.HOST || "0.0.0.0";

const KEY_PREFIX = "qdrant-cache";

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
    const key = `${KEY_PREFIX}-similar-${req.params.id}-${limit}-${previous_days}`;
    const cached = await get(key);
    if (cached) {
        console.log(`Similar articles for ${req.params.id} from cache`);
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
    console.log(`Similar articles for ${_id}`);
    const articles = await similar(_id, { limit, previous_days }).catch(err => {
        console.error(err);
        res.status(500).send(err);
    });
    const result = articles.map(article => ({
        score: article.score,
        post_id: article.payload.post_id,
        title: article.payload.title,
        url: article.payload.url,
        author: article.payload.author,
        date_published: article.payload.date_published,
        sections: article.payload.sections,
        excerpt: article.payload.excerpt
    }));
    res.send(result);
    await set(key, result);
});

app.post("/vectorize", async (req, res) => {
    const { post_id, revengine_id } = req.body;
    if (!post_id && !revengine_id) {
        res.status(400).send("post_id or revengine_id is required");
    }
    if (post_id && revengine_id) {
        res.status(400).send("post_id and revengine_id are mutually exclusive");
    }
    let article;
    const fields = ["_id", "post_id", "tags", "sections", "url", "author", "date_published", "date_modified", "title", "excerpt", "content", "urlid", "custom_section_label", "img_thumbnail", "type"];
    if (post_id) {
        article = await find_article_by_post_id(post_id, fields);
        if (!article) {
            res.status(404).send("Article not found");
            return;
        }
    }
    if (revengine_id) {
        article = await find_article_by_revengine_id(revengine_id, fields);
        if (!article) {
            res.status(404).send("Article not found");
            return;
        }
    }
    const result = await vectorize_one(article);
    res.send(result);
});


export async function init() {
    await recommend_init();
}

async function main() {
    await init();
    console.log("Server initialized");
    if (process.env.NODE_ENV !== "test") {
        await app.listen({ port, host });
        console.log(`Server listening on http://${host}:${port}`);
    }
}

export async function close() {
    // await recommend_close();
    if (process.env.NODE_ENV !== "test") {
        await app.close();
    }
}

main();
