// 「つよい」の CPU デッキを さがす: レアカードへの 入れかえを ランダムに ためし、ほかの スターターに いちばん 勝つ ものを のこす。
// 結果は src/data/cpu-hard-decks.js に 書く (手で 直さない)。node tools/tune-cpu-decks.mjs [候補の 数]
import fs from 'node:fs';
import { Game, starterDeck } from '../src/logic/game.js';
import { cpuTurn } from '../src/logic/cpu.js';
import { CARDS, DECKS, cardByNo } from '../src/data/cards.js';

const TRIES = Number(process.argv[2]) || 40;
const seeded = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const teams = Object.keys(DECKS);
const rnd = seeded(20261104);
const RARE = ['R', 'VR', 'SR', 'HR', 'OR'];

async function rate(team, list, per, seed0) {
    let w = 0, n = 0, seed = seed0;
    for (const foe of teams) {
        if (foe === team) continue;
        for (let i = 0; i < per; i++) {
            const g = new Game({ players: [{ name: 'A', deck: team, cpu: true, list }, { name: 'B', deck: foe, cpu: true }], rand: seeded(seed++) });
            await g.start();
            for (let t = 0; t < 400 && g.winner === null; t++) await cpuTurn(g, g.players[g.active]);
            n++; if (g.winner === 0) w++;
        }
    }
    return w / n;
}

function candidate(team) {
    const start = starterDeck(team);
    const pool = [
        ...CARDS.filter((c) => c.pack && c.team === team && RARE.includes(c.rarity)).flatMap((c) => [c.no, c.no, c.no]),
        ...CARDS.filter((c) => c.pack && c.team === 'nobrand' && RARE.includes(c.rarity)).flatMap((c) => [c.no, c.no])
    ];
    const k = 8 + Math.floor(rnd() * 9), add = [], left = [...start], out = [];
    while (add.length < k && pool.length) {
        const no = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        const same = left.filter((x) => cardByNo(x).lv === cardByNo(no).lv && cardByNo(x).kind === 'monster');
        const from = same.length ? same : left;
        const o = from[Math.floor(rnd() * from.length)];
        left.splice(left.indexOf(o), 1);
        out.push(o); add.push(no);
    }
    return { out: out.sort((a, b) => a - b), add: add.sort((a, b) => a - b), list: [...left, ...add] };
}

const result = {};
for (const team of teams) {
    const scored = [];
    for (let i = 0; i < TRIES; i++) {
        const c = candidate(team);
        scored.push({ ...c, score: await rate(team, c.list, 8, 1000 + i * 100) });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 5);
    for (const c of top) c.score = await rate(team, c.list, 30, 500000);   // 上位は 回数を ふやして はかりなおす
    top.sort((a, b) => b.score - a.score);
    result[team] = { out: top[0].out, add: top[0].add };
    console.log(team, Math.round(top[0].score * 100) + '%', `入れかえ ${top[0].add.length} 枚`);
}
const body = Object.entries(result).map(([t, r]) => `    ${JSON.stringify(t)}: ${JSON.stringify(r)}`).join(',\n');
fs.writeFileSync(new URL('../src/data/cpu-hard-decks.js', import.meta.url), `// tools/tune-cpu-decks.mjs が 作る (手で 直さない)。out を ぬいて add を 入れる\nexport const HARD_DECKS = {\n${body}\n};\n`);
