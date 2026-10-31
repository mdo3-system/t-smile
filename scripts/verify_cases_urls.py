# -*- coding: utf-8 -*-
import urllib.request
import sys
sys.path.insert(0, ".")
from scripts.build_custom_freedom_page import CASES_12_DATA

all_ok = True
for c in CASES_12_DATA:
    img_url = "http://localhost:8080" + c["image"]
    case_url = "http://localhost:8080/cases/" + c["slug"] + ".html"
    try:
        r1 = urllib.request.urlopen(img_url)
        r2 = urllib.request.urlopen(case_url)
        if r1.status != 200 or r2.status != 200:
            print(f"Error for {c['slug']}: img={r1.status}, page={r2.status}")
            all_ok = False
    except Exception as e:
        print(f"Failed for {c['slug']}: {e}")
        all_ok = False

if all_ok:
    print("ALL 12 CASES IMAGES AND DETAIL PAGES RETURNED HTTP 200 OK!")

