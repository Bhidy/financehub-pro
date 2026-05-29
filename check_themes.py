import os
import re

def check():
    path = "/Users/home/Documents/Info Site/mubasher-deep-extract/frontend/public"
    files = [f for f in os.listdir(path) if f.endswith(".html")]
    for file in files:
        full_path = os.path.join(path, file)
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        print(f"File: {file}")
        html_tag = re.search(r'<html[^>]*>', content)
        if html_tag:
            print(f"  HTML Tag: {html_tag.group(0)}")
            
        has_theme_vars = "data-theme" in content or "themeToggle" in content
        print(f"  Supports Theme: {has_theme_vars}")
        
        has_root = ":root" in content
        has_dark_rule = 'data-theme="dark"' in content or 'data-theme="light"' in content
        print(f"  Has CSS vars: {has_root}, Has theme CSS rule: {has_dark_rule}")
        print("-" * 30)

if __name__ == '__main__':
    check()
