#!/usr/bin/env python3
import re
import sys

def check_file(filepath):
    print(f"Checking {filepath}...")
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    issues = []
    for i, line in enumerate(lines):
        # Check for local imports that might shadow global ones inside functions/methods
        if "def " in line:
            # Entering a function/method
            pass
        
        # Simple heuristic: indentation + "import re" -> dangerous local import
        if re.match(r"^\s+import re", line):
            issues.append(f"Line {i+1}: Local import found: '{line.strip()}' - This causes UnboundLocalError!")

    if issues:
        print(f"❌ ISSUES FOUND IN {filepath}:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print(f"✅ {filepath} is clean.")
        return True

import os

def find_python_files(directory):
    py_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                py_files.append(os.path.join(root, file))
    return py_files

files_to_check = find_python_files("backend-core/app/chat")

all_clean = True
for f in files_to_check:
    if not check_file(f):
        all_clean = False

if all_clean:
    print("\n🎉 SCOPE SAFETY CHECK PASSED!")
    sys.exit(0)
else:
    print("\n💥 SCOPE SAFETY CHECK FAILED!")
    sys.exit(1)
