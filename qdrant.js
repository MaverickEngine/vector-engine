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
        console.log(response)
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
            filter: query.filters,
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
        return result.result;
    }

    async deleteRecord(collection, id) {
        const response = await fetch(`${this.url}/collections/${collection}/points/delete`, {
            method: 'POST',
            body: JSON.stringify({
                "filter": {
                    "must": [
                        {
                            "key": "file_uid",
                            "match": {
                                "value": id
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
}