import requests
from io import BytesIO
import pandas as pd

file_id = '1ZeGTv7ZwDYfI_GT3vRichF8Cblhtd0-z'
url = f'https://drive.google.com/uc?export=download&id={file_id}'

print('Downloading...')
r = requests.get(url)
print('Status:', r.status_code)
print('Content-Type:', r.headers.get('content-type'))
print('Content length:', len(r.content))

# Check if HTML (error page)
if b'<!DOCTYPE' in r.content[:100] or b'<html' in r.content[:100]:
    print('Got HTML page instead of file')
    print(r.content[:1000].decode('utf-8', errors='ignore'))
else:
    print('Got binary file, trying to read as Excel...')
    try:
        df = pd.read_excel(BytesIO(r.content))
        print('Success! Rows:', len(df))
        print('Columns:', list(df.columns))
        print(df.head())
    except Exception as e:
        print('Error:', e)
