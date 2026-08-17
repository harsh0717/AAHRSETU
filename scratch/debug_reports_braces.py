with open('/Users/shubh/Desktop/Ahar-Setu/app/admin/page.tsx', 'r') as f:
    lines = f.readlines()

brace_stack = []
paren_stack = []

for line_idx in range(850, 1170):
    line_num = line_idx + 1
    line = lines[line_idx]
    
    # Parse line
    i = 0
    while i < len(line):
        if line[i:i+2] == '//':
            break
        char = line[i]
        if char == '{':
            brace_stack.append(line_num)
        elif char == '}':
            if brace_stack:
                brace_stack.pop()
            else:
                print(f"Line {line_num}: Unmatched }}")
        elif char == '(':
            paren_stack.append(line_num)
        elif char == ')':
            if paren_stack:
                paren_stack.pop()
            else:
                print(f"Line {line_num}: Unmatched )")
        i += 1
    
    print(f"Line {line_num}: Braces={len(brace_stack)} Paren={len(paren_stack)} | {line.strip()[:50]}")
