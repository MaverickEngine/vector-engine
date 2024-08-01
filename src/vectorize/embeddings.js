import fs from "fs/promises";
import { mkdirp } from "mkdirp";
import { glob } from "glob";
import ollama from "ollama";
import { default as cliProgress } from "cli-progress";
import { existsSync } from "fs";

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
            chunk.embedding = response.embedding;
        } catch (error) {
            console.log(`Error parsing response: ${response}`);
            return null;
        }
    }
    return chunks;
}

export async function Embeddings() {
    const time_start = Date.now();
    await mkdirp(path);
    const article_files = await glob(`${previous_path}/*.json`);
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(article_files.length, 0);
    let i = 0;
    for (let article_file of article_files) {
        i++;
        const _id = article_file.split("/").pop().split(".")[0];
        if (existsSync(`${path}/${_id}.json`)) {
            bar1.increment();
            continue;
        }
        try {
            await embed_article(_id);
        } catch (error) {
            console.error(`Error processing ${article_file}: ${error}`);
        }
        bar1.increment();
    }
    bar1.stop();
    const time_end = Date.now();
    console.log(`Time elapsed: ${(time_end - time_start) / 1000}s`);
    console.log(`Average time per article: ${(time_end - time_start) / i / 1000}s`);
    return true;
}

export async function embed_article(_id, force = false) {
    if (!force || existsSync(`${path}/${_id}.json`)) return;
    const article_file = `${previous_path}/${_id}.json`;
    const article = JSON.parse(await fs.readFile(article_file, "utf8"));
    article.chunks = await embedding(article);
    await fs.writeFile(`${path}/${_id}.json`, JSON.stringify(article, null, 2));
}

// Embeddings()
//     .catch(console.error)
