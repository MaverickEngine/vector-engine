function chunkText(content, max_words) {
    function wordCount(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    function chunkParagraph(paragraph, max_words) {
        let sentences = paragraph.split(/(?<=\.)\s+/);
        let chunks = [];
        let currentChunk = [];

        sentences.forEach(sentence => {
            let currentWords = wordCount(currentChunk.join(' '));
            let sentenceWords = wordCount(sentence);

            if (currentWords + sentenceWords > max_words) {
                chunks.push(currentChunk.join(' '));
                currentChunk = [sentence]; // Start a new chunk with the current sentence
            } else {
                currentChunk.push(sentence);
            }
        });
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join(' '));
        }
        return chunks;
    }

    let paragraphs = content.split(/\n+/);
    let chunks = [];
    let currentChunk = [];

    paragraphs.forEach(paragraph => {
        let currentWords = wordCount(currentChunk.join(' '));
        let paragraphWords = wordCount(paragraph);

        if (paragraphWords > max_words) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [];
            }
            // Break paragraph into sentences and process
            chunks = chunks.concat(chunkParagraph(paragraph, max_words));
        } else {
            if (currentWords + paragraphWords > max_words) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [paragraph]; // Start a new chunk with the current paragraph
            } else {
                currentChunk.push(paragraph);
            }
        }
    });

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }

    return chunks;
}

// Example usage:
const content = `First paragraph with some short text.
Second paragraph is also short.
This paragraph however, is a bit longer and might need to be split into multiple chunks depending on the provided max_words argument. This is especially true if max_words is too low. 
Here is another short paragraph for testing.`

const max_words = 20;
const result = chunkText(content, max_words);
console.log(result);