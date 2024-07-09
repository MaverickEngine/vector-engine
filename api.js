import { fastify } from "fastify";
import { init as recommend_init, similar, close as recommend_close } from "./recommend.js";
import { get, set } from "./cache.js";

export const app = fastify();

const port = process.env.PORT || 8001;
const host = process.env.HOST || "0.0.0.0";

const KEY_PREFIX = "qdrant-cache";

app.get("/similar/:id", async (req, res) => {
    const key = `${KEY_PREFIX}-similar-${req.params.id}`;
    const cached = await get(key);
    if (cached) {
        console.log(`Similar articles for ${req.params.id} from cache`);
        res.send(cached);
        return;
    }
    const { id } = req.params;
    const limit = req.query.limit || 5;
    console.log(`Similar articles for ${id}`);
    const articles = await similar(id, { limit }).catch(err => {
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
