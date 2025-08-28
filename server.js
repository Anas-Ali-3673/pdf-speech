import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Import services and configurations
import { config } from './config/config.js';
import { WebSocketService } from './services/websocketService.js';
import { uploadRoutes } from './routes/uploadRoutes.js';
import { healthRoutes } from './routes/healthRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Initialize services
const websocketService = new WebSocketService(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize routes
uploadRoutes(app, websocketService);
healthRoutes(app);

// Start server
server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Open http://localhost:${config.port} in your browser`);
    
    if (!config.deepgramApiKey) {
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
