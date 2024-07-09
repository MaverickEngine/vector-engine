import { fastify } from "fastify";
import { init as recommend_init, similar, close as recommend_close } from "./recommend.js";
// import fastifyCaching from "@fastify/caching";
// import fastifyRedis from '@fastify/redis'
// import abstractCache from 'abstract-cache'
// import IORedis from 'ioredis'

// const redis = new IORedis({
//     host: process.env.REDIS_HOST || 'localhost',
//     port: process.env.REDIS_PORT || 6379,
// })

// const abcache = new abstractCache({
//     useAwait: false,
//     driver: {
//         name: 'abstract-cache-redis',
//         options: { client: redis }
//     }
// })

export const app = fastify();

// app.register(fastifyCaching,
//     { cache: abcache, logLevel: 'info' },
//     (err) => { if (err) throw err })

// app.register(fastifyRedis, { client: redis })

const port = process.env.PORT || 8001;
const host = process.env.HOST || "0.0.0.0";

app.get("/similar/:id", async (req, res) => {
    const { id } = req.params;
    const limit = req.query.limit || 5;
    console.log(`Similar articles for ${id}`);
    const articles = await similar(id, { limit }).catch(err => {
        console.error(err);
        return [];
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
