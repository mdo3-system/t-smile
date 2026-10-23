with open('public/temp_chunk.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for line_no, line in enumerate(lines, 1):
    in_str = None
    i = 0
    cur_opens = []
    cur_closes = []
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
            cur_opens.append(i+1)
            stack.append((line_no, line.strip()))
        elif ch == '}':
            cur_closes.append(i+1)
            if stack:
                stack.pop()
            else:
                print(f"Underflow at line {line_no}")
        i += 1
    
    # Check if indent does not match depth
    indent = len(line) - len(line.lstrip())
    # top level inside function should have indent 2, nested 4, etc.
    expected_depth = (indent // 2) + 1
    if line.strip() and not line.strip().startswith('//') and not line.strip().startswith('*') and not in_str:
        if abs(len(stack) - expected_depth) > 2 and len(stack) > 1:
            pass

print("Final open count:", len(stack))
for l_no, text in stack:
    print(f"Still unclosed from line {l_no}: {text}")
