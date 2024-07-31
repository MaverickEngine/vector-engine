import { extract_article } from "./extract.js";
import { clean_article } from "./clean.js";
import { chunk_article } from "./chunk.js";
import { embed_article } from "./embeddings.js";
import { save_article } from "./save.js";

export async function vectorize_one(article) {
    console.time("Vectorizing one article");
    console.time("extract_article");
    await extract_article(article, true);
    console.timeEnd("extract_article");
    console.time("clean_article");
    await clean_article(article._id, true);
    console.timeEnd("clean_article");
    console.time("chunk_article");
    await chunk_article(article._id, true);
    console.timeEnd("chunk_article");
    console.time("embed_article");
    await embed_article(article._id, true);
    console.timeEnd("embed_article");
    console.time("save_article");
    const result = await save_article(article._id, true);
    console.timeEnd("save_article");
    console.timeEnd("Vectorizing one article");
    console.log(result)
    return result;
}