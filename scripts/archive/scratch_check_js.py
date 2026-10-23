
with open('scripts/clean_app.js', 'r', encoding='utf-8') as f:
    text = f.read()

in_str = None
escape = False
braces = 0
parens = 0
brackets = 0

lines = text.split('\n')
for line_no, line in enumerate(lines, 1):
    i = 0
    while i < len(line):
        ch = line[i]
        if escape:
            escape = False
            i += 1
            continue
        if in_str:
            if ch == '\\':
                escape = True
            elif ch == in_str:
                in_str = None
            i += 1
            continue
        if ch in ('"', "'", '`'):
            in_str = ch
            i += 1
            continue
        if ch == '/' and i + 1 < len(line) and line[i+1] == '/':
            break
        if ch == '{': braces += 1
        elif ch == '}': braces -= 1
        elif ch == '(': parens += 1
        elif ch == ')': parens -= 1
        elif ch == '[': brackets += 1
        elif ch == ']': brackets -= 1
        i += 1

print(f"Clean JS: braces={braces}, parens={parens}, brackets={brackets}, in_str={in_str}")
