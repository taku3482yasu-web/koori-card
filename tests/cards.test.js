// カードの データの 確認 (docs/cards.md と ルール資料の 決まりに 合っているか)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, RACES, KINDS, DECKS, cardByNo } from '../src/data/cards.js';

test('カードは 60 種で 番号が 1〜60', () => {
    assert.equal(CARDS.length, 60);
    assert.deepEqual(CARDS.map((c) => c.no), Array.from({ length: 60 }, (_, i) => i + 1));
});

test('名前が かぶっていない', () => {
    assert.equal(new Set(CARDS.map((c) => c.name)).size, CARDS.length);
});

test('モンスターは 種族 (7 属性) と パワーを持ち、ほかは 持たない', () => {
    for (const c of CARDS) {
        assert.ok(KINDS[c.kind], c.name);
        if (c.kind === 'monster') {
            assert.ok(RACES.includes(c.race), c.name);
            assert.ok(c.power > 0 && c.power % 1000 === 0, c.name);
        } else {
            assert.equal(c.race, undefined, c.name);
            assert.equal(c.power, undefined, c.name);
        }
        assert.ok([1, 2, 3].includes(c.lv), c.name);
    }
});

test('構築済みデッキは それぞれ 30 種で、4 枚まで入れて 50 枚 組める', () => {
    for (const [id, d] of Object.entries(DECKS)) {
        const list = CARDS.filter((c) => c.deck === id);
        assert.equal(list.length, 30, d.name);
        assert.ok(list.reduce((n, c) => n + c.max, 0) >= 50, d.name);
        assert.equal(cardByNo(d.buddy).deck, id, d.name);
    }
});
