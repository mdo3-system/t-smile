import re

def tokenize_and_check(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        src = f.read()

    i = 0
    n = len(src)
    line = 1
    col = 1
    
    stack = [] # (type, line, col)
    
    while i < n:
        c = src[i]
        
        # Newline
        if c == '\n':
            line += 1
            col = 1
            i += 1
            continue
            
        # Single line comment
        if c == '/' and i + 1 < n and src[i+1] == '/':
            while i < n and src[i] != '\n':
                i += 1
            continue
            
        # Multi line comment
        if c == '/' and i + 1 < n and src[i+1] == '*':
            start_l, start_c = line, col
            i += 2
            col += 2
            closed = False
            while i + 1 < n:
                if src[i] == '\n':
                    line += 1
                    col = 1
                    i += 1
                elif src[i] == '*' and src[i+1] == '/':
                    i += 2
                    col += 2
                    closed = True
                    break
                else:
                    i += 1
                    col += 1
            if not closed:
                print(f"Unclosed multiline comment starting at {start_l}:{start_c}")
            continue
            
        # Strings " and '
        if c in ('"', "'"):
            quote = c
            start_l, start_c = line, col
            i += 1
            col += 1
            closed = False
            while i < n:
                if src[i] == '\\':
                    i += 2
                    col += 2
                    continue
                if src[i] == '\n':
                    # JS single/double quoted strings cannot cross newlines unless escaped
                    print(f"Unescaped newline in string literal at {start_l}:{start_c}")
                    break
                if src[i] == quote:
                    closed = True
                    i += 1
                    col += 1
                    break
                i += 1
                col += 1
            if not closed:
                print(f"Unclosed string {quote} starting at {start_l}:{start_c}")
            continue

        # Template literal `
        if c == '`':
            start_l, start_c = line, col
            i += 1
            col += 1
            closed = False
            while i < n:
                if src[i] == '\\':
                    i += 2
                    col += 2
                    continue
                if src[i] == '\n':
                    line += 1
                    col = 1
                    i += 1
                    continue
                if src[i] == '$' and i + 1 < n and src[i+1] == '{':
                    # Embedded expression in template literal
                    stack.append(('`_expr', start_l, start_c))
                    stack.append(('{', line, col))
                    i += 2
                    col += 2
                    break
                if src[i] == '`':
                    closed = True
                    i += 1
                    col += 1
                    break
                i += 1
                col += 1
            if not closed and (not stack or stack[-1][0] != '{'):
                print(f"Unclosed template literal starting at {start_l}:{start_c}")
            continue
            
        # Brackets
        if c in ('{', '(', '['):
            stack.append((c, line, col))
            i += 1
            col += 1
            continue
            
        if c in ('}', ')', ']'):
            if not stack:
                print(f"Extra closing {c} at {line}:{col}")
            else:
                top, l, cl = stack.pop()
                expected = {'}': '{', ')': '(', ']': '['}[c]
                if top != expected:
                    print(f"Mismatched {c} at {line}:{col}, expected {expected} from {l}:{cl} but got {top}")
                else:
                    if top == '{' and stack and stack[-1][0] == '`_expr':
                        # Returning to template literal
                        expr_tag, tl, tc = stack.pop()
                        # Now resume template literal
                        start_l, start_c = tl, tc
                        i += 1
                        col += 1
                        while i < n:
                            if src[i] == '\\':
                                i += 2
                                col += 2
                                continue
                            if src[i] == '\n':
                                line += 1
                                col = 1
                                i += 1
                                continue
                            if src[i] == '$' and i + 1 < n and src[i+1] == '{':
                                stack.append(('`_expr', start_l, start_c))
                                stack.append(('{', line, col))
                                i += 2
                                col += 2
                                break
                            if src[i] == '`':
                                i += 1
                                col += 1
                                break
                            i += 1
                            col += 1
                        continue
            i += 1
            col += 1
            continue

        i += 1
        col += 1

    print(f"Finished check. Stack size: {len(stack)}")
    for item in stack:
        print(f"Unclosed {item[0]} from line {item[1]}:{item[2]}")

if __name__ == '__main__':
    tokenize_and_check('public/js/app.js')
