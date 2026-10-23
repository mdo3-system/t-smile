with open('public/temp_chunk.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for line_no, line in enumerate(lines, 1):
    in_str = None
    i = 0
    before_len = len(stack)
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
            stack.append((line_no, line.strip()))
        elif ch == '}':
            if stack:
                stack.pop()
        i += 1
    # print when level changes to help spot
    # if line starts at top level but stack > 1
    stripped = line.strip()
    if stripped.startswith('function ') or stripped.startswith('// --- MODE'):
        print(f"Line {line_no} (depth={len(stack)}): {stripped[:60]}")

print("Final open braces count:", len(stack))
for item in stack:
    print(f"Open from Line {item[0]}: {item[1]}")
