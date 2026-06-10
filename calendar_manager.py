import datetime
import os.path
import sys

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']

def authenticate():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return creds

def list_events(service, max_results=10):
    now = datetime.datetime.utcnow().isoformat() + 'Z'  
    events_result = service.events().list(calendarId='primary', timeMin=now,
                                          maxResults=max_results, singleEvents=True,
                                          orderBy='startTime').execute()
    events = events_result.get('items', [])
    if not events:
        print('No upcoming events found.')
        return
    for event in events:
        start = event['start'].get('dateTime', event['start'].get('date'))
        print(f"ID: {event['id']} | Start: {start} | Summary: {event.get('summary', 'No Title')}")

def add_event(service, summary, start_time, end_time):
    event = {
        'summary': summary,
        'start': {
            'dateTime': start_time,
        },
        'end': {
            'dateTime': end_time,
        },
    }
    event = service.events().insert(calendarId='primary', body=event).execute()
    print(f"Event created: {event.get('htmlLink')}")

def edit_event(service, event_id, summary=None, start_time=None, end_time=None):
    event = service.events().get(calendarId='primary', eventId=event_id).execute()
    if summary:
        event['summary'] = summary
    if start_time:
        event['start'] = {'dateTime': start_time}
    if end_time:
        event['end'] = {'dateTime': end_time}
        
    updated_event = service.events().update(calendarId='primary', eventId=event_id, body=event).execute()
    print(f"Event updated: {updated_event.get('htmlLink')}")

def main():
    creds = authenticate()
    service = build('calendar', 'v3', credentials=creds)
    
    if len(sys.argv) < 2:
        print("Usage: python calendar_manager.py [auth|list|add|edit]")
        return
        
    command = sys.argv[1]
    
    if command == 'auth':
        print("Authentication successful!")
    elif command == 'list':
        list_events(service)
    elif command == 'add':
        if len(sys.argv) < 5:
            print("Usage: python calendar_manager.py add '<summary>' '<start_time>' '<end_time>'")
            return
        add_event(service, sys.argv[2], sys.argv[3], sys.argv[4])
    elif command == 'edit':
        if len(sys.argv) < 3:
            print("Usage: python calendar_manager.py edit <event_id> [summary=...] [start=...] [end=...]")
            return
        event_id = sys.argv[2]
        summary = None
        start = None
        end = None
        for arg in sys.argv[3:]:
            if arg.startswith("summary="):
                summary = arg.split("=", 1)[1]
            elif arg.startswith("start="):
                start = arg.split("=", 1)[1]
            elif arg.startswith("end="):
                end = arg.split("=", 1)[1]
        edit_event(service, event_id, summary, start, end)
    else:
        print("Unknown command")

if __name__ == '__main__':
    main()
