// たいせんの ルールの 確認 (CPU どうしで 何回も 遊ばせる + ルール資料の 決まりごと)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, starterDeck, DECK_SIZE } from '../src/logic/game.js';
import { cpuTurn } from '../src/logic/cpu.js';
import { cardByNo } from '../src/data/cards.js';

function seeded(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

// カードの 数が 増えたり 減ったり していないか (デッキ 50 + バディ 1)
function countCards(p) {
    return p.deck.length + p.hand.length + p.shields.length + p.grave.length
        + p.field.length + p.field.filter((u) => u.item).length + (p.buddy ? 1 : 0) + (p.scene ? 1 : 0);
}

async function cpuGame(seed, decks = ['koori', 'oni']) {
    const g = new Game({ players: decks.map((d, i) => ({ name: `CPU${i}`, deck: d, cpu: true })), rand: seeded(seed) });
    await g.start();
    for (let t = 0; t < 200 && g.winner === null; t++) {
        await cpuTurn(g, g.players[g.active]);
        for (const p of g.players) assert.equal(countCards(p), DECK_SIZE + 1, `seed ${seed} turn ${g.turn}`);
        for (const p of g.players) assert.ok(p.field.length <= p.lv + 2);
    }
    return g;
}

test('構築済みデッキは 50 枚で、同じ カードは 4 枚 (大魔王ASO は 1 枚) まで', () => {
    for (const id of ['koori', 'oni']) {
        const deck = starterDeck(id);
        assert.equal(deck.length, DECK_SIZE);
        const counts = {};
        for (const no of deck) counts[no] = (counts[no] || 0) + 1;
        for (const [no, n] of Object.entries(counts)) assert.ok(n <= cardByNo(+no).max, `${id} ${no}`);
    }
});

test('はじめは シールド 5・手札 6・山札 39・Lv1', () => {
    const g = new Game({ players: [{ name: 'A', deck: 'koori' }, { name: 'B', deck: 'oni' }], rand: seeded(1) });
    for (const p of g.players) {
        assert.equal(p.shields.length, 5);
        assert.equal(p.hand.length, 6);
        assert.equal(p.deck.length, 39);
        assert.equal(p.lv, 1);
    }
});

test('CPU どうしで 300 回 遊んで、ぜんぶ 決着する (カードの 数も 正しい)', async () => {
    const wins = [0, 0];
    for (let s = 1; s <= 300; s++) {
        const g = await cpuGame(s, s % 2 ? ['koori', 'oni'] : ['oni', 'koori']);
        assert.notEqual(g.winner, null, `seed ${s} が 終わらない`);
        wins[g.players[g.winner].deckId === 'koori' ? 0 : 1]++;
    }
    console.log(`氷隊 ${wins[0]} 勝 / 鬼鬼団 ${wins[1]} 勝`);
});

test('先攻の 最初の ターンは 引かない', async () => {
    const g = new Game({ players: [{ name: 'A', deck: 'koori', cpu: true }, { name: 'B', deck: 'oni', cpu: true }], first: 0, rand: seeded(2) });
    await g.start();
    assert.equal(g.players[0].hand.length, 6);
    await g.endTurn();
    assert.equal(g.players[1].hand.length, 7);
});

test('山札が 0 枚に なった 瞬間に 負け', async () => {
    const g = new Game({ players: [{ name: 'A', deck: 'koori', cpu: true }, { name: 'B', deck: 'oni', cpu: true }], first: 0, rand: seeded(3) });
    await g.start();
    g.players[1].deck.splice(1);   // B の 山札を 1 枚に
    await g.endTurn();             // B が 最後の 1 枚を 引く
    assert.equal(g.winner, 0);
});

test('シールド 0 枚の 相手に 攻撃が 通ると ダイレクトアタックで 勝ち', async () => {
    const g = new Game({ players: [{ name: 'A', deck: 'koori', cpu: true }, { name: 'B', deck: 'oni', cpu: true }], first: 0, rand: seeded(4) });
    await g.start();
    const a = g.players[0];
    const u = await g.enter(a, { ...cardByNo(5), uid: 9001 });
    u.enteredTurn = 0;
    g.players[1].hand.push(...g.players[1].shields.splice(0));
    await g.attack(u, 'shield');
    assert.equal(g.winner, 0);
});

test('2 枚目の シールドが 割れたら 1 枚 捨てて Lv アップ・2 枚割りで 一気に 2 回', async () => {
    const g = new Game({ players: [{ name: 'A', deck: 'koori', cpu: true }, { name: 'B', deck: 'oni', cpu: true }], first: 0, rand: seeded(5) });
    await g.start();
    const b = g.players[1];
    for (const c of b.shields) c.dt = false;   // トリガーが 出ないように (コピーなので データは かわらない)
    await g.breakShields(b, 1);
    assert.equal(b.lv, 1);
    await g.breakShields(b, 1);
    assert.equal(b.lv, 2);
    await g.breakShields(b, 2);
    assert.equal(b.lv, 3);
    assert.equal(b.shields.length, 1);
});

test('トリガーの モンスターは 場が いっぱいなら 押し出して 出る (Lv に 関係なく)', async () => {
    const g = new Game({ players: [{ name: 'A', deck: 'koori', cpu: true }, { name: 'B', deck: 'oni', cpu: true }], first: 0, rand: seeded(6) });
    await g.start();
    const b = g.players[1];
    for (let i = 0; i < 3; i++) await g.enter(b, { ...cardByNo(40), uid: 9100 + i });
    b.shields.push({ ...cardByNo(33), uid: 9200 });   // オニビン (DT)
    await g.breakShields(b, 1);
    assert.equal(b.field.length, 3);
    assert.ok(b.field.some((u) => u.no === 33));
});

test('パワーが 0 以下に なったら やられる (お守りは 効かない・ふっかつのたねは 効く)', async () => {
    const g = new Game({ players: [{ name: 'A', deck: 'koori', cpu: true }, { name: 'B', deck: 'oni', cpu: true }], first: 0, rand: seeded(7) });
    await g.start();
    const [a, b] = g.players;
    const t = await g.enter(b, { ...cardByNo(4), uid: 9301 });   // ツララボウ 1000
    t.item = { ...cardByNo(28), uid: 9302 };                     // ふるカワのお守り
    await g.use(a, { ...cardByNo(6), uid: 9303 });               // ユキオンナン: -3000
    assert.ok(!b.field.includes(t));
    assert.ok(b.grave.some((c) => c.uid === 9301) && b.grave.some((c) => c.uid === 9302));

    const s = await g.enter(b, { ...cardByNo(4), uid: 9304 });
    s.item = { ...cardByNo(58), uid: 9305 };                     // ふっかつのたね
    s.mods.push({ amount: -1000, until: g.turn + 1 });
    await g.use(a, { ...cardByNo(13), uid: 9306 });              // なにかを 出したら たしかめる
    assert.ok(!b.field.includes(s));
    assert.ok(b.hand.some((c) => c.uid === 9304));
});

test('ブロッカー: アンタップなら 攻撃を かわりに うけ、タップする。タップ中は ブロックできない', async () => {
    const g = new Game({ players: [{ name: 'A', deck: 'koori', cpu: true }, { name: 'B', deck: 'oni', cpu: true }], first: 0, rand: seeded(8) });
    await g.start();
    const [a, b] = g.players;
    const atk = await g.enter(a, { ...cardByNo(40), uid: 9401 });   // ハリー 4000 (A の 場に)
    atk.enteredTurn = 0;
    const blk = await g.enter(b, { ...cardByNo(37), uid: 9402 });   // だけさん 3000 (相手の ターンは 6000)
    const shields = b.shields.length;
    await g.attack(atk, 'shield');
    assert.equal(b.shields.length, shields);    // ブロックされて シールドは 割れない
    assert.ok(!a.field.includes(atk));          // 4000 は 6000 に まける
    assert.ok(blk.tapped);

    const atk2 = await g.enter(a, { ...cardByNo(40), uid: 9403 });
    atk2.enteredTurn = 0;
    await g.attack(atk2, 'shield');             // タップ中の だけさんは ブロックできない
    assert.equal(b.shields.length, shields - 1);

    await g.endTurn();                          // B の ターンで アンタップ
    assert.equal(blk.tapped, false);
});
