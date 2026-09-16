import {
    createStartupContext,
    formatListenUrl,
    loadStartupConfig,
    printBanner,
    printBooting,
    printReady,
} from "../src/libs/startup.js";

function captureStartup(fn) {
    const lines = [];
    const original = console.log;
    console.log = (...args) => {
        lines.push(args.map(String).join(" "));
    };

    try {
        fn();
    } finally {
        console.log = original;
    }

    return lines.join("\n");
}

describe("startup", () => {
    it("loads config from env without exposing secrets", () => {
        const config = loadStartupConfig({
            JXP_SERVER: "https://api.example.com",
            JXP_API_KEY: "secret-key",
            QDRANT_URL: "http://qdrant.example.com:6333",
            REDIS_HOST: "redis.example.com",
            REDIS_PORT: "6379",
            REDIS_PASSWORD: "s3cret",
            OLLAMA_URL: "http://ollama.example.com:11434",
            MODEL: "nomic-embed-text",
            PORT: "9000",
            HOST: "0.0.0.0",
        });

        expect(config.jxpApiKeyConfigured).toBe(true);
        expect(config.redisPasswordConfigured).toBe(true);
        expect(config.model).toBe("nomic-embed-text");
        expect(config.port).toBe("9000");
    });

    it("prints banner with server name and version", () => {
        const output = captureStartup(() =>
            printBanner(createStartupContext({}))
        );

        expect(output).toMatch(/vector-engine v/);
        expect(output).toContain("██╗");
        expect(output).toContain("\x1b[36m");
    });

    it("prints booting details with redacted endpoints", () => {
        const output = captureStartup(() =>
            printBooting(
                createStartupContext({
                    JXP_SERVER: "https://api.example.com",
                    JXP_API_KEY: "test-key",
                    QDRANT_URL: "http://qdrant.example.com:6333",
                    REDIS_HOST: "localhost",
                    REDIS_PASSWORD: "pass",
                    OLLAMA_URL: "http://ollama.example.com:11434",
                    MODEL: "mxbai-embed-large:latest",
                })
            )
        );

        expect(output).toContain("booting");
        expect(output).toContain("api.example.com");
        expect(output).toContain("qdrant.example.com");
        expect(output).toContain("***@localhost:6379");
        expect(output).toContain("ollama.example.com");
        expect(output).not.toContain("secret");
        expect(output).not.toContain("pass");
    });

    it("prints ready state with listen URL", () => {
        const ctx = createStartupContext({
            JXP_SERVER: "http://localhost:8080",
            JXP_API_KEY: "key",
            QDRANT_URL: "http://127.0.0.1:6333",
            OLLAMA_URL: "http://localhost:11434",
        });
        const output = captureStartup(() =>
            printReady({
                ...ctx,
                url: formatListenUrl("0.0.0.0", 8001),
                startedAt: new Date("2026-09-16T10:00:00"),
            })
        );

        expect(output).toContain("Ready");
        expect(output).toContain("http://localhost:8001");
    });

    it("maps 0.0.0.0 to localhost in listen URL", () => {
        expect(formatListenUrl("0.0.0.0", 8001)).toBe("http://localhost:8001");
        expect(formatListenUrl("127.0.0.1", 8001)).toBe("http://127.0.0.1:8001");
    });
});
