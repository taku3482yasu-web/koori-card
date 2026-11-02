// パック・ポイント・デッキ作りの 確認 (docs/pack1.md。2026-11-03 ユーザー OK)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    newCollection, openPack, buyPack, addResult, rollRare, deckOf, deckErrors, deckLimit, saveDeck, loadCollection, saveCollection,
    PACK_CARDS, PACK_PRICE, FREE_PACKS, SECRET_RATE
} from '../src/logic/collection.js';
import { cardByNo } from '../src/data/cards.js';
import { buddyChoices, starterDeck } from '../src/logic/game.js';

function seeded(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

test('はじめに 3 パック。勝つと 100・負けると 30 ポイント。300 ポイントで 1 パック', () => {
    const c = newCollection();
    assert.equal(c.packs, FREE_PACKS);
    assert.equal(c.points, 0);
    assert.equal(buyPack(c), false);
    assert.equal(addResult(c, true), 100);
    assert.equal(addResult(c, false), 30);
    c.points = PACK_PRICE;
    assert.equal(buyPack(c), true);
    assert.equal(c.points, 0);
    assert.equal(c.packs, FREE_PACKS + 1);
});

test('1 パック 5 枚: N ×3・U ×1・R 以上 ×1。パックが なければ あけられない', () => {
    const c = newCollection();
    const rand = seeded(7);
    for (let i = 0; i < FREE_PACKS; i++) {
        const got = openPack(c, rand);
        assert.equal(got.length, 5);
        assert.deepEqual(got.slice(0, 4).map((x) => x.rarity), ['N', 'N', 'N', 'U']);
        assert.ok(['R', 'VR', 'SR', 'HR', 'OR'].includes(got[4].rarity));
        for (const x of got) assert.equal(cardByNo(x.no).rarity, x.rarity);
    }
    assert.equal(openPack(c, rand), null);
    const total = Object.values(c.owned).reduce((a, b) => a + b, 0) + Object.values(c.secret).reduce((a, b) => a + b, 0);
    assert.equal(total, 15);
});

test('R 以上の 出かた (R 55%・VR 22%・SR 14%・HR 6%・OR 3%) と シークレット (SR 以上の 10%)', () => {
    const rand = seeded(42);
    const n = 40000;
    const count = {};
    for (let i = 0; i < n; i++) { const r = rollRare(rand); count[r] = (count[r] || 0) + 1; }
    const near = (r, p) => assert.ok(Math.abs(count[r] / n - p) < 0.01, `${r} ${count[r] / n}`);
    near('R', 0.55); near('VR', 0.22); near('SR', 0.14); near('HR', 0.06); near('OR', 0.03);
    const c = newCollection();
    c.packs = 3000;
    let high = 0, secret = 0;
    for (let i = 0; i < 3000; i++) for (const x of openPack(c, rand)) {
        if (['SR', 'HR', 'OR'].includes(x.rarity)) { high++; if (x.secret) secret++; } else assert.equal(x.secret, false);
    }
    assert.ok(Math.abs(secret / high - SECRET_RATE) < 0.03, `${secret}/${high}`);
});

test('デッキ作り: 50 枚・4 枚まで・パックの カードは 持っている 枚数まで・ほかの チームの カードは 入らない', () => {
    const c = newCollection();
    assert.deepEqual(deckOf(c, 'koori'), starterDeck('koori'));
    assert.deepEqual(deckErrors(c, 'koori', deckOf(c, 'koori')), []);
    const sword = PACK_CARDS.find((x) => x.name === 'こおりくん・絶対殺すソード');
    assert.equal(deckLimit(c, 'koori', sword.no), 0);
    c.owned[sword.no] = 2;
    assert.equal(deckLimit(c, 'koori', sword.no), 2);
    c.owned[sword.no] = 9;
    assert.equal(deckLimit(c, 'koori', sword.no), 4);
    assert.equal(deckLimit(c, 'oni', sword.no), 0);
    const list = deckOf(c, 'koori');
    list.splice(0, 3, sword.no, sword.no, sword.no);
    assert.deepEqual(deckErrors(c, 'koori', list), []);
    assert.equal(saveDeck(c, 'koori', list), true);
    assert.equal(deckOf(c, 'koori').filter((no) => no === sword.no).length, 3);
    assert.ok(deckErrors(c, 'koori', list.slice(1)).length);
    const oni = list.slice();
    oni[10] = 31;
    assert.ok(deckErrors(c, 'koori', oni).length);
    assert.equal(saveDeck(c, 'koori', oni), false);
});

test('バディ: パックの モンスターは 持っていれば えらべる', () => {
    const c = newCollection();
    const sword = PACK_CARDS.find((x) => x.name === 'こおりくん・絶対殺すソード');
    assert.ok(!buddyChoices('koori').some((x) => x.no === sword.no));
    c.owned[sword.no] = 1;
    assert.ok(buddyChoices('koori', (no) => (c.owned[no] || 0) > 0).some((x) => x.no === sword.no));
});

test('保存して 読みなおせる (こわれていたら はじめから)', () => {
    const mem = new Map();
    const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
    const c = newCollection();
    c.points = 230;
    c.owned[301] = 2;
    saveCollection(storage, c);
    const d = loadCollection(storage);
    assert.equal(d.points, 230);
    assert.equal(d.owned[301], 2);
    mem.set('koori-card-collection', '{broken');
    assert.equal(loadCollection(storage).points, 0);
    assert.equal(loadCollection(null).packs, FREE_PACKS);
});
