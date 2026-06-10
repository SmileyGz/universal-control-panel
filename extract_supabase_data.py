import urllib.request
import urllib.error
import json
import os
import sys
from collections import defaultdict

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

if SUPABASE_URL is None or SUPABASE_KEY is None:
    print("Error: SUPABASE_URL and SUPABASE_KEY environment variables must be set.")
    sys.exit(1)

def fetch_all_transactions():
    transactions = []
    limit = 1000
    offset = 0
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'count=none'
    }
    
    while True:
        url = f"{SUPABASE_URL}?select=date,amount,type&order=date.asc&limit={limit}&offset={offset}"
        req = urllib.request.Request(url, headers=headers)
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                if not data:
                    break
                    
                transactions.extend(data)
                
                if len(data) < limit:
                    break
                
                offset += limit
        except (urllib.error.HTTPError, urllib.error.URLError) as e:
            print(f"Network error occurred: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Exception occurred: {e}")
            sys.exit(1)
            
    return transactions

def main():
    transactions = fetch_all_transactions()
    print(f"Fetched {len(transactions)} transactions.")
    
    yearly_data = defaultdict(lambda: {'income': 0.0, 'expense': 0.0})
    
    for tx in transactions:
        date_str = tx.get('date')
        if not date_str:
            continue
            
        try:
            year = str(date_str).split('-')[0]
        except Exception:
            continue
            
        try:
            amount = float(tx.get('amount') or 0)
        except (ValueError, TypeError):
            amount = 0.0
            
        tx_type = str(tx.get('type') or '').lower()
        
        if tx_type == 'income':
            yearly_data[year]['income'] += amount
        elif tx_type == 'expense':
            yearly_data[year]['expense'] += amount
            
    print("\nYearly Aggregations:")
    print(f"{'Year':<6} | {'Income':<15} | {'Expense':<15}")
    print("-" * 42)
    for year in sorted(yearly_data.keys()):
        income = yearly_data[year]['income']
        expense = yearly_data[year]['expense']
        print(f"{year:<6} | {income:<15.2f} | {expense:<15.2f}")

if __name__ == "__main__":
    main()
