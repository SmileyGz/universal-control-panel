import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SPREADSHEET_ID = '1adXqdWXVELnv0duCawzD1X0C6LuloCi177zqSr5h0Wk'

def main():
    creds = Credentials.from_authorized_user_file('token_sheets.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open('token_sheets.json', 'w') as token:
                token.write(creds.to_json())
    
    service = build('sheets', 'v4', credentials=creds)
    # Read the first 100 rows from sheet '2026'
    result = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range="'2026'!A1:E100"
    ).execute()
    values = result.get('values', [])
    for idx, row in enumerate(values):
        print(f"Row {idx+1}: {row}")

if __name__ == '__main__':
    main()
