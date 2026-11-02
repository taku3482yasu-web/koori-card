# docs/starter-decks.json (カード一覧の もとの データ) から src/data/cards.js と docs/cards.md の カード表を 作る
#   python tools/build-cards.py
# カードを 直すときは docs/starter-decks.json を 直して これを 動かす (cards.js・cards.md の 表は 手で 直さない)
import json, re, os
ROOT = os.path.join(os.path.dirname(__file__), '..')
d = json.load(open(os.path.join(ROOT, 'docs', 'starter-decks.json'), encoding='utf-8'))
C, NB, TEAMS, STYLE = d['cards'], d['nb'], d['teams'], d['style']
TEAM_ID = {'nobrand': 'nobrand', 'bariki': 'bariki', 'hyoutai': 'koori', 'kiki': 'oni', 'ask3': 'ask3', '5dx': '5dx', 'muscle': 'muscle', 'bartas': 'bartas', 'kemono': 'kemono'}
KIND = {'モンスター': 'monster', '魔法': 'magic', '場面': 'field', 'アイテム': 'item'}
BUDDY = {'bariki': 68, 'hyoutai': 1, 'kiki': 31, 'ask3': 35, '5dx': 125, 'muscle': 142, 'bartas': 158, 'kemono': 176}
ORDER = ['bariki', 'hyoutai', 'kiki', 'ask3', '5dx', 'muscle', 'bartas', 'kemono']

def tight(t):
    # 分かち書きの 空白を つめる (英数字どうしの あいだだけ 残す)
    return re.sub(r'(?<=[^\x00-\x7f]) | (?=[^\x00-\x7f])', '', t)

def js(v):
    return json.dumps(v, ensure_ascii=False)

# パック 第 1 弾 (docs/pack1.json。2026-11-03 ユーザー OK)。rarity: N U R VR SR HR OR
PACK = json.load(open(os.path.join(ROOT, 'docs', 'pack1.json'), encoding='utf-8'))['cards']
for x in PACK: x.setdefault('frm', 'パック 第1弾')

cards = []
for x in sorted(C + PACK, key=lambda x: x['no']):
    text = x['text']
    dt = text.startswith('【DT】')
    if dt: text = text[len('【DT】'):]
    c = {'no': x['no'], 'kind': KIND[x['kind']], 'name': x['name'], 'team': TEAM_ID[x['team']], 'lv': x['lv'], 'text': tight(text), 'from': x['frm']}
    if x['race']: c['race'] = x['race']
    if x['power'] is not None: c['power'] = x['power']
    if dt: c['dt'] = True
    if x['no'] == 48: c['max'] = 1
    if x.get('rarity'): c['rarity'] = x['rarity']; c['pack'] = 1
    cards.append(c)

starters = {}
for t in ORDER:
    lst = [[x['no'], x['n']] for x in sorted(C, key=lambda x: x['no']) if x['team'] == t and x['n']]
    lst += [[int(no), n] for no, n in sorted(NB[t].items(), key=lambda kv: int(kv[0]))]
    starters[TEAM_ID[t]] = {'name': TEAMS[t][0], 'buddy': BUDDY[t], 'style': STYLE[t], 'list': lst}

lines = [
    '// =====================================================================',
    '// カードの データ (docs/cards.md v0.4 と docs/pack1.md。名前・種族・パワー・効果は 全部 案)',
    '// tools/build-cards.py が docs/starter-decks.json から 作る (手で 直さない)',
    '// ---------------------------------------------------------------------',
    '//   kind: monster モンスター / magic 魔法 / field 場面 (魔法の 一部。場に 残る) / item アイテム',
    '//   team: チーム (右上の エンブレム。2026-11-03)。nobrand は どの デッキにも 入る',
    '//   race: 種族 (モンスター) / 属性 (魔法・場面)。アイテムは なし',
    '//   lv: 左上の 丸い 数字 / power: パワー (モンスターだけ) / text: 効果 / dt: ドタバタトリガー付き',
    '//   max: デッキに 入れられる 枚数 (ふつうは 4)',
    '//   rarity / pack: パックの カード (N U R VR SR HR OR。パック 第 1 弾 = docs/pack1.md)。スターターデッキの カードには ない',
    '// =====================================================================',
    '',
    "export const RACES = ['こおり', 'ほのお', 'みず', 'しぜん', 'かぜ', 'ふしぎ', 'ふつう'];",
    '',
    'export const KINDS = { monster: \'モンスター\', magic: \'魔法\', field: \'場面\', item: \'アイテム\' };',
    '',
    '// チーム (右上の エンブレムの 名前)',
    'export const TEAMS = ' + js({TEAM_ID[k]: v[0] for k, v in TEAMS.items()}) + ';',
    '',
    '// スターターデッキ (チームの カード + ノーブランド。50 枚): list は [カードの 番号, 枚数]',
    'export const DECKS = {',
]
for k, v in starters.items():
    lines.append(f"    {js(k)}: {{ name: {js(v['name'])}, buddy: {v['buddy']}, style: {js(v['style'])}, list: {js(v['list'])} }},")
