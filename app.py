"""
Local development server
Jalankan: python app.py
"""
import sys
sys.path.insert(0, '.')

from api.index import app

if __name__ == '__main__':
    app.run(debug=True, port=5000)
