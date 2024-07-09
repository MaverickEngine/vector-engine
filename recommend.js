import { MongoClient } from "mongodb";
import { Qdrant } from "./qdrant.js";
import ollama from "ollama";
import { v5 as uuidv5 } from 'uuid';

const qdrant = new Qdrant();
const url = "mongodb://localhost:27017";
const client = new MongoClient(url);

const DBNAME = "dm";
const DBCOLLECTION = "articles";
const COLLECTION = "article_embeddings";
const MODEL = "all-minilm:latest"

const db = client.db(DBNAME);
const collection = db.collection(DBCOLLECTION);

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

export async function similar(post_id, { limit = 5, previous_days = 30 }) {
    const article = await collection.findOne({ post_id });
    if (!article) {
        return [];
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
    const id = uuidv5(`${article._id}_0`, uuidv5.URL);
    const result = await qdrant.similarById(COLLECTION, id, limit, filter);

    return result;
}