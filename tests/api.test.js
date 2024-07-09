import { app, close, init } from "../api.js";

describe("API", function () {
    beforeAll(async function () {
        await init();
    });
    afterAll(async function () {
        await close();
    });

    it("should return similar articles based on _id", async function () {
        const response = await app.inject({
            method: "GET",
            url: "/similar/5f17feace6eba93d8137f9bd",
        });
        expect(response.statusCode).toEqual(200);
        const result = response.json();
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        const item = result[0];
        expect(item.score).toBeGreaterThan(0);
        expect(item.post_id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.url).toBeDefined();
        expect(item.author).toBeDefined();
        expect(item.date_published).toBeDefined();
        expect(item.sections).toBeDefined();
        expect(item.excerpt).toBeDefined();
    });
});