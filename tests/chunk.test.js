import { chunk, chunkText, MAX_CHUNK_CHARACTERS } from "../src/vectorize/chunk.js";

describe("chunkText", () => {
    it("hard-splits a sentence that exceeds the chunk limit", () => {
        const content = Array.from({ length: 100 }, () => "word").join(" ");
        const chunks = chunkText(content, 100);

        expect(chunks).toHaveLength(5);
        expect(chunks.every(chunk => chunk.length <= 100)).toBe(true);
        expect(chunks.join(" ").replace(/\s+/g, " ").trim()).toBe(content);
    });
});

describe("chunk", () => {
    it("keeps every embedding prompt within the character limit", () => {
        const article = {
            url: "https://example.com/article",
            title: "A very long article",
            author: "Author",
            post_id: 1,
            date_published: "2026-09-16",
            tags: ["news"],
            sections: ["world"],
            excerpt: "An excerpt.",
            content: Array.from({ length: 500 }, () => "article").join(" "),
        };

        const chunks = chunk(article);

        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every(({ content }) => content.length <= MAX_CHUNK_CHARACTERS)).toBe(true);
    });
});
