import { readFileSync } from "node:fs";
import { join } from "node:path";

const c = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    magenta: "\x1b[35m",
    gray: "\x1b[90m",
};

const BANNER = [
    "██╗   ██╗███████╗ ██████╗████████╗ ██████╗ ██████╗     ███████╗███╗   ██╗ ██████╗ ██╗███╗   ██╗███████╗",
    "██║   ██║██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗    ██╔════╝████╗  ██║██╔════╝ ██║████╗  ██║██╔════╝",
    "██║   ██║█████╗  ██║        ██║   ██║   ██║██████╔╝    █████╗  ██╔██╗ ██║██║  ███╗██║██╔██╗ ██║█████╗  ",
    "╚██╗ ██╔╝██╔══╝  ██║        ██║   ██║   ██║██╔══██╗    ██╔══╝  ██║╚██╗██║██║   ██║██║██║╚██╗██║██╔══╝  ",
    " ╚████╔╝ ███████╗╚██████╗   ██║   ╚██████╔╝██║  ██║    ███████╗██║ ╚████║╚██████╔╝██║██║ ╚████║███████╗",
    "  ╚═══╝  ╚══════╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝    ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝",
].join("\n");

export const SERVER_NAME = "vector-engine";

/**
 * @typedef {object} StartupConfig
 * @property {string} version
 * @property {string | null} jxpServer
 * @property {boolean} jxpApiKeyConfigured
 * @property {string | null} qdrantUrl
 * @property {string | null} redisHost
 * @property {string | number | null} redisPort
 * @property {boolean} redisPasswordConfigured
 * @property {string | null} ollamaUrl
 * @property {string} model
 * @property {string | number} port
 * @property {string} host
 */

/**
 * @typedef {object} StartupContext
 * @property {string} name
 * @property {string} version
 * @property {StartupConfig} config
 */

/**
 * @typedef {StartupContext & { url: string, startedAt: Date }} ReadyContext
 */

function readPackageVersion() {
    try {
        const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
        return pkg.version ?? "0.0.0";
    } catch {
        return "0.0.0";
    }
}

function redactEndpoint(url) {
    if (!url) return `${c.dim}not configured${c.reset}`;
    try {
        return new URL(url).host;
    } catch {
        return "(invalid URL)";
    }
}

function formatConfigured(configured) {
    return configured
        ? `${c.green}configured${c.reset}`
        : `${c.yellow}${c.bold}MISSING${c.reset}`;
}

function formatRedis(config) {
    if (!config.redisHost) return `${c.dim}not configured${c.reset}`;
    const auth = config.redisPasswordConfigured ? "***@" : "";
    return `${auth}${config.redisHost}:${config.redisPort ?? 6379}`;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {StartupConfig}
 */
export function loadStartupConfig(env = process.env) {
    return {
        version: readPackageVersion(),
        jxpServer:
            env.JXP_SERVER?.trim() ||
            env.JXP_API_URL?.trim() ||
            "http://localhost:8080",
        jxpApiKeyConfigured: Boolean(
            (env.JXP_API_KEY || env.JXP_APIKEY || "").trim()
        ),
        qdrantUrl: env.QDRANT_URL?.trim() || "http://127.0.0.1:6333",
        redisHost: env.REDIS_HOST?.trim() || "localhost",
        redisPort: env.REDIS_PORT || 6379,
        redisPasswordConfigured: Boolean((env.REDIS_PASSWORD || "").trim()),
        ollamaUrl: env.OLLAMA_URL?.trim() || "http://localhost:11434",
        model: env.MODEL?.trim() || "mxbai-embed-large:latest",
        port: env.PORT || 8001,
        host: env.HOST || "0.0.0.0",
    };
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {StartupContext}
 */
export function createStartupContext(env) {
    const config = loadStartupConfig(env);
    return {
        name: SERVER_NAME,
        version: config.version,
        config,
    };
}

/**
 * @param {string} host
 * @param {string | number} port
 * @returns {string}
 */
export function formatListenUrl(host, port) {
    const displayHost = host === "0.0.0.0" ? "localhost" : host;
    return `http://${displayHost}:${port}`;
}

/**
 * @param {StartupContext} ctx
 */
export function printBanner(ctx) {
    const versionTag = `${ctx.name} v${ctx.version}`;
    const bannerWidth = BANNER.split("\n")[0]?.length ?? versionTag.length;
    const pad = Math.max(0, Math.floor((bannerWidth - versionTag.length) / 2));

    console.log("");
    console.log(`${c.cyan}${BANNER}${c.reset}`);
    console.log(
        `${c.dim}${" ".repeat(pad)}${c.bold}${c.magenta}${versionTag}${c.reset}${c.dim} · vector recommendation API${c.reset}`
    );
    console.log("");
}

/**
 * @param {StartupContext} ctx
 */
export function printBooting(ctx) {
    const { config } = ctx;

    console.log(`${c.gray}  ┌─ booting${c.reset}`);
    console.log(
        `${c.gray}  │${c.reset}  ${c.dim}JXP API${c.reset}    ${redactEndpoint(config.jxpServer)}`
    );
    console.log(
        `${c.gray}  │${c.reset}  ${c.dim}JXP key${c.reset}    ${formatConfigured(config.jxpApiKeyConfigured)}`
    );
    console.log(
        `${c.gray}  │${c.reset}  ${c.dim}Qdrant${c.reset}     ${redactEndpoint(config.qdrantUrl)}`
    );
    console.log(
        `${c.gray}  │${c.reset}  ${c.dim}Redis${c.reset}      ${formatRedis(config)}`
    );
    console.log(
        `${c.gray}  │${c.reset}  ${c.dim}Ollama${c.reset}     ${redactEndpoint(config.ollamaUrl)}`
    );
    console.log(
        `${c.gray}  │${c.reset}  ${c.dim}Model${c.reset}      ${config.model}`
    );
    console.log(`${c.gray}  └─${c.reset}`);
    console.log("");
}

/**
 * @param {ReadyContext} ctx
 */
export function printReady(ctx) {
    const time = ctx.startedAt.toLocaleTimeString();
    const { config } = ctx;

    console.log(`${c.green}${c.bold}  ✓ Ready${c.reset}`);
    console.log(
        `${c.gray}  ├─${c.reset}  ${c.dim}HTTP${c.reset}       ${c.cyan}${ctx.url}${c.reset}`
    );
    console.log(
        `${c.gray}  ├─${c.reset}  ${c.dim}JXP API${c.reset}    ${redactEndpoint(config.jxpServer)}`
    );
    console.log(
        `${c.gray}  ├─${c.reset}  ${c.dim}Qdrant${c.reset}     ${redactEndpoint(config.qdrantUrl)}`
    );
    console.log(
        `${c.gray}  ├─${c.reset}  ${c.dim}Ollama${c.reset}     ${redactEndpoint(config.ollamaUrl)}`
    );
    console.log(
        `${c.gray}  ├─${c.reset}  ${c.dim}Model${c.reset}      ${config.model}`
    );
    console.log(
        `${c.gray}  └─${c.reset}  ${c.dim}Started${c.reset}    ${c.dim}at ${time}${c.reset}`
    );
    console.log("");
}
