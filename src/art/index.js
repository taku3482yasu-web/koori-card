// =====================================================================
// カードの 絵 (どの カードに どの 絵を 使うか + 絵を 画像に する)
// ---------------------------------------------------------------------
//   sprite:<id> / big:<id> / item:<id> = 前作 koori-dungeon の 絵 (tools/extract-art.mjs で legacy-art.js に 写す)
//   new:<id> = このゲームで 作った 絵 (new-art.js)
//   ここに ない カード (技の 魔法・場面) は まだ 絵が ない (名前の 頭文字を 出す)
// =====================================================================
import { LEGACY_ART } from './legacy-art.js';
import { NEW_ART } from './new-art.js';

export const ART = { ...LEGACY_ART, ...NEW_ART };

export const CARD_ART = {
    // 氷隊の モンスター
    1: 'sprite:koori', 2: 'big:yukiusapon', 3: 'big:kakigoora', 4: 'big:tsurarabo', 5: 'big:shirokumatcho', 6: 'big:yukionnan',
    7: 'big:hyougaryu', 8: 'big:penguinknight', 9: 'big:kogame', 10: 'big:urashima', 11: 'big:okagappa', 12: 'big:nakata',
    13: 'big:harukazedori', 14: 'big:tamu', 15: 'big:zumitani', 16: 'big:sakurarisu', 17: 'big:harukirin', 18: 'big:yasu',
    // 氷隊の 魔法 (前作の 道具・キャラ) と アイテム
    22: 'item:ice_shard', 23: 'item:warp_orb', 24: 'sprite:furukawa',
    27: 'new:koori_sword', 28: 'item:omamori', 29: 'item:guard_scarf', 30: 'item:power_band',
    // 鬼鬼団の モンスター
    31: 'sprite:onioni', 32: 'big:konin', 33: 'big:onibin', 34: 'big:goukioni', 35: 'big:asahara', 36: 'big:kinmetsuki',
    37: 'big:dake', 38: 'big:kanabone', 39: 'big:setsubunmame', 40: 'big:harry', 41: 'big:goldDog', 42: 'big:shibata',
    43: 'big:nozoema', 44: 'big:hannyamen', 45: 'big:spamdama', 46: 'big:daishi', 47: 'big:runaya', 48: 'big:maou',
    // 鬼鬼団の 魔法 (前作の 道具・キャラ) と アイテム
    52: 'item:sweep_orb', 53: 'sprite:tomoishi', 54: 'item:bad_onigiri',
    57: 'new:gold_kanabo', 58: 'item:revive_seed', 59: 'item:haramaki', 60: 'item:onigiri'
};

const cache = new Map();

// カードの 絵を 画像 (data URL) に する。絵が ない ときは null
export function artURL(no) {
    const key = CARD_ART[no];
    if (!key || !ART[key] || typeof document === 'undefined') return null;
    if (cache.has(key)) return cache.get(key);
    const a = ART[key];
    const cv = document.createElement('canvas');
    cv.width = a.w;
    cv.height = a.h;
    const ctx = cv.getContext('2d');
    a.rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const c = a.palette[row[x]];
            if (!c) continue;
            ctx.fillStyle = c;
            ctx.fillRect(x, y, 1, 1);
        }
    });
    const url = cv.toDataURL();
    cache.set(key, url);
    return url;
}
