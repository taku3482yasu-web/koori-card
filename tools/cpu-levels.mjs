// CPU の 強さ (デッキ) を はかる: 各強さの デッキが、ふつう (スターター) の ほかの チームに 勝つ 割合
//   node tools/cpu-levels.mjs [1 組の 回数] [--easy 枚数]
import { Game } from '../src/logic/game.js';
import { cpuTurn } from '../src/logic/cpu.js';
import { DECKS } from '../src/data/cards.js';
import { cpuDeckList, TUNE } from '../src/logic/cpu-decks.js';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : null; };
if (opt('--easy') !== null) TUNE.easySwaps = opt('--easy');
const N = Number(args[0]) > 0 ? Number(args[0]) : 6;
const seeded = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

async function match(team, level, foe, seed) {
    const g = new Game({ players: [{ name: 'A', deck: team, cpu: true, list: cpuDeckList(team, level) }, { name: 'B', deck: foe, cpu: true }], rand: seeded(seed) });
    await g.start();
    let t = 0;
    for (; t < 400 && g.winner === null; t++) await cpuTurn(g, g.players[g.active]);
    return { win: g.winner === 0, done: g.winner !== null, turns: g.turn, reason: g.reason };
}

const teams = Object.keys(DECKS);
for (const level of ['easy', 'normal', 'hard']) {
    let w = 0, n = 0, unfinished = 0, turns = 0, max = 0, seed = 7000000;
    const per = {};
    for (const team of teams) {
        let tw = 0, tn = 0;
        for (const foe of teams) {
            if (foe === team) continue;
            for (let i = 0; i < N; i++) {
                const r = await match(team, level, foe, seed++);
                n++; tn++; turns += r.turns; max = Math.max(max, r.turns);
                if (r.win) { w++; tw++; }
                if (!r.done) unfinished++;
            }
        }
        per[team] = Math.round(100 * tw / tn);
    }
    console.log(`${level.padEnd(6)} 勝率 ${(100 * w / n).toFixed(1)}% (${n} 回)  平均 ${(turns / n).toFixed(1)} ターン・最長 ${max}・決着なし ${unfinished}  ${JSON.stringify(per)}`);
}
