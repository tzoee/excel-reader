// Excel Reader App
const API = {
    upload: '/api/upload',
    importLink: '/api/import-link',
    files: '/api/files',
    groups: '/api/groups'
};

let currentFiles = [];
let currentGroups = [];

// DOM Elements
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTabs();
    initUpload();
    initLinkImport();
    initGroups();
    initModal();
    loadData();
});

// Navigation
function initNavigation() {
    $$('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const view = btn.dataset.view;
            $$('.view').forEach(v => v.classList.remove('active'));
            $(`${view}View`).classList.add('active');
            
            if (view === 'files') loadFiles();
            if (view === 'groups') loadGroups();
        });
    });
}

// Tabs
function initTabs() {
    $$('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            $$('.tab-content').forEach(c => c.classList.remove('active'));
            $(`${tab.dataset.tab}Tab`).classList.add('active');
        });
    });
}

// Upload
function initUpload() {
    const area = $('uploadArea');
    const input = $('fileInput');
    
    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
    area.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area.addEventListener('drop', e => {
        e.preventDefault();
        area.classList.remove('dragover');
        if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
        if (e.target.files.length) uploadFile(e.target.files[0]);
    });
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('group_id', $('uploadGroupSelect').value);
    
    showLoading(true);
    try {
        const res = await fetch(API.upload, { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.error) {
            showAlert(data.error, 'error');
            return;
        }
        
        showAlert(`File "${data.file.name}" berhasil diimport!`, 'success');
        loadData();
        showPreview(data.file.id);
    } catch (err) {
        showAlert('Gagal upload file', 'error');
    } finally {
        showLoading(false);
    }
}

// Link Import
function initLinkImport() {
    $('importLinkBtn').addEventListener('click', importFromLink);
}

async function importFromLink() {
    const url = $('sheetUrl').value.trim();
    const name = $('sheetName').value.trim();
    const groupId = $('linkGroupSelect').value;
    
    if (!url) {
        showAlert('Masukkan URL Google Spreadsheet', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const res = await fetch(API.importLink, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, name, group_id: groupId })
        });
        const data = await res.json();
        
        if (data.error) {
            showAlert(data.error, 'error');
            return;
        }
        
        showAlert(`Data "${data.file.name}" berhasil diimport!`, 'success');
        $('sheetUrl').value = '';
        $('sheetName').value = '';
        loadData();
        showPreview(data.file.id);
    } catch (err) {
        showAlert('Gagal import dari link', 'error');
    } finally {
        showLoading(false);
    }
}

// Load Data
async function loadData() {
    try {
        const res = await fetch(API.files);
        const data = await res.json();
        currentFiles = data.files || [];
        currentGroups = data.groups || [];
        updateGroupSelects();
    } catch (err) {
        console.error('Failed to load data:', err);
    }
}

async function loadFiles() {
    await loadData();
    renderFiles();
}

async function loadGroups() {
    await loadData();
    renderGroups();
}

