import { app, close, init } from "../src/bin/api.js";
import { clear_keys } from "../src/libs/cache.js";

describe("API", function () {
    beforeAll(async function () {
        await init();
        await app.ready();
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

    it("should vectorize an article from a Wordpress post id", async function () {
        const response = await app.inject({
            method: "POST",
            url: "/vectorize",
            payload: {
                post_id: 674669,
            }
        });
        expect(response.statusCode).toEqual(200);
        const result = response.json();
        expect(result).toBeDefined();
        expect(result.saved_result).toBeDefined();
        expect(result.saved_result._id).toBeDefined();
        expect(result.saved_result.result[0].id).toBeDefined();
    })

    it("should vectorize an article from a RevEngine id", async function () {
        const response = await app.inject({
            method: "POST",
            url: "/vectorize",
            payload: {
                revengine_id: "669fa28fda704571f8b9b66d",
            }
        });
        expect(response.statusCode).toEqual(200);
        const result = response.json();
        expect(result).toBeDefined();
        expect(result.saved_result).toBeDefined();
        expect(result.saved_result._id).toEqual("669fa28fda704571f8b9b66d");
        expect(result.saved_result.result[0].id).toBeDefined();
    })

    it("should reject search queries that exceed word or character limits", async function () {
        const tooManyChars = "a".repeat(801);
        const charResponse = await app.inject({
            method: "POST",
            url: "/search",
            payload: { query: tooManyChars },
        });
        expect(charResponse.statusCode).toEqual(400);
        expect(charResponse.json().error).toMatch(/maximum of 100 words or 800 characters/);

        const tooManyWords = Array(101).fill("word").join(" ");
        const wordResponse = await app.inject({
            method: "POST",
            url: "/search",
            payload: { query: tooManyWords },
        });
        expect(wordResponse.statusCode).toEqual(400);
        expect(wordResponse.json().error).toMatch(/maximum of 100 words or 800 characters/);
    });

    it("should search and cache identical queries", async function () {
        await clear_keys("qdrant-cache-search");
        const payload = {
            query: "south africa politics",
            limit: 3,
            previous_days: 365,
        };

        const first = await app.inject({
            method: "POST",
            url: "/search",
            payload,
        });
        expect(first.statusCode).toEqual(200);
        const firstResult = first.json();
        expect(Array.isArray(firstResult)).toBe(true);
        expect(firstResult.length).toBeGreaterThan(0);
        expect(firstResult[0].score).toBeDefined();
        expect(firstResult[0].payload).toBeDefined();

        const second = await app.inject({
            method: "POST",
            url: "/search",
            payload,
        });
        expect(second.statusCode).toEqual(200);
        expect(second.json()).toEqual(firstResult);
    });

    it("should return 429 when the rate limit is exceeded", async function () {
        const previousMax = process.env.RATE_LIMIT_MAX;
        process.env.RATE_LIMIT_MAX = "2";

        try {
            // Oversized query fails validation without Redis/Qdrant; unique IP avoids shared budget.
            const injectOpts = {
                method: "POST",
                url: "/search",
                remoteAddress: "203.0.113.10",
                payload: { query: "a".repeat(801) },
            };
            const first = await app.inject(injectOpts);
            const second = await app.inject(injectOpts);
            const third = await app.inject(injectOpts);

            expect(first.statusCode).toEqual(400);
            expect(second.statusCode).toEqual(400);
            expect(third.statusCode).toEqual(429);
            expect(third.headers["retry-after"]).toBeDefined();
        } finally {
            if (previousMax === undefined) {
                delete process.env.RATE_LIMIT_MAX;
            } else {
                process.env.RATE_LIMIT_MAX = previousMax;
            }
        }
    });
});