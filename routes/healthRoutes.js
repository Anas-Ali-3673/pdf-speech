import { config } from '../config/config.js';

export const healthRoutes = (app) => {
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'OK', 
            deepgramConfigured: !!config.deepgramApiKey 
        });
    });
};

export default healthRoutes;
