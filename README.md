# Frontend - RAG System Web Interface

A Flask-based web interface for interacting with the Vectorless RAG API. Provides a user-friendly interface for uploading documents, asking questions, and viewing AI-generated answers with source citations.

## Overview

This frontend application provides:
- 📤 **Document Upload**: Upload PDF files to the RAG system
- 💬 **Question Interface**: Ask questions and get AI-powered answers
- 📚 **Document Management**: View loaded documents and their metadata
- 🔄 **System Refresh**: Reload documents from the backend
- 📊 **Status Monitoring**: Check system health and document statistics

## Features

- Clean, responsive web interface
- Real-time communication with backend API
- Document statistics and metadata display
- Flash messages for user feedback
- Health check endpoint for monitoring
- Environment-based configuration

## Project Structure

```
frontend/
├── app.py                 # Flask application
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html        # Main web interface
└── static/               # Static assets (CSS, JS, images)
```

## Installation

### Prerequisites

- Python 3.8+
- pip
- Backend API running (see backend README)

### Setup

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables** (optional):
   
   Create a `.env` file in the frontend directory:
   ```env
   BACKEND_API=http://localhost:8000
   SECRET_KEY=your-secret-key-here
   ```

## Usage

### Start the Frontend Server

```bash
python app.py
```

The web interface will be available at: `http://localhost:5000`

### Default Configuration

- **Frontend URL**: `http://localhost:5000`
- **Backend API**: `http://localhost:8000`
- **Debug Mode**: Enabled (development only)

## Routes

### 1. Home Page
```
GET /
```
Main interface displaying:
- Document upload form
- Question input interface
- Document statistics
- System status

### 2. Upload Document
```
POST /upload
```
Upload a PDF file to the backend system.

**Form Data**:
- `file`: PDF file (multipart/form-data)

**Behavior**:
- Validates file type (PDF only)
- Forwards file to backend API
- Displays success/error message
- Redirects to home page

### 3. Refresh Documents
```
POST /refresh
```
Trigger backend to reload all documents from uploads directory.

**Behavior**:
- Calls backend `/refresh` endpoint
- Updates document statistics
- Displays success/error message
- Redirects to home page

### 4. Health Check
```
GET /health
```
Check frontend and backend health status.

**Response**:
```json
{
  "frontend": "healthy",
  "backend": "healthy",
  "backend_url": "http://localhost:8000"
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_API` | Backend API URL | `http://localhost:8000` |
| `SECRET_KEY` | Flask secret key for sessions | `dev-secret-key-change-in-production` |

### Backend Integration

The frontend communicates with the backend API for:
- Document status and statistics
- File uploads
- Document refresh operations
- Question answering (via frontend interface)

## User Interface

### Main Features

1. **Document Upload Section**
   - Drag-and-drop or click to upload
   - PDF file validation
   - Upload progress feedback

2. **Question Interface**
   - Text input for questions
   - Submit button
   - Answer display with sources

3. **Document Statistics**
   - Total documents loaded
   - Total chunks processed
   - Last update timestamp
   - Individual document details

4. **System Status**
   - Ready/Not Ready indicator
   - Backend connection status
   - Error messages if applicable

### Flash Messages

The application uses Flask's flash messaging for user feedback:
- ✅ **Success**: Green messages for successful operations
- ❌ **Error**: Red messages for failures or validation errors
- ℹ️ **Info**: Blue messages for informational updates

## Dependencies

- **flask**: Web framework (v3.1.0)
- **werkzeug**: WSGI utilities (v3.1.3)
- **requests**: HTTP client for backend communication (v2.31.0)
- **python-dotenv**: Environment variable management (v1.2.2)

## Development

### Running in Development Mode

```bash
python app.py
```

Development mode features:
- Auto-reload on code changes
- Debug toolbar
- Detailed error pages

### Running in Production

For production deployment, use a production WSGI server:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

**Production Checklist**:
- [ ] Set `SECRET_KEY` environment variable
- [ ] Disable debug mode
- [ ] Use production WSGI server (gunicorn, uwsgi)
- [ ] Configure proper logging
- [ ] Set up reverse proxy (nginx, Apache)
- [ ] Enable HTTPS
- [ ] Configure CORS properly

## Troubleshooting

### Cannot connect to backend API

**Symptoms**: Error messages about backend connection

**Solutions**:
1. Verify backend is running: `curl http://localhost:8000/`
2. Check `BACKEND_API` environment variable
3. Ensure no firewall blocking port 8000
4. Review backend logs for errors

### File upload fails

**Symptoms**: Upload error messages

**Solutions**:
1. Verify file is a valid PDF
2. Check file size limits
3. Ensure backend `/upload` endpoint is working
4. Check backend disk space

### Flash messages not displaying

**Symptoms**: No feedback after actions

**Solutions**:
1. Verify `SECRET_KEY` is set
2. Check browser console for JavaScript errors
3. Ensure templates include flash message display
4. Clear browser cache

### Page not loading document info

**Symptoms**: Empty document statistics

**Solutions**:
1. Check backend `/status` endpoint
2. Verify documents are in backend `uploads/` directory
3. Call `/refresh` to reload documents
4. Review backend initialization logs

## API Integration

### Backend Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/status` | GET | Fetch document statistics |
| `/upload` | POST | Upload PDF files |
| `/refresh` | POST | Reload documents |
| `/` | GET | Backend health check |

### Request Timeout

Default timeouts:
- Status check: 5 seconds
- Upload: 30 seconds
- Refresh: 10 seconds
- Health check: 2 seconds

## Security Considerations

1. **Secret Key**: Change `SECRET_KEY` in production
2. **File Validation**: Only PDF files accepted
3. **CORS**: Backend configured for localhost:5000
4. **Input Sanitization**: werkzeug's `secure_filename` used
5. **Error Handling**: Sensitive errors not exposed to users

## Monitoring

### Health Check Endpoint

Use `/health` for monitoring:

```bash
curl http://localhost:5000/health
```

**Response Codes**:
- 200: Frontend healthy
- Check `backend` field for backend status

### Logging

Flask logs include:
- Request/response information
- Error tracebacks (debug mode)
- Backend communication errors

## Deployment

### Docker Deployment

Example Dockerfile:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV BACKEND_API=http://backend:8000
ENV SECRET_KEY=production-secret-key

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Environment Variables for Production

```env
BACKEND_API=https://api.yourdomain.com
SECRET_KEY=your-secure-random-secret-key
FLASK_ENV=production
```

## License

This project is part of a RAG system implementation.

## Support

For issues or questions:
1. Check backend is running and accessible
2. Review browser console for errors
3. Check Flask application logs
4. Verify environment variables are set correctly
