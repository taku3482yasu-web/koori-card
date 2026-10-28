// =====================================================================
// 技の 魔法・場面の 絵 (このゲームで 描いた。48 × 36 ドット)
// ---------------------------------------------------------------------
// 技は「その キャラが 技を 放つ ところ」(2026-10-28 ユーザー指定)。キャラは 前作の 絵 (legacy-art.js) を そのまま 使い、
// 武器・エフェクト・背景を 描きたす。場面は ダンジョンの 景色を 1 枚の 絵に した。
//   paint(p): p.rect / p.px / p.line / p.disc / p.art (前作の 絵を 置く。scale 2 で 2 倍・0.5 で 半分、skip で 消す 色の 文字)
// =====================================================================
export const W = 48;
export const H = 36;

// 空や 床の 帯 (上から [色, 行数])
function bands(p, list) {
    let y = 0;
    for (const [c, n] of list) { p.rect(0, y, W, n, c); y += n; }
    p.rect(0, y, W, H - y, list[list.length - 1][0]);
}
// キラッ (十字の 光)
function sparkle(p, x, y, c = '#ffffff', r = 2) {
    p.line(x - r, y, x + r, y, c);
    p.line(x, y - r, x, y + r, c);
}
// 炎の しずく 1 つ (下が 丸く 上が とがる)
function flame(p, x, y, h, outer, inner) {
    const r = Math.max(2, Math.round(h / 3));
    p.disc(x, y, r, outer);
    for (let i = 1; i <= h - r; i++) {
        const w = Math.max(0, Math.round(r * (1 - i / (h - r + 1))));
        p.rect(x - w, y - r - i + 1, w * 2 + 1, 1, outer);
    }
    p.disc(x, y + 1, Math.max(1, r - 1), inner);
}

