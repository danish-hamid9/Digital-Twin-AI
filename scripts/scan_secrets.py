import subprocess
import re
import os

patterns = {
    'Google API Key': re.compile(r'AIza[0-9A-Za-z-_]{35}'),
    'OpenAI API Key': re.compile(r'sk-[a-zA-Z0-9]{20,}'),
    'Generic API Key/Token': re.compile(r'(?i)(api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*["\']([a-zA-Z0-9_\-\.]{16,})["\']'),
    'Private Key': re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
}

def scan_text(text, source_name):
    findings = []
    lines = text.splitlines()
    for idx, line in enumerate(lines, 1):
        for name, pat in patterns.items():
            for match in pat.finditer(line):
                val = match.group(0)
                # Ignore placeholders
                lower_val = val.lower()
                if any(x in lower_val for x in [
                    'example', 'placeholder', 'dummy', 'replace_with', 'your_', 
                    'secret_key_here', 'minimum_32', 'replace_with_a_super',
                    'postgrespassword', 'dummy_hash', 'fakepassword', 'token_here'
                ]):
                    continue
                # Mask secret value: print only pattern name, line number, file
                findings.append({
                    'source': source_name,
                    'line_num': idx,
                    'type': name,
                    'preview': val[:8] + '...' + val[-4:] if len(val) > 12 else '***'
                })
    return findings

print("=== 1. SCANNING GIT REPOSITORY HISTORY ===")
try:
    commits = subprocess.check_output(['git', 'rev-list', '--all'], encoding='utf-8', errors='ignore').splitlines()
    print(f"Total commits in history: {len(commits)}")
    history_findings = []
    for commit in commits:
        diff = subprocess.check_output(['git', 'show', commit], encoding='utf-8', errors='ignore')
        commit_f = scan_text(diff, f"commit {commit[:8]}")
        history_findings.extend(commit_f)
    print(f"Git history potential secret findings count: {len(history_findings)}")
    for f in history_findings:
        print(f" - [{f['source']}] Type: {f['type']}")
except Exception as e:
    print(f"Error scanning git log: {e}")

print("\n=== 2. SCANNING WORKING TREE (TRACKED + UNTRACKED) ===")
working_tree_findings = []
tracked = subprocess.check_output(['git', 'ls-files'], encoding='utf-8', errors='ignore').splitlines()
untracked = subprocess.check_output(['git', 'status', '--porcelain'], encoding='utf-8', errors='ignore').splitlines()
all_files = set(tracked)
for u in untracked:
    path = u[3:].strip()
    if os.path.isfile(path):
        all_files.add(path)

for file_path in sorted(all_files):
    # Skip binary files, lockfiles, node_modules, .git
    if any(file_path.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.eot', '.db', '.sqlite', '.joblib']):
        continue
    if any(part in file_path.split(os.sep) for part in ['node_modules', '.next', '.git', '__pycache__', '.pytest_cache', 'venv', '.venv']):
        continue
    if not os.path.exists(file_path):
        continue
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
            content = fp.read()
        f_findings = scan_text(content, file_path)
        working_tree_findings.extend(f_findings)
    except Exception as e:
        pass

print(f"Working tree potential secret findings count: {len(working_tree_findings)}")
for f in working_tree_findings:
    print(f" - [{f['source']}:L{f['line_num']}] Type: {f['type']}")

print("\n=== SCAN COMPLETE ===")
