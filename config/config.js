import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    deepgramApiKey: process.env.DEEPGRAM_API_KEY,
    ttsModel: process.env.TTS_MODEL || 'aura-2-iris-en',
    uploadLimits: {
        fileSize: 10 * 1024 * 1024 
    },
    ttsOptions: {
        encoding: 'linear16',
        sample_rate: 24000
    },
    textProcessing: {
        maxChunkSize: 300,
        chunkDelay: 100 
    }
};

export default config;
