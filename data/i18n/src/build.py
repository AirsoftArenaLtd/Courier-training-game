import json, glob, re, os, sys
# python3 build.py <lang> "<Name in English>" — joins <lang>/NN.json (aligned with src-NN.json) into data/i18n/<lang>.js
D = os.path.dirname(os.path.abspath(__file__))
lang, name = sys.argv[1], sys.argv[2]
meta = json.load(open(D + '/meta.json'))
tmpl = set(meta['templates'])
strings, templates, bad, have = {}, [], 0, 0
HOLE = r'\{(\d+)(?::[^|}]*\|[^}]*)?\}'
for f in sorted(glob.glob(D + '/src-*.json')):
    n = f[-7:-5]; e = json.load(open(f)); p = '%s/%s/%s.json' % (D, lang, n)
    if not os.path.exists(p): continue
    s = json.load(open(p))
    if len(s) != len(e): print('COUNT MISMATCH', n, len(e), len(s)); bad += 1; continue
    have += 1
    for a, b in zip(e, s):
        ha = set(re.findall(r'\{(\d+)\}', a)); hb = set(re.findall(HOLE, b))
        if not hb <= ha or (ha and not hb): print('HOLES', n, repr(a)[:70], '|', repr(b)[:70]); bad += 1
        if re.search(r'\{(?!\d+(?::[^|}]*\|[^}]*)?\})', b): print('BRACE', n, repr(b)[:80]); bad += 1
        if a.startswith('\n') != b.startswith('\n') or a.count('\n') and not b.count('\n'): print('NEWLINES', n, repr(a)[:60], '|', repr(b)[:60]); bad += 1
        if a in tmpl: templates.append([a, b])
        elif a != b: strings[a] = b
ov = D + '/%s/override.json' % lang
if os.path.exists(ov):
    for a, b in json.load(open(ov)).items(): strings[a] = b   # reworded so a quiz or conversation rule holds
out = ('/* %s. Translated from data/i18n/catalogue.json (test/tools/i18n-extract.js); see src/core/i18n.js.\n'
       ' * A machine-drafted translation: have a native speaker review safety wording before relying on it. */\n'
       'window.OTR_I18N = window.OTR_I18N || {};\nwindow.OTR_I18N.%s = ' % (name, lang)
       + json.dumps({'strings': strings, 'templates': templates, 'keep': meta['keep']}, ensure_ascii=False, indent=0) + ';\n')
open('/home/user/wp1/data/i18n/%s.js' % lang, 'w').write(out)
print('%s: %d chunks, %d strings, %d templates, %d problems' % (lang, have, len(strings), len(templates), bad))
