import { upload } from '../middleware/upload.js';
import { PDFService } from '../services/pdfService.js';
import { TTSService } from '../services/ttsService.js';
import { splitTextIntoChunks } from '../utils/textUtils.js';
import { config } from '../config/config.js';

export const uploadRoutes = (app, websocketService) => {
    const ttsService = new TTSService();

    app.post('/upload', upload.single('pdf'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        if (!config.deepgramApiKey) {
            return res.status(500).json({ error: 'Deepgram API key not configured' });
        }

        try {
            // Extract text from PDF
            const extractedText = await PDFService.processPDFFile(req.file.path);

            // Split text into chunks
            const textChunks = splitTextIntoChunks(extractedText, config.textProcessing.maxChunkSize);
            
            // Log the first few chunks to verify they look correct
            console.log('Sample chunks:');
            textChunks.slice(0, 3).forEach((chunk, index) => {
                console.log(`Chunk ${index}: "${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}"`);
            });
            
            websocketService.broadcastProcessingStarted(textChunks.length, extractedText.length);

            res.json({
                message: 'PDF processing started',
                totalChunks: textChunks.length,
                totalCharacters: extractedText.length
            });

            // Process chunks sequentially and send audio
            await processTextChunks(textChunks, ttsService, websocketService);

        } catch (error) {
            console.error('Error processing PDF:', error);
            
            res.status(500).json({ 
                error: 'Error processing PDF: ' + error.message 
            });

            websocketService.broadcastProcessingError(error.message);
        }
    });
};

// Helper function to process text chunks
async function processTextChunks(textChunks, ttsService, websocketService) {
    for (let i = 0; i < textChunks.length; i++) {
        try {
            websocketService.broadcastChunkProcessing(
                i, 
                textChunks[i], 
                ((i + 1) / textChunks.length) * 100
            );

            const audioBuffer = await ttsService.convertTextToSpeech(textChunks[i], i);
            
            // Convert buffer to base64 for transmission
            const audioBase64 = audioBuffer.toString('base64');
            
            websocketService.broadcastAudioChunk(
                i, 
                audioBase64, 
                ((i + 1) / textChunks.length) * 100
            );

            // Small delay between chunks to prevent overwhelming the API
            await new Promise(resolve => setTimeout(resolve, config.textProcessing.chunkDelay));

        } catch (error) {
            console.error(`Error processing chunk ${i}:`, error);
            websocketService.broadcastChunkError(i, error.message);
        }
    }

    websocketService.broadcastProcessingComplete();
}

export default uploadRoutes;
