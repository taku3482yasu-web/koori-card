// =====================================================================
// カードの 絵 (どの カードに どの 絵を 使うか + 絵を 画像に する)
// ---------------------------------------------------------------------
//   sprite:<id> / big:<id> / item:<id> = 前作 koori-dungeon の 絵 (tools/extract-art.mjs で legacy-art.js に 写す)
//   new:<id> = このゲームで 作った 絵 (new-art.js)
//   scene:<id> = 技を 放つ ところ・場面の 景色 (scenes.js。このゲームで 描いた)
// =====================================================================
import { LEGACY_ART } from './legacy-art.js';
import { NEW_ART } from './new-art.js';
import { SCENES, paintScene } from './scenes.js';

export const ART = { ...LEGACY_ART, ...NEW_ART };

export const CARD_ART = {
    // 氷隊の モンスター
    1: 'sprite:koori', 2: 'big:yukiusapon', 3: 'big:kakigoora', 4: 'big:tsurarabo', 5: 'big:shirokumatcho', 6: 'big:yukionnan',
    7: 'big:hyougaryu', 8: 'big:penguinknight', 9: 'big:kogame', 10: 'big:urashima', 11: 'big:okagappa', 12: 'big:nakata',
    13: 'big:harukazedori', 14: 'big:tamu', 15: 'big:zumitani', 16: 'big:sakurarisu', 17: 'big:harukirin', 18: 'big:yasu',
    // 氷隊の 魔法 (技・道具・キャラ。その 場面を 描いた) と 場面・アイテム
    19: 'scene:koori_hammer', 20: 'scene:shitennou_sword', 21: 'scene:koori_breath',
    22: 'scene:ice_shard', 23: 'scene:warp_orb', 24: 'scene:furukawa_cheer',
    27: 'new:koori_sword', 28: 'item:omamori', 29: 'item:guard_scarf', 30: 'item:power_band',
    25: 'scene:glacier', 26: 'scene:sea_cave',
    // 鬼鬼団の モンスター
    31: 'sprite:onioni', 32: 'big:konin', 33: 'big:onibin', 34: 'big:goukioni', 35: 'big:asahara', 36: 'big:kinmetsuki',
    37: 'big:dake', 38: 'big:kanabone', 39: 'big:setsubunmame', 40: 'big:harry', 41: 'big:goldDog', 42: 'big:shibata',
    43: 'big:nozoema', 44: 'big:hannyamen', 45: 'big:spamdama', 46: 'big:daishi', 47: 'big:runaya', 48: 'big:maou',
    // 鬼鬼団の 魔法 (技・道具・キャラ。その 場面を 描いた) と 場面・アイテム
    49: 'scene:oni_kanabo', 50: 'scene:aso_burst', 51: 'scene:onibi',
    52: 'scene:sweep_orb', 53: 'scene:tomoishi_bento', 54: 'scene:bad_onigiri',
    55: 'scene:aso_pit', 56: 'scene:net_temple',
    57: 'new:gold_kanabo', 58: 'item:revive_seed', 59: 'item:haramaki', 60: 'item:onigiri'
};

const cache = new Map();

// カードの 絵を 画像 (data URL) に する。絵が ない ときは null
// 絵を 色の 表 (行ごとの 色。null は とうめい) に する
export function artGrid(key) {
    if (SCENES[key]) return paintScene(key, ART);
    const a = ART[key];
    return a ? a.rows.map((row) => [...row].map((ch) => a.palette[ch] || null)) : null;
}

export function artURL(no) {
    const key = CARD_ART[no];
    if (!key || typeof document === 'undefined') return null;
    if (cache.has(key)) return cache.get(key);
    const grid = artGrid(key);
    if (!grid) return null;
    const cv = document.createElement('canvas');
    cv.width = grid[0].length;
    cv.height = grid.length;
    const ctx = cv.getContext('2d');
    grid.forEach((row, y) => row.forEach((c, x) => {
        if (!c) return;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
    }));
    const url = cv.toDataURL();
    cache.set(key, url);
    return url;
}
