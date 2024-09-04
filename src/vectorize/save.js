import fs from "fs/promises";
import { glob } from "glob";
import { Qdrant } from "../libs/qdrant.js";
import { v5 as uuidv5 } from 'uuid';
import { default as cliProgress } from "cli-progress";

// Constants
const previous_path = "articles/3-embeddings";
const collectionName = "article_embeddings";

const qdrant = new Qdrant();

async function createCollection() {
    // Sample a file to get size of vectors
    const article_file = await glob(`${previous_path}/*.json`);
    const article = JSON.parse(await fs.readFile(article_file[0], "utf8"));
    const chunks = article.chunks;
    const vector_size = chunks[0].embedding.length;
    await qdrant.createCollection(collectionName, vector_size);
}

export async function Save() {
    // Use connect method to connect to the server
    await createCollection();
    const time_start = Date.now();
    const article_files = await glob(`${previous_path}/*.json`);
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(article_files.length, 0);
    let i = 0;
    for (let article_file of article_files) {
        const _id = article_file.split("/").pop().split(".")[0];
        try {
            await save_article(_id);
        } catch (error) {
            console.error(`Error processing ${article_file}: ${error}`);
        }
        i++;
        bar1.increment();
    }
    bar1.stop();
    const time_end = Date.now();
    console.log(`Time elapsed: ${(time_end - time_start) / 1000}s`);
    console.log(`Average time per article: ${(time_end - time_start) / i / 1000}s`);
    return true;
}

export async function save_article(_id) {
    const article = JSON.parse(await fs.readFile(`${previous_path}/${_id}.json`, "utf8"));
    const chunks = article.chunks;
    let j = 0;
    let result = [];
    for (let chunk of chunks) {
        if (!chunk.embedding) {
            throw (`Missing embedding for ${article._id}`);
        }
        const id = uuidv5(`${article._id}_${j++}`, uuidv5.URL);
        const data = {
            id,
            vectors: chunk.embedding,
            data: {
                post_id: article.post_id,
                url: article.url,
                title: article.title,
                excerpt: article.excerpt,
                content: chunk.content,
                author: article.author,
                tags: article.tags,
                sections: article.sections,
                date_published: article.date_published,
                custom_section_label: article.custom_section_label,
                img_thumbnail: article.img_thumbnail,
                type: article.type,
                status: article.status,
            }
        }
        // console.log(data.vectors.length);
        const response = await qdrant.addRecords(collectionName, [data]);
        if (!response) {
            throw (`Error upserting ${article._id}`);
        }
        // console.log(response);
        result.push({
            id,
            response
        });
    }
    return result;
}

// Save()
//     .catch(console.error)
