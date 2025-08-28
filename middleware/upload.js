import multer from 'multer';
import { config } from '../config/config.js';

// Configure multer for file uploads
export const upload = multer({ 
    dest: 'uploads/',
    limits: config.uploadLimits
});

export default upload;
