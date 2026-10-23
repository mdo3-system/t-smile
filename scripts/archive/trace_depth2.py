with open('public/temp_chunk.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
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
            stack.append((line_no, line.strip()))
        elif ch == '}':
            if stack:
                stack.pop()
        i += 1
    if line_no >= 430 and len(stack) == 1:
        print(f"Reached depth 1 at line {line_no}: {line.strip()}")
    elif line_no >= 430 and line.strip().startswith('function'):
        print(f"Function at line {line_no} (depth={len(stack)}): {line.strip()[:60]}")

print("End of file depth:", len(stack))
