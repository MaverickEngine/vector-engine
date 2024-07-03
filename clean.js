import fs from "fs/promises";
import he from "he";
import { mkdirp } from "mkdirp";
import { glob } from "glob";

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
    // No more than 2 newlines in a row
    content = content.replace(/\n{3,}/g, '\n\n');
    return content;
}

function clean_article_map(article) {
    const content = cleanContent(article.content);
    return {
        _id: article._id.toString(),
        post_id: article.post_id,
        tags: article.tags,
        sections: article.sections,
        url: `https://www.dailymaverick.co.za/article/${article.date_published.substring(0, 10)}-${article.urlid}/`,
        author: article.author,
        date_published: article.date_published,
        date_modified: article.date_modified,
        title: cleanContent(article.title),
        excerpt: cleanContent(article.excerpt),
        content,
        word_count: content.split(/\s+/).length
    }
}

async function main() {
    await mkdirp(path);
    const article_files = await glob(`${previous_path}/*.json`);
    console.log(`Found ${article_files.length} articles.`);

    let max_word_count = 0;
    let tot_word_count = 0;
    let i = 0;
    // Write cleaned articles to a file
    for (let article_file of article_files) {
        const article = clean_article_map(JSON.parse(await fs.readFile(article_file, "utf8")));
        if (article.word_count > max_word_count) {
            max_word_count = article.word_count;
        }
        tot_word_count += article.word_count;
        i++;
        await fs.writeFile(`${path}/${article._id}.json`, JSON.stringify(article, null, 2));
    }
    console.log(`Max word count: ${max_word_count}; Total word count: ${tot_word_count}; Average word count: ${tot_word_count / i}`);
    return "done.";

}

main()
    .then(console.log)
    .catch(console.error)
