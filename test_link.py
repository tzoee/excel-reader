import requests
import pandas as pd
from io import BytesIO

url = "https://docs.google.com/spreadsheets/d/1ZeGTv7ZwDYfI_GT3vRichF8Cblhtd0-z/edit?usp=sharing&ouid=114825179097621992805&rtpof=true&sd=true"

file_id = "1ZeGTv7ZwDYfI_GT3vRichF8Cblhtd0-z"
download_url = f"https://drive.google.com/uc?export=download&id={file_id}"

print(f"Downloading from: {download_url}")

headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get(download_url, headers=headers, timeout=30)

print(f"Status: {r.status_code}")
print(f"Content-Type: {r.headers.get('content-type', '')}")
print(f"Size: {len(r.content)} bytes")

if r.status_code == 200:
    try:
        df = pd.read_excel(BytesIO(r.content), engine='openpyxl')
        print(f"\nSuccess! Rows: {len(df)}, Columns: {list(df.columns)}")
        print(df.head())
    except Exception as e:
        print(f"Error reading Excel: {e}")