export const SCENES = {
    // ---------- 技 ----------
    // コオリハンマー：こおりくんが 氷の ハンマーを ふりおろす
    'scene:koori_hammer': (p) => {
        bands(p, [['#14203a', 8], ['#1b2c4c', 10], ['#22385e', 12], ['#3a5a80', 6]]);
        p.rect(0, 31, W, 5, '#cfe8f8');
        p.rect(0, 31, W, 1, '#ffffff');
        // ふった あとの 弧
        for (let a = 0; a < 6; a++) p.px(18 + a * 2, 14 - Math.round(Math.sin(a / 2) * 8), '#7fd3f7');
        p.art('sprite:koori', 0, 3, { scale: 2 });
        // 柄と 氷の ブロック
        p.line(27, 21, 36, 13, '#6a4a2a', 2);
        p.rect(31, 1, 16, 14, '#1b3a6b');
        p.rect(32, 2, 14, 12, '#7fd3f7');
        p.rect(32, 2, 14, 4, '#bff0ff');
        p.rect(33, 3, 5, 1, '#ffffff');
        p.rect(33, 4, 2, 1, '#ffffff');
        p.rect(32, 11, 14, 3, '#4aa8e0');
        // 地面に ヒビと 氷の かけら
        p.line(38, 31, 34, 34, '#4aa8e0');
        p.line(40, 31, 44, 35, '#4aa8e0');
        sparkle(p, 44, 25, '#ffffff', 2);
        sparkle(p, 30, 27, '#bff0ff', 1);
    },
    // 四天王絶対殺す剣：こおりくんが 虹色の 大剣を かかげる
    'scene:shitennou_sword': (p) => {
        bands(p, [['#1a0f2e', 10], ['#24143e', 10], ['#2e1a4e', 16]]);
        // 後光
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            p.line(36, 10, 36 + Math.round(Math.cos(a) * 14), 10 + Math.round(Math.sin(a) * 14), '#3e2a6a');
        }
        p.art('sprite:koori', 2, 4, { scale: 2 });
        const rainbow = ['#ff4a4a', '#ff9a3a', '#ffe04a', '#5ae07a', '#4ab0ff', '#9a6aff'];
        for (let i = 0; i < 18; i++) {
            const x = 29 + i;
            const y = 21 - i;
            p.rect(x, y, 2, 2, rainbow[Math.floor(i / 3) % rainbow.length]);
            p.px(x, y, '#ffffff');
        }
        p.rect(26, 21, 5, 2, '#ffd84a');   // つば
        p.rect(27, 23, 2, 3, '#8a5a2a');   // 柄
        sparkle(p, 45, 3, '#ffffff', 2);
        sparkle(p, 38, 6, '#ffe04a', 1);
        sparkle(p, 41, 16, '#bff0ff', 1);
    },
    // こおりのいき：こおりくんが 冷たい 息を ふきかける
    'scene:koori_breath': (p) => {
        bands(p, [['#10203a', 12], ['#163050', 12], ['#1e4068', 12]]);
        p.art('sprite:koori', 0, 4, { scale: 2 });
        // 口から 右へ 広がる 息
        for (let x = 24; x < W; x++) {
            const spread = Math.round((x - 24) / 3);
            for (let y = 20 - spread; y <= 20 + spread; y++) {
                if ((x + y * 3) % 5 === 0) p.px(x, y, '#bff0ff');
                if ((x * 7 + y) % 11 === 0) p.px(x, y, '#ffffff');
            }
        }
        // 雪の 結晶
        for (const [x, y] of [[36, 12], [42, 26], [44, 16]]) {
            sparkle(p, x, y, '#ffffff', 2);
            p.px(x - 1, y - 1, '#bff0ff'); p.px(x + 1, y + 1, '#bff0ff'); p.px(x - 1, y + 1, '#bff0ff'); p.px(x + 1, y - 1, '#bff0ff');
        }
    },
    // 鬼鬼の金棒：おにおにが 金棒を ふりおろす
    'scene:oni_kanabo': (p) => {
        bands(p, [['#2a1010', 10], ['#3a1612', 12], ['#4a1e14', 8], ['#6a3a20', 6]]);
        p.rect(0, 31, W, 5, '#5a3a20');
        for (let a = 0; a < 7; a++) p.px(22 + a * 2, 10 - Math.round(Math.sin(a / 2.2) * 5), '#ff9a6a');
        p.art('sprite:onioni', 0, 3, { scale: 2, skip: 'gs' });   // 前作の 金棒を 消して、ふりかぶった 金棒を 描く
        p.line(25, 18, 33, 11, '#4a3a2a', 2);
        p.line(32, 12, 42, 3, '#4a3a2a', 5);
        for (const [x, y] of [[34, 9], [37, 6], [40, 3], [36, 11], [39, 8], [42, 5]]) p.px(x, y, '#d0d0d0');
        // 地面に 衝撃
        p.line(36, 31, 32, 35, '#2a1a10');
        p.line(42, 31, 46, 35, '#2a1a10');
        sparkle(p, 44, 26, '#ffe040', 2);
        sparkle(p, 38, 27, '#ff9a3a', 1);
    },
    // 亜祖宇激烈破：大魔王ASO の まわりが 爆発する
    'scene:aso_burst': (p) => {
        bands(p, [['#1a0606', 8], ['#2e0a08', 10], ['#4a120a', 10], ['#6a1a0a', 8]]);
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            p.line(24, 18, 24 + Math.round(Math.cos(a) * 26), 18 + Math.round(Math.sin(a) * 22), i % 2 ? '#8a2a10' : '#c04a1a');
        }
        p.disc(24, 18, 15, '#ff7a1a');
        p.disc(24, 18, 12, '#ffb030');
        p.art('big:maou', 8, 2, { scale: 0.5 });
        for (const [x, h] of [[3, 9], [9, 6], [40, 8], [45, 10], [15, 5], [33, 6]]) flame(p, x, 33, h, '#ff5a1a', '#ffe060');
        sparkle(p, 6, 6, '#ffe060', 2);
        sparkle(p, 42, 5, '#ffe060', 2);
    },
    // 鬼火：おにおにが 火の玉を 飛ばす
    'scene:onibi': (p) => {
        bands(p, [['#120a1e', 12], ['#1a0e28', 12], ['#221232', 12]]);
        p.rect(0, 32, W, 4, '#2a1a30');
        p.art('sprite:onioni', 0, 4, { scale: 2 });
        for (const [x, y, r] of [[30, 16, 3], [38, 10, 4], [44, 20, 3]]) {
            for (let t = 1; t <= 4; t++) p.px(x - r - t * 2, y + (t % 2), '#ff7a3a');
            p.disc(x, y, r, '#ff5a1a');
            p.disc(x, y, r - 1, '#ffb040');
            p.px(x - 1, y - 1, '#fff4c0');
        }
    },

    // ---------- 場面 ----------
    // 雪どけの氷河：とけはじめた 氷河と 春の 芽
    'scene:glacier': (p) => {
        bands(p, [['#8fd0ff', 6], ['#a8dcff', 6], ['#c4e8ff', 4]]);
        for (const [x, w, h] of [[-4, 20, 10], [12, 22, 13], [30, 22, 11]]) {
            for (let i = 0; i < h; i++) p.rect(x + w / 2 - i, 16 - h + i, i * 2 + 1, 1, i < 3 ? '#ffffff' : '#9ab8d8');
        }
        p.rect(0, 16, W, 10, '#d8f0ff');
        p.rect(0, 16, W, 1, '#ffffff');
        for (const x of [6, 17, 29, 40]) p.line(x, 17, x + 3, 25, '#7fb8e0');
        p.rect(0, 26, W, 10, '#5a9a4a');
        p.rect(0, 26, W, 1, '#7ac06a');
        p.line(10, 26, 30, 35, '#4a90d8', 2);   // とけた 水の 流れ
        for (const [x, y] of [[4, 30], [38, 29], [44, 33], [24, 31]]) { p.px(x, y, '#ffb0c8'); p.px(x + 1, y - 1, '#7ae07a'); }
        for (const [x, y] of [[8, 8], [26, 4], [40, 10]]) p.px(x, y, '#ffb0c8');
    },
    // 浦の島の海岸どうくつ：どうくつの 中の 海と 重蔵の 家
    'scene:sea_cave': (p) => {
        bands(p, [['#3a2a20', 36]]);
        p.disc(24, 30, 26, '#1a3a5a');
        p.disc(24, 30, 22, '#2a5a8a');
        p.disc(34, 10, 3, '#fff4c0');            // どうくつの 外の 光
        p.rect(0, 26, W, 10, '#2a6aa8');
        for (let x = 0; x < W; x += 4) p.rect(x, 26 + (x % 8 ? 1 : 0), 2, 1, '#bfe8ff');
        p.rect(4, 23, 20, 4, '#e0c890');          // 砂
        // 重蔵の 家
        p.rect(8, 15, 10, 8, '#c08a50');
        for (let i = 0; i < 5; i++) p.rect(7 + i, 15 - i, 12 - i * 2, 1, '#8a3a2a');
        p.rect(12, 19, 3, 4, '#5a3a20');
        p.rect(9, 17, 2, 2, '#ffe680');
        for (const [x, y] of [[0, 0], [44, 2], [2, 20], [45, 22]]) p.disc(x, y, 5, '#2a1e16');
    },
    // ASOの壺の底：溶岩の たまる 底
    'scene:aso_pit': (p) => {
        bands(p, [['#0e0808', 8], ['#1e0e0a', 10], ['#2e140c', 8]]);
        for (const [x, w] of [[0, 8], [40, 8]]) p.rect(x, 0, w, 28, '#2a1a14');
        p.rect(8, 4, 2, 24, '#3a2418');
        p.rect(38, 4, 2, 24, '#3a2418');
        p.rect(0, 26, W, 10, '#c03a10');
        for (let x = 0; x < W; x++) {
            p.px(x, 26 + ((x * 5) % 3), '#ff7a1a');
            if (x % 5 === 0) p.px(x, 30 + (x % 3), '#ffd040');
        }
        p.disc(24, 31, 3, '#ffd040');
        for (const [x, y] of [[14, 20], [30, 16], [22, 10], [34, 22]]) p.px(x, y, '#ff9a3a');
        for (const [x, y] of [[18, 14], [27, 8]]) p.disc(x, y, 2, '#3a3030');   // けむり
    },
    // ネット寺：アンテナの 立つ お寺と 光る 画面
    'scene:net_temple': (p) => {
        bands(p, [['#0e1430', 10], ['#162048', 10], ['#1e2a5a', 6]]);
        for (const [x, y] of [[4, 4], [12, 8], [40, 3], [44, 12], [30, 2]]) p.px(x, y, '#ffffff');
        // 屋根と 本堂
        for (let i = 0; i < 8; i++) p.rect(10 - i, 12 + i, 28 + i * 2, 1, i === 0 ? '#5a4a3a' : '#3a2a20');
        p.rect(6, 20, 36, 10, '#8a2a20');
        for (const x of [8, 16, 30, 38]) p.rect(x, 20, 2, 10, '#5a1a14');
        p.rect(19, 22, 10, 7, '#1a2a3a');          // 画面
        p.rect(20, 23, 8, 5, '#4ae0ff');
        p.rect(21, 24, 3, 1, '#ffffff');
        p.rect(0, 30, W, 6, '#4a4a5a');
        // アンテナと 電波
        p.line(24, 12, 24, 4, '#c8c8d8');
        p.px(24, 3, '#ff4a4a');
        for (const r of [3, 6]) { p.px(24 - r, 4 - Math.floor(r / 2), '#4ae0ff'); p.px(24 + r, 4 - Math.floor(r / 2), '#4ae0ff'); p.px(24 - r + 1, 3 - Math.floor(r / 2), '#4ae0ff'); p.px(24 + r - 1, 3 - Math.floor(r / 2), '#4ae0ff'); }
        p.disc(4, 24, 2, '#ffb040');                // ちょうちん
        p.disc(44, 24, 2, '#ffb040');
    }
};

