import http.server
import socketserver
import json
import os
import sys
from urllib.parse import urlparse, parse_qs

# Google API Client Libraries
try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
except ImportError:
    print("Error: Missing Google client libraries. Run: pip3 install google-auth-oauthlib google-api-python-client")
    sys.exit(1)

PORT = 8080
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SPREADSHEET_ID = '1adXqdWXVELnv0duCawzD1X0C6LuloCi177zqSr5h0Wk'

# ============================================================
# GOOGLE AUTHENTICATION
# ============================================================
def authenticate_sheets():
    creds = None
    token_path = 'token_sheets.json'
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                raise FileNotFoundError("Missing credentials.json in Smiley directory.")
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    return creds

# ============================================================
# DATE FORMATTING (e.g. 2026-06-06 -> junio 6)
# ============================================================
def format_date_to_sheet_style(date_str):
    if not date_str:
        return ""
    try:
        parts = date_str.split('-')
        if len(parts) != 3:
            return date_str
        month_idx = int(parts[1]) - 1
        day = int(parts[2])
        months = [
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ]
        return f"{months[month_idx]} {day}"
    except Exception:
        return date_str

# ============================================================
# SHEET DATA APPEND (for transactions)
# ============================================================
def append_transaction(year, date_str, desc, amount, tx_type, notes):
    creds = authenticate_sheets()
    service = build('sheets', 'v4', credentials=creds)
    
    formatted_date = format_date_to_sheet_style(date_str)
    expense_val = amount if tx_type == 'expense' else ""
    income_val  = amount if tx_type == 'income'  else ""
    
    row_values = [formatted_date, desc, expense_val, income_val, notes]
    range_name = f"'{year}'!A:E"
    
    service.spreadsheets().values().append(
        spreadsheetId=SPREADSHEET_ID,
        range=range_name,
        valueInputOption='USER_ENTERED',
        body={'values': [row_values]}
    ).execute()

# ============================================================
# PORTFOLIO — SETUP (creates the tab and seeds default assets)
# ============================================================
def setup_portfolio():
    creds = authenticate_sheets()
    service = build('sheets', 'v4', credentials=creds)
    
    # Check if Portfolio tab already exists
    spreadsheet = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    existing = [s['properties']['title'] for s in spreadsheet.get('sheets', [])]
    
    if 'Portfolio' not in existing:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={'requests': [{'addSheet': {'properties': {'title': 'Portfolio'}}}]}
        ).execute()
    
    # Seed with current assets (user edits amounts directly in the sheet)
    headers = [['Asset', 'Categoría', 'Valor', 'Notas', 'Ícono']]
    assets = [
        ['Préstamo Tía',  'Préstamos',   20000, '$750/mes de interés recibido',   '🏦'],
        ['CETES',         'Inversiones',  3750,  'Bonos gubernamentales',          '📈'],
        ['IVVPESO',       'Inversiones',   250,  'ETF S&P 500 en MXN (3 acciones)','🌎'],
        ['USD Cash',      'Liquidez',        0,  'Dólares en efectivo',            '💵'],
        ['Caja Chica',    'Liquidez',        0,  'Efectivo en casa / billetera',   '💰'],
        ['MercadoPago',   'Ahorro',          0,  'Cuenta MercadoPago',             '🏧'],
        ['Klar',          'Ahorro',          0,  'Cuenta Klar',                    '🏧'],
        ['Monse',         'Ahorro',          0,  'Monse semanal',                  '🏧'],
    ]
    
    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'Portfolio'!A1",
        valueInputOption='USER_ENTERED',
        body={'values': headers + assets}
    ).execute()
    
    return {'status': 'success', 'message': 'Portfolio tab created and seeded'}

# ============================================================
# PORTFOLIO — READ (returns JSON array grouped by category)
# ============================================================
def read_portfolio():
    creds = authenticate_sheets()
    service = build('sheets', 'v4', credentials=creds)
    
    result = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range="'Portfolio'!A:E"
    ).execute()
    
    values = result.get('values', [])
    if len(values) < 2:
        return {'status': 'not_found'}
    
    assets = []
    for row in values[1:]:  # skip header row
        if len(row) >= 3:
            try:
                val = float(str(row[2]).replace(',', '').replace('$', '')) if row[2] else 0
            except ValueError:
                val = 0
            assets.append({
                'name':     row[0] if len(row) > 0 else '',
                'category': row[1] if len(row) > 1 else 'Otros',
                'value':    val,
                'notes':    row[3] if len(row) > 3 else '',
                'icon':     row[4] if len(row) > 4 else '💰',
            })
    
    return {'status': 'success', 'assets': assets}

# ============================================================
# JSON RESPONSE HELPER
# ============================================================
def json_response(handler, data, code=200):
    handler.send_response(code)
    handler.send_header('Content-type', 'application/json')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

# ============================================================
# HTTP REQUEST HANDLER
# ============================================================
class DashboardServer(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        root = os.path.join(os.getcwd(), 'dashboard')
        original_path = super().translate_path(path)
        rel_path = os.path.relpath(original_path, os.getcwd())
        return os.path.join(root, rel_path)

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path == '/api/test':
            self.handle_test()
        elif path == '/api/add':
            self.handle_add(parsed_url.query)
        elif path == '/api/portfolio':
            self.handle_portfolio()
        elif path == '/api/setup-portfolio':
            self.handle_setup_portfolio()
        else:
            super().do_GET()

    # ── /api/test ──────────────────────────────────────────────
    def handle_test(self):
        try:
            authenticate_sheets()
            json_response(self, {'status': 'success', 'message': 'Authorized'})
        except Exception as e:
            json_response(self, {'status': 'error', 'message': str(e)}, 500)

    # ── /api/add ───────────────────────────────────────────────
    def handle_add(self, query):
        params = parse_qs(query)
        try:
            year     = params.get('year',   [None])[0]
            date_str = params.get('date',   [None])[0]
            desc     = params.get('desc',   [None])[0]
            amount   = float(params.get('amount', ['0'])[0])
            tx_type  = params.get('type',   [None])[0]
            notes    = params.get('notes',  [''])[0]
            
            if not year or not date_str or not desc or not tx_type:
                raise ValueError("Faltan parámetros requeridos.")
            
            append_transaction(year, date_str, desc, amount, tx_type, notes)
            json_response(self, {'status': 'success'})
        except Exception as e:
            json_response(self, {'status': 'error', 'message': str(e)}, 500)

    # ── /api/portfolio ─────────────────────────────────────────
    def handle_portfolio(self):
        try:
            data = read_portfolio()
            json_response(self, data)
        except Exception as e:
            json_response(self, {'status': 'error', 'message': str(e)}, 500)

    # ── /api/setup-portfolio ───────────────────────────────────
    def handle_setup_portfolio(self):
        try:
            result = setup_portfolio()
            json_response(self, result)
        except Exception as e:
            json_response(self, {'status': 'error', 'message': str(e)}, 500)

# ============================================================
# START SERVER
# ============================================================
if __name__ == '__main__':
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(parent_dir)
    
    print(f"🟢 Smiley Server corriendo en http://localhost:{PORT}")
    print("   Ctrl+C para detener.\n")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), DashboardServer) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDeteniendo servidor.")
            sys.exit(0)
