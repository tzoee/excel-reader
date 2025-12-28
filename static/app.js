// Excel Reader App
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

let files = [];
let groups = [];
let previewData = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
    // Navigation
    $$('.nav-btn').forEach(btn => {
        btn.onclick = () => {
            $$('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.view').forEach(v => v.classList.remove('active'));
            $(`${btn.dataset.view}View`).classList.add('active');
            if (btn.dataset.view === 'files') loadFiles();
            if (btn.dataset.view === 'groups') loadGroups();
        };
    });

    // Tabs
    $$('.tab').forEach(tab => {
        tab.onclick = () => {
            $$('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.tab-panel').forEach(p => p.classList.remove('active'));
            $(`${tab.dataset.tab}Tab`).classList.add('active');
        };
    });

    // Upload
    const uploadArea = $('uploadArea');
    const fileInput = $('fileInput');
    
    uploadArea.onclick = () => fileInput.click();
    uploadArea.ondragover = e => { e.preventDefault(); uploadArea.classList.add('dragover'); };
    uploadArea.ondragleave = () => uploadArea.classList.remove('dragover');
    uploadArea.ondrop = e => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
    };
    fileInput.onchange = e => { if (e.target.files[0]) uploadFile(e.target.files[0]); };

    // Link - auto read on paste
    const urlInput = $('sheetUrl');
    urlInput.addEventListener('paste', e => {
        setTimeout(() => {
            const url = urlInput.value.trim();
            if (url && url.includes('docs.google.com/spreadsheets')) {
                readFromLink(url);
            }
        }, 100);
    });
    
    urlInput.addEventListener('input', () => {
        $('linkStatus').textContent = '';
        $('saveLinkBtn').disabled = true;
        previewData = null;
    });

    $('saveLinkBtn').onclick = saveFromLink;
    $('createGroupBtn').onclick = createGroup;
    $('closeModal').onclick = () => $('previewModal').classList.remove('show');
    $('previewModal').onclick = e => { if (e.target === $('previewModal')) $('previewModal').classList.remove('show'); };

    loadData();
}

// Upload File
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('group_id', $('uploadGroupSelect').value);

    showLoading(true);
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) return showAlert(data.error, 'error');
        
        showAlert(`"${data.file.name}" berhasil diimport`, 'success');
        loadData();
        showPreview(data.file.id);
    } catch (e) {
        showAlert('Gagal upload', 'error');
    } finally {
        showLoading(false);
    }
}

// Read from Link (auto on paste)
async function readFromLink(url) {
    const status = $('linkStatus');
    status.textContent = '⏳ Membaca...';
    status.className = 'link-status loading';

    try {
        const res = await fetch('/api/read-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await res.json();
        
        if (data.error) {
            status.textContent = '❌ ' + data.error;
            status.className = 'link-status error';
            return;
        }

        status.textContent = `✓ ${data.rows} baris, ${data.columns.length} kolom`;
        status.className = 'link-status success';
        previewData = data;
        $('saveLinkBtn').disabled = false;
        
        // Auto show preview
        showLinkPreview(data);
    } catch (e) {
        status.textContent = '❌ Gagal membaca';
        status.className = 'link-status error';
    }
}

// Show preview from link
function showLinkPreview(data) {
    $('previewTitle').textContent = 'Preview Data';
    $('dataSummary').innerHTML = `
        <div><div class="stat-value">${data.rows}</div><div class="stat-label">Baris</div></div>
        <div><div class="stat-value">${data.columns.length}</div><div class="stat-label">Kolom</div></div>
    `;
    
    $('tableHead').innerHTML = '<tr>' + data.columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
    $('tableBody').innerHTML = data.data.slice(0, 50).map(row =>
        '<tr>' + data.columns.map(c => `<td>${row[c] ?? '-'}</td>`).join('') + '</tr>'
    ).join('');
    
    $('previewModal').classList.add('show');
}

// Save from Link
async function saveFromLink() {
    if (!previewData) return;
    
    showLoading(true);
    try {
        const res = await fetch('/api/import-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: $('sheetUrl').value,
                name: $('sheetName').value || previewData.suggested_name,
                group_id: $('linkGroupSelect').value
            })
        });
        const data = await res.json();
        if (data.error) return showAlert(data.error, 'error');
        
        showAlert(`"${data.file.name}" berhasil disimpan`, 'success');
        $('sheetUrl').value = '';
        $('sheetName').value = '';
        $('linkStatus').textContent = '';
        $('saveLinkBtn').disabled = true;
        previewData = null;
        $('previewModal').classList.remove('show');
        loadData();
    } catch (e) {
        showAlert('Gagal menyimpan', 'error');
    } finally {
        showLoading(false);
    }
}

