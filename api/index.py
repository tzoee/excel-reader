"""
Flask API untuk Vercel Serverless
"""
import os
import json
import uuid
import requests
import pandas as pd
from io import BytesIO
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__, template_folder='../templates', static_folder='../static')
app.secret_key = os.environ.get('SECRET_KEY', 'excel-reader-2024')

# Gunakan /tmp untuk Vercel serverless
UPLOAD_FOLDER = '/tmp/uploads'
DATA_FILE = '/tmp/data_store.json'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def load_data_store():
    """Load data store dari file JSON"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {'files': [], 'groups': []}


def save_data_store(data):
    """Simpan data store ke file JSON"""
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f)


def read_google_sheet(url):
    """Baca Google Spreadsheet atau Excel file dari Google Drive"""
    import re
    
    # Extract file ID dari berbagai format URL
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
    if not match:
        raise ValueError('URL tidak valid')
    
    file_id = match.group(1)
    
    # Cek apakah ini file Excel di Drive (ada rtpof=true) atau Google Sheets native
    is_excel_file = 'rtpof=true' in url or 'export=download' in url
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    session = requests.Session()
    
    if is_excel_file:
        # File Excel di Google Drive - download dengan confirm token
        download_url = f'https://drive.google.com/uc?export=download&id={file_id}'
        
        response = session.get(download_url, headers=headers, timeout=60)
        
        # Handle virus scan warning untuk file besar
        if 'confirm=' in response.text or 'download_warning' in str(response.cookies):
            # Extract confirm token
            for key, value in response.cookies.items():
                if key.startswith('download_warning'):
                    download_url = f'https://drive.google.com/uc?export=download&confirm={value}&id={file_id}'
                    break
            else:
                # Coba extract dari HTML
                import re as regex
                token_match = regex.search(r'confirm=([0-9A-Za-z_-]+)', response.text)
                if token_match:
                    download_url = f'https://drive.google.com/uc?export=download&confirm={token_match.group(1)}&id={file_id}'
            
            response = session.get(download_url, headers=headers, timeout=60)
        
        if response.status_code != 200:
            raise ValueError('Gagal download file')
        
        # Cek apakah response adalah HTML (error page)
        if b'<!DOCTYPE' in response.content[:100] or b'<html' in response.content[:100]:
            raise ValueError('File tidak bisa diakses. Pastikan sharing "Anyone with the link"')
        
        content = BytesIO(response.content)
        
        # Coba baca sebagai Excel
        try:
            df = pd.read_excel(content, engine='openpyxl')
        except:
            content.seek(0)
            try:
                df = pd.read_csv(content)
            except:
                raise ValueError('Format file tidak didukung')
    else:
        # Google Sheets native - export as CSV
        gid = '0'
        gid_match = re.search(r'gid=(\d+)', url)
        if gid_match:
            gid = gid_match.group(1)
        
        export_url = f'https://docs.google.com/spreadsheets/d/{file_id}/export?format=csv&gid={gid}'
        
        response = session.get(export_url, headers=headers, timeout=60)
        
        if response.status_code != 200:
            raise ValueError('Gagal mengakses spreadsheet')
        
        content_type = response.headers.get('content-type', '')
        if 'text/html' in content_type:
            raise ValueError('Spreadsheet tidak bisa diakses. Pastikan sharing "Anyone with the link"')
        
        try:
            df = pd.read_csv(BytesIO(response.content))
        except Exception as e:
            raise ValueError(f'Gagal membaca data: {str(e)}')
    
    if df.empty:
        raise ValueError('File kosong atau tidak bisa dibaca')
    
    return df, file_id


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'Tidak ada file yang dipilih'}), 400
    
    file = request.files['file']
    group_id = request.form.get('group_id', '')
    
    if file.filename == '':
        return jsonify({'error': 'Tidak ada file yang dipilih'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Format tidak didukung. Gunakan: xlsx, xls, csv'}), 400
    
    try:
        filename = secure_filename(file.filename)
        file_id = uuid.uuid4().hex[:8]
        
        # Baca file langsung ke DataFrame
        suffix = filename.rsplit('.', 1)[1].lower()
        if suffix == 'csv':
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
        
        # Simpan data ke store
        store = load_data_store()
        file_data = {
            'id': file_id,
            'name': filename,
            'source': 'upload',
            'group_id': group_id,
            'created_at': datetime.now().isoformat(),
            'rows': len(df),
            'columns': list(df.columns),
            'data': df.head(500).to_dict('records')  # Simpan max 500 baris
        }
        store['files'].append(file_data)
        save_data_store(store)
        
        return jsonify({
            'success': True,
            'file': {
                'id': file_id,
                'name': filename,
                'rows': len(df),
                'columns': list(df.columns)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/read-link', methods=['POST'])
def read_from_link():
    """Baca Google Spreadsheet tanpa menyimpan (preview)"""
    data = request.json
    url = data.get('url', '')
    
    if not url:
        return jsonify({'error': 'URL tidak boleh kosong'}), 400
    
    try:
        df, sheet_id = read_google_sheet(url)
        return jsonify({
            'success': True,
            'rows': len(df),
            'columns': list(df.columns),
            'data': df.head(100).to_dict('records'),
            'suggested_name': f'GSheet_{sheet_id[:8]}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/import-link', methods=['POST'])
def import_from_link():
    """Import dari Google Spreadsheet link"""
    data = request.json
    url = data.get('url', '')
    group_id = data.get('group_id', '')
    custom_name = data.get('name', '')
    
    if not url:
        return jsonify({'error': 'URL tidak boleh kosong'}), 400
    
    try:
        df, sheet_id = read_google_sheet(url)
        file_id = uuid.uuid4().hex[:8]
        filename = custom_name or f'GSheet_{sheet_id[:8]}'
        
        store = load_data_store()
        file_data = {
            'id': file_id,
            'name': filename,
            'source': 'google_sheet',
            'source_url': url,
            'group_id': group_id,
            'created_at': datetime.now().isoformat(),
            'rows': len(df),
            'columns': list(df.columns),
            'data': df.head(500).to_dict('records')
        }
        store['files'].append(file_data)
        save_data_store(store)
        
        return jsonify({
            'success': True,
            'file': {
                'id': file_id,
                'name': filename,
                'rows': len(df),
                'columns': list(df.columns)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/files', methods=['GET'])
def get_files():
    """Dapatkan semua file tersimpan"""
    store = load_data_store()
    files = [{
        'id': f['id'],
        'name': f['name'],
        'source': f['source'],
        'group_id': f.get('group_id', ''),
        'created_at': f['created_at'],
        'rows': f['rows'],
        'columns': f['columns']
    } for f in store['files']]
    return jsonify({'files': files, 'groups': store['groups']})


@app.route('/api/files/<file_id>', methods=['GET'])
def get_file_data(file_id):
    """Dapatkan data file tertentu"""
    store = load_data_store()
    file_data = next((f for f in store['files'] if f['id'] == file_id), None)
    
    if not file_data:
        return jsonify({'error': 'File tidak ditemukan'}), 404
    
    return jsonify({
        'success': True,
        'file': file_data
    })


@app.route('/api/files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Hapus file"""
    store = load_data_store()
    store['files'] = [f for f in store['files'] if f['id'] != file_id]
    save_data_store(store)
    return jsonify({'success': True})


