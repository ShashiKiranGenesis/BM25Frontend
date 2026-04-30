// Backend API URL (passed from Flask template)
let BACKEND_API = "http://localhost:8000"; // Default, will be overridden by template

// Document metadata (will be populated by template)
let docMeta = {};

// Initialize the application
function initApp(backendUrl, documentMetadata) {
    BACKEND_API = backendUrl;
    docMeta = documentMetadata;
    setupEventListeners();
    
    // Auto-scroll chat history to bottom on load
    const chatHistory = document.getElementById('chatHistory');
    if (chatHistory) chatHistory.scrollTop = chatHistory.scrollHeight;
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

// Modal Logic for Upload
function openUploadModal() {
    document.getElementById('uploadModal').style.display = 'flex';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('uploadForm').reset();
    document.getElementById('fileLabel').textContent = 'Click to select a PDF document';
}

// Helper to get multiple selected values from checkboxes
function getCheckboxValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    const values = Array.from(checkboxes).map(cb => cb.value).filter(val => val !== "");
    return values.length > 0 ? values : null;
}

// Filter logic - Get metadata filter values
function getMetadataFilters() {
    return {
        category: getCheckboxValues('categoryFilter'),
        department: getCheckboxValues('departmentFilter'),
        doc_type: getCheckboxValues('docTypeFilter'),
        region: getCheckboxValues('regionFilter')
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

    if (fileInput.files[0].size > 20 * 1024 * 1024) {
        alert('File size exceeds the 20MB limit.');
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

        // Show success message and redirect
        alert(`Success! ${data.message}`);
        window.location.href = '/';

    } catch (err) {
        alert('Upload error: ' + err.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
    }
}

function appendUserMessage(text) {
    const chatHistory = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = 'chat-message user';
    div.innerHTML = `
        <div class="avatar">U</div>
        <div class="message-content">
            <p>${escapeHtml(text)}</p>
        </div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendBotTyping() {
    const chatHistory = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = 'chat-message system typing-msg';
    div.id = 'typingIndicator';
    div.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function removeBotTyping() {
    const typingMsg = document.getElementById('typingIndicator');
    if (typingMsg) typingMsg.remove();
}

function typeBotMessage(markdownText, sourcesHtml = '') {
    const chatHistory = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = 'chat-message system';
    div.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="message-content">
            <div class="answer-text"></div>
            <div class="sources-wrapper" style="display: none;">
                ${sourcesHtml ? `
                    <div class="sources-container">
                        <h4>Sources</h4>
                        ${sourcesHtml}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    const answerTextDiv = div.querySelector('.answer-text');
    const sourcesWrapper = div.querySelector('.sources-wrapper');
    
    let charIndex = 0;
    // Type out the message 2 characters at a time
    const typingInterval = setInterval(() => {
        if (charIndex < markdownText.length) {
            charIndex += 2;
            if (charIndex > markdownText.length) charIndex = markdownText.length;
            
            // Parse the partial markdown
            answerTextDiv.innerHTML = marked.parse(markdownText.substring(0, charIndex));
            chatHistory.scrollTop = chatHistory.scrollHeight;
        } else {
            clearInterval(typingInterval);
            if (sourcesHtml) {
                sourcesWrapper.style.display = 'block';
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
        }
    }, 15);
}

function appendBotMessage(answerHtml, sourcesHtml = '') {
    const chatHistory = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = 'chat-message system';
    div.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="message-content">
            ${answerHtml}
            ${sourcesHtml ? `
                <div class="sources-container">
                    <h4>Sources</h4>
                    ${sourcesHtml}
                </div>
            ` : ''}
        </div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Ask question - Main Q&A function
async function askQuestion() {
    const questionInput = document.getElementById('question');
    const askBtn = document.getElementById('askBtn');

    const question = questionInput.value.trim();
    if (!question) return;

    // Get metadata filters
    const filters = getMetadataFilters();

    // Get query parameters from UI
    const topK = parseInt(document.getElementById('topK')?.value || '15');
    const rerankTopN = parseInt(document.getElementById('rerankTopN')?.value || '5');

    // UI Updates
    appendUserMessage(question);
    questionInput.value = '';
    askBtn.disabled = true;
    questionInput.disabled = true;
    
    appendBotTyping();

    try {
        // Build query body with metadata filters
        const queryBody = {
            question,
            top_k: topK,
            rerank_top_n: rerankTopN
        };

        // Add optional metadata filters (only if selected)
        if (filters.category) queryBody.category = filters.category;
        if (filters.department) queryBody.department = filters.department;
        if (filters.doc_type) queryBody.doc_type = filters.doc_type;
        if (filters.region) queryBody.region = filters.region;

        // Call FastAPI backend directly
        const res = await fetch(`${BACKEND_API}/v1/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryBody)
        });

        const data = await res.json();
        removeBotTyping();

        if (!res.ok) throw new Error(data.detail || 'Something went wrong');

        // Render Sources
        let sourcesHtml = '';
        if (data.source_chunks && data.source_chunks.length > 0) {
            data.source_chunks.forEach(chunk => {
                const docMetadata = chunk.document_metadata || {};
                
                let filename = chunk.source_file;
                if (!filename || filename === 'Unknown') {
                    filename = (chunk.file_path || '').split(/[\\\/]/).pop() || 'Unknown';
                }

                sourcesHtml += `
                    <details class="source-chunk">
                        <summary class="source-meta">
                            <span class="badge badge-file">${escapeHtml(filename)}</span>
                            <span class="badge badge-page">Page ${chunk.page}</span>
                            <span class="badge badge-score">Score ${(chunk.score || 0).toFixed(3)}</span>
                            <span class="expand-hint">Click to expand</span>
                        </summary>
                        <div class="source-content">${escapeHtml(chunk.text)}</div>
                    </details>
                `;
            });
        }

        // Use the typing effect
        typeBotMessage(data.answer, sourcesHtml);

    } catch (err) {
        removeBotTyping();
        appendBotMessage(`<p style="color: red;">Error: ${err.message}</p>`);
    } finally {
        askBtn.disabled = false;
        questionInput.disabled = false;
        questionInput.focus();
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Delete document function
async function deleteDocument(docId, filename) {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
        return;
    }

    try {
        const res = await fetch(`${BACKEND_API}/v1/documents/${docId}`, {
            method: 'DELETE'
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.detail || 'Failed to delete document');
        }
        
        window.location.reload();
    } catch (err) {
        alert('Delete error: ' + err.message);
    }
}

// --- Edit Metadata Logic ---

function openEditModal(docId, filename) {
    const meta = docMeta[filename] || {};
    document.getElementById('edit_doc_id').value = docId;
    document.getElementById('edit_filename').value = filename;
    document.getElementById('edit_category').value = meta.category || '';
    document.getElementById('edit_department').value = meta.department || '';
    document.getElementById('edit_doc_type').value = meta.doc_type || '';
    document.getElementById('edit_region').value = meta.region || '';
    document.getElementById('edit_version').value = meta.version || '';
    document.getElementById('edit_author').value = meta.author || '';
    document.getElementById('edit_description').value = meta.description || '';

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Attach event listener for editForm
document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const docId = document.getElementById('edit_doc_id').value;
            const btn = document.getElementById('saveEditBtn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const body = {};
            const cat = document.getElementById('edit_category').value;
            if (cat) body.category = cat;
            const dep = document.getElementById('edit_department').value;
            if (dep) body.department = dep;
            const dt = document.getElementById('edit_doc_type').value;
            if (dt) body.doc_type = dt;
            const reg = document.getElementById('edit_region').value;
            if (reg) body.region = reg;
            const ver = document.getElementById('edit_version').value;
            if (ver) body.version = ver;
            const auth = document.getElementById('edit_author').value;
            if (auth) body.author = auth;
            const desc = document.getElementById('edit_description').value;
            if (desc) body.description = desc;

            try {
                const res = await fetch(`${BACKEND_API}/v1/documents/${docId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Edit failed');

                window.location.reload();
            } catch (err) {
                alert('Edit error: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Changes';
            }
        });
    }
});
