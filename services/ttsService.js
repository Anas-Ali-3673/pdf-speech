import { createClient } from '@deepgram/sdk';
import { config } from '../config/config.js';
import { cleanTextForTTS } from '../utils/textUtils.js';

export class TTSService {
    constructor() {
        this.deepgram = createClient(config.deepgramApiKey);
    }

    // Helper function to convert stream to buffer
    static async getAudioBuffer(stream) {
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

    // Convert text to speech using Deepgram
    async convertTextToSpeech(text, chunkIndex) {
        try {
            const cleanText = cleanTextForTTS(text);
            const options = {
                model: config.ttsModel,
                ...config.ttsOptions
            };

            console.log(`Converting chunk ${chunkIndex}: "${cleanText.substring(0, 100)}${cleanText.length > 100 ? '...' : ''}"`);

            const response = await this.deepgram.speak.request(
                { text: cleanText },
                options
            );

            const stream = await response.getStream();
            if (stream) {
                const buffer = await TTSService.getAudioBuffer(stream);
                return buffer;
            }
            
            throw new Error('No audio stream received');
        } catch (error) {
            console.error(`Error converting chunk ${chunkIndex} to speech:`, error);
            throw error;
        }
    }
}

export default TTSService;
