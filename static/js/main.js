// Backend API URL (passed from Flask template)
let BACKEND_API = "http://localhost:8000"; // Default, will be overridden by template

// Document metadata (will be populated by template)
let docMeta = {};

// Initialize the application
function initApp(backendUrl, documentMetadata) {
    BACKEND_API = backendUrl;
    docMeta = documentMetadata;
    setupEventListeners();
    updateFilterSummary();
}

// Setup event listeners
function setupEventListeners() {
    // File input label update
    const fileInput = document.getElementById('file');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            document.getElementById('fileLabel').textContent =
                this.files[0]?.name || 'Click to select a PDF document';
        });
    }

    // Upload form submission
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // Question input and ask button
    const questionInput = document.getElementById('question');
    const askBtn = document.getElementById('askBtn');

    if (askBtn) {
        askBtn.addEventListener('click', askQuestion);
    }

    if (questionInput) {
        questionInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') askQuestion();
        });
    }
}

// Filter logic - Get metadata filter values
function getMetadataFilters() {
    return {
        category: document.getElementById('categoryFilter')?.value || null,
        department: document.getElementById('departmentFilter')?.value || null,
        doc_type: document.getElementById('docTypeFilter')?.value || null,
        region: document.getElementById('regionFilter')?.value || null
    };
}

// Handle file upload with metadata
async function handleUpload(event) {
    event.preventDefault();

    const fileInput = document.getElementById('file');
    const categorySelect = document.getElementById('category');
    const departmentSelect = document.getElementById('department');
    const docTypeSelect = document.getElementById('document_type');
    const regionSelect = document.getElementById('region');
    const versionInput = document.getElementById('version');
    const effectiveDateInput = document.getElementById('effective_date');
    const descriptionTextarea = document.getElementById('description');
    const uploadBtn = document.getElementById('uploadBtn');

    // Validate required fields
    if (!fileInput.files[0]) {
        alert('Please select a PDF file.');
        return;
    }

    if (!categorySelect.value || !departmentSelect.value || !docTypeSelect.value || 
        !regionSelect.value || !versionInput.value || !effectiveDateInput.value) {
        alert('Please fill in all required metadata fields.');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('category', categorySelect.value);
    formData.append('department', departmentSelect.value);
    formData.append('document_type', docTypeSelect.value);
    formData.append('region', regionSelect.value);
    formData.append('version', versionInput.value);
    formData.append('effective_date', effectiveDateInput.value);
    formData.append('description', descriptionTextarea.value);

    uploadBtn.disabled = true;
    const originalText = uploadBtn.textContent;
    uploadBtn.textContent = 'Uploading...';

    try {
        const res = await fetch(`${BACKEND_API}/v1/documents`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Upload failed');
        }

        // Show success message
        alert(`Success! ${data.message}`);

        // Reset form
        document.getElementById('uploadForm').reset();
        document.getElementById('fileLabel').textContent = 'Click to select a PDF document';

        // Redirect to home to refresh document list
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);

    } catch (err) {
        alert('Upload error: ' + err.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
    }
}

// Ask question - Main Q&A function
async function askQuestion() {
    const questionInput = document.getElementById('question');
    const askBtn = document.getElementById('askBtn');
    const loading = document.getElementById('loading');
    const answerSection = document.getElementById('answerSection');
    const answerDiv = document.getElementById('answer');
    const sourcesDiv = document.getElementById('sources');

    const question = questionInput.value.trim();
    if (!question) {
        alert('Please enter a question.');
        return;
    }

    // Get metadata filters
    const filters = getMetadataFilters();

    // Get query parameters from UI
    const topK = parseInt(document.getElementById('topK')?.value || '15');
    const rerankTopN = parseInt(document.getElementById('rerankTopN')?.value || '5');

    loading.style.display = 'block';
    answerSection.style.display = 'none';
    askBtn.disabled = true;

    try {
        // Build query body with metadata filters
        const queryBody = {
            question,
            top_k: topK,
            rerank_top_n: rerankTopN
        };

        // Add optional metadata filters (only if selected)
        if (filters.category) queryBody.filter_category = filters.category;
        if (filters.department) queryBody.filter_department = filters.department;
        if (filters.doc_type) queryBody.filter_doc_type = filters.doc_type;
        if (filters.region) queryBody.filter_region = filters.region;

        // Call FastAPI backend directly
        const res = await fetch(`${BACKEND_API}/v1/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryBody)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Something went wrong');

        // Display answer (render markdown)
        answerDiv.innerHTML = marked.parse(data.answer);

        // Display source chunks
        sourcesDiv.innerHTML = '';
        data.source_chunks.forEach(chunk => {
            const docMetadata = chunk.document_metadata || {};
            const metadata = chunk.metadata || {};

            // Resolve filename
            let filename = chunk.source_file;
            if (!filename || filename === 'Unknown') {
                filename = (chunk.file_path || '').split(/[\\\/]/).pop() || 'Unknown';
            }

            const div = document.createElement('div');
            div.className = 'source-chunk';
            div.innerHTML = `
                <div class="source-meta">
                    <span class="badge badge-file">📄 ${escapeHtml(filename)}</span>
                    <span class="badge badge-page">Page ${chunk.page}</span>
                    <span class="badge badge-score">Score ${chunk.score.toFixed(3)}</span>
                    ${docMetadata.author ? `<span class="badge badge-author">👤 ${escapeHtml(docMetadata.author)}</span>` : ''}
                    ${docMetadata.category ? `<span class="badge badge-category">🏷 ${escapeHtml(docMetadata.category)}</span>` : ''}
                    ${metadata.word_count ? `<span class="badge" style="background:#f5f5f5;color:#555">${metadata.word_count} words</span>` : ''}
                </div>
                <div class="source-text">${escapeHtml(chunk.text)}</div>
            `;
            sourcesDiv.appendChild(div);
        });

        answerSection.style.display = 'block';

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        loading.style.display = 'none';
        askBtn.disabled = false;
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
