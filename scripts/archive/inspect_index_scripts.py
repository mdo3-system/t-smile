# -*- coding: utf-8 -*-
with open('public/madori-sketch/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\']', text)
for s in scripts:
    print('SCRIPT SRC:', s)

print('has room_detector:', 'room_detector' in text)
print('has detectRoomsFromWalls:', 'detectRoomsFromWalls' in text)
print('has triggerAutoRoomDetection:', 'triggerAutoRoomDetection' in text)