// Load Data
async function loadData() {
    try {
        const res = await fetch('/api/files');
        const data = await res.json();
        files = data.files || [];
        groups = data.groups || [];
        updateSelects();
    } catch (e) {}
}

async function loadFiles() {
    await loadData();
    renderFiles();
}

async function loadGroups() {
    await loadData();
    renderGroups();
}

function updateSelects() {
    const opts = '<option value="">Tanpa Group</option>' + groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    $('uploadGroupSelect').innerHTML = opts;
    $('linkGroupSelect').innerHTML = opts;
    $('filterGroup').innerHTML = '<option value="">Semua</option>' + groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    $('filterGroup').onchange = renderFiles;
}

function renderFiles() {
    const filter = $('filterGroup').value;
    const list = filter ? files.filter(f => f.group_id === filter) : files;
    
    if (!list.length) {
        $('fileList').innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Belum ada data</p></div>';
        return;
    }
    
    $('fileList').innerHTML = list.map(f => {
        const g = groups.find(x => x.id === f.group_id);
        const icon = f.source === 'google_sheet' ? '📊' : '📄';
        return `
            <div class="file-card">
                <div class="file-icon">${icon}</div>
                <div class="file-info">
                    <div class="file-name">${f.name}</div>
                    <div class="file-meta">${f.rows} baris • ${f.columns.length} kolom${g ? ' • ' + g.name : ''}</div>
                </div>
                <div class="file-actions">
                    <button class="btn-sm" onclick="showPreview('${f.id}')">👁️</button>
                    <button class="btn-sm btn-danger" onclick="deleteFile('${f.id}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderGroups() {
    if (!groups.length) {
        $('groupList').innerHTML = '<div class="empty"><div class="empty-icon">📂</div><p>Belum ada group</p></div>';
        return;
    }
    
    $('groupList').innerHTML = groups.map(g => {
        const count = files.filter(f => f.group_id === g.id).length;
        return `
            <div class="group-card">
                <div><span class="group-name">📂 ${g.name}</span><span class="group-count">${count} file</span></div>
                <button class="btn-sm btn-danger" onclick="deleteGroup('${g.id}')">🗑️ Hapus</button>
            </div>
        `;
    }).join('');
}

// Preview
async function showPreview(id) {
    showLoading(true);
    try {
        const res = await fetch(`/api/files/${id}`);
        const data = await res.json();
        if (data.error) return showAlert(data.error, 'error');
        
        const f = data.file;
        $('previewTitle').textContent = f.name;
        $('dataSummary').innerHTML = `
            <div><div class="stat-value">${f.rows}</div><div class="stat-label">Baris</div></div>
            <div><div class="stat-value">${f.columns.length}</div><div class="stat-label">Kolom</div></div>
        `;
        
        $('tableHead').innerHTML = '<tr>' + f.columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
        $('tableBody').innerHTML = f.data.map(row =>
            '<tr>' + f.columns.map(c => `<td>${row[c] ?? '-'}</td>`).join('') + '</tr>'
        ).join('');
        
        $('previewModal').classList.add('show');
    } catch (e) {
        showAlert('Gagal memuat', 'error');
    } finally {
        showLoading(false);
    }
}

// Groups
async function createGroup() {
    const name = $('newGroupName').value.trim();
    if (!name) return showAlert('Masukkan nama group', 'error');
    
    try {
        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.error) return showAlert(data.error, 'error');
        
        showAlert(`Group "${name}" dibuat`, 'success');
        $('newGroupName').value = '';
        loadGroups();
    } catch (e) {
        showAlert('Gagal membuat group', 'error');
    }
}

async function deleteGroup(id) {
    const g = groups.find(x => x.id === id);
    const count = files.filter(f => f.group_id === id).length;
    if (!confirm(`Hapus "${g.name}" dan ${count} file di dalamnya?`)) return;
    
    try {
        await fetch(`/api/groups/${id}`, { method: 'DELETE' });
        showAlert('Group dihapus', 'success');
        loadGroups();
    } catch (e) {
        showAlert('Gagal menghapus', 'error');
    }
}

async function deleteFile(id) {
    if (!confirm('Hapus data ini?')) return;
    try {
        await fetch(`/api/files/${id}`, { method: 'DELETE' });
        showAlert('Data dihapus', 'success');
        loadFiles();
    } catch (e) {
        showAlert('Gagal menghapus', 'error');
    }
}

// Utils
function showAlert(msg, type) {
    const el = $('alert');
    el.textContent = msg;
    el.className = `alert ${type} show`;
    setTimeout(() => el.classList.remove('show'), 3000);
}

function showLoading(show) {
    $('loading').classList.toggle('show', show);
}
