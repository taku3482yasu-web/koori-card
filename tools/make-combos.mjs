// =====================================================================
// 全カードで 絵が ダブらない ように、組み合わせの 絵 (src/art/combos.js) を 作る (2026-11-03 ユーザー指定)
// ---------------------------------------------------------------------
// node tools/make-combos.mjs
//   同じ 絵 (src/art/index.js の BASE_ART) を 使う カードは、いちばん 番号の 小さい モンスターだけ もとの 絵の まま。
//   ほかは「背景 + キャラ + エフェクト」の 絵に する。背景は チーム・属性・名前、エフェクトは 効果の ことばで えらぶ。
//   場面の カードは 景色が 主役 (たいせんの 場の 背景にも なる)。組み合わせが かぶったら エフェクト → 背景の じゅんに ずらす
// =====================================================================
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARDS } from '../src/data/cards.js';
import { BASE_ART } from '../src/art/index.js';
import { BGS, FXS } from '../src/art/combo-paint.js';

const here = dirname(fileURLToPath(import.meta.url));

// アタックチャンスの カード (前作の 絵の キャラ)
const EXTRA = { 216: 'sprite:koori', 217: 'sprite:koori', 218: 'sprite:onioni', 219: 'big:asahara', 220: 'big:okagappa', 221: 'big:ueno', 222: 'big:yahami', 223: 'big:ishii', 224: 'sprite:furukawa', 225: 'sprite:tomoishi' };
const TEAM_BG = { bariki: 'city', koori: 'ice', oni: 'fire', ask3: 'castle', '5dx': 'stage', muscle: 'gym', bartas: 'night', kemono: 'forest' };
// 同じ キャラが 何回も 出る ときは 背景も かえる (チームに 合う 背景の じゅん)
const TEAM_ALT = {
    bariki: ['city', 'town', 'gold', 'sky', 'shrine'], koori: ['ice', 'sky', 'sea', 'night', 'cave'], oni: ['fire', 'dark', 'cave', 'night', 'shrine'],
    ask3: ['castle', 'cyber', 'lab', 'gold', 'dark'], '5dx': ['stage', 'sea', 'beach', 'night', 'sky'], muscle: ['gym', 'beach', 'fire', 'sky', 'town'],
    bartas: ['night', 'dark', 'gold', 'city', 'cave'], kemono: ['forest', 'cave', 'night', 'sky', 'shrine'], nobrand: ['town', 'sky', 'forest', 'sea', 'gold']
};
const charBg = {};
const RACE_BG = { こおり: 'ice', ほのお: 'fire', みず: 'sea', しぜん: 'forest', かぜ: 'sky', ふしぎ: 'cyber', ふつう: 'town' };
const PLACE_BG = [['基地', 'ice'], ['氷', 'ice'], ['雪', 'ice'], ['アジト', 'cave'], ['洞', 'cave'], ['穴', 'cave'], ['城', 'castle'], ['玉座', 'castle'], ['ライブ', 'stage'], ['ステージ', 'stage'],
    ['ビーチ', 'beach'], ['海', 'sea'], ['竜宮', 'sea'], ['夜', 'night'], ['月', 'night'], ['摩天楼', 'city'], ['タウン', 'town'], ['町', 'town'], ['神社', 'shrine'], ['寺', 'shrine'],
    ['ジム', 'gym'], ['山', 'gym'], ['森', 'forest'], ['迷宮', 'forest'], ['獣道', 'forest'], ['宝', 'gold'], ['金', 'gold'], ['研究', 'lab'], ['ネット', 'cyber']];
const RACE_FX = { こおり: 'ice', ほのお: 'fire', みず: 'wave', しぜん: 'sparkle', かぜ: 'thunder', ふしぎ: 'beam', ふつう: 'sparkle' };
const TEXT_FX = [['バトルさせる', 'clash'], ['ただで', 'portal'], ['シールドに 加', 'shield'], ['筋肉', 'muscle'], ['すべて 墓地', 'burst'], ['シールドを', 'burst'],
    ['墓地へ', 'slash'], ['うば', 'steal'], ['ぬす', 'steal'], ['ねこばば', 'steal'], ['捨て', 'steal'], ['タップ', 'chain'], ['手札に 戻', 'whirl'], ['引く', 'cards'],
    ['ブロッカー', 'shield'], ['パワー -', 'skull'], ['パワー +', 'aura'], ['魔法', 'note'], ['ポイント', 'coin']];

// もとの 絵の まま 使う カード (同じ 絵の 中で いちばん 番号の 小さい モンスター。場面は 景色に するので 入れない)
const users = {};
for (const c of CARDS) { const k = BASE_ART[c.no]; if (k) (users[k] ||= []).push(c); }
const keep = new Set();
for (const [k, list] of Object.entries(users)) {
    if (k.startsWith('scene:')) { keep.add(list.find((c) => c.kind === 'field')?.no ?? list[0].no); continue; }
    const c = list.find((x) => x.kind === 'monster') || list.find((x) => x.kind !== 'field');
    if (c) keep.add(c.no);
}

const used = new Set();
const COMBOS = {};
const fxList = Object.keys(FXS).filter((f) => f !== 'none');
const bgList = Object.keys(BGS);
for (const c of CARDS) {
    if (keep.has(c.no)) continue;
    const base = BASE_ART[c.no] || EXTRA[c.no];
    if (!base) throw new Error(`絵が ない: ${c.no} ${c.name}`);
    const land = c.kind === 'field';
    const char = base.startsWith('scene:') ? null : base;
    const place = land ? PLACE_BG.find(([w]) => c.name.includes(w))?.[1] : null;
    let bg = place || TEAM_BG[c.team] || RACE_BG[c.race] || 'town';
    if (!land && char) {
        const seen = (charBg[char] ||= []);
        const alt = (TEAM_ALT[c.team] || []).find((b) => !seen.includes(b));
        if (alt && seen.includes(bg)) bg = alt;
        seen.push(bg);
    }
    let fx = land ? 'none' : (TEXT_FX.find(([w]) => c.text.includes(w))?.[1] || RACE_FX[c.race] || 'sparkle');
    const sig = () => `${char}|${bg}|${fx}|${land}`;
    // かぶったら ずらす (景色は 背景、ほかは エフェクト → 背景)
    for (let i = 0; used.has(sig()); i++) {
        if (land || i >= fxList.length) bg = bgList[(bgList.indexOf(bg) + 1) % bgList.length];
        else fx = fxList[(fxList.indexOf(fx) + 1) % fxList.length];
    }
    used.add(sig());
    COMBOS[c.no] = { bg, char, fx, ...(land ? { land: true } : {}) };
}

const body = Object.entries(COMBOS).map(([no, s]) => `    ${no}: ${JSON.stringify(s).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ')},   // ${CARDS.find((c) => c.no === +no).name}`).join('\n');
writeFileSync(join(here, '..', 'src', 'art', 'combos.js'), `// 組み合わせの 絵 (背景 bg + キャラ char + エフェクト fx・land は 場面の 景色)。tools/make-combos.mjs が 作る (手で 直さない)
// 2026-11-03 ユーザー指定: 全カードで 絵が ダブらない ように。絵の 描きかたは combo-paint.js
export const COMBOS = {
${body}
};
`);
console.log(`${Object.keys(COMBOS).length} まいの カードを 組み合わせの 絵に しました`);
