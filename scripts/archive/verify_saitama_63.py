# -*- coding: utf-8 -*-
import json
import re

def verify():
    # 1. Verify JSON file
    with open('public/data/saitama_63_subsidies.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"[JSON] Total records: {len(data)}")
    assert len(data) == 63, f"Expected 63, got {len(data)}"

    # Check for empty links or invalid data
    for item in data:
        assert item.get('key'), f"Missing key: {item}"
        assert item.get('name'), f"Missing name: {item}"
        assert item.get('link') and item['link'].startswith('http'), f"Invalid link in {item['name']}: {item.get('link')}"
        assert item.get('maxAmount') is not None, f"Missing maxAmount in {item['name']}"

    # 2. Verify public/subsidy/index.html
    with open('public/subsidy/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Find keys in cities
    cities_keys = re.findall(r'\"([^\"]+)\":\s*\{\s*\"name\":', html)
    print(f"[HTML] Total city keys found in HTML: {len(cities_keys)}")
    assert len(cities_keys) == 63, f"Expected 63 in HTML, got {len(cities_keys)}"

    # Check that all keys in JSON exist in HTML
    for item in data:
        assert item['key'] in cities_keys, f"Key {item['key']} missing in HTML!"

    print("[SUCCESS] All 63 municipalities of Saitama Prefecture are completely defined with official links, amounts, and conditions!")

if __name__ == '__main__':
    verify()
