import fs from "fs/promises";
import { mkdirp } from "mkdirp";
import { glob } from "glob";
import { default as cliProgress } from "cli-progress";
import { existsSync } from "fs";

// Constants
const path = "articles/2-chunked";
const previous_path = "articles/1-cleaned";
const max_chunk_size = 2000;

function chunkText(content, max_words) {
    function wordCount(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    function chunkParagraph(paragraph, max_words) {
        let sentences = paragraph.split(/(?<=\.)\s+/);
        let chunks = [];
        let currentChunk = [];

        sentences.forEach(sentence => {
            let currentWords = wordCount(currentChunk.join(' '));
            let sentenceWords = wordCount(sentence);

            if (currentWords + sentenceWords > max_words) {
                chunks.push(currentChunk.join(' '));
                currentChunk = [sentence]; // Start a new chunk with the current sentence
            } else {
                currentChunk.push(sentence);
            }
        });
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join(' '));
        }
        return chunks;
    }

    let paragraphs = content.split(/\n+/);
    let chunks = [];
    let currentChunk = [];

    paragraphs.forEach(paragraph => {
        let currentWords = wordCount(currentChunk.join(' '));
        let paragraphWords = wordCount(paragraph);

        if (paragraphWords > max_words) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [];
            }
            // Break paragraph into sentences and process
            chunks = chunks.concat(chunkParagraph(paragraph, max_words));
        } else {
            if (currentWords + paragraphWords > max_words) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [paragraph]; // Start a new chunk with the current paragraph
            } else {
                currentChunk.push(paragraph);
            }
        }
    });

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }

    return chunks;
}

function chunk(article) {
    const header = `URL: ${article.url}\nTitle: ${article.title}\npost_id: ${article.post_id}\nDate: ${article.date_published}\n\n<!--starts-->\n\n`;
    const footer = `<!--ends-->\n\n`;
    const body = `${article.excerpt}\n\n${article.content}`;
    if (body.length < max_chunk_size) {
        return [{
            content: header + body + footer,
        }];
    }
    const chunks = chunkText(body, max_chunk_size);
    return chunks.map(chunk => ({
        content: header + chunk + footer,
    }));
}

export async function Chunk() {
    await mkdirp(path);
    const article_files = await glob(`${previous_path}/*.json`);
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(article_files.length, 0);
    for (let article_file of article_files) {
        const _id = article_file.split("/").pop().split(".")[0];
        if (existsSync(`${path}/${_id}.json`)) {
            bar1.increment();
            continue;
        }
        try {
            await chunk_article(_id);
        } catch (error) {
            console.error(`Error processing ${article_file}: ${error}`);
        }
        bar1.increment();
    }
    bar1.stop();
}

export async function chunk_article(_id, force = false) {
    if (!force && existsSync(`${path}/${_id}.json`)) return;
    const article_file = `${previous_path}/${_id}.json`;
    const article = JSON.parse(await fs.readFile(article_file, "utf8"));
    article.chunks = chunk(article);
    await fs.writeFile(`${path}/${_id}.json`, JSON.stringify(article, null, 2));
    return article;
}

// Chunk()
//     .catch(console.error)
