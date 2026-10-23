# -*- coding: utf-8 -*-
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

pos_up = text.find("canvas2d.addEventListener('pointerup'")
pos = text.find("drag.type === 'wall'", pos_up)

# 該当ブロックを置換
block_start = text.rfind("} else if (drag.type === 'wall') {", 0, pos + 30)
block_end = text.find("} else if (drag.type !== 'pan') {", block_start)

new_wall_up = """} else if (drag.type === 'wall') {
        if (drag.startX !== drag.curX || drag.startY !== drag.curY) {
            fl.walls.push({
                id: uid(),
                x1: drag.startX,
                y1: drag.startY,
                x2: drag.curX,
                y2: drag.curY,
                wallType: state.subWallType || 'exterior'
            });
            state.wallClickStart = null;
            saveHistorySnapshot();
            if (typeof triggerAutoRoomDetection === 'function') triggerAutoRoomDetection();
            if (typeof rebuild3DScene === 'function') rebuild3DScene();
            showToast('壁を作成しました');
            request2DRedraw();
        }
    """

text = text[:block_start] + new_wall_up + text[block_end:]

with open(SRC_HTML, 'w', encoding='utf-8') as f:
    f.write(text)

print("Successfully patched wall pointerup logic!")
