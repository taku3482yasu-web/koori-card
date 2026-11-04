// 「つよい」の デッキを 1 枚ずつ 入れかえて きたえる: node tools/climb-cpu-decks.mjs <チーム> [回数]
// 同じ 乱数で くらべて 勝率が 上がった ときだけ のこす。結果の 1 行を src/data/cpu-hard-decks.js に 入れる (tools/tune-cpu-decks.mjs の 続き)
import { Game, starterDeck } from '../src/logic/game.js';
import { cpuTurn } from '../src/logic/cpu.js';
import { CARDS, DECKS } from '../src/data/cards.js';
import { HARD_DECKS } from '../src/data/cpu-hard-decks.js';

const team = process.argv[2], STEPS = Number(process.argv[3]) || 50, PER = 24;
const seeded = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = seeded(team.length * 7919 + 11);
const teams = Object.keys(DECKS).filter((t) => t !== team);
async function rate(list) {
    let w = 0, n = 0, seed = 300000;
    for (const foe of teams) for (let i = 0; i < PER; i++) {
        const g = new Game({ players: [{ name: 'A', deck: team, cpu: true, list }, { name: 'B', deck: foe, cpu: true }], rand: seeded(seed++) });
        await g.start();
        for (let t = 0; t < 400 && g.winner === null; t++) await cpuTurn(g, g.players[g.active]);
        n++; if (g.winner === 0) w++;
    }
    return w / n;
}
const start = starterDeck(team);
const pool = [...new Set([...start, ...CARDS.filter((c) => c.pack && ['R', 'VR', 'SR', 'HR', 'OR'].includes(c.rarity) && (c.team === team || c.team === 'nobrand')).map((c) => c.no)])];
let list = [...start];
for (const no of HARD_DECKS[team].out) list.splice(list.indexOf(no), 1);
list.push(...HARD_DECKS[team].add);
let best = await rate(list);
const first = best;
for (let i = 0; i < STEPS; i++) {
    const next = [...list];
    const no = pool[Math.floor(rnd() * pool.length)];
    if (next.filter((x) => x === no).length >= 4) continue;
    next.splice(Math.floor(rnd() * next.length), 1, no);
    const r = await rate(next);
    if (r > best) { best = r; list = next; }
}
const left = [...start], add = [];
for (const no of list) { const i = left.indexOf(no); if (i >= 0) left.splice(i, 1); else add.push(no); }
console.log(JSON.stringify({ team, first: Math.round(first * 100), best: Math.round(best * 100), out: left.sort((a, b) => a - b), add: add.sort((a, b) => a - b) }));
