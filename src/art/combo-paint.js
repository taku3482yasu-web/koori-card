// =====================================================================
// 組み合わせの 絵 (2026-11-03 ユーザー指定: 全カードで 絵が ダブらない ように)
// ---------------------------------------------------------------------
// 同じ キャラの 絵を 使う カードは「背景 (bg) + キャラ (char) + エフェクト (fx)」を 組み合わせた 48 × 36 の 絵に する。
// 場面の カードは 景色が 主役 (land: キャラは 小さく)。たいせんの 場の 背景にも 使う。
// どの カードに どの 組み合わせかは combos.js の COMBOS
// =====================================================================
import { W, H } from './scenes.js';

function bands(p, list) {
    let y = 0;
    for (const [c, n] of list) { p.rect(0, y, W, n, c); y += n; }
    p.rect(0, y, W, H - y, list[list.length - 1][0]);
}
function sparkle(p, x, y, c = '#ffffff', r = 2) {
    p.line(x - r, y, x + r, y, c);
    p.line(x, y - r, x, y + r, c);
}
function stars(p, n, c, seed = 7) {
    for (let i = 0; i < n; i++) p.px((seed * 13 + i * 29) % W, (seed * 7 + i * 17) % 20, c);
}

// ---------- 背景 ----------
export const BGS = {
    ice: (p) => {
        bands(p, [['#0e1a33', 8], ['#14264a', 8], ['#1c3560', 8]]);
        for (const [x, h] of [[4, 12], [16, 16], [30, 11], [42, 15]]) for (let i = 0; i < h; i++) p.rect(x - Math.floor(i / 2), 26 - h + i, i + 1, 1, i < 3 ? '#ffffff' : '#7fb0d8');
        p.rect(0, 27, W, 9, '#d8f0ff'); p.rect(0, 27, W, 1, '#ffffff');
        stars(p, 10, '#bff0ff', 3);
    },
    fire: (p) => {
        bands(p, [['#1a0606', 8], ['#3a0c08', 8], ['#5a1608', 8]]);
        p.rect(0, 28, W, 8, '#2a1008');
        for (let x = 0; x < W; x += 3) p.rect(x, 28 + (x % 2), 2, 1, '#ff6a1a');
        for (const x of [3, 15, 27, 41]) { p.disc(x, 30, 2, '#ff8a2a'); p.px(x, 27, '#ffd84a'); }
        stars(p, 8, '#ff9a4a', 5);
    },
    sea: (p) => {
        bands(p, [['#0a2a4a', 9], ['#0e3a62', 9], ['#124c7a', 9], ['#16608e', 9]]);
        for (let y = 6; y < H; y += 7) for (let x = (y % 2) * 3; x < W; x += 8) p.line(x, y, x + 3, y - 1, '#4ab0e0');
        for (const [x, y] of [[6, 10], [40, 6], [36, 22], [10, 26]]) { p.px(x, y, '#bfefff'); p.px(x + 1, y - 2, '#bfefff'); }
        p.rect(0, 32, W, 4, '#c8b070');
    },
    forest: (p) => {
        bands(p, [['#0e2214', 10], ['#163020', 10], ['#1c3a24', 16]]);
        for (const x of [2, 12, 22, 33, 44]) { p.disc(x, 12, 6, '#24562e'); p.disc(x, 9, 4, '#2e6a3a'); p.rect(x - 1, 16, 3, 12, '#4a3020'); }
        p.rect(0, 28, W, 8, '#2a4a20');
        for (let x = 1; x < W; x += 4) p.px(x, 28, '#5a8a3a');
    },
    sky: (p) => {
        bands(p, [['#4a9ae0', 10], ['#6ab0ea', 10], ['#8ac4f0', 16]]);
        for (const [x, y] of [[8, 7], [34, 4], [24, 16], [44, 20]]) { p.disc(x, y, 3, '#ffffff'); p.disc(x + 4, y + 1, 2, '#ffffff'); p.disc(x - 3, y + 1, 2, '#eef6ff'); }
        p.rect(0, 31, W, 5, '#5aa04a');
    },
    night: (p) => {
        bands(p, [['#0a0818', 12], ['#120e28', 12], ['#1a1438', 12]]);
        stars(p, 16, '#e8e0ff', 11);
        p.disc(40, 7, 4, '#fff6c8'); p.disc(42, 6, 3, '#120e28');
        p.rect(0, 30, W, 6, '#1e1a2e');
        for (const x of [4, 18, 30]) p.rect(x, 24, 6, 6, '#141020');
    },
    town: (p) => {
        bands(p, [['#5ab0f0', 12], ['#8acaf6', 10], ['#a8d8f8', 14]]);
        for (const [x, w, h, c] of [[1, 10, 12, '#e8c89a'], [13, 9, 15, '#d89a7a'], [24, 11, 10, '#f0d8a8'], [37, 10, 14, '#c8a080']]) {
            p.rect(x, 30 - h, w, h, c);
            p.rect(x - 1, 30 - h - 2, w + 2, 2, '#a83a2a');
            p.rect(x + 2, 30 - h + 3, 2, 2, '#4a6a9a'); p.rect(x + w - 4, 30 - h + 3, 2, 2, '#4a6a9a');
        }
        p.rect(0, 30, W, 6, '#8a8a8a'); p.rect(0, 33, W, 1, '#c8c8c8');
    },
    city: (p) => {
        bands(p, [['#0c0a22', 10], ['#1a1440', 10], ['#2a1e54', 16]]);
        stars(p, 8, '#ffffff', 4);
        for (const [x, w, h] of [[0, 7, 20], [8, 6, 28], [15, 8, 16], [24, 6, 30], [31, 9, 22], [41, 7, 26]]) {
            p.rect(x, 36 - h, w, h, '#16142a');
            for (let y = 38 - h; y < 34; y += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if ((xx * 3 + y) % 5) p.px(xx, y, '#ffd84a');
        }
    },
    castle: (p) => {
        bands(p, [['#2a1440', 10], ['#3a1c54', 10], ['#4a2468', 16]]);
        stars(p, 6, '#ffe8ff', 9);
        p.rect(10, 12, 28, 20, '#1a1028');
        for (const x of [8, 20, 34]) { p.rect(x, 6, 6, 26, '#22142e'); for (let i = 0; i < 6; i += 2) p.rect(x + i, 4, 1, 2, '#22142e'); }
        p.rect(21, 24, 4, 8, '#ffd84a'); p.rect(11, 16, 2, 3, '#ffd84a'); p.rect(35, 16, 2, 3, '#ffd84a');
        p.rect(0, 32, W, 4, '#2a1a20');
    },
    cyber: (p) => {
        bands(p, [['#040c10', 18], ['#06141a', 18]]);
        for (let x = 0; x < W; x += 6) p.line(x, 18, x < 24 ? x - 10 : x + 10, H, '#0a5a4a');
        for (let y = 20; y < H; y += 4) p.line(0, y, W, y, '#0a4a3a');
        for (let i = 0; i < 14; i++) p.rect((i * 17) % W, (i * 5) % 16, 1, 2 + (i % 3), '#3aff9a');
    },
    stage: (p) => {
        bands(p, [['#140a1e', 26], ['#3a2014', 10]]);
        p.rect(0, 0, 6, 30, '#8a1424'); p.rect(42, 0, 6, 30, '#8a1424');
        for (const [x, c] of [[14, '#ff6aa0'], [24, '#ffe04a'], [34, '#6ac8ff']]) for (let i = 0; i < 24; i++) if (i % 2 === 0) p.rect(x - Math.floor(i / 4), i, Math.floor(i / 2) + 1, 1, c);
        p.rect(0, 26, W, 2, '#6a3a20');
    },
    gym: (p) => {
        bands(p, [['#e8dcc0', 22], ['#c89a5a', 14]]);
        for (let x = 0; x < W; x += 8) p.rect(x, 22, 1, 14, '#a87a3a');
        p.rect(2, 6, 16, 2, '#6a6a7a'); p.rect(2, 4, 3, 6, '#2a2a3a'); p.rect(15, 4, 3, 6, '#2a2a3a');
        p.rect(30, 3, 14, 10, '#4a90d0'); p.rect(31, 4, 12, 8, '#8ac4f0');
    },
    beach: (p) => {
        bands(p, [['#5ab8f0', 12], ['#2a8ad0', 8], ['#f0d890', 16]]);
        p.disc(40, 6, 4, '#ffe04a');
        for (let x = 0; x < W; x += 6) p.line(x, 20, x + 3, 20, '#ffffff');
        p.rect(4, 22, 1, 10, '#8a5a2a'); p.disc(4, 21, 4, '#3a9a4a');
    },
    shrine: (p) => {
        bands(p, [['#f0a870', 10], ['#e88a6a', 10], ['#c86a5a', 16]]);
        p.rect(6, 6, 36, 3, '#c8201a'); p.rect(4, 5, 40, 1, '#2a1a1a'); p.rect(10, 11, 28, 2, '#c8201a');
        p.rect(12, 9, 3, 23, '#c8201a'); p.rect(33, 9, 3, 23, '#c8201a');
        p.rect(0, 32, W, 4, '#a8a090');
    },
    cave: (p) => {
        bands(p, [['#1a120c', 12], ['#2a1c12', 12], ['#3a2618', 12]]);
        for (let x = 0; x < W; x += 5) p.rect(x, 0, 3, 3 + (x * 7) % 6, '#120c08');
        p.rect(0, 30, W, 6, '#4a3420');
        for (const [x, y] of [[8, 20], [38, 16], [24, 26]]) { p.px(x, y, '#7affe0'); sparkle(p, x, y, '#4ac8b0', 1); }
    },
    gold: (p) => {
        bands(p, [['#3a2a08', 10], ['#5a400c', 10], ['#7a5a10', 16]]);
        for (let i = 0; i < 12; i++) p.disc((i * 11) % W, 30 + (i % 3), 2, i % 2 ? '#ffd84a' : '#e8b02a');
        for (const [x, y] of [[6, 6], [40, 10], [26, 4]]) sparkle(p, x, y, '#fff2a8', 2);
    },
    lab: (p) => {
        bands(p, [['#1e2a3a', 26], ['#3a4a5a', 10]]);
        for (const x of [4, 14, 36]) { p.rect(x, 8, 6, 14, '#2a3a4a'); p.rect(x + 1, 9, 4, 3, '#4aff9a'); p.rect(x + 1, 14, 4, 1, '#ff4a4a'); }
        p.rect(0, 26, W, 1, '#8a9aaa');
    },
    dark: (p) => {
        bands(p, [['#080408', 12], ['#140810', 12], ['#200c14', 12]]);
        for (let i = 0; i < 10; i++) p.line((i * 9) % W, 36, (i * 9 + 6) % W, 22 + (i % 4) * 2, '#3a0a1a');
        stars(p, 6, '#ff4a6a', 13);
    }
};

// ---------- エフェクト (右がわ 26〜47 あたり) ----------
export const FXS = {
    none: () => {},
    slash: (p) => { for (let i = 0; i < 3; i++) p.line(28 + i * 5, 4, 44 + i * 2, 30, i === 1 ? '#ffffff' : '#ff4a4a'); sparkle(p, 44, 6, '#ffffff', 2); },
    burst: (p) => { p.disc(38, 16, 9, '#ff8a2a'); p.disc(38, 16, 6, '#ffd84a'); p.disc(38, 16, 3, '#ffffff'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.px(38 + Math.round(Math.cos(a) * 12), 16 + Math.round(Math.sin(a) * 12), '#ffd84a'); } },
    chain: (p) => { p.rect(31, 8, 14, 10, '#3a4a6a'); p.rect(32, 9, 12, 8, '#8aa0c8'); for (let x = 28; x < 47; x += 3) { p.rect(x, 22, 2, 2, '#c8c8d8'); p.px(x + 2, 23, '#8a8a9a'); } p.line(36, 24, 36, 30, '#c8c8d8'); },
    cards: (p) => { for (const [x, y, c] of [[28, 8, '#2d6cdf'], [33, 6, '#8a4ad8'], [38, 8, '#2a9a5a']]) { p.rect(x, y, 8, 12, '#ffffff'); p.rect(x + 1, y + 1, 6, 10, c); p.px(x + 3, y + 4, '#ffd84a'); } sparkle(p, 45, 4, '#ffffff', 2); },
    muscle: (p) => { for (let i = 0; i < 5; i++) p.line(30 + i * 4, 30, 32 + i * 4, 12 + (i % 2) * 4, '#ff9a2a'); p.disc(38, 9, 4, '#ffb84a'); p.disc(42, 12, 3, '#ffb84a'); sparkle(p, 45, 4, '#fff2a8', 2); },
    aura: (p) => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; p.line(14 + Math.round(Math.cos(a) * 10), 18 + Math.round(Math.sin(a) * 10), 14 + Math.round(Math.cos(a) * 15), 18 + Math.round(Math.sin(a) * 15), '#ffe04a'); } },
    steal: (p) => { p.rect(36, 6, 9, 13, '#ffffff'); p.rect(37, 7, 7, 11, '#c83a8a'); p.line(26, 24, 36, 14, '#ffd84a', 2); p.px(36, 13, '#ffd84a'); p.px(35, 12, '#ffd84a'); p.disc(26, 26, 3, '#2a1a2a'); },
    shield: (p) => { p.rect(31, 6, 14, 14, '#2a5ac8'); p.rect(33, 20, 10, 4, '#2a5ac8'); p.rect(35, 24, 6, 3, '#2a5ac8'); p.rect(33, 8, 10, 10, '#6ab0ff'); p.rect(37, 9, 2, 12, '#ffffff'); p.rect(34, 13, 8, 2, '#ffffff'); },
    whirl: (p) => { for (let i = 0; i < 40; i++) { const a = i / 4, r = i / 3; p.px(38 + Math.round(Math.cos(a) * r), 16 + Math.round(Math.sin(a) * r), i % 2 ? '#bff0ff' : '#ffffff'); } },
    note: (p) => { for (const [x, y, c] of [[30, 10, '#ff6aa0'], [38, 6, '#ffe04a'], [42, 18, '#6ac8ff']]) { p.disc(x, y + 6, 2, c); p.line(x + 2, y, x + 2, y + 6, c); p.line(x + 2, y, x + 5, y + 2, c); } },
    clash: (p) => { p.line(28, 6, 46, 28, '#d0d8e8', 2); p.line(46, 6, 28, 28, '#d0d8e8', 2); p.rect(27, 26, 3, 3, '#8a5a2a'); p.rect(44, 26, 3, 3, '#8a5a2a'); p.disc(37, 17, 3, '#ffe04a'); sparkle(p, 37, 17, '#ffffff', 5); },
    portal: (p) => { p.disc(38, 18, 9, '#4a1a8a'); p.disc(38, 18, 7, '#8a4ad8'); p.disc(38, 18, 4, '#c8a4ff'); p.disc(38, 18, 1, '#ffffff'); sparkle(p, 30, 6, '#c8a4ff', 2); },
    sparkle: (p) => { for (const [x, y, r] of [[32, 6, 2], [42, 12, 3], [36, 24, 2], [45, 28, 1]]) sparkle(p, x, y, '#fff6c8', r); },
    ice: (p) => { for (const [x, y] of [[32, 8], [40, 14], [34, 22], [44, 26]]) { p.rect(x, y, 3, 6, '#bff0ff'); p.px(x + 1, y - 1, '#ffffff'); p.rect(x, y + 6, 3, 1, '#4aa8e0'); } },
    fire: (p) => { for (const [x, y, s] of [[32, 26, 6], [40, 22, 9], [46, 28, 5]]) { p.disc(x, y, Math.ceil(s / 3), '#ff4a1a'); for (let i = 0; i < s; i++) p.rect(x - Math.max(0, 2 - Math.floor(i / 3)), y - i, Math.max(1, 5 - Math.floor(i / 2)), 1, i < s / 2 ? '#ff8a2a' : '#ffd84a'); } },
    thunder: (p) => { const pts = [[40, 0], [34, 12], [40, 12], [32, 30]]; for (let i = 0; i < 3; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#ffe04a', 2); sparkle(p, 32, 30, '#ffffff', 2); },
    beam: (p) => { p.rect(22, 15, 26, 5, '#ff6aa0'); p.rect(22, 16, 26, 3, '#ffd8ea'); p.rect(22, 17, 26, 1, '#ffffff'); sparkle(p, 22, 17, '#ffffff', 3); },
    heart: (p) => { for (const [x, y] of [[34, 10], [42, 20]]) { p.disc(x - 2, y, 2, '#ff4a7a'); p.disc(x + 2, y, 2, '#ff4a7a'); for (let i = 0; i < 4; i++) p.rect(x - 3 + i, y + 1 + i, 7 - i * 2, 1, '#ff4a7a'); } },
    skull: (p) => { p.disc(38, 14, 6, '#e8e8e8'); p.rect(35, 18, 7, 5, '#e8e8e8'); p.rect(35, 12, 2, 3, '#1a1a1a'); p.rect(40, 12, 2, 3, '#1a1a1a'); p.rect(36, 21, 1, 2, '#1a1a1a'); p.rect(39, 21, 1, 2, '#1a1a1a'); },
    wave: (p) => { for (let y = 8; y < 32; y += 6) for (let x = 26; x < W; x++) p.px(x, y + Math.round(Math.sin(x / 2) * 2), '#6ac8ff'); },
    coin: (p) => { for (const [x, y] of [[32, 8], [40, 14], [35, 22], [44, 26]]) { p.disc(x, y, 3, '#e8b02a'); p.disc(x, y, 2, '#ffd84a'); p.px(x, y, '#fff2a8'); } },
    smoke: (p) => { for (const [x, y, r] of [[32, 22, 5], [40, 16, 6], [44, 26, 4], [36, 10, 4]]) { p.disc(x, y, r, '#8a8a9a'); p.disc(x - 1, y - 1, r - 2, '#c8c8d8'); } },
    up: (p) => { for (const x of [32, 40]) { p.rect(x - 1, 12, 3, 16, '#4aff9a'); for (let i = 0; i < 5; i++) p.rect(x - i, 8 + i, i * 2 + 1, 1, '#4aff9a'); } }
};

// 組み合わせの 絵を 描く。spec = { bg, char, fx, land, flip, tint }
export function paintCombo(p, spec) {
    BGS[spec.bg](p);
    if (spec.char) {
        if (spec.land) p.fit(spec.char, spec.flip ? 30 : 2, 18, 16, { flip: spec.flip, tint: spec.tint });
        else p.fit(spec.char, spec.flip ? 18 : 1, 3, 32, { flip: spec.flip, tint: spec.tint });
    }
    FXS[spec.fx || 'none'](p);
}
