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
            brace_stack.append((line_num, i))
        elif char == '}':
            if brace_stack:
                brace_stack.pop()
            else:
                print("Unmatched } at line " + str(line_num))
        elif char == '(':
            paren_stack.append((line_num, i))
        elif char == ')':
            if paren_stack:
                paren_stack.pop()
            else:
                print("Unmatched ) at line " + str(line_num))
        i += 1

print("Open braces:")
for b in brace_stack:
    print("  Line " + str(b[0]) + ": " + lines[b[0]-1].strip()[:60])

print("Open parentheses:")
for p in paren_stack:
    print("  Line " + str(p[0]) + ": " + lines[p[0]-1].strip()[:60])
