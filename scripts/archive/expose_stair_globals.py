# -*- coding: utf-8 -*-
"""
階段関連関数を window オブジェクトに明示的にバインドし、インラインonclickから確実に呼べるようにする
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

bind_code = """
// 階段関数を window に公開（インライン onclick / モーダル対応）
window.setStairDrawMode = setStairDrawMode;
window.handleStairPointerDown = handleStairPointerDown;
window.finishStairPathInput = finishStairPathInput;
window.cancelStairDrawing = cancelStairDrawing;
window.openStairModal = openStairModal;
window.closeStairModal = closeStairModal;
window.setStairModalDir = setStairModalDir;
window.confirmCreateStairFromModal = confirmCreateStairFromModal;
window.createStairFromPoints = createStairFromPoints;
window.placeStairPreset = placeStairPreset;
window.placeStairPresetAt = placeStairPresetAt;
window.updateStairProp = updateStairProp;
"""

if 'window.confirmCreateStairFromModal = confirmCreateStairFromModal;' not in text:
    text += "\n" + bind_code
    print("Added window bindings for stair functions!")

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved src/madori-sketch/index.source.html")
