# Project Structure Documentation


##  Project Structure

```
TTS/
├── config/
│   └── config.js                 # Configuration and environment variables
├── middleware/
│   └── upload.js                 # Multer file upload configuration
├── services/
│   ├── pdfService.js            # PDF text extraction logic
│   ├── ttsService.js            # Text-to-speech conversion using Deepgram
│   └── websocketService.js      # WebSocket connection management
├── utils/
│   └── textUtils.js             # Text processing utilities
├── routes/
│   ├── uploadRoutes.js          # PDF upload and processing routes
│   └── healthRoutes.js          # Health check endpoints
├── public/
│   └── index.html               # Frontend application
├── uploads/                     # Temporary file storage
├── server.js                    # Main server entry point (refactored)
├── package.json
└── README.md
```

## Module Descriptions

### `config/config.js`
- Centralizes all configuration settings
- Environment variable management
- Default values for various settings
- Exports a single config object

### `middleware/upload.js`
- Multer configuration for file uploads
- File size limits and storage settings
- Reusable upload middleware

### `services/pdfService.js`
- PDF text extraction using pdfjs-dist
- File cleanup after processing
- Text cleaning and validation
- Error handling for PDF operations

### `services/ttsService.js`
- Deepgram API integration
- Text-to-speech conversion
- Audio stream processing
- Buffer management utilities

### `services/websocketService.js`
- WebSocket server initialization
- Client connection management
- Broadcasting methods for different message types
- Connection cleanup

### `utils/textUtils.js`
- Text chunking algorithms
- Text cleaning utilities
- TTS-specific text preparation
- Reusable text processing functions

### `routes/uploadRoutes.js`
- PDF upload endpoint
- Text processing orchestration
- Progress tracking and broadcasting
- Error handling and cleanup

### `routes/healthRoutes.js`
- Health check endpoints
- Configuration validation
- Simple status reporting

### `server.js` (refactored)
- Application initialization
- Middleware setup
- Service initialization
- Route registration
- Server startup and shutdown

## Benefits of the Refactored Structure

1. **Separation of Concerns**: Each module has a specific responsibility
2. **Maintainability**: Easier to locate and modify specific functionality
3. **Testability**: Individual modules can be tested in isolation
4. **Reusability**: Services and utilities can be reused across different parts of the application
5. **Scalability**: Easy to add new features without cluttering the main server file
6. **Debugging**: Easier to trace issues to specific modules
7. **Code Organization**: Related functionality is grouped together

## Migration Notes

- All functionality remains exactly the same from a user perspective
- No changes required to the frontend or API endpoints
- Environment variables and configuration remain unchanged
- The application maintains the same performance characteristics
- Error handling and logging are preserved

## Future Enhancements

With this modular structure, future enhancements can be easily added:
- Additional TTS providers
- Different PDF parsing engines
- Rate limiting middleware
- Authentication services
- Database integration
- API versioning
- Unit tests for individual modules
