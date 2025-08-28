import { WebSocketServer } from 'ws';

export class WebSocketService {
    constructor(server) {
        this.wss = new WebSocketServer({ server });
        this.clients = new Set();
        this.initialize();
    }

    // Initialize WebSocket server
    initialize() {
        this.wss.on('connection', (ws) => {
            console.log('Client connected');
            this.clients.add(ws);

            ws.on('close', () => {
                console.log('Client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
    }

    // Broadcast message to all connected clients
    broadcast(message) {
        this.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    // Send processing started message
    broadcastProcessingStarted(totalChunks, totalCharacters) {
        this.broadcast({
            type: 'processing_started',
            totalChunks,
            totalCharacters
        });
    }

    // Send chunk processing message
    broadcastChunkProcessing(chunkIndex, chunkText, progress) {
        this.broadcast({
            type: 'chunk_processing',
            chunkIndex,
            chunkText,
            progress
        });
    }

    // Send audio chunk message
    broadcastAudioChunk(chunkIndex, audioData, progress) {
        this.broadcast({
            type: 'audio_chunk',
            chunkIndex,
            audioData,
            progress
        });
    }

    // Send chunk error message
    broadcastChunkError(chunkIndex, error) {
        this.broadcast({
            type: 'chunk_error',
            chunkIndex,
            error
        });
    }

    // Send processing complete message
    broadcastProcessingComplete() {
        this.broadcast({
            type: 'processing_complete'
        });
    }

    // Send processing error message
    broadcastProcessingError(error) {
        this.broadcast({
            type: 'processing_error',
            error
        });
    }
}

export default WebSocketService;
