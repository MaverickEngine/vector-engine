import fs from "fs/promises";
import { readFileSync } from "fs";
import { mkdirp } from "mkdirp";
import { glob } from "glob";
import ollama from "ollama";

// Constants
const path = "articles/2-entities";
const previous_path = "articles/1-cleaned";
const model = "llama3:8b";
// const model = "all-minilm:latest"

const prompt_template = readFileSync("prompt.txt", "utf8");

async function extract_entities(article) {
    const prompt = prompt_template
        .replace("${article.title}", article.title)
        .replace("${article.excerpt}", article.excerpt)
        .replace("${article.content}", article.content) + "\n\n```json\n";
    try {
        const response = await ollama.generate({
            prompt,
            model,
            format: "json",
            stream: false,
            options: {
                // max_tokens: 1000,
                temperature: 0.1,
                // top_p: 1,
                // frequency_penalty: 0,
                // presence_penalty: 0,
                // stop: ["```"],
            }
        })
        // console.log(response)
        // .catch(console.error);

        return JSON.parse(response.response)
    } catch (error) {
        console.log(`Error parsing response: ${response}`);
        return null;
    }
}

async function main() {
    const time_start = Date.now();
    await mkdirp(path);
    const article_files = await glob(`${previous_path}/*.json`);
    console.log(`Found ${article_files.length} articles.`);
    let i = 0;
    for (let article_file of article_files.slice(0, 100)) {
        const article = JSON.parse(await fs.readFile(article_file, "utf8"));
        article.entities = await extract_entities(article);
        // console.log(entities);
        // break;
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
