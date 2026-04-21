// Backend API URL (passed from Flask template)
let BACKEND_API = "http://localhost:8000"; // Default, will be overridden by template

// Document metadata (will be populated by template)
let docMeta = {};

// Retrieval mode: 'bm25' | 'hybrid'
let retrievalMode = 'bm25';

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

// Filter logic - Get checked files
function getCheckedFiles() {
    return [...document.querySelectorAll('.doc-pill.active')]
        .map(el => el.dataset.filename);
}

// Toggle document selection
function toggleDoc(pill) {
    pill.classList.toggle('active');
    pill.querySelector('.pill-icon').textContent =
        pill.classList.contains('active') ? '✓' : '';
    updateFilterSummary();
}

// Select all documents
function selectAll() {
    document.querySelectorAll('.doc-pill').forEach(pill => {
        pill.classList.add('active');
        pill.querySelector('.pill-icon').textContent = '✓';
    });
    updateFilterSummary();
}

// Clear all document selections
function clearAll() {
    document.querySelectorAll('.doc-pill').forEach(pill => {
        pill.classList.remove('active');
        pill.querySelector('.pill-icon').textContent = '';
    });
    updateFilterSummary();
}

// Apply metadata filters (category, department, doc type)
function applyMetaFilter() {
    const cat = document.getElementById('categoryFilter')?.value || '';
    const dept = document.getElementById('departmentFilter')?.value || '';
    const type = document.getElementById('docTypeFilter')?.value || '';

    document.querySelectorAll('.doc-pill').forEach(pill => {
        const fn = pill.dataset.filename;
        const meta = docMeta[fn] || {};
        const match =
            (!cat || meta.category === cat) &&
            (!dept || meta.department === dept) &&
            (!type || meta.doc_type === type);

        if (match) {
            pill.classList.add('active');
            pill.querySelector('.pill-icon').textContent = '✓';
        } else {
            pill.classList.remove('active');
            pill.querySelector('.pill-icon').textContent = '';
        }
    });
    updateFilterSummary();
}

// Update filter summary text
function updateFilterSummary() {
    const checked = getCheckedFiles();
    const total = document.querySelectorAll('.doc-pill').length;
    const el = document.getElementById('filterSummary');
    if (!el) return;

    if (checked.length === 0) {
        el.innerHTML = '⚠️ No documents selected — please select at least one.';
    } else if (checked.length === total) {
        el.innerHTML = 'Searching across <span>all ' + total + ' documents</span>.';
    } else {
        el.innerHTML = 'Searching <span>' + checked.length + '</span> of ' + total + ' documents.';
    }
}

// Set retrieval mode and update UI
function setRetrievalMode(mode) {
    retrievalMode = mode;

    const bm25Btn    = document.getElementById('modeBM25');
    const hybridBtn  = document.getElementById('modeHybrid');
    const infoIcon   = document.querySelector('.mode-info-icon');
    const infoText   = document.getElementById('modeInfoText');
    const infoBox    = document.getElementById('modeInfo');

    bm25Btn.classList.toggle('active', mode === 'bm25');
    hybridBtn.classList.toggle('active', mode === 'hybrid');

    if (mode === 'hybrid') {
        infoIcon.textContent = '🧠';
        infoText.textContent = 'Hybrid mode: BM25 keyword + ChromaDB semantic search. Results are merged and reranked for best coverage.';
        infoBox.classList.add('hybrid');
    } else {
        infoIcon.textContent = '⚡';
        infoText.textContent = 'BM25 keyword retrieval — fast, no embeddings needed.';
        infoBox.classList.remove('hybrid');
    }
}


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

    const filterFiles = getCheckedFiles();
    if (filterFiles.length === 0) {
        alert('Please select at least one document to search.');
        return;
    }

    loading.style.display = 'block';
    answerSection.style.display = 'none';
    askBtn.disabled = true;

    const useVector = retrievalMode === 'hybrid';

    try {
        const res = await fetch(`${BACKEND_API}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                top_k: 15,
                rerank_top_n: 5,
                filter_files: filterFiles,
                use_vector: useVector
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Something went wrong');

        // Update answer header to show which mode was used
        const modeTag = useVector
            ? '<span class="badge badge-hybrid">🧠 Hybrid BM25 + Vector</span>'
            : '<span class="badge badge-bm25">⚡ BM25 Only</span>';
        document.querySelector('.answer-section h3').innerHTML = `💡 Answer &nbsp;${modeTag}`;

        // Display answer
        answerDiv.textContent = data.answer;

        // Display source chunks
        sourcesDiv.innerHTML = '';
        data.source_chunks.forEach(chunk => {
            const docMetadata = chunk.document_metadata || {};
            const metadata = chunk.metadata || {};

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
