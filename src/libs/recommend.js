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
const model = process.env.MODEL || "mxbai-embed-large:latest";

export async function init() { }

export async function qdrant_search(content, limit, { previous_days = 30, section = null, tag = null, author = null }) {
    console.log(`Searching for: ${content}`);
    const embeddings = await ollama.embeddings({ prompt: content, model });

    const filter = { "must": [] };

    if (previous_days > 0) {
        const start_date = new Date();
        start_date.setDate(start_date.getDate() - previous_days);
        filter.must.push({
            "key": "date_published",
            "range": {
                "gte": start_date.toISOString(),
                "lte": new Date().toISOString()
            }
        });
    }

    if (section && section !== "all") {
        filter.must.push({
            "key": "sections",
            "match": { "value": section }
        });
    }

    if (tag && tag !== "all") {
        filter.must.push({
            "key": "tags",
            "match": { "value": tag }
        });
    }

    // Add author filter
    if (author && author !== "all") {
        filter.must.push({
            "key": "author",
            "match": { "value": author }
        });
    }

    const result = await qdrant.search(COLLECTION, {
        filter,
        top: limit * 10,
        vectors: embeddings.embedding
    });

    // Rerank with most recent articles first
    // Find lowest and highest date_published
    const dates = result.map(r => new Date(r.payload.date_published).getTime());
    dates.sort();
    const min_date = dates[0];
    const max_date = dates[dates.length - 1];
    // Normalize dates to 0-1
    const date_range = max_date - min_date;
    result.forEach((r, i) => {
        const val = new Date(r.payload.date_published).getTime();
        r.normalized_date = (val - min_date) / (max_date - min_date);
        r.score = (r.score * 0.7) + (r.normalized_date * 0.3);
    });

    result.sort((a, b) => b.score - a.score);
    result.splice(limit);
    return result;
}

export async function search(content, { limit = 5, previous_days = 30, section = "all", tag = "all", author = "all" }) {
    if (limit > 10) {
        limit = 10;
    }
    return await qdrant_search(content, limit, {
        previous_days,
        section,
        tag,
        author
    });
}

export async function similar(_id, { limit = 5, history = [], previous_days = 30 }) {
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
    // console.log({ _id, id });
    const result = await qdrant.similarById(COLLECTION, id, limit, filter).catch(err => {
        console.log(err);
        return [];
    });
    // console.log(result.map(r => r.score));
    return result;
}

export async function close() {
    // qdrant.close();
}