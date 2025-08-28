// Function to split text into chunks
export function splitTextIntoChunks(text, maxChunkSize = 300) {
    // Clean up the text first
    text = text.replace(/\s+/g, ' ').trim();
    
    // Split into sentences first
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        
        // If adding this sentence would exceed the limit
        if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
            // If we have content in current chunk, push it
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            // If the sentence itself is too long, split it by words
            if (trimmedSentence.length > maxChunkSize) {
                const words = trimmedSentence.split(/\s+/);
                let wordChunk = '';
                
                for (const word of words) {
                    // If adding this word would exceed the limit
                    if (wordChunk.length + word.length + 1 > maxChunkSize) {
                        if (wordChunk) {
                            chunks.push(wordChunk.trim());
                            wordChunk = word;
                        } else {
                            // Single word is too long, just add it
                            chunks.push(word);
                        }
                    } else {
                        wordChunk += (wordChunk ? ' ' : '') + word;
                    }
                }
                
                if (wordChunk) {
                    currentChunk = wordChunk;
                }
            } else {
                currentChunk = trimmedSentence;
            }
        } else {
            currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
}

// Function to clean extracted text
export function cleanExtractedText(text) {
    return text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n+/g, ' ')  // Replace newlines with spaces
        .replace(/\s+([.!?])/g, '$1')  // Remove spaces before punctuation
        .trim();
}

// Function to clean text for TTS
export function cleanTextForTTS(text) {
    return text
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/([.!?])\s*$/, '$1')  // Ensure proper punctuation at end
        .trim();
}
