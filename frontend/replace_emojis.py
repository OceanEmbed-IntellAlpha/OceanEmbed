import os
import re

DIR = r"d:\hackathon\sih2k26\frontend\public\device-viewer"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    js_replacements = [
        (r"icon:\s*'☀️'", r"icon: '<span class=\"material-symbols-outlined\">light_mode</span>'"),
        (r"icon:\s*'🌙'", r"icon: '<span class=\"material-symbols-outlined\">dark_mode</span>'"),
        (r"btn.textContent = t === 'blueprint' \? '☀️' : '🌙';", r"btn.innerHTML = t === 'blueprint' ? '<span class=\"material-symbols-outlined\">light_mode</span>' : '<span class=\"material-symbols-outlined\">dark_mode</span>';")
    ]
    
    for old_pattern, new_replacement in js_replacements:
        content = re.sub(old_pattern, new_replacement, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filename in os.listdir(DIR):
    if filename.endswith(".html"):
        print(f"Processing {filename}...")
        process_file(os.path.join(DIR, filename))
print("Done!")
