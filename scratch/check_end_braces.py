with open('/Users/shubh/Desktop/Ahar-Setu/app/admin/page.tsx', 'r') as f:
    lines = f.readlines()

brace_stack = []
paren_stack = []

for line_idx, line in enumerate(lines):
    line_num = line_idx + 1
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
                print("Unmatched } at line " + str(line_num))
        elif char == '(':
            paren_stack.append(line_num)
        elif char == ')':
            if paren_stack:
                paren_stack.pop()
            else:
                print("Unmatched ) at line " + str(line_num))
        i += 1
    
    if line_num > 1490:
        print(f"Line {line_num}: Braces={len(brace_stack)} (stack={brace_stack}) Paren={len(paren_stack)} (stack={paren_stack}) | {line.strip()[:40]}")
