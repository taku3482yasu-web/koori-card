// オンライン対戦 (ロックステップ) の 確認: 2 台を メモリで つないで CPU どうしで 遊ばせ、2 台の 中身が 最後まで 同じか
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { cpuTurn } from '../src/logic/cpu.js';
import { Lockstep, seeded, checksum } from '../src/logic/lockstep.js';
import { CARDS } from '../src/data/cards.js';

// Game の CPU と 同じ えらびかた
function cpuPick(req) {
    let best = null;
    for (const o of req.options) if (!best || (o.score ?? 0) > (best.score ?? 0)) best = o;
    if (req.cancel && (!best || (best.score ?? 0) < (req.cancelScore ?? -Infinity))) return null;
    return best ? best.value : null;
}

async function onlineGame(seed, decks, lists = [null, null]) {
    const links = [];
    const games = [];
    const desync = [];
    for (const me of [0, 1]) {
        const link = new Lockstep((m) => setImmediate(() => links[1 - me].receive(JSON.parse(JSON.stringify(m)))), me);
        link.onDesync = (why) => desync.push(`${me}: ${why}`);
        links.push(link);
        games.push(new Game({
            players: decks.map((d, i) => ({ name: `P${i}`, deck: d, list: lists[i] })),
            rand: seeded(seed),
            ask: link.askFn(async (req) => cpuPick(req))
        }));
    }
    const run = async (me) => {
        const g = games[me], link = links[me];
        await g.start();
        for (let i = 0; i < 400 && g.winner === null; i++) {
            if (g.active === me) await cpuTurn(g, g.players[me], link.actor(g));
            else await link.remoteTurn(g);
        }
    };
    await Promise.all([run(0), run(1)]);
    return { games, desync };
}

test('オンライン対戦: 2 台で 同じ 乱数・同じ 入力なら 最後まで 同じ ように 進み、同じ 人が 勝つ (2026-11-03)', async () => {
    const pairs = [['koori', 'oni'], ['bartas', 'kemono'], ['5dx', 'muscle'], ['ask3', 'bariki']];
    for (let k = 0; k < pairs.length; k++) {
        const { games, desync } = await onlineGame(100 + k, pairs[k]);
        assert.deepEqual(desync, []);
        assert.notEqual(games[0].winner, null, pairs[k].join(' vs '));
        assert.equal(games[0].winner, games[1].winner);
        assert.deepEqual(games[0].logs, games[1].logs);
        assert.equal(checksum(games[0]), checksum(games[1]));
    }
});

test('オンライン対戦: パックの カード (うばう・アタックチャンス など) の デッキでも ずれない', async () => {
    const listOf = (team) => CARDS.filter((c) => (c.pack || (c.no >= 216 && c.no <= 225)) && (c.team === team || c.team === 'nobrand')).flatMap((c) => [c.no, c.no]).slice(0, 50);
    for (const [a, b] of [['bartas', 'oni'], ['kemono', 'koori']]) {
        const { games, desync } = await onlineGame(7, [a, b], [listOf(a), listOf(b)]);
        assert.deepEqual(desync, []);
        assert.deepEqual(games[0].logs, games[1].logs);
    }
});

test('オンライン対戦: 行動が 入れちがったら ずれを 知らせる', async () => {
    const link = new Lockstep(() => {}, 0);
    let why = null;
    link.onDesync = (w) => { why = w; };
    link.receive({ t: 'act', a: 'end' });
    await assert.rejects(link.expect('ans'));
    assert.match(why, /ans/);
});
