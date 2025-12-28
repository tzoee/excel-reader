import requests
import pandas as pd
from io import BytesIO

file_id = "1ZeGTv7ZwDYfI_GT3vRichF8Cblhtd0-z"
export_url = f'https://docs.google.com/spreadsheets/d/{file_id}/export?format=csv'

print(f"URL: {export_url}")

r = requests.get(export_url, timeout=30)
print(f"Status: {r.status_code}")
print(f"Content-Type: {r.headers.get('content-type', '')}")
print(f"Size: {len(r.content)} bytes")

if r.status_code == 200:
    df = pd.read_csv(BytesIO(r.content))
    print(f"\nRows: {len(df)}, Columns: {len(df.columns)}")
    print(f"Columns: {list(df.columns)}")
    print(df.head())