lines[-1] = lines[-1].rstrip(',')
lines += ['};', '', 'export const MAX_COPIES = 4;', '',
    '// レア度 (低い じゅん) と シークレット (2026-11-03 ユーザー OK: OR = 別の 絵柄・HR = プラチナ・SR = ブラック)',
    "export const RARITIES = ['N', 'U', 'R', 'VR', 'SR', 'HR', 'OR'];",
    "export const SECRET = { OR: { id: 'alt', name: '別絵柄' }, HR: { id: 'platinum', name: 'プラチナ' }, SR: { id: 'black', name: 'ブラック' } };",
    '', 'const LIST = [']
for c in cards:
    lines.append('    ' + js(c) + ',')
lines[-1] = lines[-1].rstrip(',')
lines += [
    '];',
    '',
    'export const CARDS = LIST.map((c) => ({ max: MAX_COPIES, dt: false, ...c }));',
    'const BY_NO = new Map(CARDS.map((c) => [c.no, c]));',
    'export const cardByNo = (no) => BY_NO.get(no);',
    '// デッキに 入れられるか (そのチームの カードと ノーブランド。2026-11-03)',
    "export const fitsDeck = (card, team) => card.team === team || card.team === 'nobrand';",
    ''
]
open(os.path.join(ROOT, 'src', 'data', 'cards.js'), 'w', encoding='utf-8').write('\n'.join(lines))

# ----- docs/cards.md の カード表 (2 章から) -----
md_path = os.path.join(ROOT, 'docs', 'cards.md')
md = open(md_path, encoding='utf-8').read()
head = md[:md.index('## 2. チームと エンブレム')]
tail = md[md.index('## 12. 聞きたいこと'):] if '## 12. 聞きたいこと' in md else ''
by = {x['no']: x for x in C}
H = '| No | 名前 | 種類 | 種族・属性 | Lv | パワー | 効果 | 枚 | 出典 |\n|---|---|---|---|---|---|---|---|---|'
KO = {'モンスター': 0, '魔法': 1, '場面': 2, 'アイテム': 3}
def row(x, n):
    pw = '' if x['power'] is None else str(x['power'])
    return f"| {x['no']:03d} | {x['name']} | {x['kind']} | {x['race'] or '―'} | {x['lv']} | {pw} | {tight(x['text'])} | {n} | {x['frm']} |"
out = [head.rstrip(), '', '## 2. チームと エンブレム', '', '| チーム | エンブレム |', '|---|---|']
out += [f'| {name} | {emb} |' for name, emb in TEAMS.values()]
out.append('')
for i, t in enumerate(ORDER):
    own = sorted([x for x in C if x['team'] == t], key=lambda x: (KO[x['kind']], x['lv'], x['no']))
    out += [f'## {i + 3}. スターターデッキ「{TEAMS[t][0]}」', '', f'**とくちょう**: {STYLE[t]}　**バディ**: {by[BUDDY[t]]["name"]}', '', '### チームの カード', '', H]
    out += [row(x, x['n']) for x in own]
    out += ['', '### ノーブランド（この デッキに 入れる ぶん）', '', H]
    out += [row(by[int(no)], n) for no, n in sorted(NB[t].items(), key=lambda kv: (KO[by[int(kv[0])]['kind']], int(kv[0])))]
    tot = sum(x['n'] for x in own) + sum(NB[t].values())
    out += ['', f'合計 **{tot} 枚・{len(own) + len(NB[t])} 種**', '']
out += ['## 11. ノーブランドの カード（ぜんぶ）', '', H]
out += [row(x, '―') for x in sorted([x for x in C if x['team'] == 'nobrand'], key=lambda x: x['no'])]
out.append('')
if tail: out.append(tail)
open(md_path, 'w', encoding='utf-8').write('\n'.join(out))
print(len(cards), 'cards')
