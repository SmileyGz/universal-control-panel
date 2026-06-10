import os
import json
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SPREADSHEET_ID = '1adXqdWXVELnv0duCawzD1X0C6LuloCi177zqSr5h0Wk'

def main():
    token_path = 'token_sheets.json'
    creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    service = build('sheets', 'v4', credentials=creds)
    result = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range="'Portfolio'!A1:E20"
    ).execute()
    values = result.get('values', [])
    print(json.dumps(values, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
