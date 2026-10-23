# -*- coding: utf-8 -*-
import json

with open('public/data/qa_knowledge_100.json', 'r', encoding='utf-8') as f:
    d1 = json.load(f)

qs1 = d1.get('questions', [])
print('qa_knowledge_100 count:', len(qs1))
if len(qs1) > 0:
    q0 = qs1[0]
    print('Sample q0 keys:', list(q0.keys()))
    print('  id:', q0.get('id'))
    print('  category:', q0.get('category'))
    print('  categoryName:', repr(q0.get('categoryName')))
    print('  question:', repr(q0.get('question')))
    print('  image/diagram:', q0.get('image'), q0.get('diagram'), q0.get('diagramPath'))

with open('public/data/thermal_qa_200.json', 'r', encoding='utf-8') as f:
    d2 = json.load(f)

qs2 = d2.get('questions', [])
print('\nthermal_qa_200 count:', len(qs2))
if len(qs2) > 0:
    q0 = qs2[0]
    print('Sample q0 keys:', list(q0.keys()))
    print('  id:', q0.get('id'))
    print('  category:', q0.get('category'))
    print('  categoryName:', repr(q0.get('categoryName')))
    print('  question:', repr(q0.get('question')))
    print('  image/diagram:', q0.get('image'), q0.get('diagram'), q0.get('diagramPath'))
