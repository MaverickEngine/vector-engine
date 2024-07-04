import { MongoClient } from "mongodb";
import fs from "fs/promises";
import { glob } from "glob";
import { Qdrant } from "./qdrant.js";
import { v5 as uuidv5 } from 'uuid';

// Constants
const url = "mongodb://localhost:27017";
const client = new MongoClient(url);
const previous_path = "articles/3-embeddings";
const batch_size = 1000;
const max_batch_count = 1;
const collectionName = "article_embeddings";

async function main() {
    // Use connect method to connect to the server
    const qdrant = new Qdrant();
    qdrant.createCollection(collectionName);
    const time_start = Date.now();
    const article_files = await glob(`${previous_path}/*.json`);
    console.log(`Found ${article_files.length} articles.`);
    let i = 0;
    for (let article_file of article_files) {
        const article = JSON.parse(await fs.readFile(article_file, "utf8"));
        const chunks = article.chunks;
        let j = 0;
        for (let chunk of chunks) {
            if (!chunk.embedding) {
                console.log(`Missing embedding for ${article._id}`);
                continue;
            }
            // const points = data.map((item: any) => ({
            //     id: item.id,
            //     vectors: item.vectors,
            //     data: {
            //         text: item.text,
            //         original_name: this.file.original_name,
            //         file_uid: this.file.uid,
            //     }
            // }));
            const id = uuidv5(`${article._id}_${j}`, uuidv5.URL);
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
                }
            }
            const response = await qdrant.addRecords(collectionName, [data]);
            if (response) {
                console.log(`Upserted ${article._id}`);
            } else {
                console.log(`Error upserting ${article._id}`);
            }
        }
        i++;
    }
    const time_end = Date.now();
    console.log(`Time elapsed: ${(time_end - time_start) / 1000}s`);
    console.log(`Average time per article: ${(time_end - time_start) / i / 1000}s`);
    return true;


}

main()
    .then(console.log)
    .catch(console.error)
    .finally(() => client.close());
