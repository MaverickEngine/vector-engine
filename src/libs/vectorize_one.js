import { extract_article } from "../vectorize/extract.js";
import { clean_article } from "../vectorize/clean.js";
import { chunk_article } from "../vectorize/chunk.js";
import { embed_article } from "../vectorize/embeddings.js";
import { save_article } from "../vectorize/save.js";

export async function vectorize_one(article) {
    const extracted_result = await extract_article(article, true);
    const cleaned_result = await clean_article(article._id, true);
    const chunked_result = await chunk_article(article._id, true);
    const embedded_result = await embed_article(article._id, true);
    const saved_result = await save_article(article._id, true);
    return {
        extracted_result,
        cleaned_result,
        chunked_result,
        embedded_result,
        saved_result
    };
}