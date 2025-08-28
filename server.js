import express from 'express';
import multer from 'multer';
import PDFParser from 'pdf2json';
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
function splitTextIntoChunks(text, maxChunkSize = 500) {
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= maxChunkSize) {
            currentChunk += sentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
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
        const options = {
            model: process.env.TTS_MODEL || 'aura-asteria-en',
            encoding: 'mp3'
        };

        const response = await deepgram.speak.request(
            { text },
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
        // Read and parse PDF using pdf2json
        const pdfParser = new PDFParser();
        
        // Promise wrapper for pdf2json
        const parsePDF = () => {
            return new Promise((resolve, reject) => {
                pdfParser.on('pdfParser_dataError', reject);
                pdfParser.on('pdfParser_dataReady', (pdfData) => {
                    // Extract text from parsed PDF data
                    let extractedText = '';
                    if (pdfData.Pages) {
                        pdfData.Pages.forEach(page => {
                            if (page.Texts) {
                                page.Texts.forEach(textItem => {
                                    textItem.R.forEach(textRun => {
                                        extractedText += decodeURIComponent(textRun.T) + ' ';
                                    });
                                });
                            }
                        });
                    }
                    resolve(extractedText.trim());
                });
                
                // Load PDF file
                pdfParser.loadPDF(req.file.path);
            });
        };

        const extractedText = await parsePDF();
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        if (!extractedText) {
            return res.status(400).json({ error: 'No text found in PDF' });
        }

        // Split text into chunks
        const textChunks = splitTextIntoChunks(extractedText);
        
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
