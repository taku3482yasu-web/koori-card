// カードの データの 確認 (docs/cards.md と ルール資料の 決まりに 合っているか)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, RACES, KINDS, DECKS, TEAMS, RARITIES, SECRET, cardByNo, fitsDeck } from '../src/data/cards.js';

test('カードは 313 種 (スターター 211 + パック 第1弾 102) で 番号が かぶらず、v0.1 の 1〜60 も のこっている (2026-11-03)', () => {
    assert.equal(CARDS.length, 313);
    assert.equal(CARDS.filter((c) => c.pack === 1).length, 102);
    assert.equal(new Set(CARDS.map((c) => c.no)).size, CARDS.length);
    for (let no = 1; no <= 60; no++) assert.ok(cardByNo(no), no);
});

test('どの カードも チーム (右上の エンブレム) か ノーブランド', () => {
    for (const c of CARDS) assert.ok(TEAMS[c.team], c.name);
    assert.equal(Object.keys(TEAMS).length, 9);
});

test('名前が かぶっていない', () => {
    assert.equal(new Set(CARDS.map((c) => c.name)).size, CARDS.length);
});

test('モンスターは 種族 と パワー、魔法・場面は 属性 (7 属性) を持ち、アイテムは どちらも 持たない', () => {
    for (const c of CARDS) {
        assert.ok(KINDS[c.kind], c.name);
        if (c.kind === 'monster') {
            assert.ok(RACES.includes(c.race), c.name);
            assert.ok(c.power > 0 && c.power % 1000 === 0, c.name);
        } else {
            if (c.kind === 'item') assert.equal(c.race, undefined, c.name);
            else assert.ok(RACES.includes(c.race), c.name);
            assert.equal(c.power, undefined, c.name);
        }
        assert.ok([1, 2, 3].includes(c.lv), c.name);
    }
});

test('スターターデッキ 8 つ: 50 枚・約 30 種・その チームと ノーブランドだけ・4 枚まで (2026-11-03)', () => {
    assert.deepEqual(Object.keys(DECKS).sort(), ['5dx', 'ask3', 'bariki', 'bartas', 'kemono', 'koori', 'muscle', 'oni']);
    for (const [id, d] of Object.entries(DECKS)) {
        assert.equal(d.list.reduce((n, [, k]) => n + k, 0), 50, d.name);
        assert.ok(d.list.length >= 29 && d.list.length <= 33, `${d.name} ${d.list.length} 種`);
        for (const [no, n] of d.list) {
            assert.ok(fitsDeck(cardByNo(no), id), `${d.name} に ${cardByNo(no).name}`);
            assert.ok(n <= cardByNo(no).max, `${d.name} ${cardByNo(no).name}`);
        }
        assert.equal(cardByNo(d.buddy).team, id, d.name);
    }
});

test('ばりきつよめの こおりくん・おにおには 氷隊・鬼鬼団とは 別の カード', () => {
    assert.ok(CARDS.some((c) => c.name === 'こおりくん（ばりきつよめ）' && c.team === 'bariki'));
    assert.ok(CARDS.some((c) => c.name === 'こおりくん（氷隊）' && c.team === 'koori'));
    assert.ok(CARDS.some((c) => c.name === 'おにおに（ばりきつよめ）' && c.team === 'bariki'));
    assert.ok(CARDS.some((c) => c.name === 'おにおに（鬼鬼団）' && c.team === 'oni'));
});

test('魔法の 属性: ふるカワ・ともいし・道具は ふつう、キャラの 技は その キャラと 同じ', () => {
    for (const no of [22, 23, 24, 52, 53, 54]) assert.equal(cardByNo(no).race, 'ふつう', cardByNo(no).name);
    assert.equal(cardByNo(19).race, cardByNo(1).race);    // コオリハンマー = こおりくん
    assert.equal(cardByNo(49).race, cardByNo(31).race);   // 鬼鬼の金棒 = おにおに
});

test('パック 第1弾: レア度は N〜OR・どの デッキにも HR と OR が ある・スターターデッキには 入っていない (2026-11-03)', () => {
    const pack = CARDS.filter((c) => c.pack === 1);
    for (const c of pack) assert.ok(RARITIES.includes(c.rarity), c.name);
    for (const team of Object.keys(DECKS)) {
        for (const r of ['HR', 'OR']) assert.ok(pack.some((c) => c.team === team && c.rarity === r), `${team} ${r}`);
    }
    for (const r of RARITIES) assert.ok(pack.some((c) => c.rarity === r), r);
    for (const d of Object.values(DECKS)) for (const [no] of d.list) assert.ok(!cardByNo(no).pack, `${d.name} ${no}`);
    assert.deepEqual(Object.keys(SECRET).sort(), ['HR', 'OR', 'SR']);
});
