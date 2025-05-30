import fs from "fs/promises";
import { mkdirp } from "mkdirp";
import { glob } from "glob";
import { Ollama } from "ollama";
import { default as cliProgress } from "cli-progress";
import { existsSync } from "fs";
import { config } from "dotenv";
config();

const ollama = new Ollama({
    host: process.env.OLLAMA_URL || "http://localhost:11434",
});

// Constants
const path = "articles/3-embeddings";
const previous_path = "articles/2-chunked";
// const model = "llama3:8b";
// const model = "all-minilm:latest"
const model = process.env.MODEL || "mxbai-embed-large:latest";
const concurrency = 20;

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
            console.log(`Error parsing response: ${error}`);
            return null;
        }
    }
    return chunks;
}

async function ensure_model() {
    const list = await ollama.list();
    for (let installed_model of list.models) {
        if (installed_model.name === model) {
            return true;
        }
    }
    console.log(`Model ${model} not found, downloading...`);
    const response = await ollama.pull({ model });
    if (!response.status === "success") {
        throw (`Model ${model} not found, failed to download`);
    }
}

export async function Embeddings() {
    const time_start = Date.now();
    await ensure_model();
    await mkdirp(path);
    const article_files = await glob(`${previous_path}/*.json`);
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(article_files.length, 0);
    let i = 0;
    const processChunk = async (chunk) => {
        await Promise.all(chunk.map(async (article_file) => {
            i++;
            const _id = article_file.split("/").pop().split(".")[0];
            if (existsSync(`${path}/${_id}.json`)) {
                bar1.increment();
                return;
            }
            try {
                await embed_article(_id);
            } catch (error) {
                console.error(`Error processing ${article_file}: ${error}`);
            }
            bar1.increment();
        }));
    };
    for (let j = 0; j < article_files.length; j += concurrency) {
        const chunk = article_files.slice(j, j + concurrency);
        await processChunk(chunk);
    }
    bar1.stop();
    const time_end = Date.now();
    console.log(`Time elapsed: ${(time_end - time_start) / 1000}s`);
    console.log(`Average time per article: ${(time_end - time_start) / i / 1000}s`);
    return true;
}

export async function embed_article(_id, force = false) {
    if (!force && existsSync(`${path}/${_id}.json`)) return;
    const article_file = `${previous_path}/${_id}.json`;
    const article = JSON.parse(await fs.readFile(article_file, "utf8"));
    article.chunks = await embedding(article);
    await mkdirp(path);
    await fs.writeFile(`${path}/${_id}.json`, JSON.stringify(article, null, 2));
}

// Embeddings()
//     .catch(console.error)
