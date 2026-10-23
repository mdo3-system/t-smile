# -*- coding: utf-8 -*-
"""
</script> より後ろに誤って追記されてしまった JavaScript コードを
正しい <script> の内側に移動するスクリプト
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(BASE_DIR, 'src', 'madori-sketch', 'index.source.html')

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    text = f.read()

# 最後の </script> の位置
last_script_end = text.rfind('</script>')
tail_code = text[last_script_end + len('</script>'):]

# tail_code の中から </body></html> 以外の純粋な JS コードを抽出
if 'function createNewPlan()' in tail_code or 'window.createNewPlan' in tail_code:
    # </body> と </html> を除去
    clean_tail_js = tail_code.replace('</body>', '').replace('</html>', '').strip()
    
    # </script> の前に clean_tail_js を挿入
    new_text = text[:last_script_end] + "\n\n" + clean_tail_js + "\n</script>\n</body>\n</html>"
    
    with open(SRC_HTML, 'w', encoding='utf-8') as f:
        f.write(new_text)
    
    print("Successfully moved tail JS inside <script> tag!")
else:
    print("No tail JS detected outside <script>")
