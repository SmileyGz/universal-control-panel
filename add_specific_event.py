import calendar_manager
from googleapiclient.discovery import build

def main():
    creds = calendar_manager.authenticate()
    service = build('calendar', 'v3', credentials=creds)

    event = {
        'summary': 'cancel google subscription',
        'start': {
            'dateTime': '2026-09-04T09:00:00-05:00',
        },
        'end': {
            'dateTime': '2026-09-04T09:30:00-05:00',
        },
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'popup', 'minutes': 15},
                {'method': 'popup', 'minutes': 30},
                {'method': 'popup', 'minutes': 45},
            ],
        }
    }
    created_event = service.events().insert(calendarId='primary', body=event).execute()
    print(f"Event created: {created_event.get('htmlLink')}")

if __name__ == '__main__':
    main()
