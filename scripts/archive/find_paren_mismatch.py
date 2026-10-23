# -*- coding: utf-8 -*-
with open('public/js/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

stack = []
line = 1
col = 1

in_string = False
string_char = ''
in_comment = False
in_line_comment = False
escape = False

for i, ch in enumerate(code):
    if ch == '\n':
        line += 1
        col = 1
        if in_line_comment:
            in_line_comment = False
        continue
    else:
        col += 1

    if in_line_comment:
        continue

    if in_comment:
        if ch == '/' and i > 0 and code[i-1] == '*':
            in_comment = False
        continue

    if in_string:
        if escape:
            escape = False
        elif ch == '\\':
            escape = True
        elif ch == string_char:
            in_string = False
        continue

    if ch == '/' and i + 1 < len(code):
        if code[i+1] == '/':
            in_line_comment = True
            continue
        elif code[i+1] == '*':
            in_comment = True
            continue

    if ch in ("'", '"', '`'):
        in_string = True
        string_char = ch
        continue

    if ch in '({[':
        stack.append((ch, line, col, code[max(0, i-30):min(len(code), i+30)].replace('\n', ' ')))
    elif ch in ')}]':
        if not stack:
            print(f"Extra closing {ch} at line {line}:{col}")
            continue
        top, tline, tcol, snippet = stack[-1]
        matches = {')': '(', '}': '{', ']': '['}
        if matches[ch] == top:
            stack.pop()
        else:
            print(f"Mismatched {ch} at line {line}:{col}, expected matching for {top} from line {tline}:{tcol}")
            print(f"  Context: {snippet}")
            break

print(f"Finished check. Stack size: {len(stack)}")
for item in stack[-5:]:
    print(f"Unclosed {item[0]} from line {item[1]}:{item[2]}: {item[3]}")