@app.route('/api/groups', methods=['POST'])
def create_group():
    """Buat group baru"""
    data = request.json
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'Nama group tidak boleh kosong'}), 400
    
    store = load_data_store()
    group_id = uuid.uuid4().hex[:8]
    store['groups'].append({
        'id': group_id,
        'name': name,
        'created_at': datetime.now().isoformat()
    })
    save_data_store(store)
    
    return jsonify({'success': True, 'group': {'id': group_id, 'name': name}})


@app.route('/api/groups/<group_id>', methods=['DELETE'])
def delete_group(group_id):
    """Hapus group beserta semua file di dalamnya"""
    store = load_data_store()
    store['groups'] = [g for g in store['groups'] if g['id'] != group_id]
    store['files'] = [f for f in store['files'] if f.get('group_id') != group_id]
    save_data_store(store)
    return jsonify({'success': True})


@app.route('/api/files/<file_id>/move', methods=['POST'])
def move_file_to_group(file_id):
    """Pindahkan file ke group lain"""
    data = request.json
    group_id = data.get('group_id', '')
    
    store = load_data_store()
    for f in store['files']:
        if f['id'] == file_id:
            f['group_id'] = group_id
            break
    save_data_store(store)
    return jsonify({'success': True})


# Untuk development lokal
if __name__ == '__main__':
    app.run(debug=True, port=5000)
