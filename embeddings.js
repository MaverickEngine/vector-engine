import fs from "fs/promises";
import { mkdirp } from "mkdirp";
import { glob } from "glob";
import ollama from "ollama";

// Constants
const path = "articles/3-embeddings";
const previous_path = "articles/2-chunked";
// const model = "llama3:8b";
const model = "all-minilm:latest"

async function embedding(article) {
    const chunks = article.chunks;
    for (let chunk of chunks) {
        try {
            const response = await ollama.embeddings({
                prompt: chunk.content,
                model,
            })
            // console.log(response)
            chunk.embedding = response.embedding;
        } catch (error) {
            console.log(`Error parsing response: ${response}`);
            return null;
        }
    }
    return chunks;
}

async function main() {
    const time_start = Date.now();
    await mkdirp(path);
    const article_files = await glob(`${previous_path}/*.json`);
    console.log(`Found ${article_files.length} articles.`);
    let i = 0;
    for (let article_file of article_files) {
        const article = JSON.parse(await fs.readFile(article_file, "utf8"));
        article.chunks = await embedding(article);
        await fs.writeFile(`${path}/${article._id}.json`, JSON.stringify(article, null, 2));
        i++;
    }
    const time_end = Date.now();
    console.log(`Time elapsed: ${(time_end - time_start) / 1000}s`);
    console.log(`Average time per article: ${(time_end - time_start) / i / 1000}s`);
    return true;
}

main()
    .catch(console.error)
