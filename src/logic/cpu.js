// =====================================================================
// CPU (ふつう): 出せる 中で 役に立つ カードを 出し、勝てる 相手を こうげきし、なければ シールドを 割る
// 魔法・場面・アイテムを 使うかは カードの 効果 (effects.js) の want で きめる (2026-11-03 スターターデッキ 8 つ)。
// 選ぶ 場面 (だれを たおすか など) は game.js の ask の score で きめる
// =====================================================================
import { effectOf } from './effects.js';

function wantCard(g, p, c) {
    const want = effectOf(c.no).want;
    if (c.kind === 'magic') return want ? want(g, p) : false;
    if (c.kind === 'field') return p.scene?.no !== c.no && (want ? want(g, p) : !p.scene);
    return true;
}

// 1 つ 出す。出したら true
async function playOne(g, p, A) {
    const pool = [...p.hand.map((c) => [c, 'hand']), ...(p.buddy ? [[p.buddy, 'buddy']] : [])]
        .filter(([c]) => g.canPlay(p, c));
    const magic = pool.find(([c]) => c.kind === 'magic' && wantCard(g, p, c));
    if (magic) return A.play(p, magic[0], magic[1]);
    const scene = pool.find(([c]) => c.kind === 'field' && wantCard(g, p, c));
    if (scene) return A.play(p, scene[0], scene[1]);
    const monsters = pool.filter(([c]) => c.kind === 'monster')
        .filter(([c]) => !(c.no === 48 && p.hand.length < 3))   // 大魔王ASO は 手札に よゆうが あるとき
        .sort((a, b) => b[0].power - a[0].power || (a[1] === 'hand' ? -1 : 1));
    if (monsters.length) return A.play(p, monsters[0][0], monsters[0][1]);
    const item = pool.find(([c]) => c.kind === 'item');
    if (item) return A.play(p, item[0], item[1]);
    return false;
}

// A: 行動を する もの (ふつうは g。オンライン対戦では 相手に 送りながら 動かす)
export async function cpuTurn(g, p, A = g) {
    for (let i = 0; i < 20 && g.winner === null; i++) {
        await g.delay();
        if (!(await playOne(g, p, A))) break;
    }
    for (let i = 0; i < 20 && g.winner === null; i++) {
        const attacker = p.field.filter((u) => g.canAttack(u)).sort((a, b) => g.power(b) - g.power(a))[0];
        if (!attacker) break;
        const ap = g.power(attacker, { attacking: true });
        const prey = g.opp(p).field.filter((u) => g.power(u, { defending: true }) < ap).sort((a, b) => g.power(b) - g.power(a))[0];
        const target = prey || (g.canTarget(attacker, 'shield') ? 'shield' : null);
        if (!target) { attacker.attacks = g.maxAttacks(attacker); continue; }   // 攻撃できる 相手が いない
        await g.delay();
        await A.attack(attacker, target);
    }
    if (g.winner === null) {
        await g.delay();
        await A.endTurn();
    }
}
