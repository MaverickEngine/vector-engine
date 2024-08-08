import { Qdrant } from "./qdrant.js";
import { Ollama } from "ollama";
import { v5 as uuidv5 } from 'uuid';
import { config } from "dotenv";
config();

const ollama = new Ollama({
    host: process.env.OLLAMA_URL || "http://localhost:11434",
});

const qdrant = new Qdrant();

const COLLECTION = "article_embeddings";
const MODEL = "all-minilm:latest"

export async function init() { }

export async function qdrant_search(content, limit, filter = {}) {
    const embeddings = await ollama.embeddings({ prompt: content, model: MODEL });
    const result = await qdrant.search(COLLECTION, {
        filter,
        top: limit,
        vectors: embeddings.embedding
    });
    return result;
}

export async function search(content, { limit = 5, previous_days = 30, section = "all", tag = "all" }) {
    if (limit > 10) {
        limit = 10;
    }
    const start_date = new Date();
    start_date.setDate(start_date.getDate() - previous_days);
    const filter = { "must": [] }
    if (previous_days > 0) {
        filter.must.push({
            "key": "date_published",
            "range": {
                "gte": start_date.toISOString(),
                "lte": new Date().toISOString()
            }
        });
    }
    if (section !== "all") {
        filter.must.push({
            "key": "sections",
            "match": {
                "value": section
            }
        });
    }
    if (tag !== "all") {
        filter.must.push({
            "key": "tags",
            "match": {
                "value": tag
            }
        });
    }
    const result = await qdrant_search(content, limit, filter);
    return result;
}

export async function similar(_id, { limit = 5, previous_days = 30 }) {
    if (limit > 10) {
        limit = 10;
    }
    const start_date = new Date();
    start_date.setDate(start_date.getDate() - previous_days);
    const filter = {
        must: []
    };
    if (previous_days > 0) {
        filter.must.push({
            "key": "date_published",
            "range": {
                "gte": start_date.toISOString(),
                "lte": new Date().toISOString()
            }
        });
    }
    const id = uuidv5(`${_id}_0`, uuidv5.URL);
    const result = await qdrant.similarById(COLLECTION, id, limit, filter);
    // console.log(result.map(r => r.score));
    return result;
}

export async function close() {
    // qdrant.close();
}