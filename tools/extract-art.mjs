// =====================================================================
// 前作 (koori-dungeon) の ドット絵を、カードの 絵 (パレット + 文字列) に 写す
// ---------------------------------------------------------------------
// node tools/extract-art.mjs [../koori-dungeon]  →  src/art/legacy-art.js を 作り直す (手で 直さない)
// キャラは art.js の SPRITES (こおりくん・おにおに など) と bigart.js などの BIG、道具は art.js の drawItem から。
// どの カードに どの 絵を 使うかは src/art/index.js の CARD_ART (と 技・魔法の 絵で 使う src/art/scenes.js の USES)。前作に ない 絵は src/art/new-art.js
// =====================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_ART } from '../src/art/index.js';
import { USES } from '../src/art/scenes.js';

const here = dirname(fileURLToPath(import.meta.url));
const dungeon = process.argv[2] || join(here, '..', '..', 'koori-dungeon');
globalThis.performance = { now: () => 0 };
globalThis.KD = {};
for (const f of ['rng.js', 'dungeon.js', 'units.js', 'enemies.js', 'items.js', 'dungeons.js', 'collection.js', 'allies.js', 'enemies9.js', 'enemies10.js', 'enemies11.js',
    'art.js', 'itemart.js', 'bigart.js', 'enemyart.js', 'enemyart9.js', 'enemyart10.js', 'enemyart11.js']) {
    vm.runInThisContext(readFileSync(join(dungeon, 'js', f), 'utf8'), { filename: f });
}

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// 四角を 塗る 関数で 描かれた 絵を、1 ドットずつ 文字に する (半とうめいの 影は 入れない)
function capture(w, h, paint) {
    const colors = [];
    const grid = Array.from({ length: h }, () => Array(w).fill('.'));
    paint((x, y, rw, rh, color) => {
        if (!color || color.startsWith('rgba')) return;
        let i = colors.indexOf(color);
        if (i < 0) { colors.push(color); i = colors.length - 1; }
        for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) {
            if (yy >= 0 && yy < h && xx >= 0 && xx < w) grid[yy][xx] = CHARS[i];
        }
    });
    const palette = {};
    colors.forEach((c, i) => { palette[CHARS[i]] = c; });
    return { w, h, palette, rows: grid.map((r) => r.join('')) };
}

const fakeCtx = (rect) => ({
    fillStyle: '',
    globalAlpha: 1,
    fillRect(x, y, w, h) { rect(x, y, w, h, this.fillStyle); }
});

// 道具の 種類 (art.js の drawItem は 種類で 絵を えらぶ)
const ITEM_KIND = { onigiri: 'food', bad_onigiri: 'food', ice_shard: 'heal', omamori: 'revive', revive_seed: 'revive', warp_orb: 'orb', sweep_orb: 'orb' };

const out = {};
for (const key of [...Object.values(CARD_ART), ...USES]) {
    if (out[key] || key.startsWith('new:') || key.startsWith('scene:')) continue;
    const [type, id] = key.split(':');
    if (type === 'sprite') {
        const s = KD.Art.SPRITES[id];
        out[key] = { w: s.frames[0][0].length, h: s.frames[0].length, palette: s.palette, rows: s.frames[0] };
    } else if (type === 'big') {
        const a = KD.BigArt.BIG[id];
        if (!a) throw new Error(`ダンジョンに 絵が ない: ${key}`);
        out[key] = capture(a.w, a.h, (rect) => a.draw(rect, 0));
    } else if (type === 'item') {
        out[key] = capture(16, 16, (rect) => KD.Art.drawItem(fakeCtx(rect), id, ITEM_KIND[id] || 'gear', 0, 0));
    }
}

const body = Object.entries(out).map(([k, a]) =>
    `    '${k}': {\n        w: ${a.w}, h: ${a.h},\n        palette: ${JSON.stringify(a.palette)},\n        rows: [\n${a.rows.map((r) => `            '${r}'`).join(',\n')}\n        ]\n    }`).join(',\n');
writeFileSync(join(here, '..', 'src', 'art', 'legacy-art.js'),
    `// 前作 (koori-dungeon) の ドット絵を 写したもの。tools/extract-art.mjs が 作る (手で 直さない)
// 1 文字 = 1 ドット。'.' は とうめい
export const LEGACY_ART = {
${body}
};
`);
console.log(`${Object.keys(out).length} この 絵を 写しました`);
