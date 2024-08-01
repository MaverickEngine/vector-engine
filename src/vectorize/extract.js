import { MongoClient } from "mongodb";
import fs from "fs/promises";
import { mkdirp } from "mkdirp";
import { default as cliProgress } from "cli-progress";
import { existsSync } from "fs";
import { config } from "dotenv";
config();

// Constants
const url = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(url);
const path = "articles/0-extracted";
const batch_size = 1000;
const max_batch_count = -1;
const dbName = "dm";
const fields = ["_id", "post_id", "tags", "sections", "url", "author", "date_published", "date_modified", "title", "excerpt", "content", "urlid", "custom_section_label", "img_thumbnail", "type"];
const search = { $or: [{ type: "article" }, { type: "opinion-piece" }], urlid: { $exists: true, $ne: null }, excerpt: { $exists: true, $ne: "", $type: "string" } };

async function extract_articles(articles) {
    await mkdirp(path);
    try {
        for (let article of articles) {

        }
    } catch (error) {
        console.error(error);
    }
}

export async function extract_article(article, force = false) {
    if (!force || existsSync(`${path}/${article._id}.json`)) return;
    await fs.writeFile(`${path}/${article._id}.json`, JSON.stringify(article, null, 2));
}

export async function Extract() {
    // Use connect method to connect to the server
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("articles");

    const count = await collection.countDocuments(search);
    console.log(`Found ${count} articles`);
    const batch_count = max_batch_count > 0 ? max_batch_count : Math.ceil(count / batch_size);
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(batch_count, 0);
    for (let i = 0; i < batch_count; i++) {
        const batch_start = i * batch_size;
        const field_obj = {};
        for (let field of fields) {
            field_obj[field] = 1;
        }
        const batch_articles = await collection.find(search).project(field_obj).skip(batch_start).limit(batch_size).toArray();
        await extract_articles(batch_articles);
        bar1.increment();
    }
    bar1.stop();
}

// export async function extract_article(_id) {
//     await client.connect();
//     const db = client.db(dbName);
//     const collection = db.collection("articles");
//     const article = await collection.findOne({ _id });
//     await extract_articles([article]);
// }

// Extract()
//     .catch(console.error)
//     .finally(() => client.close());
