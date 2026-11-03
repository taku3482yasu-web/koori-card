// =====================================================================
// CPU: 出せる 中で 役に立つ カードを 出し、勝てる 相手を こうげきし、なければ シールドを 割る
// 魔法・場面・アイテムを 使うかは カードの 効果 (effects.js) の want で きめる (2026-11-03 スターターデッキ 8 つ)。
// 選ぶ 場面 (だれを たおすか など) は game.js の ask の score で きめる
// 強さ (2026-11-03 ユーザー指定): p.level = 'easy' かんたん / 'normal' ふつう / 'hard' つよい
//   かんたん: 出す カード・こうげきの 相手を ときどき でたらめに えらび、ときどき こうげきしない (選ぶ 場面も ときどき でたらめ。game.js の ask)
//   つよい: ブロッカーに 止められて やられる こうげきは しない・先に じゃまな ブロッカーを たおす・シールドが すくない ときは ブロッカーを のこす
// =====================================================================
import { effectOf } from './effects.js';

export const LEVELS = { easy: 'かんたん', normal: 'ふつう', hard: 'つよい' };

function wantCard(g, p, c) {
    const want = effectOf(c.no).want;
    if (c.kind === 'magic') return want ? want(g, p) : false;
    if (c.kind === 'field') return p.scene?.no !== c.no && (want ? want(g, p) : !p.scene);
    return true;
}

// 1 つ 出す。出したら true
async function playOne(g, p, A) {
    const easy = p.level === 'easy';
    const pool = [...p.hand.map((c) => [c, 'hand']), ...(p.buddy ? [[p.buddy, 'buddy']] : [])]
        .filter(([c]) => g.canPlay(p, c));
    const magic = pool.find(([c]) => c.kind === 'magic' && wantCard(g, p, c));
    if (magic && !(easy && g.rand() < 0.3)) return A.play(p, magic[0], magic[1]);
    const scene = pool.find(([c]) => c.kind === 'field' && wantCard(g, p, c));
    if (scene) return A.play(p, scene[0], scene[1]);
    const monsters = pool.filter(([c]) => c.kind === 'monster')
        .filter(([c]) => !(c.no === 48 && p.hand.length < 3))   // 大魔王ASO は 手札に よゆうが あるとき
        .sort((a, b) => b[0].power - a[0].power || (a[1] === 'hand' ? -1 : 1));
    if (monsters.length) {
        const pick = easy ? monsters[Math.floor(g.rand() * monsters.length)] : monsters[0];
        return A.play(p, pick[0], pick[1]);
    }
    const item = pool.find(([c]) => c.kind === 'item');
    if (item) return A.play(p, item[0], item[1]);
    return false;
}

// つよい: こうげきの 相手を えらぶ (null = こうげきしない)
function hardTarget(g, p, u) {
    const o = g.opp(p);
    const ap = g.power(u, { attacking: true });
    // 1. じゃまな ブロッカーを 先に たおす (勝てる ものの うち いちばん 強い)
    const preyBlocker = o.field.filter((b) => g.canBlock(b) && g.power(b, { defending: true }) < ap).sort((a, b) => g.power(b) - g.power(a))[0];
    if (preyBlocker) return preyBlocker;
    // 2. シールドが 0 なら とどめ
    if (o.shields.length === 0 && g.canTarget(u, 'shield')) return 'shield';
    // 3. 勝てる いちばん 強い モンスター
    const prey = o.field.filter((x) => g.power(x, { defending: true }) < ap).sort((a, b) => g.power(b) - g.power(a))[0];
    if (prey) return prey;
    if (!g.canTarget(u, 'shield')) return null;
    // 4. つぎに 割ると 相手の Lv が 上がる (2・4 枚目) ときは、ほかにも こうげきできる なかまが いて おしきれる ときだけ
    const lvUp = (o.broken === 1 || o.broken === 3) && o.lv < 3 && o.shields.length > g.breaksOf(u);
    const others = p.field.filter((x) => x !== u && g.canAttack(x)).length;
    if (lvUp && others < 3) return null;
    return 'shield';
}

// A: 行動を する もの (ふつうは g。オンライン対戦では 相手に 送りながら 動かす)
export async function cpuTurn(g, p, A = g) {
    const level = p.level || 'normal';
    for (let i = 0; i < 20 && g.winner === null; i++) {
        await g.delay();
        if (!(await playOne(g, p, A))) break;
    }
    for (let i = 0; i < 20 && g.winner === null; i++) {
        // つよい: 相手に ブロッカーが いる ときは 弱い ほうから こうげきして ブロックを さそう
        const bait = level === 'hard' && g.opp(p).field.some((b) => g.canBlock(b));
        const attacker = p.field.filter((u) => g.canAttack(u)).sort((a, b) => (bait ? 1 : -1) * (g.power(a) - g.power(b)))[0];
        if (!attacker) break;
        const ap = g.power(attacker, { attacking: true });
        let target;
        if (level === 'hard') target = hardTarget(g, p, attacker);
        else {
            const preys = g.opp(p).field.filter((u) => g.power(u, { defending: true }) < ap).sort((a, b) => g.power(b) - g.power(a));
            target = preys[0] || (g.canTarget(attacker, 'shield') ? 'shield' : null);
            if (level === 'easy') {
                const all = [...g.opp(p).field, ...(g.canTarget(attacker, 'shield') ? ['shield'] : [])];
                if (g.rand() < 0.35) target = all[Math.floor(g.rand() * all.length)] || null;
                if (g.rand() < 0.2) target = null;   // こうげきしない
            }
        }
        if (!target) { attacker.attacks = g.maxAttacks(attacker); continue; }   // 攻撃しない (できる 相手が いない)
        await g.delay();
        await A.attack(attacker, target);
    }
    if (g.winner === null) {
        await g.delay();
        await A.endTurn();
    }
}
