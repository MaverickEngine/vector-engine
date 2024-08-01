import { Extract } from "../vectorize/extract.js";
import { Clean } from "../vectorize/clean.js";
import { Chunk } from "../vectorize/chunk.js";
import { Embeddings } from "../vectorize/embeddings.js";
import { Save } from "../vectorize/save.js";

async function vectorize() {
    console.time("Vectorize");
    // await Extract();
    console.log("Cleaning...");
    await Clean();
    console.log("Chunking...");
    await Chunk();
    console.log("Embedding...");
    await Embeddings();
    console.log("Saving...");
    await Save();
    console.timeEnd("Vectorize");
}

vectorize()
    .catch(console.error);