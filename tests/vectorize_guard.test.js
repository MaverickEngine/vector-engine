import { createVectorizeGuard } from "../src/libs/vectorize_guard.js";

function fakeRedis() {
    const keys = new Map();
    return {
        keys,
        async set(key, value, ex, ttl, nx) {
            expect([ex, nx]).toEqual(["EX", "NX"]);
            if (keys.has(key)) return null;
            keys.set(key, { value, ttl });
            return "OK";
        },
    };
}

const quietLog = { error: () => {} };
const flush = () => new Promise(resolve => setImmediate(resolve));

describe("vectorize guard", function () {
    it("vectorizes a burst of requests for one article once", async function () {
        const redis = fakeRedis();
        const calls = [];
        const guard = createVectorizeGuard({ redis, run: async id => calls.push(id), keyPrefix: "lock", ttlSeconds: 900, log: quietLog });

        const started = await Promise.all(Array.from({ length: 50 }, () => guard.request("abc")));
        await flush();

        expect(started.filter(Boolean)).toHaveLength(1);
        expect(calls).toEqual(["abc"]);
        expect(redis.keys.get("lock-abc").ttl).toBe(900);
    });

    it("does not vectorize again while the lock is held, even after success", async function () {
        const redis = fakeRedis();
        const calls = [];
        const guard = createVectorizeGuard({ redis, run: async id => calls.push(id), keyPrefix: "lock", ttlSeconds: 900, log: quietLog });

        await guard.request("abc");
        await flush();
        expect(await guard.request("abc")).toBe(false);
        expect(calls).toHaveLength(1);
    });

    it("respects a lock taken by another pod", async function () {
        const redis = fakeRedis();
        redis.keys.set("lock-abc", { value: "1", ttl: 900 });
        const run = jest.fn();
        const guard = createVectorizeGuard({ redis, run, keyPrefix: "lock", ttlSeconds: 900, log: quietLog });

        expect(await guard.request("abc")).toBe(false);
        expect(run).not.toHaveBeenCalled();
    });

    it("keeps one run per pod when Redis is down", async function () {
        const redis = { set: async () => { throw new Error("down"); } };
        let finish;
        const run = jest.fn(() => new Promise(resolve => { finish = resolve; }));
        const guard = createVectorizeGuard({ redis, run, keyPrefix: "lock", ttlSeconds: 900, log: quietLog });

        expect(await guard.request("abc")).toBe(true);
        expect(await guard.request("abc")).toBe(false);
        await flush();
        expect(run).toHaveBeenCalledTimes(1);
        finish();
    });

    it("swallows failures from the vectorization", async function () {
        const errors = [];
        const guard = createVectorizeGuard({
            redis: fakeRedis(),
            run: async () => { throw new Error("ollama timeout"); },
            keyPrefix: "lock",
            ttlSeconds: 900,
            log: { error: (...args) => errors.push(args) },
        });

        expect(await guard.request(123)).toBe(true);
        await flush();
        expect(errors).toHaveLength(1);
        expect(errors[0][1]).toBe("123");
    });
});
