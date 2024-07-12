import fs from "fs/promises";
import he from "he";
import { mkdirp } from "mkdirp";
import { glob } from "glob";
import { default as cliProgress } from "cli-progress";
import { existsSync } from "fs";

// Constants
const path = "articles/1-cleaned";
const previous_path = "articles/0-extracted";

function cleanContent(content) {
    // Remove everything in between <script>...</script> tags
    content = content.replace(/<script.*?>.*?<\/script>/g, '');
    // Replace all <br> tags with newlines
    content = content.replace(/<br>/g, '\n');
    // Replace all <br /> tags with newlines
    content = content.replace(/<br \/>/g, '\n');
    // Replace all <p> tags with newlines
    content = content.replace(/<p>/g, '\n');
    // Replace all </p> tags with newlines
    content = content.replace(/<\/p>/g, '\n');
    // Replace all <div> tags with newlines
    content = content.replace(/<div>/g, '\n');
    // Replace all </div> tags with newlines
    content = content.replace(/<\/div>/g, '\n');
    // Remove all HTML tags
    content = content.replace(/<[^>]*>/g, '');
    // Remove Wordpress shortcodes
    content = content.replace(/\[.*?\]/g, '');
    // Remove HTML entities
    content = he.decode(content);
    // Remove all leading and trailing whitespace
    content = content.trim();
    // Remove all double spaces
    content = content.replace(/  /g, ' ');
    // Normalize paragraph breaks
    content = content.replace(/\n\n+/g, '\n\n');
    content = content.replace(/\r\n/g, '\n\n');
    // No more than 2 newlines in a row
    content = content.replace(/\n{3,}/g, '\n\n');
    return content;
}

function clean_article_map(article) {
    const content = cleanContent(article.content || "");
    const excerpt = cleanContent(article.excerpt || "");
    const title = cleanContent(article.title || "");
    return {
        _id: article._id.toString(),
        post_id: article.post_id,
        tags: article.tags || [],
        sections: article.sections || [],
        url: `https://www.dailymaverick.co.za/article/${article.date_published.substring(0, 10)}-${article.urlid}/`,
        author: article.author || "",
        date_published: article.date_published,
        date_modified: article.date_modified,
        title,
        excerpt,
        content,
        word_count: (`${title}\n${excerpt}\n${content}`).split(/\s+/).length
    }
}

export async function clean_article(_id) {
    const article_file = `${previous_path}/${_id}.json`;
    const previous_article = JSON.parse(await fs.readFile(article_file, "utf8"));
    const article = clean_article_map(previous_article);
    await fs.writeFile(`${path}/${_id}.json`, JSON.stringify(article, null, 2));
}

export async function Clean() {
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
            await clean_article(_id);
        } catch (error) {
            console.error(`Error processing ${article_file}: ${error}`);
            // break;
        }
        bar1.increment();
    }
    bar1.stop();
}

// Clean()
//     .catch(console.error)
