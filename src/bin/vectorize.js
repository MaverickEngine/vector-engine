import { Extract } from "./extract.js";
import { Clean } from "./clean.js";
import { Chunk } from "./chunk.js";
import { Embeddings } from "./embeddings.js";
import { Save } from "./save.js";

async function vectorize() {
    console.time("Vectorize");
    await Extract();
    await Clean();
    await Chunk();
    await Embeddings();
    await Save();
    console.timeEnd("Vectorize");
}

vectorize()
    .catch(console.error);