// Render Files
function renderFiles() {
    const container = $('fileList');
    const filterGroup = $('filterGroup').value;
    
    let files = currentFiles;
    if (filterGroup) {
        files = files.filter(f => f.group_id === filterGroup);
    }
    
    if (files.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📭</span>
                <p>Belum ada data tersimpan</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = files.map(f => {
        const group = currentGroups.find(g => g.id === f.group_id);
        const icon = f.source === 'google_sheet' ? '📊' : '📄';
        const date = new Date(f.created_at).toLocaleDateString('id-ID');
        
        return `
            <div class="file-item">
                <div class="file-icon">${icon}</div>
                <div class="file-info">
                    <div class="file-name">${f.name}</div>
                    <div class="file-meta">
                        <span>${f.rows} baris</span>
                        <span>${f.columns.length} kolom</span>
                        <span>${date}</span>
                        ${group ? `<span>📂 ${group.name}</span>` : ''}
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm" onclick="showPreview('${f.id}')">👁️ Lihat</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteFile('${f.id}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// Render Groups
function renderGroups() {
    const container = $('groupList');
    
    if (currentGroups.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📂</span>
                <p>Belum ada group</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentGroups.map(g => {
        const fileCount = currentFiles.filter(f => f.group_id === g.id).length;
        return `
            <div class="group-item">
                <div class="group-name">
                    <span>📂</span> ${g.name}
                    <span class="group-count">${fileCount} file</span>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteGroup('${g.id}')">
                    🗑️ Hapus Group & Data
                </button>
            </div>
        `;
    }).join('');
}

// Update Group Selects
function updateGroupSelects() {
    const options = '<option value="">-- Tanpa Group --</option>' +
        currentGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    
    $('uploadGroupSelect').innerHTML = options;
    $('linkGroupSelect').innerHTML = options;
    $('filterGroup').innerHTML = '<option value="">Semua Group</option>' +
        currentGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

// Groups
function initGroups() {
    $('createGroupBtn').addEventListener('click', createGroup);
    $('refreshFilesBtn').addEventListener('click', loadFiles);
    $('filterGroup').addEventListener('change', renderFiles);
}

async function createGroup() {
    const name = $('newGroupName').value.trim();
    if (!name) {
        showAlert('Masukkan nama group', 'error');
        return;
    }
    
    try {
        const res = await fetch(API.groups, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        
        if (data.error) {
            showAlert(data.error, 'error');
            return;
        }
        
        showAlert(`Group "${name}" berhasil dibuat!`, 'success');
        $('newGroupName').value = '';
        loadGroups();
    } catch (err) {
        showAlert('Gagal membuat group', 'error');
    }
}

async function deleteGroup(groupId) {
    const group = currentGroups.find(g => g.id === groupId);
    const fileCount = currentFiles.filter(f => f.group_id === groupId).length;
    
    if (!confirm(`Hapus group "${group.name}" beserta ${fileCount} file di dalamnya?`)) return;
    
    try {
        await fetch(`${API.groups}/${groupId}`, { method: 'DELETE' });
        showAlert('Group berhasil dihapus', 'success');
        loadGroups();
    } catch (err) {
        showAlert('Gagal menghapus group', 'error');
    }
}

async function deleteFile(fileId) {
    if (!confirm('Hapus data ini?')) return;
    
    try {
        await fetch(`${API.files}/${fileId}`, { method: 'DELETE' });
        showAlert('Data berhasil dihapus', 'success');
        loadFiles();
    } catch (err) {
        showAlert('Gagal menghapus data', 'error');
    }
}

// Preview Modal
function initModal() {
    $('closeModal').addEventListener('click', () => {
        $('previewModal').classList.remove('show');
    });
    
    $('previewModal').addEventListener('click', e => {
        if (e.target === $('previewModal')) {
            $('previewModal').classList.remove('show');
        }
    });
}

async function showPreview(fileId) {
    showLoading(true);
    try {
        const res = await fetch(`${API.files}/${fileId}`);
        const data = await res.json();
        
        if (data.error) {
            showAlert(data.error, 'error');
            return;
        }
        
        const file = data.file;
        $('previewTitle').textContent = file.name;
        
        $('dataSummary').innerHTML = `
            <div class="summary-item">
                <div class="summary-value">${file.rows}</div>
                <div class="summary-label">Total Baris</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${file.columns.length}</div>
                <div class="summary-label">Total Kolom</div>
            </div>
        `;
        
        $('tableHead').innerHTML = '<tr>' + 
            file.columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
        
        $('tableBody').innerHTML = file.data.map(row =>
            '<tr>' + file.columns.map(c => `<td>${row[c] ?? '-'}</td>`).join('') + '</tr>'
        ).join('');
        
        $('previewModal').classList.add('show');
    } catch (err) {
        showAlert('Gagal memuat data', 'error');
    } finally {
        showLoading(false);
    }
}

// Utilities
function showAlert(message, type) {
    const alert = $('alert');
    alert.textContent = message;
    alert.className = `alert ${type} show`;
    setTimeout(() => alert.classList.remove('show'), 4000);
}

function showLoading(show) {
    $('loading').classList.toggle('show', show);
}
