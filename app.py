from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import requests
import os

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Backend API URL
BACKEND_API = os.getenv('BACKEND_API', 'http://localhost:8000')


@app.route("/")
def index():
    """Main page - fetch document info from backend and render."""
    try:
        response = requests.get(f"{BACKEND_API}/status", timeout=5)
        status_data = response.json()
        
        is_ready = status_data.get("ready", False)
        doc_info = {
            "total_documents": status_data.get("total_documents", 0),
            "total_chunks": status_data.get("total_chunks", 0),
            "last_updated": status_data.get("last_updated"),
            "documents": status_data.get("documents", {})
        }
        
        return render_template('index.html', doc_info=doc_info, is_ready=is_ready, backend_api=BACKEND_API)
    
    except requests.exceptions.RequestException as e:
        flash(f'Cannot connect to backend API: {str(e)}', 'error')
        return render_template('index.html', doc_info={}, is_ready=False, backend_api=BACKEND_API)


@app.route("/upload", methods=['POST'])
def upload_redirect():
    """Handle file upload - redirect to backend or show error."""
    if 'file' not in request.files:
        flash('No file selected', 'error')
        return redirect(url_for('index'))
    
    file = request.files['file']
    
    if file.filename == '':
        flash('No file selected', 'error')
        return redirect(url_for('index'))
    
    if not file.filename.endswith('.pdf'):
        flash('Only PDF files are supported', 'error')
        return redirect(url_for('index'))
    
    try:
        # Forward file to backend
        files = {'file': (file.filename, file.stream, file.content_type)}
        response = requests.post(f"{BACKEND_API}/upload", files=files, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            flash(f'{data["message"]} Total: {data["total_documents"]} documents, {data["total_chunks"]} chunks', 'success')
        else:
            error_data = response.json()
            flash(f'Upload failed: {error_data.get("detail", "Unknown error")}', 'error')
    
    except requests.exceptions.RequestException as e:
        flash(f'Error connecting to backend: {str(e)}', 'error')
    
    return redirect(url_for('index'))


@app.route("/refresh", methods=['POST'])
def refresh_redirect():
    """Trigger document refresh on backend."""
    try:
        response = requests.post(f"{BACKEND_API}/refresh", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            flash(f'{data["message"]} Total: {data["total_documents"]} documents, {data["total_chunks"]} chunks', 'success')
        else:
            error_data = response.json()
            flash(f'Refresh failed: {error_data.get("detail", "Unknown error")}', 'error')
    
    except requests.exceptions.RequestException as e:
        flash(f'Error connecting to backend: {str(e)}', 'error')
    
    return redirect(url_for('index'))


@app.route("/health")
def health():
    """Health check endpoint."""
    try:
        response = requests.get(f"{BACKEND_API}/", timeout=2)
        backend_status = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        backend_status = "unreachable"
    
    return jsonify({
        "frontend": "healthy",
        "backend": backend_status,
        "backend_url": BACKEND_API
    })


if __name__ == '__main__':
    print(f"🎨 Frontend starting on http://localhost:5000")
    print(f"🔗 Backend API: {BACKEND_API}")
    app.run(debug=True, host='0.0.0.0', port=5000)
