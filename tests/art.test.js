// カードの 絵の 確認 (どの 絵も ちゃんと あって、大きさが そろっているか)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ART, CARD_ART, artGrid } from '../src/art/index.js';
import { SCENES, W, H } from '../src/art/scenes.js';
import { CARDS } from '../src/data/cards.js';

test('CARD_ART の 絵は ぜんぶ ある', () => {
    for (const [no, key] of Object.entries(CARD_ART)) assert.ok(ART[key] || SCENES[key], `${no}: ${key}`);
});

test('60 種 ぜんぶ 絵が ある (ユーザー指定)', () => {
    for (const c of CARDS) assert.ok(CARD_ART[c.no], c.name);
});

test('技・場面の 絵は 48 × 36 で、すみずみまで 描いてある (前作の キャラも 入る)', () => {
    for (const key of Object.keys(SCENES)) {
        const g = artGrid(key);
        assert.equal(g.length, H, key);
        assert.ok(g.every((r) => r.length === W), key);
        const filled = g.flat().filter(Boolean).length;
        assert.ok(filled > W * H * 0.9, `${key}: ${filled}`);
    }
});

test('絵の 行は w 文字 × h 行で、色は パレットに ある', () => {
    for (const [key, a] of Object.entries(ART)) {
        assert.equal(a.rows.length, a.h, key);
        for (const r of a.rows) {
            assert.equal(r.length, a.w, `${key}: ${r}`);
            for (const ch of r) assert.ok(ch === '.' || a.palette[ch], `${key}: ${ch}`);
        }
    }
});
