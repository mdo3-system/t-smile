import sys

def check_js(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()

    stack = []
    in_str = None
    escape = False
    lines = text.split('\n')

    for line_idx, line in enumerate(lines, 1):
        i = 0
        while i < len(line):
            ch = line[i]
            if escape:
                escape = False
                i += 1
                continue
            if ch == '\\':
                escape = True
                i += 1
                continue
            if in_str:
                if ch == in_str:
                    in_str = None
                i += 1
                continue
            else:
                if ch in ('"', "'", '`'):
                    in_str = ch
                elif ch == '/' and i + 1 < len(line) and line[i+1] == '/':
                    break
                elif ch in ('{', '(', '['):
                    stack.append((ch, line_idx, i+1))
                elif ch in ('}', ')', ']'):
                    expected = {'}': '{', ')': '(', ']': '['}[ch]
                    if not stack:
                        print(f"Extra {ch} at line {line_idx}:{i+1}")
                    else:
                        top, l_idx, c_idx = stack.pop()
                        if top != expected:
                            print(f"Mismatched {ch} at line {line_idx}:{i+1}, expected {expected} matching {top} from line {l_idx}:{c_idx}")
            i += 1

    if in_str:
        print(f"Unterminated string {in_str}")
    if stack:
        print(f"Unclosed items (count={len(stack)}):")
        for item in stack[-15:]:
            print(f"  {item[0]} opened at line {item[1]}:{item[2]}")

if __name__ == '__main__':
    check_js('public/js/app.js')
