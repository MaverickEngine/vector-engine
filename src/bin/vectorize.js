import { Extract } from "../vectorize/extract.js";
import { Clean } from "../vectorize/clean.js";
import { Chunk } from "../vectorize/chunk.js";
import { Embeddings } from "../vectorize/embeddings.js";
import { Save } from "../vectorize/save.js";
import { program } from "commander";

program
    .name("vectorize")
    .description("Run the vectorization pipeline")
    .option("-a, --all", "Run all steps")
    .option("-e, --extract", "Extract text from files")
    .option("-c, --clean", "Clean text")
    .option("-ch, --chunk", "Chunk text")
    .option("-em, --embeddings", "Generate embeddings")
    .option("-s, --save", "Save embeddings")
    .option("-sd, --start-date <date>", "Start date for filtering articles (YYYY-MM-DD)")
    .option("-ed, --end-date <date>", "End date for filtering articles (YYYY-MM-DD)")
    .parse(process.argv);

const options = program.opts();

if (options.all === true) {
    console.log("Running all steps...");
    await vectorize().catch(console.error);
}

if (options.extract === true) {
    console.log("Extracting text...");
    await Extract(options.startDate, options.endDate).catch(console.error);
}

if (options.clean === true) {
    console.log("Cleaning text...");
    await Clean().catch(console.error);
}

if (options.chunk === true) {
    console.log("Chunking text...");
    await Chunk().catch(console.error);
}

if (options.embeddings === true) {
    console.log("Generating embeddings...");
    await Embeddings().catch(console.error);
}

if (options.save === true) {
    console.log("Saving embeddings...");
    await Save().catch(console.error);
}

async function vectorize() {
    console.time("Vectorize");
    await Extract(options.startDate, options.endDate);
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

// vectorize()
//     .catch(console.error);