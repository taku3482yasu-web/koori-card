// たいせんの ルールの 確認 (CPU どうしで 何回も 遊ばせる + ルール資料の 決まりごと)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, starterDeck, DECK_SIZE } from '../src/logic/game.js';
import { cpuTurn } from '../src/logic/cpu.js';
import { cardByNo, DECKS } from '../src/data/cards.js';

function seeded(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

// カードの 数が 増えたり 減ったり していないか (2 人で デッキ 50 + バディ 1 ずつ。ノラハンの ねこばば・ヤーハミーの アイテムどろぼうで
//   プレイヤーの あいだを 動く ことが あるので 2 人の 合計で 見る。進化の 下の カードも 数える)
function countCards(p) {
    return p.deck.length + p.hand.length + p.shields.length + p.grave.length
        + p.field.reduce((n, u) => n + 1 + (u.item ? 1 : 0) + (u.under ? u.under.length : 0), 0) + (p.buddy ? 1 : 0) + (p.scene ? 1 : 0);
}

async function cpuGame(seed, decks = ['koori', 'oni']) {
    const g = new Game({ players: decks.map((d, i) => ({ name: `CPU${i}`, deck: d, cpu: true })), rand: seeded(seed) });
    await g.start();
    for (let t = 0; t < 200 && g.winner === null; t++) {
        await cpuTurn(g, g.players[g.active]);
        assert.equal(countCards(g.players[0]) + countCards(g.players[1]), 2 * (DECK_SIZE + 1), `seed ${seed} turn ${g.turn}`);
        for (const p of g.players) assert.ok(p.field.length <= p.lv + 2);
    }
    return g;
}

test('構築済みデッキは 50 枚で、同じ カードは 4 枚 (大魔王ASO は 1 枚) まで', () => {
    for (const id of Object.keys(DECKS)) {
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

test('CPU どうしで 8 デッキ 総当たり (各 組み合わせ 10 回) して、ぜんぶ 決着する (カードの 数も 正しい)', async () => {
    const ids = Object.keys(DECKS), wins = Object.fromEntries(ids.map((id) => [id, 0])), games = Object.fromEntries(ids.map((id) => [id, 0]));
    let s = 0;
    for (const a of ids) for (const b of ids) {
        if (a === b) continue;
        for (let k = 0; k < 5; k++) {
            const g = await cpuGame(++s, [a, b]);
            assert.notEqual(g.winner, null, `seed ${s} ${a} vs ${b} が 終わらない`);
            wins[g.players[g.winner].deckId]++;
            games[a]++; games[b]++;
        }
    }
    console.log(ids.map((id) => `${DECKS[id].name} ${Math.round(100 * wins[id] / games[id])}%`).join(' / '));
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

// ----- スターターデッキ 8 つの 新しい しくみ (2026-11-03) -----
const fresh = async (seed, decks = ['oni', 'koori']) => { const g = new Game({ players: decks.map((d, i) => ({ name: 'AB'[i], deck: d, cpu: true })), first: 0, rand: seeded(seed) }); await g.start(); return g; };
const put = (g, p, no, uid) => g.enter(p, { ...cardByNo(no), uid });

test('【進化】: おにおに → 鬼神 → 鬼の王。重ねて 出し、出た ターンも 攻撃できる。やられたら 下の カードも 墓地へ', async () => {
    const g = await fresh(11);
    const [a, b] = g.players;
    a.lv = 3;
    const base = await put(g, a, 31, 9501);
    const god = { ...cardByNo(95), uid: 9502 };
    a.hand.push(god);
    assert.ok(g.canPlay(a, god));
    await g.play(a, god);
    const u = a.field.find((x) => x.no === 95);
    assert.ok(u && !a.field.includes(base) && u.under.length === 1);
    assert.ok(g.canAttack(u), '出た ターンも 攻撃できる');
    assert.equal(g.breaksOf(u), 2);
    await g.destroy(u, 'テスト');
    assert.ok(a.grave.some((c) => c.uid === 9501) && a.grave.some((c) => c.uid === 9502));
    void b;
});

test('筋肉: 1 こ = パワー +1000。ダンベルは 付けると 筋肉 +1・マッスルジムで さらに +1000', async () => {
    const g = await fresh(12, ['muscle', 'koori']);
    const a = g.players[0];
    const u = await put(g, a, 40, 9601);   // ハリー 4000
    a.hand.push({ ...cardByNo(156), uid: 9602 });
    await g.play(a, a.hand[a.hand.length - 1]);
    assert.equal(u.muscle, 1);
    assert.equal(g.power(u), 4000 + 1000 + 0);
    a.scene = { ...cardByNo(213), uid: 9603 };
    assert.equal(g.power(u), 6000);
});

test('ASAPANCHI: 自分の シールドが 2 枚以下なら 相手の シールドを 3 枚 割る', async () => {
    const g = await fresh(13, ['ask3', 'koori']);
    const [a, b] = g.players;
    a.lv = 3;
    a.shields.splice(0, 3);
    const before = b.shields.length;
    await g.use(a, { ...cardByNo(116), uid: 9701 });
    assert.equal(b.shields.length, before - 3);
});

test('カウンター: ハエトリグサーンを 攻撃すると いっしょに 墓地へ・マンゲツウルフは 攻撃されると +3000', async () => {
    const g = await fresh(14, ['koori', 'kemono']);
    const [a, b] = g.players;
    const atk = await put(g, a, 7, 9801); atk.enteredTurn = 0;   // ヒョウガリュウ 9000
    const trap = await put(g, b, 185, 9802);
    await g.attack(atk, trap);
    assert.ok(!a.field.includes(atk) && !b.field.includes(trap));
    const atk2 = await put(g, a, 5, 9803); atk2.enteredTurn = 0;  // シロクマッチョ 7000
    const wolf = await put(g, b, 179, 9804);                      // マンゲツウルフ 5000 (+3000)
    await g.attack(atk2, wolf);
    assert.ok(!a.field.includes(atk2) && b.field.includes(wolf), '8000 に まけた');
});

test('5DX: ハリーメイジで 魔法の Lv が 1 下がり、おかがっぱは 魔法を 使うと +2000', async () => {
    const g = await fresh(15, ['5dx', 'koori']);
    const a = g.players[0];
    const magic = { ...cardByNo(136), uid: 9901 };   // 牛の角アタック Lv2
    assert.ok(!g.canPlay(a, magic));
    await put(g, a, 127, 9902);
    assert.ok(g.canPlay(a, magic));
    const oka = await put(g, a, 11, 9903);
    const pw = g.power(oka);
    await g.use(a, { ...cardByNo(24), uid: 9904 });
    assert.equal(g.power(oka), pw + 2000);
});

test('氷隊: ヒョウガメが こおりくんの かわりに やられる・コオリノカガミが かわりに 選ばれる', async () => {
    const g = await fresh(16, ['oni', 'koori']);
    const [a, b] = g.players;
    const koori = await put(g, b, 1, 9951);
    const turtle = await put(g, b, 92, 9952);
    await g.destroy(koori, 'テスト');
    assert.ok(b.field.includes(koori) && !b.field.includes(turtle));
    const mirror = await put(g, b, 91, 9953);
    const t = await g.pickEnemy(a, 'テスト', (u) => u === koori);
    assert.equal(t, mirror);
});

test('バータス: ノラハンは 相手の 手札を 1 枚 ねこばば・ヤーハミーは アイテムを ぬすむ', async () => {
    const g = await fresh(17, ['bartas', 'koori']);
    const [a, b] = g.players;
    const ha = a.hand.length, hb = b.hand.length;
    await put(g, a, 160, 9961);
    assert.equal(a.hand.length, ha + 1);
    assert.equal(b.hand.length, hb - 1);
    const holder = await put(g, b, 40, 9962);
    holder.item = { ...cardByNo(30), uid: 9963 };
    a.lv = 3;
    const yahami = await put(g, a, 158, 9964);
    assert.ok(!holder.item && a.field.some((u) => u.item?.uid === 9963));
    void yahami;
});

test('手札の カードでも ブロッカーかを 聞ける (条件つきの ブロッカーも こわれない)', async () => {
    const g = await fresh(18, ['koori', 'oni']);
    for (const no of [5, 126, 3]) assert.equal(g.isBlocker({ ...cardByNo(no) }), true, cardByNo(no).name);
});

test('バディは 自分で えらべる (チームの モンスター)。えらばなければ おすすめ・ちがう チームは えらべない (2026-11-03)', async () => {
    const { buddyChoices } = await import('../src/logic/game.js');
    assert.ok(buddyChoices('koori').every((c) => c.kind === 'monster' && c.team === 'koori'));
    const g = new Game({ players: [{ name: 'A', deck: 'koori', buddy: 7 }, { name: 'B', deck: 'oni', buddy: 1 }], rand: seeded(21) });
    assert.equal(g.players[0].buddy.no, 7);
    assert.equal(g.players[1].buddy.no, DECKS.oni.buddy, '氷隊の こおりくんは 鬼鬼団の バディに できない');
});

test('速攻: Lv1 の 速攻には 制限が あり、Lv2 からは 制限なし。マグマッチョは 手札が 2 枚以下の ときだけ (2026-11-03)', async () => {
    const { CARDS } = await import('../src/data/cards.js');
    const LIMIT = /戻る|墓地へ|以下なら|攻撃できない|しか|捨てれば/;
    for (const c of CARDS.filter((x) => x.kind === 'monster' && x.text.includes('速攻'))) {
        if (c.lv === 1) assert.match(c.text, LIMIT, `${c.name} (Lv1) に 制限が ない`);
    }
    assert.ok(CARDS.some((c) => c.kind === 'monster' && c.lv >= 2 && c.text.startsWith('速攻')), 'Lv2 からの 制限なし 速攻が ある');
    const g = await fresh(22, ['muscle', 'koori']);
    const a = g.players[0];
    const u = await put(g, a, 150, 9971);
    a.hand.length = 3;
    assert.equal(g.canAttack(u), false, '手札 3 枚では 速攻なし');
    a.hand.length = 2;
    assert.equal(g.canAttack(u), true, '手札 2 枚なら 速攻');
});
