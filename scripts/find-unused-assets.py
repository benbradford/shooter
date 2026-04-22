#!/usr/bin/env python3
"""Find PNG files in public/assets/ not referenced by code, level JSON, or AssetRegistry."""
import os, re, json, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
os.chdir(ROOT)

# Gather all string references from code, levels, and registry
refs = set()

# AssetRegistry keys and paths
with open('src/assets/AssetRegistry.ts') as f:
    content = f.read()
    refs.update(re.findall(r"key:\s*'([^']+)'", content))
    refs.update(os.path.basename(p).rsplit('.', 1)[0] for p in re.findall(r"path:\s*'([^']+)'", content))

# All quoted strings in src/ and editor/ TS files
for d in ('src', 'editor'):
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.ts'):
                with open(os.path.join(root, f)) as fh:
                    refs.update(re.findall(r"'([a-zA-Z0-9_-]+)'", fh.read()))

# All strings in level JSON files
for root, _, files in os.walk('public/levels'):
    for f in files:
        if f.endswith('.json'):
            with open(os.path.join(root, f)) as fh:
                def extract(obj):
                    if isinstance(obj, str): refs.add(obj)
                    elif isinstance(obj, dict):
                        for v in obj.values(): extract(v)
                    elif isinstance(obj, list):
                        for v in obj: extract(v)
                try: extract(json.load(fh))
                except: pass

# Find unreferenced PNGs (skip animation source frames)
unreferenced = []
for root, _, files in os.walk('public/assets'):
    if '/animations/' in root or '/rotations/' in root:
        continue
    for f in files:
        if f.endswith('.png'):
            basename = f.rsplit('.', 1)[0]
            path = os.path.join(root, f)
            if basename not in refs:
                unreferenced.append((os.path.getsize(path), path.replace('public/assets/', '')))

unreferenced.sort(reverse=True)
total = sum(s for s, _ in unreferenced)

for size, path in unreferenced:
    if size >= 1024 * 1024:
        print(f"  {size/1024/1024:5.1f}MB  {path}")
    elif size >= 1024:
        print(f"  {size/1024:5.0f}KB  {path}")
    else:
        print(f"  {size:5}B   {path}")

print(f"\n{len(unreferenced)} unreferenced PNGs, {total/1024/1024:.1f}MB total")
