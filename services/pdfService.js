import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import { cleanExtractedText } from '../utils/textUtils.js';

export class PDFService {
    // Extract text from PDF buffer
    static async extractTextFromPDF(pdfBuffer) {
        try {
            const pdfData = new Uint8Array(pdfBuffer);
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
            
            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No text found in PDF');
            }

            // Clean up the extracted text
            const cleanText = cleanExtractedText(extractedText);
            
            console.log(`Extracted text length: ${cleanText.length} characters`);
            console.log(`Sample text: "${cleanText.substring(0, 200)}..."`);
            
            return cleanText;
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw error;
        }
    }

    // Process uploaded PDF file
    static async processPDFFile(filePath) {
        try {
            const pdfBuffer = fs.readFileSync(filePath);
            const extractedText = await this.extractTextFromPDF(pdfBuffer);
            
            // Clean up uploaded file
            fs.unlinkSync(filePath);
            
            return extractedText;
        } catch (error) {
            // Clean up uploaded file in case of error
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            throw error;
        }
    }
}

export default PDFService;
