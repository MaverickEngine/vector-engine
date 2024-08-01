import { extract_article } from "../vectorize/extract.js";
import { clean_article } from "../vectorize/clean.js";
import { chunk_article } from "../vectorize/chunk.js";
import { embed_article } from "../vectorize/embeddings.js";
import { save_article } from "../vectorize/save.js";

export async function vectorize_one(article) {
    await extract_article(article, true);
    await clean_article(article._id, true);
    await chunk_article(article._id, true);
    await embed_article(article._id, true);
    const result = await save_article(article._id, true);
    return result;
}