// 絵を 色の 表 (H 行 × W 列。null は とうめい) に する
export function paintScene(key, ART) {
    const grid = Array.from({ length: H }, () => Array(W).fill(null));
    const px = (x, y, c) => {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < W && y >= 0 && y < H && c) grid[y][x] = c;
    };
    const p = {
        px,
        rect(x, y, w, h, c) { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) px(x + xx, y + yy, c); },
        line(x0, y0, x1, y1, c, t = 1) {
            const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
            const o = Math.floor((t - 1) / 2);
            for (let i = 0; i <= n; i++) {
                const x = Math.round(x0 + ((x1 - x0) * i) / n);
                const y = Math.round(y0 + ((y1 - y0) * i) / n);
                for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) px(x - o + a, y - o + b, c);
            }
        },
        disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) px(cx + x, cy + y, c); },
        art(key2, x, y, { scale = 1, skip = '' } = {}) {
            const a = ART[key2];
            if (!a) throw new Error(`絵が ない: ${key2}`);
            if (scale >= 1) {
                a.rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
                    if (ch === '.' || skip.includes(ch)) return;
                    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) px(x + rx * scale + sx, y + ry * scale + sy, a.palette[ch]);
                }));
            } else {
                const step = Math.round(1 / scale);
                for (let ry = 0; ry < a.h; ry += step) for (let rx = 0; rx < a.w; rx += step) {
                    const ch = a.rows[ry][rx];
                    if (ch !== '.' && !skip.includes(ch)) px(x + rx / step, y + ry / step, a.palette[ch]);
                }
            }
        }
    };
    SCENES[key](p);
    return grid;
}
