import express from 'express';
import multer from 'multer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createClient } from '@deepgram/sdk';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Deepgram
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Store active WebSocket connections
const clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Broadcast to all connected clients
function broadcast(message) {
    clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Function to split text into chunks
function splitTextIntoChunks(text, maxChunkSize = 300) {
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

// Function to convert text to speech using Deepgram
async function convertTextToSpeech(text, chunkIndex) {
    try {
        // Clean and prepare text for better speech synthesis
        const cleanText = text
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/([.!?])\s*$/, '$1')  // Ensure proper punctuation at end
            .trim();

        const options = {
            model: process.env.TTS_MODEL || 'aura-luna-en',
            encoding: 'linear16',
            sample_rate: 24000
        };

        console.log(`Converting chunk ${chunkIndex}: "${cleanText.substring(0, 100)}${cleanText.length > 100 ? '...' : ''}"`);

        const response = await deepgram.speak.request(
            { text: cleanText },
            options
        );

        const stream = await response.getStream();
        if (stream) {
            const buffer = await getAudioBuffer(stream);
            return buffer;
        }
        
        throw new Error('No audio stream received');
    } catch (error) {
        console.error(`Error converting chunk ${chunkIndex} to speech:`, error);
        throw error;
    }
}

// Helper function to convert stream to buffer
async function getAudioBuffer(stream) {
    const chunks = [];
    const reader = stream.getReader();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return Buffer.from(result);
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    if (!process.env.DEEPGRAM_API_KEY) {
        return res.status(500).json({ error: 'Deepgram API key not configured' });
    }

    try {
        // Read PDF file
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = new Uint8Array(pdfBuffer);
        
        // Parse PDF using pdfjs
        const pdfDoc = await pdfjs.getDocument({data: pdfData}).promise;
        let extractedText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items into readable text
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            
            extractedText += pageText + ' ';
        }
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        if (!extractedText || extractedText.trim().length === 0) {
            return res.status(400).json({ error: 'No text found in PDF' });
        }

        // Clean up the extracted text
        extractedText = extractedText
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/\n+/g, ' ')  // Replace newlines with spaces
            .replace(/\s+([.!?])/g, '$1')  // Remove spaces before punctuation
            .trim();

        console.log(`Extracted text length: ${extractedText.length} characters`);
        console.log(`Sample text: "${extractedText.substring(0, 200)}..."`);

        // Split text into chunks
        const textChunks = splitTextIntoChunks(extractedText);
        
        // Log the first few chunks to verify they look correct
        console.log('Sample chunks:');
        textChunks.slice(0, 3).forEach((chunk, index) => {
            console.log(`Chunk ${index}: "${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}"`);
        });
        
        broadcast({
            type: 'processing_started',
            totalChunks: textChunks.length,
            totalCharacters: extractedText.length
        });

        res.json({
            message: 'PDF processing started',
            totalChunks: textChunks.length,
            totalCharacters: extractedText.length
        });

        // Process chunks sequentially and send audio
        for (let i = 0; i < textChunks.length; i++) {
            try {
                broadcast({
                    type: 'chunk_processing',
                    chunkIndex: i,
                    chunkText: textChunks[i],
                    progress: ((i + 1) / textChunks.length) * 100
                });

                const audioBuffer = await convertTextToSpeech(textChunks[i], i);
                
                // Convert buffer to base64 for transmission
                const audioBase64 = audioBuffer.toString('base64');
                
                broadcast({
                    type: 'audio_chunk',
                    chunkIndex: i,
                    audioData: audioBase64,
                    progress: ((i + 1) / textChunks.length) * 100
                });

                // Small delay between chunks to prevent overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`Error processing chunk ${i}:`, error);
                broadcast({
                    type: 'chunk_error',
                    chunkIndex: i,
                    error: error.message
                });
            }
        }

        broadcast({
            type: 'processing_complete'
        });

    } catch (error) {
        console.error('Error processing PDF:', error);
        
        // Clean up uploaded file in case of error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            error: 'Error processing PDF: ' + error.message 
        });

        broadcast({
            type: 'processing_error',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        deepgramConfigured: !!process.env.DEEPGRAM_API_KEY 
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    
    if (!process.env.DEEPGRAM_API_KEY) {
        console.warn('⚠️  WARNING: DEEPGRAM_API_KEY not set in environment variables');
        console.log('Please create a .env file with your Deepgram API key');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
