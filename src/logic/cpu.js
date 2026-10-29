// =====================================================================
// CPU (ふつう): 出せる 中で 役に立つ カードを 出し、勝てる 相手を こうげきし、なければ シールドを 割る
// 選ぶ 場面 (だれを たおすか など) は game.js の ask の score で きめる
// =====================================================================

const KILL_ONE = { 19: 4000, 20: Infinity, 23: Infinity, 49: 4000, 51: 2000 };
const KILL_ALL = { 50: 5000, 52: 2000 };
const STOP = new Set([21, 54]);
const DRAW = new Set([24, 53]);
const SCENE_RACE = { 25: 'こおり', 26: 'みず', 55: 'ほのお', 56: 'ふしぎ' };

function wantMagic(g, p, c) {
    const enemies = g.opp(p).field.filter((u) => u.item?.no !== 59);
    if (c.no in KILL_ONE) return enemies.some((u) => g.power(u) <= KILL_ONE[c.no]);
    if (c.no in KILL_ALL) return g.opp(p).field.filter((u) => g.power(u) <= KILL_ALL[c.no]).length >= 2;
    if (STOP.has(c.no)) return enemies.some((u) => g.power(u) >= 4000);
    if (DRAW.has(c.no)) return p.hand.length <= 4 && p.deck.length > 6;
    if (c.no === 22) return p.shields.length < 5 && p.deck.length > 6;
    return false;
}

function wantScene(p, c) {
    const race = SCENE_RACE[c.no];
    if (p.scene?.no === c.no) return false;
    return [...p.field, ...p.hand].filter((x) => x.kind === 'monster' && x.race === race).length >= 2;
}

// 1 つ 出す。出したら true
async function playOne(g, p) {
    const pool = [...p.hand.map((c) => [c, 'hand']), ...(p.buddy ? [[p.buddy, 'buddy']] : [])]
        .filter(([c]) => g.canPlay(p, c));
    const magic = pool.find(([c]) => c.kind === 'magic' && wantMagic(g, p, c));
    if (magic) return g.play(p, magic[0], magic[1]);
    const scene = pool.find(([c]) => c.kind === 'field' && wantScene(p, c));
    if (scene) return g.play(p, scene[0], scene[1]);
    const monsters = pool.filter(([c]) => c.kind === 'monster')
        .filter(([c]) => !(c.no === 48 && p.hand.length < 3))   // 大魔王ASO は 手札に よゆうが あるとき
        .sort((a, b) => b[0].power - a[0].power || (a[1] === 'hand' ? -1 : 1));
    if (monsters.length) return g.play(p, monsters[0][0], monsters[0][1]);
    const item = pool.find(([c]) => c.kind === 'item');
    if (item) return g.play(p, item[0], item[1]);
    return false;
}

export async function cpuTurn(g, p) {
    for (let i = 0; i < 20 && g.winner === null; i++) {
        await g.delay();
        if (!(await playOne(g, p))) break;
    }
    for (let i = 0; i < 20 && g.winner === null; i++) {
        const attacker = p.field.filter((u) => g.canAttack(u)).sort((a, b) => g.power(b) - g.power(a))[0];
        if (!attacker) break;
        const ap = g.power(attacker, { attacking: true });
        const prey = g.opp(p).field.filter((u) => g.power(u) < ap).sort((a, b) => g.power(b) - g.power(a))[0];
        await g.delay();
        await g.attack(attacker, prey || 'shield');
    }
    if (g.winner === null) {
        await g.delay();
        await g.endTurn();
    }
}
