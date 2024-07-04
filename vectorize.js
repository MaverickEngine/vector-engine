import { Extract } from "./extract.js";
import { Clean } from "./clean.js";
import { Chunk } from "./chunk.js";
import { Embeddings } from "./embeddings.js";
import { Save } from "./save.js";

async function vectorize() {
    console.time("Vectorize");
    console.log("Extract")
    console.time("Extract")
    await Extract();
    console.timeEnd("Extract")
    console.log("Clean")
    console.time("Clean")
    await Clean();
    console.timeEnd("Clean")
    console.log("Chunk")
    console.time("Chunk")
    await Chunk();
    console.timeEnd("Chunk")
    console.log("Embeddings")
    console.time("Embeddings")
    await Embeddings();
    console.timeEnd("Embeddings")
    console.log("Save")
    console.time("Save")
    await Save();
    console.timeEnd("Save")
    console.timeEnd("Vectorize");
}

vectorize()
    .catch(console.error);