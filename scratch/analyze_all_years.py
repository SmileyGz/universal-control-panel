import urllib.request
import csv
import io

gids = {
    '2017': '85299747',
    '2018': '1025026287',
    '2019': '2087947011',
    '2020': '285909528',
    '2021': '907253310',
    '2022': '464393664',
    '2023': '1478861240',
    '2024': '1719366755',
    '2025': '1281391376',
    '2026': '319533843'
}

def parse_currency(value):
    if not value:
        return 0.0
    value = value.replace('$', '').replace('.', '').replace(',', '.').strip()
    try:
        return float(value)
    except:
        return 0.0

yearly_gastos = {}
yearly_ingresos = {}
all_expenses = []
all_incomes = []

for year, gid in gids.items():
    url = f"https://docs.google.com/spreadsheets/d/1adXqdWXVELnv0duCawzD1X0C6LuloCi177zqSr5h0Wk/export?format=csv&gid={gid}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req)
        content = response.read().decode('utf-8')
        
        reader = csv.reader(io.StringIO(content))
        
        headers = None
        for row in reader:
            row_upper = [str(r).strip().upper() for r in row]
            if 'GASTOS' in row_upper:
                headers = row_upper
                break
                
        if not headers:
            continue
            
        gastos_index = headers.index('GASTOS') if 'GASTOS' in headers else -1
        ingresos_index = headers.index('INGRESOS') if 'INGRESOS' in headers else -1
        concepto_index = headers.index('CONCEPTO') if 'CONCEPTO' in headers else -1
        
        total_gasto = 0.0
        total_ingreso = 0.0
        
        for row in reader:
            # Parse Gastos
            if gastos_index != -1 and len(row) > gastos_index:
                gasto_str = row[gastos_index]
                if gasto_str:
                    val = parse_currency(gasto_str)
                    total_gasto += val
                    if val > 0 and concepto_index != -1 and len(row) > concepto_index:
                        concepto = row[concepto_index].strip()
                        if concepto:
                            all_expenses.append({'year': year, 'concepto': concepto, 'amount': val})
            
            # Parse Ingresos
            if ingresos_index != -1 and len(row) > ingresos_index:
                ingreso_str = row[ingresos_index]
                if ingreso_str:
                    val = parse_currency(ingreso_str)
                    total_ingreso += val
                    if val > 0 and concepto_index != -1 and len(row) > concepto_index:
                        concepto = row[concepto_index].strip()
                        if concepto:
                            all_incomes.append({'year': year, 'concepto': concepto, 'amount': val})
                            
        yearly_gastos[year] = total_gasto
        yearly_ingresos[year] = total_ingreso
    except Exception as e:
        print(f"Error processing {year}: {e}")

print("--- YEARLY SUMMARY ---")
for year in sorted(yearly_gastos.keys()):
    g = yearly_gastos[year]
    i = yearly_ingresos[year]
    net = i - g
    print(f"{year}: Ingresos: ${i:,.2f} | Gastos: ${g:,.2f} | Net: ${net:,.2f}")

print("\n--- TOP INCOME SOURCES OVERALL ---")
income_totals = {}
for e in all_incomes:
    c = e['concepto'].upper()
    income_totals[c] = income_totals.get(c, 0) + e['amount']

sorted_inc = sorted(income_totals.items(), key=lambda x: x[1], reverse=True)
for cat, total in sorted_inc[:10]:
    print(f"{cat}: ${total:,.2f}")

print("\n--- TOP EXPENSES / VENDORS OVERALL ---")
category_totals = {}
for e in all_expenses:
    c = e['concepto'].upper()
    category_totals[c] = category_totals.get(c, 0) + e['amount']

sorted_cats = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
for cat, total in sorted_cats[:10]:
    print(f"{cat}: ${total:,.2f}")
