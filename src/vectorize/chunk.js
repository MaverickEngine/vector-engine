import fs from "fs/promises";
import { mkdirp } from "mkdirp";
import { glob } from "glob";
import { default as cliProgress } from "cli-progress";
import { existsSync } from "fs";

// Constants
const path = "articles/2-chunked";
const previous_path = "articles/1-cleaned";
export const MAX_CHUNK_CHARACTERS = 1000;
const METADATA_CHARACTER_BUDGET = 250;

function truncateText(text, maxCharacters) {
    if (text.length <= maxCharacters) return text;
    return `${text.slice(0, maxCharacters - 1).trimEnd()}…`;
}

export function chunkText(content, maxCharacters) {
    const segments = content
        .trim()
        .split(/(?<=[.!?])\s+|\n+/)
        .flatMap(segment => {
            const parts = [];
            let remaining = segment.trim();

            while (remaining.length > maxCharacters) {
                const breakAt = remaining.lastIndexOf(" ", maxCharacters);
                const splitAt = breakAt > 0 ? breakAt : maxCharacters;
                parts.push(remaining.slice(0, splitAt).trim());
                remaining = remaining.slice(splitAt).trim();
            }

            if (remaining) parts.push(remaining);
            return parts;
        });

    const chunks = [];
    let currentChunk = "";
    for (const segment of segments) {
        if (!currentChunk) {
            currentChunk = segment;
        } else if (currentChunk.length + 1 + segment.length <= maxCharacters) {
            currentChunk += `\n${segment}`;
        } else {
            chunks.push(currentChunk);
            currentChunk = segment;
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

export function chunk(article) {
    const fullHeader = `URL: ${article.url}\nTitle: ${article.title}\nAuthor: ${article.author}\npost_id: ${article.post_id}\nDate: ${article.date_published}\nTags: ${(article.tags || []).join(", ")}\nSections: ${(article.sections || []).join(", ")}\n\n<!--starts-->\n\n`;
    const header = truncateText(fullHeader, METADATA_CHARACTER_BUDGET);
    const footer = `<!--ends-->\n\n`;
    const body = `${article.excerpt}\n\n${article.content}`;
    const bodyCharacterBudget = MAX_CHUNK_CHARACTERS - header.length - footer.length;
    const chunks = chunkText(body, bodyCharacterBudget);

    return chunks.map(content => ({
        content: `${header}${content}${footer}`,
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
    await mkdirp(path);
    await fs.writeFile(`${path}/${_id}.json`, JSON.stringify(article, null, 2));
    return {
        _id: article._id,
        file: `${path}/${_id}.json`,
        chunk_count: article.chunks.length
    };
}

// Chunk()
//     .catch(console.error)
