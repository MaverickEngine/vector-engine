import { search, similar } from "../recommend.js";

describe("Search", function () {
    it("should search for articles based on what I'm asking", async function () {
        const content = "What should I cook for dinner?";
        const limit = 5;
        const result = await search(content, limit);
        expect(result).toBeDefined();
        expect(result.length).toEqual(5);
        const item = result[0];
        // console.log(item);
        expect(item.id).toBeDefined();
        expect(item.score).toBeGreaterThan(0);
        expect(item.payload).toBeDefined();
        expect(item.payload.title).toBeDefined();
        expect(item.payload.url).toBeDefined();
        expect(item.payload.post_id).toBeDefined();
        expect(item.payload.date_published).toBeDefined();
        expect(item.payload.content).toBeDefined();
    });

    it("should limit results by section", async function () {
        const content = "What should I cook for dinner?";
        const limit = 5;
        const section = "Africa";
        const result = await search(content, { limit, section });
        expect(result).toBeDefined();
        expect(result.length).toEqual(5);
        const item = result[0];
        // console.log(item.sections);
        expect(item.payload.sections).toContain(section);
    });
});

describe("Similarity", function () {
    it("should find similar articles based on post_id", async function () {
        const post_id = 2248596; // AirFryday: Cheesy chilli con carne, the air fryer edition
        const limit = 5;
        const result = await similar(post_id, limit);
        expect(result).toBeDefined();
        expect(result.length).toEqual(5);
        const post_ids = result.map(item => item.payload.post_id);
        expect(post_ids).not.toContain(post_id);
        const scores = result.map(item => item.score);
        // Expect scores to decrease in size
        expect(scores[0]).toBeLessThan(scores[1]);
        expect(scores[1]).toBeLessThan(scores[2]);
    });
});