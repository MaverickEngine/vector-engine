const url = process.env.QDRANT_URL || 'http://127.0.0.1:6333';

export class Qdrant {
    url;

    constructor(options = {}) {
        this.url = options.url || url;
    }

    async getCollections() {
        const response = await fetch(`${this.url}/collections`);
        const collections = (await response.json()).result.collections;
        return collections.map((collection) => collection.name);
    }

    async collectionExists(collection) {
        const collections = await this.getCollections();
        if (collections.includes(collection)) {
            return true;
        }
        return false;
    }

    async createCollection(collection) {
        if (await this.collectionExists(collection)) {
            return false;
        }
        const config = {
            vectors: {
                size: 384,
                distance: 'Cosine',
                on_disk: true
            }
        }
        const response = await fetch(`${this.url}/collections/${collection}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        await response.json();
        return true;
    }

    async deleteCollection(collection) {
        if (!await this.collectionExists(collection)) {
            return false;
        }
        const response = await fetch(`${this.url}/collections/${collection}`, {
            method: 'DELETE'
        });
        await response.json();
        return true;
    }

    async upsert(collection, id, data) {
        const response = await fetch(`${this.url}/collections/${collection}/upsert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id,
                data
            })
        });
        return await response.json();
    }

    async addRecords(collection, records) {
        const points = records.map(record => ({
            id: record.id,
            vector: record.vectors,
            payload: record.data
        }));
        // console.log(points);
        const response = await fetch(`${this.url}/collections/${collection}/points?wait=true`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ points })
        });
        const result = await response.json();
        // console.log({ result });
        return {};
    }

    async search(collection, query) {
        const search = {
            filter: query.filter || {},
            "params": {
                "hnsw_ef": 128,
                "exact": false
            },
            limit: query.top,
            vector: query.vectors,
            "with_payload": true
        }
        const response = await fetch(`${this.url}/collections/${collection}/points/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(search)
        });
        const result = await response.json();
        if (result.status !== "ok") {
            console.log(result)
            throw new Error(result.statusText || "Unknown error");
        }
        return result.result.sort((a, b) => b.score - a.score);
    }

    async deleteRecord(collection, post_id) {
        const response = await fetch(`${this.url}/collections/${collection}/points/delete`, {
            method: 'POST',
            body: JSON.stringify({
                "filter": {
                    "must": [
                        {
                            "key": "post_id",
                            "match": {
                                "value": post_id
                            }
                        }
                    ]
                }
            })
        });
        await response.json();
    }

    async getInfo(collection) {
        const response = await fetch(`${this.url}/collections/${collection}`);
        const info = (await response.json()).result;
        return info;
    }

    async getById(collection, id) {
        const response = await fetch(`${this.url}/collections/${collection}/points/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        if (result.status !== "ok") {
            console.log(result)
            throw new Error(result.statusText || "Unknown error");
        }
        if (!result.result) {
            return null;
        }
        return result.result;
    }

    async similarById(collection, id, limit, filter = {}) {
        const point = await this.getById(collection, id);
        if (!point) {
            return [];
        }
        filter.must_not = [
            {
                "key": "post_id", "match": { "value": point.payload.post_id }
            }
        ]
        const search = {
            vector: point.vector,
            "params": {
                "hnsw_ef": 128,
                "exact": false
            },
            limit,
            "with_payload": true,
            filter,
            "group_by": "post_id",
            "group_size": 1,
        }
        const response = await fetch(`${this.url}/collections/${collection}/points/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(search)
        });
        const result = await response.json();
        if (result.status !== "ok") {
            throw new Error(result.statusText || "Unknown error");
        }
        return result.result.sort((a, b) => b.score - a.score);
    }
}