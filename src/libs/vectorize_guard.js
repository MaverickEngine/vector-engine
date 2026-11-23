// Stops /similar from vectorizing the same article over and over.
//
// When an article isn't in Qdrant yet, every request for it used to start a
// new vectorization. Under morning traffic that queued thousands of duplicate
// embeddings in Ollama, which made each one slower, which kept the article
// missing for longer. Now each article is vectorized at most once per
// `ttlSeconds`, across all API pods (a Redis key) and within this one (a Set).
// The key is left to expire rather than cleared on success, so it also covers
// articles that are vectorized but still have no similar results.

export function createVectorizeGuard({ redis, run, keyPrefix, ttlSeconds, log = console }) {
    const pending = new Set();

    async function claim(id) {
        try {
            return (await redis.set(`${keyPrefix}-${id}`, "1", "EX", ttlSeconds, "NX")) === "OK";
        } catch (err) {
            // Redis being down shouldn't stop new articles being vectorized; the
            // in-process Set still keeps this pod from repeating itself.
            log.error("Vectorize lock unavailable, continuing without it", err);
            return true;
        }
    }

    // Starts a vectorization in the background unless one ran recently.
    // Never throws. Resolves to whether this call started one.
    async function request(article_id) {
        const id = String(article_id);
        if (pending.has(id)) return false;
        pending.add(id);
        let started = false;
        try {
            if (!(await claim(id))) return false;
            started = true;
            Promise.resolve()
                .then(() => run(id))
                .catch(err => log.error("Background vectorize failed", id, err))
                .finally(() => pending.delete(id));
            return true;
        } finally {
            if (!started) pending.delete(id);
        }
    }

    return { request };
}
