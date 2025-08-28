# PDF to Text-to-Speech Application

A real-time PDF to speech application using Deepgram's Text-to-Speech API. Upload a PDF file and listen to its content as it's being processed.

## Features

- **PDF Upload**: Upload PDF files through a web interface
- **Real-time Processing**: Text is converted to speech as the PDF is parsed
- **Streaming Audio**: Audio playback starts immediately as text is processed
- **Deepgram Integration**: Uses Deepgram's Aura TTS models for high-quality speech synthesis
- **WebSocket Communication**: Real-time communication between frontend and backend

## Prerequisites

- Node.js (v16 or higher)
- A Deepgram API key

## Setup

1. **Clone and navigate to the project:**
   ```bash
   cd TTS
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   Create a `.env` file in the root directory with your Deepgram API key:
   ```
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   PORT=3000
   ```

4. **Get your Deepgram API Key:**
   - Sign up at [Deepgram Console](https://console.deepgram.com/)
   - Create a new project
   - Generate an API key from the API Keys section

## Usage

1. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   Navigate to `http://localhost:3000`

3. **Upload a PDF:**
   - Click "Choose File" and select a PDF
   - Click "Upload PDF" 
   - The application will start processing and playing audio immediately

## How it Works

1. **PDF Upload**: User uploads a PDF file through the web interface
2. **Text Extraction**: Backend extracts text from PDF using pdf-parse library
3. **Chunking**: Text is split into manageable chunks for processing
4. **Real-time TTS**: Each chunk is sent to Deepgram TTS API
5. **Audio Streaming**: Generated audio is streamed back to the frontend
6. **Playback**: Audio plays automatically as it's received

## API Endpoints

- `GET /` - Serves the main HTML page
- `POST /upload` - Handles PDF file upload and processing
- `WebSocket /ws` - Real-time communication for audio streaming

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, JavaScript, Web Audio API
- **PDF Processing**: pdf-parse
- **TTS**: Deepgram API
- **Real-time Communication**: WebSocket
- **File Upload**: Multer

## Configuration

The application can be configured through environment variables:

- `DEEPGRAM_API_KEY`: Your Deepgram API key (required)
- `PORT`: Server port (default: 3000)
- `TTS_MODEL`: Deepgram TTS model (default: aura-asteria-en)

## Error Handling

- PDF parsing errors are handled gracefully
- Network errors with Deepgram API are reported to the user
- Audio playback errors are caught and logged

## License

MIT License
