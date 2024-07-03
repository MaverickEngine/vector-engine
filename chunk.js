import fs from "fs/promises";
import { glob } from "glob";
import path from "path";

async function chunk_article(article_path) {
    const article = JSON.parse(await fs.readFile(article_path, "utf8"));
    const new_path = path.join("articles", "chunked", path.basename(article_path));
    const chunks = [];
    for (let i = 0; i < article.length; i += 1000) {
        chunks.push(article.slice(i, i + 1000));
    }
    await fs.writeFile(new_path, JSON.stringify(chunks, null, 2));
}

async function main() {
    const cleaned_articles = await glob("articles/cleaned/*.json");

}