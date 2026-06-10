import csv
import re

def parse_currency(value):
    if not value:
        return 0.0
    value = value.replace('$', '').replace('.', '').replace(',', '.').strip()
    try:
        return float(value)
    except:
        return 0.0

def analyze_2024():
    gastos = 0.0
    ingresos = 0.0
    with open('scratch/2024.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            gasto_str = row.get('GASTOS', '')
            ingreso_str = row.get('INGRESOS', '')
            if gasto_str: gastos += parse_currency(gasto_str)
            if ingreso_str: ingresos += parse_currency(ingreso_str)
    return gastos, ingresos

def analyze_ahorro():
    total_ahorro = 0.0
    with open('scratch/ahorro.csv', 'r') as f:
        reader = csv.reader(f)
        headers = next(reader)
        for row in reader:
            for val in row:
                if '$' in val:
                    total_ahorro += parse_currency(val)
    return total_ahorro

g, i = analyze_2024()
a = analyze_ahorro()
print(f"2024 Gastos: {g}")
print(f"2024 Ingresos: {i}")
print(f"Ahorro Total: {a}")
