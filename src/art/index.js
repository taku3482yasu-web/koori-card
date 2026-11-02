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
    57: 'new:gold_kanabo', 58: 'item:revive_seed', 59: 'item:haramaki', 60: 'item:onigiri',
    // スターターデッキ 8 つの 新しい カード (2026-11-03)。技・場面・アイテムは その キャラ・道具の 絵
    61: 'sprite:haribaby', 62: 'big:daichouenkin', 63: 'sprite:nemuridake', 64: 'sprite:mumenbachi', 65: 'big:kinmenkoinu', 68: 'sprite:koori',
    69: 'sprite:onioni', 70: 'big:saikoron', 71: 'big:pachinkodaman', 72: 'big:richibou', 73: 'big:gachapon', 74: 'big:yataiman',
    75: 'sprite:pekorisu', 76: 'big:neontanuki', 77: 'big:maikumbo', 78: 'sprite:koori', 80: 'big:dake', 82: 'big:yasu',
    84: 'big:richibou', 85: 'item:guard_scarf', 86: 'item:money', 87: 'big:shakkinbourei', 89: 'big:yukimidango', 90: 'big:fubukipenguin',
    91: 'big:koorinokagami', 92: 'big:hyougame', 93: 'sprite:koori', 94: 'item:ice_pellet', 95: 'sprite:onioni', 96: 'sprite:onioni',
    97: 'big:taikooni', 98: 'big:aoonibo', 99: 'big:hyoutanoni', 101: 'big:kinmetsuki', 102: 'sprite:onioni', 103: 'big:hannyamen',
    104: 'big:sasaki', 105: 'big:kotani', 106: 'big:spamking', 107: 'big:htmlmokkun', 108: 'big:csspakkun', 109: 'big:virusn',
    110: 'big:burakrasher', 111: 'big:notfound', 112: 'big:mugenloop', 113: 'big:firewall', 114: 'big:nullpon', 116: 'big:asahara',
    117: 'big:sasaki', 118: 'big:kotani', 119: 'big:sasaki', 120: 'big:asahara', 121: 'big:asahara', 122: 'big:popupn',
    125: 'big:hibikimakuri', 126: 'big:yamamou', 127: 'big:harrymage', 128: 'big:hoshikuzun', 129: 'big:kawarimidanuki', 130: 'big:tsukiusagi',
    131: 'big:kaguyausagi', 132: 'new:kozarappa', 134: 'big:okagappa', 135: 'big:hibikimakuri', 136: 'big:yamamou', 137: 'big:okagappa',
    138: 'big:hibikimakuri', 139: 'big:harrymage', 140: 'big:otohimedai', 142: 'big:ueno', 143: 'big:ikekimu', 144: 'big:proteingolem',
    145: 'big:dumbbellkong', 146: 'big:muscletitan', 148: 'big:yukidarumuscle', 149: 'big:hyouzanmuscle', 150: 'big:magmatcho', 151: 'big:kazanmatcho',
    152: 'big:proteingolem', 153: 'big:ueno', 154: 'big:nozoema', 155: 'big:ikekimu', 156: 'big:dumbbellkong', 157: 'item:power_band',
    158: 'big:yahami', 159: 'big:maechokkin', 160: 'big:norahan', 161: 'big:takaramimic', 162: 'big:kinkomimic', 163: 'big:geninman',
    164: 'big:jouninman', 165: 'big:shinobigaeru', 166: 'big:kunaisuzume', 167: 'big:makibishimushi', 168: 'big:kagebunshin', 169: 'big:yopparaigarasu',
    170: 'big:yahami', 171: 'big:makibishimushi', 172: 'big:geninman', 173: 'big:norahan', 174: 'big:takaramimic', 175: 'big:yahami',
    176: 'big:ishii', 177: 'big:mazuda', 178: 'big:naitoon', 179: 'big:mangetsuwolf', 180: 'big:shingetsuwolf', 181: 'big:mikazukibat',
    182: 'sprite:yofukashi', 183: 'sprite:donguriko', 184: 'big:oodonguriko', 185: 'big:haetorigusan', 186: 'big:isoginchakku', 187: 'big:yoroinukegara',
    188: 'new:ishikoron', 189: 'big:haetorigusan', 190: 'big:mikazukibat', 191: 'big:ishii', 192: 'big:naitoon', 193: 'big:mangetsuwolf',
    194: 'big:tsunodaruma', 195: 'big:hakupai', 197: 'big:dumbbellkong', 198: 'big:proteingolem', 199: 'big:shurikenbo', 200: 'big:harrymimic',
    201: 'big:norahan', 202: 'big:maechokkin', 203: 'big:tatsumakitsune', 204: 'sprite:tsutankobu', 205: 'big:yoakefukurou', 206: 'big:mangetsuwolf',
    207: 'big:umibozun', 208: 'big:netkozou', 209: 'big:asahara', 210: 'big:okagappa', 211: 'big:hibikimakuri', 212: 'big:hibikimakuri',
    213: 'big:muscletitan', 214: 'big:shibata', 215: 'big:muscletitan'
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
