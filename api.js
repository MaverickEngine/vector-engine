import { fastify } from "fastify";
import { init as recommend_init, similar, close as recommend_close } from "./recommend.js";
import { get, set } from "./cache.js";
import JXPHelper from "jxp-helper";
import { config } from "dotenv";
config();

const JXP_SERVER = process.env.JXP_SERVER || "http://localhost:8080";
const JXP_API_KEY = process.env.JXP_API_KEY || "1234";
const jxp = new JXPHelper({ server: JXP_SERVER, apikey: JXP_API_KEY });

export const app = fastify();

const port = process.env.PORT || 8001;
const host = process.env.HOST || "0.0.0.0";

const KEY_PREFIX = "qdrant-cache";

async function find_article_by_post_id(post_id) {
    const article = (await jxp.get("article", {
        "filter[post_id]": post_id,
        "fields": "_id",
    })).data;
    if (article.length === 0) {
        return null;
    }
    return article[0];
}

app.get("/similar/:id", async (req, res) => {
    const key = `${KEY_PREFIX}-similar-${req.params.id}`;
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
    const limit = req.query.limit || 5;
    console.log(`Similar articles for ${_id}`);
    const articles = await similar(_id, { limit }).catch(err => {
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
