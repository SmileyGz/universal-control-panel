import urllib.request
import re

url = "https://docs.google.com/spreadsheets/d/1adXqdWXVELnv0duCawzD1X0C6LuloCi177zqSr5h0Wk/htmlview"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    matches = re.findall(r'\{"name":"([^"]+)","gid":"([^"]+)"\}', html)
    if matches:
        print("Found tabs:")
        for name, gid in matches:
            print(f"- {name} (gid: {gid})")
    else:
        # Sometimes it's embedded differently
        matches = re.findall(r'gid=([0-9]+)[^>]*>([^<]+)</a>', html)
        if matches:
            print("Found tabs:")
            for gid, name in matches:
                print(f"- {name} (gid: {gid})")
        else:
            print("No tabs found.")
except Exception as e:
    print("Error:", e)
