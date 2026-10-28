// カードの 絵の 確認 (どの 絵も ちゃんと あって、大きさが そろっているか)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ART, CARD_ART } from '../src/art/index.js';
import { CARDS } from '../src/data/cards.js';

test('CARD_ART の 絵は ぜんぶ ある', () => {
    for (const [no, key] of Object.entries(CARD_ART)) assert.ok(ART[key], `${no}: ${key}`);
});

test('モンスターと アイテムは ぜんぶ 絵が ある (ユーザー指定)', () => {
    for (const c of CARDS.filter((c) => c.kind === 'monster' || c.kind === 'item')) assert.ok(CARD_ART[c.no], c.name);
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
