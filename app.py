from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import requests
import os
from utils.logger import get_logger

logger = get_logger(__name__)

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Backend API URL
BACKEND_API = os.getenv('BACKEND_API', 'http://localhost:8000')


@app.route("/")
def index():
    """Main page - fetch document info from backend and render."""
    try:
        logger.debug(f"Fetching status from backend: {BACKEND_API}/v1/documents")
        response = requests.get(f"{BACKEND_API}/v1/documents", timeout=5)
        status_data = response.json()
        logger.info(f"Backend status retrieved successfully")
        
        is_ready = status_data.get("ready", False)
        doc_info = {
            "total_documents": status_data.get("total_documents", 0),
            "total_chunks": status_data.get("total_chunks", 0),
            "last_updated": status_data.get("last_updated"),
            "documents": status_data.get("documents", {})
        }
        
        return render_template('index.html', doc_info=doc_info, is_ready=is_ready, backend_api=BACKEND_API)
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Cannot connect to backend API: {str(e)}")
        flash(f'Cannot connect to backend API: {str(e)}', 'error')
        return render_template('index.html', doc_info={}, is_ready=False, backend_api=BACKEND_API)


@app.route("/upload", methods=['POST'])
def upload_redirect():
    """Handle file upload - redirect to backend or show error."""
    if 'file' not in request.files:
        logger.warning("Upload attempt with no file selected")
        flash('No file selected', 'error')
        return redirect(url_for('index'))
    
    file = request.files['file']
    
    if file.filename == '':
        logger.warning("Upload attempt with empty filename")
        flash('No file selected', 'error')
        return redirect(url_for('index'))
    
    if not file.filename.endswith('.pdf'):
        logger.warning(f"Upload attempt with non-PDF file: {file.filename}")
        flash('Only PDF files are supported', 'error')
        return redirect(url_for('index'))
    
    try:
        logger.info(f"Uploading file: {file.filename}")
        # Forward file to backend
        files = {'file': (file.filename, file.stream, file.content_type)}
        response = requests.post(f"{BACKEND_API}/v1/documents", files=files, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"File uploaded successfully: {file.filename}")
            flash(f'{data["message"]} Total: {data["total_documents"]} documents, {data["total_chunks"]} chunks', 'success')
        else:
            error_data = response.json()
            logger.error(f"Upload failed for {file.filename}: {error_data.get('detail', 'Unknown error')}")
            flash(f'Upload failed: {error_data.get("detail", "Unknown error")}', 'error')
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to backend during upload: {str(e)}")
        flash(f'Error connecting to backend: {str(e)}', 'error')
    
    return redirect(url_for('index'))


@app.route("/refresh", methods=['POST'])
def refresh_redirect():
    """Trigger document refresh on backend."""
    try:
        logger.info("Triggering document refresh")
        response = requests.post(f"{BACKEND_API}/v1/documents/refresh", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            logger.info("Document refresh completed successfully")
            flash(f'{data["message"]} Total: {data["total_documents"]} documents, {data["total_chunks"]} chunks', 'success')
        else:
            error_data = response.json()
            logger.error(f"Refresh failed: {error_data.get('detail', 'Unknown error')}")
            flash(f'Refresh failed: {error_data.get("detail", "Unknown error")}', 'error')
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to backend during refresh: {str(e)}")
        flash(f'Error connecting to backend: {str(e)}', 'error')
    
    return redirect(url_for('index'))


@app.route("/health")
def health():
    """Health check endpoint."""
    try:
        logger.debug("Performing health check")
        response = requests.get(f"{BACKEND_API}/health", timeout=2)
        backend_status = "healthy" if response.status_code == 200 else "unhealthy"
        logger.info(f"Backend health check: {backend_status}")
    except Exception as e:
        logger.warning(f"Backend unreachable during health check: {str(e)}")
        backend_status = "unreachable"
    
    return jsonify({
        "frontend": "healthy",
        "backend": backend_status,
        "backend_url": BACKEND_API
    })


if __name__ == '__main__':
    logger.info(f"Frontend starting on http://localhost:5000")
    logger.info(f"Backend API: {BACKEND_API}")
    app.run(debug=True, host='0.0.0.0', port=5000)
