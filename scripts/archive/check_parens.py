with open('public/temp_chunk.js', 'r', encoding='utf-8') as f:
    text = f.read()

stack = []
lines = text.split('\n')
for line_no, line in enumerate(lines, 1):
    in_str = None
    i = 0
    while i < len(line):
        ch = line[i]
        if in_str:
            if ch == '\\':
                i += 2
                continue
            if ch == in_str:
                in_str = None
            i += 1
            continue
        if ch in ('"', "'", '`'):
            in_str = ch
            i += 1
            continue
        if ch == '/' and i + 1 < len(line) and line[i+1] == '/':
            break
        if ch == '{':
            stack.append((line_no, i+1))
        elif ch == '}':
            if not stack:
                print(f"EXTRA }} AT LINE {line_no}:{i+1} -> {line.strip()}")
            else:
                stack.pop()
        i += 1

print('Remaining open ( count:', len(stack))
for item in stack[:10]:
    print(f"Unclosed ( at line {item[0]}:{item[1]} -> {lines[item[0]-1].strip()}")
