// =====================================================================
// カードの 効果 (docs/cards.md v0.3。番号ごと)。画面には ふれない
// ---------------------------------------------------------------------
// EFFECTS[no] に その カードの「はたらく ところ (hook)」を 書く。game.js が よぶ。
//   キーワード: haste 速攻 (true か (g, u) => bool。Lv1 の 速攻には 制限を つけ、Lv2 から 制限なし。2026-11-03) / blocker ブロッカー (true か (g, u) => bool) / breaks 割る 枚数 / attacks 1 ターンの 攻撃回数 /
//     noAttack 攻撃できない / noShield シールドを 攻撃できない / firstMonsterOnly 出た ターンは モンスターにしか 攻撃できない /
//     evolveFrom 【進化】の もと (名前の はじめ)
//   パワー: power(g, u, ctx) 自分の 分 / aura(g, src, u, ctx) 場の ほかの モンスターへ / scene(g, owner, u, ctx) 場面 /
//     itemPower(g, u, ctx) アイテム。ctx = { attacking, defending }
//   できごと: enter 出たとき / magic 魔法 / destroyed やられたとき / attack 攻撃するとき / allyAttack 味方が 攻撃するとき /
//     afterAttack 攻撃の あと / winBattle 攻撃で 勝った / block ブロックしたとき / blockWin ブロックして 勝った /
//     allyBlock 味方が ブロックした / attacked 攻撃された (ブロックも ふくむ) / onMagic 自分が 魔法を 使った /
//     turnStart 自分の ターンの はじめ (場面) / oppDiscard 相手が 手札を 捨てた (場面) / attach アイテムを 付けた /
//     breakShield アイテム: シールドを 割った / guard アイテム: やられる かわり / grantBlocker アイテム: ブロッカーに する /
//     unblockable アイテム: ブロックされない / extraBreaks アイテム: 割る 枚数を ふやす / grantHaste アイテム: 速攻
//   パック: magicImmune 相手の 魔法で 選ばれない / allBlockers 味方 ぜんぶ ブロッカー / anyBlockWin 味方が ブロックで 勝つたび /
//     sceneAttack 場面: 攻撃するとき / unblockable(g, u) 条件つきで ブロックされない / block が { killAttacker } を 返すと バトルせず 攻撃側を 墓地へ
//   attackChance(g, u): アタックチャンス (自分の u が 攻撃するとき ただで 使える 魔法)
//   want(g, p): CPU が 使いたいか (魔法・場面・アイテム)
// 「〇〇の モンスター」は 右上の エンブレム (team)。「こおりくん」「おにおに」は 名前が そう はじまる カード
// =====================================================================

export const isKoori = (u) => u.name.startsWith('こおりくん');
export const isOni = (u) => u.name.includes('おにおに');
const isOkaHibiki = (u) => u.name === 'おかがっぱ' || u.name === 'ひびきまくり';
const team = (p, id, but = null) => p.field.filter((u) => u !== but && u.team === id);
const muscles = (p) => p.field.reduce((n, u) => n + (u.muscle || 0), 0);
const thisTurn = (g) => g.turn;                                        // この ターンの 終わりまで
const untilMyNextEnd = (g, p) => (g.active === p.id ? g.turn + 2 : g.turn + 1);   // 次の 自分の ターンの 終わりまで

// ----- よく 使う 効果 -----
const killOne = (max, why, magic = true) => async (g, p) => {
    const t = await g.pickEnemy(p, `${why}：${max ? `パワー${max}以下の ` : ''}相手を えらんでね`, (u) => !max || g.power(u) <= max, { magic });
    if (t) await g.destroy(t, why);
};
const killAll = (max, why) => async (g, p) => {
    for (const u of g.opp(p).field.filter((u) => g.power(u) <= max)) await g.destroy(u, why);
};
const bounceOne = (why, magic = true, max = 0) => async (g, p) => {
    const t = await g.pickEnemy(p, `${why}：手札に 戻す 相手を えらんでね`, (u) => !max || g.power(u) <= max, { magic });
    if (t) await g.bounce(t);
};
const stopOne = (why, magic = true) => async (g, p) => {
    const t = await g.pickEnemy(p, `${why}：止める 相手を えらんでね`, () => true, { magic });
    if (t) g.stop(t);
};
const tapOne = (why, magic = true) => async (g, p) => {
    const t = await g.pickEnemy(p, `${why}：タップする 相手を えらんでね`, (u) => !u.tapped, { magic });
    if (t) g.tap(t);
};
const weaken = (amount, why, until, magic = true) => async (g, p) => {
    const t = await g.pickEnemy(p, `${why}：パワーを -${amount} する 相手を えらんでね`, () => true, { magic });
    if (t) { t.mods.push({ amount: -amount, until: until(g, p) }); g.log(`${t.name} の パワーが -${amount}`); }
};
const draw = (n) => async (g, p) => g.draw(p, n);
const oppDiscard = (n) => async (g, p) => g.discard(g.opp(p), n, `${p.name} に 捨てさせられる カード`);
const peekDiscard = async (g, p) => g.chooseDiscard(p, g.opp(p));
const pickOwn = (g, p, title, filter = () => true) => {
    const list = p.field.filter(filter);
    if (!list.length) return null;
    return g.ask(p, { title, options: list.map((u) => ({ label: `${u.name}（${g.power(u)}）`, value: u, card: u, score: g.power(u) + (u.tapped ? 0 : 500) })) });
};
const muscleOne = (n) => async (g, p) => { const u = await pickOwn(g, p, `筋肉 +${n} を 付ける モンスターを えらんでね`); if (u) g.addMuscle(u, n); };
const pumpOne = (amount) => async (g, p) => {
    const u = await pickOwn(g, p, `パワー +${amount} する モンスターを えらんでね`);
    if (u) { u.mods.push({ amount, until: thisTurn(g) }); g.log(`${u.name} の パワーが この ターン +${amount}`); }
};
// モンスター 1 体 (自分か 相手) を タップ か アンタップ (2026-11-03: カードは メインフェイズだけなので「アンタップ」だけの 効果を 直した)
//   CPU は 相手の アンタップの ブロッカー → 相手の 強い モンスターを タップ、自分の タップした モンスターを アンタップ
const tapOrUntap = (why, { magic = false, pump = 0 } = {}) => async (g, p) => {
    const o = g.opp(p);
    const opts = [];
    for (const u of [...p.field, ...o.field]) {
        if (magic && u.owner !== p.id && effectOf(u.no).magicImmune) continue;
        const mine = u.owner === p.id;
        const score = mine ? (u.tapped ? 2 : 0) : (u.tapped ? -1 : 1 + (g.isBlocker(u) ? 1 : 0) + g.power(u) / 100000);
        opts.push({ label: `${u.name} を ${u.tapped ? 'アンタップ' : 'タップ'}`, value: u, card: u, score });
    }
    if (!opts.length) return;
    const u = await g.ask(p, { title: `${why}：タップ か アンタップ する モンスターを えらんでね`, options: opts, cancel: 'しない', cancelScore: 0.5 });
    if (!u) return;
    if (u.tapped) { u.tapped = false; g.log(`${u.name} を アンタップした`); } else g.tap(u);
    if (pump && u.owner === p.id) { u.mods.push({ amount: pump, until: g.turn + 1, oppTurnOnly: true }); g.log(`${u.name} は 次の 相手の ターン パワー +${pump}`); }
};
// 手札から モンスターを ただで 出す (アタックチャンス。Lv・1 ターン 1 体の 決まりに 関係なく。進化は のぞく)
async function summonFree(g, p, filter, why) {
    if (p.field.length >= g.slots(p)) return g.log(`${why}：場が いっぱい`), null;
    const list = p.hand.filter((c) => c.kind === 'monster' && !effectOf(c.no).evolveFrom && filter(c));
    if (!list.length) return g.log(`${why}：出せる モンスターが 手札に ない`), null;
    const c = await g.ask(p, { title: `${why}：ただで 出す モンスターを えらんでね`, options: list.map((x) => ({ label: `${x.name}（${x.power}）`, value: x, card: x, score: x.power + x.lv * 1000 })) });
    p.hand.splice(p.hand.indexOf(c), 1);
    g.log(`${p.name} は ${c.name} を ただで 出した！`);
    return g.enter(p, c);
}
// 自分の モンスター 1 体と 相手の モンスター 1 体を バトルさせる (アタックチャンス)
async function fightOne(g, p, why, { but = null, tapFirst = false } = {}) {
    const o = g.opp(p);
    let e = null;
    if (tapFirst) {
        e = await g.pickEnemy(p, `${why}：タップする 相手を えらんでね`, () => true, { magic: true });
        if (e) g.tap(e);
    }
    const mine = p.field.filter((u) => u !== but && !u.tapped);
    const enemy = e ? [e] : o.field.filter((u) => !(effectOf(u.no).magicImmune));
    if (!mine.length || !enemy.length) return g.log(`${why}：バトルできる モンスターが いない`);
    const a = await g.ask(p, { title: `${why}：バトルする 自分の モンスターを えらんでね`, options: mine.map((u) => ({ label: `${u.name}（${g.power(u)}）`, value: u, card: u, score: g.power(u) })) });
    const d = e || await g.ask(p, { title: `${why}：バトルする 相手を えらんでね`, options: enemy.map((u) => ({ label: `${u.name}（${g.power(u)}）`, value: u, card: u, score: (g.power(u) < g.power(a) ? 10 : 0) + g.power(u) / 10000 })) });
    await g.fight(p, a, d);
}
const fromGrave = (p, filter) => p.grave.filter(filter);
async function graveToHand(g, p, filter, title) {
    const list = fromGrave(p, filter);
    if (!list.length) return null;
    const c = await g.ask(p, { title, options: list.map((x) => ({ label: x.name, value: x, card: x, score: (x.power || 3000) + x.lv * 1000 })) });
    p.grave.splice(p.grave.indexOf(c), 1);
    p.hand.push(c);
    g.log(`${c.name} を 墓地から 手札に 戻した`);
    return c;
}
async function search(g, p, filter, title) {
    const list = p.deck.filter(filter);
    if (!list.length) return null;
    const seen = new Set();
    const c = await g.ask(p, { title, options: list.filter((x) => !seen.has(x.no) && seen.add(x.no)).map((x) => ({ label: x.name, value: x, card: x, score: (x.power || 3000) + x.lv * 1000 })) });
    p.deck.splice(p.deck.indexOf(c), 1);
    p.hand.push(c);
    g.shuffleDeck(p);
    g.log(`${p.name} は 山札から ${c.name} を 手札に くわえた`);
    return c;
}
async function destroyItem(g, p, why) {
    const list = g.opp(p).field.filter((u) => u.item);
    if (!list.length) return;
    const u = await g.ask(p, { title: `${why}：アイテムを 墓地へ 送る 相手を えらんでね`, options: list.map((x) => ({ label: `${x.name} の ${x.item.name}`, value: x, card: x.item, score: 1 })) });
    g.dropItem(u, why);
}
const hasTarget = (max) => (g, p) => g.opp(p).field.some((u) => (!max || g.power(u) <= max) && u.item?.no !== 59);
const strongEnemy = (g, p) => g.opp(p).field.some((u) => g.power(u) >= 4000 && u.item?.no !== 59);
const canDraw = (g, p) => p.hand.length <= 5 && p.deck.length > 8;

// ----- カードごと -----
export const EFFECTS = {
    // ===== 氷隊 =====
    1: { enter: killOne(3000, 'コオリソード', false) },
    2: { haste: true, afterAttack: async (g, p, u) => { if (p.field.includes(u)) await g.bounce(u); } },
    3: { blocker: true },
    4: { destroyed: async (g, p, u, { battle, by }) => { if (battle && by && g.players[by.owner].field.includes(by)) await g.destroy(by, 'ツララボウの みちづれ'); } },
    5: { blocker: (g, u) => g.players[u.owner].field.some((x) => x !== u && isKoori(x)) },
    6: { enter: weaken(3000, 'ユキオンナン', untilMyNextEnd, false) },
    7: { breaks: 2 },
    8: {
        enter: async (g, p, u) => {
            if (!p.hand.length || g.active !== p.id) return;
            const ok = await g.ask(p, { title: '手札を 1 枚 捨てて、この ターン 速攻に する？', options: [{ label: '捨てて 速攻', value: true, score: 0 }], cancel: 'しない', cancelScore: 0.5 });
            if (ok) { await g.discard(p, 1, '捨てる カード'); u.haste = true; g.log('ペンギンナイトは 速攻に なった'); }
        }
    },
    9: { blocker: true, power: (g, u) => (g.active !== u.owner ? 2000 : 0) },
    10: { enter: async (g, p) => graveToHand(g, p, (c) => c.kind === 'monster', '墓地から 手札に 戻す モンスターを えらんでね') },
    11: {
        power: (g, u, ctx) => (ctx.attacking ? 2000 : 0),
        onMagic: async (g, p, u) => { u.mods.push({ amount: 1000, until: thisTurn(g) }); g.log('おかがっぱの パワーが +1000'); }
    },
    12: { enter: killOne(0, 'アクアブレス', false) },
    13: { enter: draw(1) },
    14: { enter: stopOne('たむキック', false) },
    15: { attacks: 2 },
    16: { aura: (g, src, u) => (u.owner === src.owner && isKoori(u) ? 2000 : 0) },
    17: {
        enter: async (g, p) => {
            const list = fromGrave(p, (c) => c.kind === 'monster' && c.lv === 1);
            if (!list.length || p.field.length >= g.slots(p)) return;
            const c = await g.ask(p, { title: '墓地から 場に 出す Lv1 の モンスターを えらんでね', options: list.map((x) => ({ label: x.name, value: x, card: x, score: x.power })) });
            p.grave.splice(p.grave.indexOf(c), 1);
            g.log(`ハル麒麟が ${c.name} を よんだ`);
            await g.enter(p, c);
        }
    },
    18: { destroyed: async (g, p) => { if (p.deck.length) { p.shields.push(g.takeTop(p)); g.log(`やすさんの 応急手当：${p.name} の シールドが 1 枚 ふえた`); } } },
    19: { magic: killOne(4000, 'コオリハンマー'), want: hasTarget(4000) },
    20: { magic: killOne(0, '四天王絶対殺す剣'), want: strongEnemy },
    21: { magic: stopOne('こおりのいき'), want: strongEnemy },
    22: {
        magic: async (g, p) => {
            if (p.shields.length > 4) return g.log('シールドが 5 枚 あるので なにも おきない');
            p.shields.push(g.takeTop(p));
            g.log(`${p.name} の シールドが 1 枚 ふえた`);
        },
        want: (g, p) => p.shields.length < 5 && p.deck.length > 6
    },
    23: { magic: bounceOne('ワープ玉'), want: strongEnemy },
    24: { magic: draw(2), want: canDraw },
    25: { scene: (g, owner, u) => (u.owner === owner.id && u.race === 'こおり' ? 1000 : 0), want: (g, p) => p.field.filter((u) => u.race === 'こおり').length >= 2 },
    26: { scene: (g, owner, u) => (u.owner === owner.id ? (u.race === 'みず' ? 1000 : 0) : (u.race === 'ほのお' ? -1000 : 0)), want: (g, p) => p.field.filter((u) => u.race === 'みず').length >= 1 },
    27: { itemPower: (g, u) => (u.race === 'こおり' ? 3000 : 1000) },
    28: { guard: true },
    29: { itemPower: (g, u) => (g.active !== u.owner ? 3000 : 0) },
    30: { itemPower: () => 2000 },
    // ===== 鬼鬼団 =====
    31: { enter: async (g, p) => { g.log('「お金かえせ！」'); await g.discard(g.opp(p), 1, 'おにおにに とられる カード'); } },
    32: { haste: true, endOfTurnDie: true },
    33: { enter: killOne(2000, 'オニビン', false) },
    34: { haste: true, power: (g, u) => (g.players[u.owner].field.some((x) => x !== u && isOni(x)) ? 2000 : 0) },
    35: { breaks: 2, power: (g, u) => (g.players[u.owner].shields.length <= 3 ? 3000 : 0) },
    36: { enter: async (g, p) => g.discard(g.opp(p), 1, '金滅鬼：捨てる カード') },
    37: { blocker: true, power: (g, u) => (g.active !== u.owner ? 3000 : 0) },
    38: { blocker: true },
    39: { enter: async (g, p) => g.dropScene(g.opp(p), 'おには そと！') },
    41: { enter: async (g, p) => { g.draw(p, 2); await g.discard(p, 1, 'ゴールド金面犬：捨てる カード'); } },
    42: { winBattle: async (g, p) => { const o = g.opp(p); if (o.shields.length) { g.log('シバターの 追いうち！'); await g.breakShields(o, 1); } } },
    43: { attack: async (g, p) => { g.log('ノゾエマの 鏡筋一刀斬り！'); await killAll(2000, '鏡筋一刀斬り')(g, p); } },
    44: { power: (g, u) => (g.players[u.owner].shields.length <= 2 ? 2000 : 0) },
    45: {
        destroyed: async (g, p) => {
            const next = p.hand.find((c) => c.no === 45);
            if (!next || p.field.length >= g.slots(p)) return;
            const ok = await g.ask(p, { title: 'スパムダマが 分裂！ 手札の スパムダマを 出す？', options: [{ label: '出す', value: true, card: next, score: 1 }], cancel: '出さない' });
            if (!ok) return;
            p.hand.splice(p.hand.indexOf(next), 1);
            g.log('スパムダマが 分裂した');
            await g.enter(p, next);
        }
    },
    46: { power: (g, u) => (g.players[u.owner].shields.length <= 2 ? 3000 : 0) },
    47: { enter: bounceOne('ルナヤ', false) },
    48: { enter: async (g, p) => g.discard(p, 1, '大魔王ASO：捨てる カード') },
    49: { magic: killOne(4000, '鬼鬼の金棒'), want: hasTarget(4000) },
    50: { magic: killAll(5000, '亜祖宇激烈破'), want: (g, p) => g.opp(p).field.filter((u) => g.power(u) <= 5000).length >= 2 },
    51: { magic: killOne(2000, '鬼火'), want: hasTarget(2000) },
    52: { magic: killAll(2000, '一網打尽玉'), want: (g, p) => g.opp(p).field.filter((u) => g.power(u) <= 2000).length >= 2 },
    53: { magic: draw(2), want: canDraw },
    54: { magic: stopOne('腐ったおにぎり'), want: strongEnemy },
    55: { scene: (g, owner, u) => (u.owner === owner.id && u.team === 'bariki' ? 1000 : 0), want: (g, p) => team(p, 'bariki').length >= 1 },
    56: { scene: (g, owner, u) => (u.owner === owner.id && u.race === 'ふしぎ' ? 1000 : 0), want: (g, p) => p.field.filter((u) => u.race === 'ふしぎ').length >= 1 },
    57: { itemPower: (g, u) => (isOni(u) ? 3000 : 1000) },
    58: { revive: true },
    59: { haramaki: true },
    60: { itemPower: () => 1000 },
    // ===== ノーブランド =====
    61: { enter: weaken(1000, 'ハリベビー', thisTurn, false) },
    62: { enter: stopOne('大腸炎', false) },
    63: { blocker: true },
    64: { haste: true, noShield: true },
    65: {
        enter: async (g, p) => {
            if (!p.deck.length || p.deck.length < 2) return;
            const top = p.deck[p.deck.length - 1];
            const toShield = p.shields.length < 5 && await g.ask(p, { title: `山札の 上は「${top.name}」。シールドに 加える？`, options: [{ label: 'シールドに 加える', value: true, card: top, score: 1 }], cancel: '山札の 下へ', cancelScore: 0 });
            p.deck.pop();
            if (toShield) { p.shields.push(top); g.log(`${p.name} の シールドが 1 枚 ふえた`); } else { p.deck.unshift(top); g.log('山札の 上の カードを 下へ'); }
        }
    },
    // ===== ばりきつよめ =====
    68: { enter: draw(1), power: (g, u) => (team(g.players[u.owner], 'bariki', u).length >= 2 ? 2000 : 0) },
    69: { attack: async (g, p, u) => { if (team(p, 'bariki', u).length) { g.log('おにおにの 取り立て！'); await killOne(3000, '取り立て', false)(g, p); } } },
    70: {
        enter: async (g, p) => {
            if (p.deck.length < 2) return;
            const top = p.deck.pop();
            g.log(`サイコロン：山札の 上は ${top.name}`);
            if (top.kind === 'monster' && top.lv === 1 && p.field.length < g.slots(p)) await g.enter(p, top);
            else p.hand.push(top);
        }
    },
    71: { haste: true, firstMonsterOnly: true },
    72: { destroyed: async (g, p) => g.draw(p, 1) },
    73: {
        enter: async (g, p) => {
            const n = Math.min(3, p.deck.length - 1);
            if (n <= 0) return;
            const top = p.deck.slice(-n);
            const c = await g.ask(p, { title: 'ガチャポン：手札に 加える カードを えらんでね', options: top.map((x) => ({ label: x.name, value: x, card: x, score: (x.power || 3000) + x.lv * 1000 })) });
            p.deck.splice(p.deck.length - n, n);
            p.hand.push(c);
            p.deck.unshift(...top.filter((x) => x !== c));
            g.log(`${p.name} は ${c.name} を 手札に くわえた`);
        }
    },
    74: { enter: tapOrUntap('ヤタイマン') },
    75: { blocker: true },
    76: {
        enter: async (g, p) => {
            if (!p.hand.length) return;
            const ok = await g.ask(p, { title: '手札を 1 枚 捨てて 2 枚 引く？', options: [{ label: '捨てて 引く', value: true, score: 1 }], cancel: 'しない', cancelScore: 0 });
            if (ok) { await g.discard(p, 1, '捨てる カード'); g.draw(p, 2); }
        }
    },
    77: { enter: pumpOne(2000) },
    78: {
        breaks: 2,
        enter: async (g, p) => { if (team(p, 'bariki').length >= 3) { g.log('ばりきつよめのレクイエム！'); await killOne(0, 'レクイエム', false)(g, p); } }
    },
    80: { magic: async (g, p) => { for (const u of p.field) u.mods.push({ amount: 2000, until: thisTurn(g) }); g.log('ばりき全開！ 自分の モンスター すべて +2000'); }, want: (g, p) => p.field.filter((u) => g.canAttack(u)).length >= 2 },
    82: { magic: async (g, p) => graveToHand(g, p, (c) => c.kind === 'monster' && c.team === 'bariki', '手札に 戻す ばりきつよめの モンスターを えらんでね'), want: (g, p) => fromGrave(p, (c) => c.kind === 'monster' && c.team === 'bariki').length > 0 },
    84: { magic: async (g, p) => g.draw(p, team(p, 'bariki').length >= 3 ? 3 : 2), want: canDraw },
    85: { itemPower: () => 1000, grantBlocker: (g, u) => u.team === 'bariki' },
    86: { itemDestroyed: async (g, p) => g.draw(p, 1) },
    87: { enter: async (g, p) => { const o = g.opp(p); if (o.shields.length > p.shields.length) { g.log('借金の 取り立て！'); await g.breakShields(o, 1); } } },
    // ===== 氷隊 (新) =====
    89: { enter: async (g, p, u) => { if (p.field.some((x) => x !== u && isKoori(x))) g.draw(p, 1); } },
    90: {
        allyAttack: async (g, p, src, u) => {
            if (!isKoori(u) || src.tapped || src === u) return 0;
            const ok = await g.ask(p, { title: 'フブキペンギンを タップして、こおりくんの パワー +3000？（合体攻撃）', options: [{ label: '合体攻撃！', value: true, card: src, score: 1 }], cancel: 'しない', cancelScore: 0 });
            if (!ok) return 0;
            src.tapped = true;
            g.log('フブキペンギンと 合体攻撃！');
            return 3000;
        }
    },
    91: { blocker: true, decoy: true },
    92: { protectKoori: true },
    93: { magic: async (g, p) => { if (!(await search(g, p, isKoori, '山札から 手札に 加える こおりくんを えらんでね'))) g.draw(p, 1); }, want: (g, p) => !p.hand.some(isKoori) && p.deck.length > 6 },
    94: { itemPower: () => 2000, extraBreaks: (g, u) => (isKoori(u) ? 1 : 0) },
    // ===== 鬼鬼団 (新) =====
    95: { evolveFrom: (u) => u.name.startsWith('おにおに（'), breaks: 2 },
    96: { evolveFrom: (u) => u.name === 'おにおに・鬼神', attack: async (g, p) => { g.log('鬼の王の金棒！'); await killOne(5000, '鬼の王の金棒', false)(g, p); } },
    97: { aura: (g, src, u) => (u.owner === src.owner && isOni(u) ? 2000 : 0) },
    98: { enter: async (g, p) => search(g, p, (c) => c.name.includes('おにおに'), '山札から 手札に 加える「おにおに」を えらんでね') },
    99: { enter: async (g, p) => graveToHand(g, p, (c) => c.kind === 'monster' && isOni(c), '墓地から 手札に 戻す「おにおに」を えらんでね') },
    101: { scene: (g, owner, u) => (u.owner === owner.id && isOni(u) ? 2000 : 0), want: (g, p) => [...p.field, ...p.hand].some(isOni) },
    102: {
        magic: async (g, p) => {
            const base = await pickOwn(g, p, '鬼神に 進化させる おにおにを えらんでね', EFFECTS[95].evolveFrom);
            if (!base) return g.log('進化できる おにおにが いない');
            const from = p.hand.find((c) => c.no === 95) ? 'hand' : p.deck.find((c) => c.no === 95) ? 'deck' : null;
            if (!from) return g.log('おにおに・鬼神が 手札にも 山札にも ない');
            const card = (from === 'hand' ? p.hand : p.deck).find((c) => c.no === 95);
            (from === 'hand' ? p.hand : p.deck).splice((from === 'hand' ? p.hand : p.deck).indexOf(card), 1);
            if (from === 'deck') g.shuffleDeck(p);
            await g.evolve(p, base, card);
        },
        want: (g, p) => p.field.some(EFFECTS[95].evolveFrom) && [...p.hand, ...p.deck].some((c) => c.no === 95)
    },
    103: { itemPower: () => 1000, grantHaste: (g, u) => isOni(u) },
    // ===== ASK-3 =====
    104: { enter: peekDiscard },
    105: { haste: true, enter: tapOne('計算どおり', false) },
    106: { power: (g, u) => 1000 * g.players[u.owner].field.filter((x) => x.no === 45).length },
    107: { blocker: true },
    108: { enter: async (g, p) => destroyItem(g, p, 'CSSパックン') },
    109: { enter: weaken(3000, 'ウイルスン', untilMyNextEnd, false) },
    110: { destroyed: async (g, p) => g.discard(g.opp(p), 1, 'ブラクラッシャー：捨てる カード') },
    111: { enter: bounceOne('ノットファウンド', false) },
    112: { enter: async (g, p) => { const t = await g.pickEnemy(p, 'ムゲンループ：とじこめる 相手を えらんでね'); if (t) { g.tap(t); g.stop(t); t.lockUntap = g.turn + 1; } } },
    113: { blocker: true },
    114: { enter: async (g, p) => g.dropScene(g.opp(p), 'ヌルポン') },
    116: {
        magic: async (g, p) => {
            const o = g.opp(p);
            if (p.shields.length <= 3) { g.log('ASAPANCHI！！ 一発逆転！'); await g.breakShields(o, 3); } else await killOne(0, 'ASAPANCHI')(g, p);
        },
        want: (g, p) => p.shields.length <= 3 || strongEnemy(g, p)
    },
    117: { magic: async (g, p) => { await oppDiscard(1)(g, p); g.draw(p, 1); }, want: (g, p) => g.opp(p).hand.length > 0 && p.deck.length > 6 },
    118: { magic: tapOne('計算どおり'), want: (g, p) => g.opp(p).field.some((u) => !u.tapped && g.isBlocker(u)) },
    119: { magic: async (g, p) => { await bounceOne('しめきり厳守', true, 4000)(g, p); await g.discard(g.opp(p), 1, 'しめきり厳守：捨てる カード'); }, want: hasTarget(4000) },
    120: { scene: (g, owner, u) => (u.owner === owner.id ? (owner.shields.length <= 3 ? 2000 : 1000) : 0), want: (g, p) => p.field.length >= 1 },
    121: { breakShield: async (g, p) => g.discard(g.opp(p), 1, 'KINGの王冠：捨てる カード') },
    122: { enter: tapOne('ポップアップン', false) },
    // ===== 5DX =====
    125: {
        enter: async (g, p) => graveToHand(g, p, (c) => c.kind === 'magic', '墓地から 手札に 戻す 魔法を えらんでね'),
        onMagic: async (g, p, u) => { if (u.echoTurn === g.turn) return; u.echoTurn = g.turn; await weaken(1000, 'ひびき', thisTurn, false)(g, p); }   // 1 ターンに 1 回
    },
    126: { blocker: true, power: (g, u) => (g.players[u.owner].field.some(isOkaHibiki) ? 2000 : 0) },
    127: { magicLvDown: true },
    128: { enter: draw(1) },
    129: { destroyed: async (g, p) => graveToHand(g, p, (c) => c.kind === 'magic', '墓地から 手札に 戻す 魔法を えらんでね') },
    130: { blocker: true },
    131: {
        enter: async (g, p) => {
            for (let i = 0; i < 2; i++) {
                const list = fromGrave(p, (c) => c.kind === 'magic');
                if (!list.length) return;
                const c = await g.ask(p, { title: `カグヤウサギ：墓地から 使う 魔法を えらんでね（あと ${2 - i} 枚）`, options: list.map((x) => ({ label: x.name, value: x, card: x, score: x.lv })), cancel: 'やめる' });
                if (!c) return;
                p.grave.splice(p.grave.indexOf(c), 1);
                await g.castFree(p, c);
                p.grave.splice(p.grave.indexOf(c), 1);
                p.deck.unshift(c);
            }
        }
    },
    132: {
        enter: async (g, p) => {
            const n = Math.min(2, p.deck.length - 1);
            if (n <= 0) return;
            const top = p.deck.slice(-n), magic = top.filter((x) => x.kind === 'magic');
            p.deck.splice(p.deck.length - n, n);
            let got = null;
            if (magic.length) got = await g.ask(p, { title: 'コザラッパ：手札に 加える 魔法を えらんでね', options: magic.map((x) => ({ label: x.name, value: x, card: x, score: x.lv })) });
            if (got) { p.hand.push(got); g.log(`${p.name} は ${got.name} を 手札に くわえた`); }
            p.deck.unshift(...top.filter((x) => x !== got));
        }
    },
    134: { magic: killOne(3000, 'カッパのお皿ビーム'), want: hasTarget(3000) },
    135: { magic: async (g, p) => { await stopOne('響きの波')(g, p); g.draw(p, 1); }, want: (g, p) => strongEnemy(g, p) || canDraw(g, p) },
    136: { magic: killOne(5000, '牛の角アタック'), want: hasTarget(5000) },
    137: { magic: async (g, p) => killOne(p.field.some((u) => u.name === 'おかがっぱ') ? 0 : 4000, 'おかピポっと光線')(g, p), want: (g, p) => hasTarget(p.field.some((u) => u.name === 'おかがっぱ') ? 0 : 4000)(g, p) },
    138: { magic: async (g, p) => { g.draw(p, 1); if (p.hand[p.hand.length - 1]?.kind === 'magic') g.draw(p, 1); }, want: canDraw },
    139: { magic: async (g, p) => { p.lvDownTurn = g.turn; g.log('この ターンは 魔法の Lv が 1 下がる'); g.draw(p, 1); }, want: (g, p) => p.hand.filter((c) => c.kind === 'magic' && c.lv > p.lv).length > 0 },
    140: { onMagicScene: async (g, p) => { if (p.magicCount === 2) { g.log('竜宮城：2 枚目の 魔法で 1 枚 引く'); g.draw(p, 1); } }, want: (g, p) => p.hand.filter((c) => c.kind === 'magic').length >= 2 },
    // ===== お願いマッスル =====
    142: { aura: (g, src, u) => (u.owner === src.owner ? 1000 : 0), enter: muscleOne(2) },
    143: { enter: async (g, p) => { await muscleOne(1)(g, p); g.draw(p, 1); } },
    144: { blocker: true, enter: muscleOne(1) },
    145: { enter: muscleOne(1) },
    146: { power: (g, u) => 1000 * muscles(g.players[u.owner]) },
    148: { blocker: true },
    149: { breaks: (g, u) => ((u.muscle || 0) >= 3 ? 2 : 1) },
    150: { haste: (g, u) => g.players[u.owner].hand.length <= 2, attack: async (g, p, u) => g.addMuscle(u, 1) },
    151: { winBattle: async (g, p, u) => g.addMuscle(u, 1) },
    152: { magic: muscleOne(1), want: (g, p) => p.field.length > 0 },
    153: { magic: pumpOne(3000), want: (g, p) => p.field.some((u) => g.canAttack(u)) },
    154: { turnStart: async (g, p) => { if (p.field.length) await muscleOne(1)(g, p); }, want: (g, p) => p.field.length > 0 },
    155: {
        magic: async (g, p) => {
            const u = await pickOwn(g, p, 'マッスルボム：力を 使う モンスターを えらんでね');
            if (!u) return;
            const pw = g.power(u);
            await killOne(pw, 'マッスルボム')(g, p);
        },
        want: (g, p) => p.field.some((u) => g.opp(p).field.some((e) => g.power(e) <= g.power(u) && e.item?.no !== 59))
    },
    156: { attach: async (g, p, u) => g.addMuscle(u, 1) },
    157: { itemPower: () => 3000, guard: true },
    // ===== バータス =====
    158: {
        enter: async (g, p, self) => {
            const list = g.opp(p).field.filter((u) => u.item);
            const free = p.field.filter((u) => !u.item);
            if (list.length && free.length) {
                const from = await g.ask(p, { title: 'ヤーハミー：ぬすむ アイテムを えらんでね', options: list.map((x) => ({ label: `${x.name} の ${x.item.name}`, value: x, card: x.item, score: 1 })) });
                const to = free.includes(self) ? self : free[0];
                to.item = from.item;
                from.item = null;
                g.log(`ヤーハミーが ${to.item.name} を ぬすんで ${to.name} に 付けた`);
            }
            await g.discard(g.opp(p), 1, 'ヤーハミー：捨てる カード');
        }
    },
    159: { haste: true, enter: async (g, p) => destroyItem(g, p, 'チョッキン'), attack: async (g, p) => tapOne('マエチョッキン', false)(g, p) },
    160: {
        enter: async (g, p) => {
            const o = g.opp(p);
            if (!o.hand.length) return;
            const c = o.hand.splice(Math.floor(g.rand() * o.hand.length), 1)[0];
            p.hand.push(c);
            g.log(`ノラハンが ${o.name} の 手札から 1 枚 ねこばば！`);
        }
    },
    161: { blocker: true, destroyed: async (g, p) => g.discard(g.opp(p), 1, 'タカラミミック：捨てる カード') },
    162: { blocker: true, block: async (g, p) => g.discard(g.opp(p), 1, 'キンコミミック：捨てる カード') },
    163: { haste: true, attack: async (g, p) => g.discard(g.opp(p), 1, 'ゲニンマン：捨てる カード'), afterAttack: async (g, p, u) => { if (p.field.includes(u)) await g.bounce(u); } },
    164: { enter: stopOne('ジョウニンマン', false) },
    165: { enter: tapOne('シノビガエル', false) },
    166: { enter: killOne(3000, 'クナイスズメ', false) },
    167: { aura: (g, src, u, ctx) => (u.owner !== src.owner && ctx.attacking ? -1000 : 0) },
    168: { destroyed: async (g, p) => tapOne('カゲブンシンダヌキ', false)(g, p) },
    169: { enter: async (g, p) => g.dropScene(g.opp(p), 'ヨッパライガラス') },
    170: { magic: peekDiscard, want: (g, p) => g.opp(p).hand.length > 0 },
    171: { magic: async (g, p) => { await tapOne('まきびし')(g, p); await tapOne('まきびし')(g, p); }, want: (g, p) => g.opp(p).field.some((u) => !u.tapped && g.isBlocker(u)) },
    172: { magic: stopOne('けむり玉'), want: strongEnemy },
    173: { magic: async (g, p) => { await bounceOne('宝石すり替え')(g, p); await g.discard(g.opp(p), 1, '宝石すり替え：捨てる カード'); }, want: strongEnemy },
    174: { oppDiscardScene: true, want: () => true },
    175: { unblockable: true },
    // ===== ケモノミチ =====
    176: { blocker: true, blockWin: async (g, p) => { const o = g.opp(p); if (o.shields.length) { g.log('イシイーの 反撃！'); await g.breakShields(o, 1); } } },
    177: { blocker: true, power: (g, u) => (g.active !== u.owner ? 2000 : 0) },
    178: { allyBlock: async (g, p) => { g.log('NAITOON の カウンター！'); await killOne(3000, 'NAITOON', false)(g, p); } },
    179: { attacked: () => ({ def: 3000, log: 'マンゲツウルフの カウンター！ パワー +3000' }) },
    180: { blocker: true },
    181: { blocker: true, destroyed: async (g, p) => g.draw(p, 1) },
    182: { enter: stopOne('ヨフカシフクロウ', false) },
    183: { blocker: true, power: (g, u) => (g.active !== u.owner ? 2000 : 0) },
    184: { blocker: true, blockWin: async (g, p) => { if (p.deck.length > 1 && p.shields.length < 5) { p.shields.push(g.takeTop(p)); g.log('オオドングリコ：シールドが 1 枚 ふえた'); } } },
    185: { attacked: () => ({ trap: true, log: 'ハエトリグサーンの カウンター！' }) },
    186: { blocker: true, block: async () => ({ atk: -3000, log: 'イソギンチャック：攻撃してきた モンスターの パワー -3000' }) },
    187: { blocker: true, noAttack: true },
    188: { blocker: true },
    189: { magic: killOne(3000, '獣道のわな'), want: hasTarget(3000) },
    190: { scene: (g, owner, u) => (u.owner === owner.id && g.isBlocker(u) ? 2000 : 0), want: (g, p) => p.field.filter((u) => g.isBlocker(u)).length >= 2 },
    191: {
        magic: async (g, p) => { for (const e of g.opp(p).field) if (!e.tapped && !effectOf(e.no).magicImmune) g.tap(e); g.log('迷宮の待ちぶせ！ 相手の モンスターを すべて タップ'); },
        want: (g, p) => g.opp(p).field.filter((u) => !u.tapped && g.isBlocker(u)).length >= 1 && p.field.some((u) => g.canAttack(u))
    },
    192: { magic: weaken(3000, 'しっぺ返し', untilMyNextEnd), want: strongEnemy },
    193: { blockPower: 3000 },
    194: { enter: async (g, p, u) => g.addMuscle(u, 1) },
    195: { blocker: true, power: (g, u) => ((u.muscle || 0) > 0 ? 2000 : 0) },
    197: { magic: async (g, p) => { for (const u of p.field) g.addMuscle(u, 1); }, want: (g, p) => p.field.length >= 2 },
    198: { attach: async (g, p, u) => { g.addMuscle(u, 1); g.draw(p, 1); } },
    199: { enter: weaken(2000, 'シュリケンボー', thisTurn, false) },
    200: { blocker: true, destroyed: async (g, p) => destroyItem(g, p, 'ハリーミミック') },
    201: { magic: async (g, p) => g.discardRandom(g.opp(p), 'ねこの手'), want: (g, p) => g.opp(p).hand.length > 0 },
    202: { itemAttack: async (g, p) => destroyItem(g, p, '盗みのハサミ') },
    203: { attacked: async (g, p) => { await bounceOne('タツマキツネ', false)(g, p); return null; } },
    204: { blocker: true, block: async (g, p) => { g.draw(p, 1); } },
    205: { enter: tapOne('ヨアケフクロウ', false) },
    206: {
        magic: async (g, p) => { for (const u of p.field.filter((x) => g.isBlocker(x))) u.mods.push({ amount: 2000, until: g.turn + 1, oppTurnOnly: true }); g.log('野生のさけび！ ブロッカーが 強く なった'); },
        want: (g, p) => p.field.filter((u) => g.isBlocker(u)).length >= 2
    },
    207: { enter: async (g, p) => { if (fromGrave(p, (c) => c.kind === 'magic').length >= 3) await killOne(0, 'ウミボウズン', false)(g, p); } },
    208: { enter: async (g, p) => { const o = g.opp(p); for (let i = 0; i < 2; i++) o.grave.push(g.takeTop(o)); g.log(`ネットコゾウ：${o.name} の 山札の 上 2 枚を 墓地へ`); } },
    209: { magic: async (g, p) => g.breakShields(g.opp(p), p.field.some((u) => u.name === 'KING.ASAHARA') ? 2 : 1), want: (g, p) => g.opp(p).shields.length > 0 },
    210: { magic: async (g, p) => { if (!(await search(g, p, isOkaHibiki, '山札から 手札に 加える カードを えらんでね'))) g.draw(p, 1); }, want: (g, p) => p.deck.length > 6 },
    211: {
        magic: async (g, p) => {
            if (p.field.some((u) => u.name === 'ひびきまくり')) {
                for (const u of g.opp(p).field) u.mods.push({ amount: -2000, until: thisTurn(g) });
                g.log('大合唱！ 相手の モンスター すべて -2000');
            } else await weaken(2000, '大合唱', thisTurn)(g, p);
        },
        want: (g, p) => g.opp(p).field.length >= 2
    },
    212: { itemPower: (g, u) => 1000 + (isOkaHibiki(u) && g.players[u.owner].magicCount > 0 && g.active === u.owner ? 2000 : 0) },
    213: { scene: (g, owner, u) => (u.owner === owner.id && (u.muscle || 0) > 0 ? 1000 : 0), want: (g, p) => p.field.some((u) => u.muscle) },
    214: {
        magic: async (g, p) => { for (const u of p.field) u.mods.push({ amount: u.muscle ? 2000 : 1000, until: thisTurn(g) }); g.log('パンプアップ！'); },
        want: (g, p) => p.field.filter((u) => g.canAttack(u)).length >= 2
    },
    215: { attach: async (g, p, u) => g.addMuscle(u, 2) },
    // ===================== アタックチャンス (2026-11-03 ユーザー指定) =====================
    // attackChance(g, u): u が 攻撃するとき ただで 使えるか。メインフェイズでは ふつうに Lv3 の 魔法として 使える
    216: { attackChance: (g, u) => u.team === 'bariki', magic: async (g, p) => summonFree(g, p, (c) => c.team === 'bariki', 'ばりきつよめ総攻撃'), want: (g, p) => p.hand.some((c) => c.kind === 'monster' && c.team === 'bariki' && c.lv >= 2) },
    217: { attackChance: (g, u) => isKoori(u), magic: async (g, p) => summonFree(g, p, (c) => c.team === 'koori' && c.lv <= 2, '氷隊、緊急出動！'), want: (g, p) => p.hand.some((c) => c.kind === 'monster' && c.team === 'koori' && c.lv === 2) },
    218: { attackChance: (g, u) => isOni(u), magic: async (g, p) => fightOne(g, p, '鬼の大暴れ'), want: (g, p) => p.field.some((u) => !u.tapped && g.opp(p).field.some((e) => g.power(e) < g.power(u))) },
    219: {
        attackChance: (g, u) => u.team === 'ask3',
        magic: async (g, p) => { const u = await summonFree(g, p, (c) => c.team === 'ask3', '緊急残業命令'); if (u) { u.haste = true; g.log(`${u.name} は この ターン 速攻`); } },
        want: (g, p) => p.hand.some((c) => c.kind === 'monster' && c.team === 'ask3' && c.lv >= 2)
    },
    220: {
        attackChance: (g, u) => isOkaHibiki(u) || u.name.startsWith('おかがっぱ') || u.name.startsWith('ひびきまくり'),
        magic: async (g, p) => {
            const list = fromGrave(p, (c) => c.kind === 'magic' && !EFFECTS[c.no]?.attackChance);
            if (!list.length) return g.log('アンコール！：墓地に 魔法が ない');
            const c = await g.ask(p, { title: 'アンコール！：墓地から 使う 魔法を えらんでね', options: list.map((x) => ({ label: x.name, value: x, card: x, score: (EFFECTS[x.no]?.want?.(g, p) ? 10 : 0) + x.lv })) });
            p.grave.splice(p.grave.indexOf(c), 1);
            await g.castFree(p, c);
        },
        want: (g, p) => fromGrave(p, (c) => c.kind === 'magic' && c.lv >= 2).length > 0
    },
    221: {
        attackChance: (g, u) => (u.muscle || 0) > 0,
        magic: async (g, p) => { const u = await summonFree(g, p, () => true, 'マッスル乱入'); if (u) g.addMuscle(u, 1); },
        want: (g, p) => p.hand.some((c) => c.kind === 'monster' && c.lv >= 2)
    },
    222: { attackChance: (g, u) => u.team === 'bartas', magic: async (g, p) => fightOne(g, p, '怪盗の早業', { tapFirst: true }), want: (g, p) => p.field.some((u) => !u.tapped && g.opp(p).field.some((e) => g.power(e) < g.power(u))) },
    223: { attackChance: (g, u) => u.team === 'kemono', magic: async (g, p) => summonFree(g, p, (c) => g.isBlocker(c), '獣道の伏兵'), want: (g, p) => p.hand.some((c) => c.kind === 'monster' && c.lv >= 2 && g.isBlocker(c)) },
    224: { attackChance: () => true, magic: async (g, p) => summonFree(g, p, (c) => c.lv === 1, '助っ人コール'), want: () => false },
    225: { attackChance: (g, u) => g.power(u) >= 6000, magic: async (g, p) => fightOne(g, p, '真剣勝負'), want: (g, p) => p.field.some((u) => !u.tapped && g.opp(p).field.some((e) => g.power(e) < g.power(u))) },
    // ===================== パック 第 1 弾 (docs/pack1.md。2026-11-03) =====================
    // ----- ばりきつよめ -----
    301: { enter: async (g, p, u) => { if (team(p, 'bariki', u).length) g.draw(p, 1); } },
    302: { blocker: true, power: (g, u) => (team(g.players[u.owner], 'bariki', u).length ? 1000 : 0) },
    303: {
        magic: async (g, p) => {
            const u = await pickOwn(g, p, 'ばりきコール：パワーを 上げる モンスターを えらんでね');
            if (!u) return;
            const n = u.team === 'bariki' ? 3000 : 2000;
            u.mods.push({ amount: n, until: thisTurn(g) });
            g.log(`${u.name} の パワーが この ターン +${n}`);
        },
        want: (g, p) => p.field.some((u) => g.canAttack(u))
    },
    304: { enter: async (g, p) => search(g, p, (c) => c.kind === 'monster' && c.team === 'bariki', '山札から 手札に 加える ばりきつよめの モンスターを えらんでね') },
    305: { itemPower: () => 2000, itemDestroyed: async (g, p, u) => { if (u.team === 'bariki') g.draw(p, 1); } },
    306: { aura: (g, src, u) => (u.owner === src.owner && u.team === 'bariki' ? 1000 : 0) },
    307: { scene: (g, owner, u, ctx) => (u.owner === owner.id && ctx.attacking && team(owner, 'bariki').length >= 3 ? 2000 : 0), want: (g, p) => team(p, 'bariki').length >= 2 },
    308: { blocker: true, destroyed: async (g, p) => { if (p.deck.length > 2) { p.shields.push(g.takeTop(p)); g.log(`やすさん・ばりきMAX：${p.name} の シールドが 1 枚 ふえた`); g.draw(p, 1); } } },
    309: { enter: async (g, p) => { await stopOne('たむキック 連打', false)(g, p); await stopOne('たむキック 連打', false)(g, p); } },
    310: { blocker: true, power: (g, u) => (g.active !== u.owner ? 3000 : 0), blockWin: async (g, p) => { const o = g.opp(p); if (o.shields.length) { g.log('だけさんの 反撃！'); await g.breakShields(o, 1); } } },
    311: {
        breaks: 2,
        power: (g, u) => 1000 * team(g.players[u.owner], 'bariki', u).length,
        enter: async (g, p) => {
            for (let i = 0; i < 2; i++) if (!(await graveToHand(g, p, (c) => c.kind === 'monster' && c.team === 'bariki', `墓地から 手札に 戻す ばりきつよめの モンスターを えらんでね（あと ${2 - i} 体）`))) return;
        }
    },
    // ----- 氷隊 -----
    312: { enter: async (g, p, u) => { await tapOne('ツララコウモリ', false)(g, p); if (p.field.some((x) => x !== u && isKoori(x))) g.draw(p, 1); } },
    313: { blocker: true, power: (g, u) => (g.players[u.owner].field.some(isKoori) ? 1000 : 0) },
    314: {
        magic: async (g, p) => {
            g.draw(p, 1);
            const u = await pickOwn(g, p, 'ひんやりサポート：パワー +3000 する こおりくんを えらんでね', isKoori);
            if (u) { u.mods.push({ amount: 3000, until: thisTurn(g) }); g.log(`${u.name} の パワーが この ターン +3000`); }
        },
        want: (g, p) => p.field.some((u) => isKoori(u) && g.canAttack(u)) || canDraw(g, p)
    },
    315: { blocker: true, destroyed: async (g, p) => search(g, p, isKoori, '山札から 手札に 加える こおりくんを えらんでね') },
    316: { itemPower: () => 2000, guard: (g, u) => isKoori(u) },
    317: {
        blocker: true,
        enter: async (g, p) => {
            await tapOne('コオリモドキ・真', false)(g, p);
            for (const u of p.field.filter(isKoori)) u.mods.push({ amount: 2000, until: thisTurn(g) });
            if (p.field.some(isKoori)) g.log('こおりくんの パワーが この ターン +2000');
        }
    },
    318: { scene: (g, owner, u) => (u.owner === owner.id && isKoori(u) ? 2000 : 0), want: (g, p) => [...p.field, ...p.hand].some(isKoori) },
    319: { magic: async (g, p) => killOne(p.field.some(isKoori) ? 7000 : 5000, 'コオリソード・極')(g, p), want: (g, p) => hasTarget(p.field.some(isKoori) ? 7000 : 5000)(g, p) },
    320: { blocker: true, enter: draw(2), aura: (g, src, u) => (u.owner === src.owner && isKoori(u) ? 1000 : 0) },
    321: { evolveFrom: isKoori, breaks: 2, enter: killOne(0, '絶対殺すソード', false) },
    322: { evolveFrom: isKoori, breaks: 2, attack: async (g, p) => { g.log('絶対殺すソード・レクイエム！'); await killAll(6000, 'レクイエム')(g, p); } },
    // ----- 鬼鬼団 -----
    323: { destroyed: async (g, p) => g.draw(p, 1) },
    324: { blocker: (g, u) => g.players[u.owner].field.some(isOni) },
    325: { magic: async (g, p) => { if (!(await search(g, p, (c) => c.name.includes('おにおに'), '山札から 手札に 加える「おにおに」を えらんでね'))) g.log('おにおにが 山札に いない'); g.draw(p, 1); }, want: (g, p) => p.deck.length > 6 && p.hand.length <= 6 },
    326: { attack: async (g, p, u) => { if (p.field.some((x) => x !== u && isOni(x))) await killOne(3000, 'エンジョウボウズ', false)(g, p); } },
    327: { itemPower: (g, u) => (isOni(u) ? 3000 : 1000), guard: (g, u) => isOni(u) },
    328: { aura: (g, src, u) => (u.owner === src.owner && isOni(u) ? 1000 : 0) },
    329: { sceneAttack: async (g, p, u) => { if (isOni(u)) await g.discard(g.opp(p), 1, '鬼鬼団のアジト：捨てる カード'); }, want: (g, p) => [...p.field, ...p.hand].some(isOni) },
    330: {
        magic: async (g, p) => { await EFFECTS[102].magic(g, p); g.draw(p, 1); },
        want: (g, p) => EFFECTS[102].want(g, p)
    },
    331: { evolveFrom: isOni, haste: true, enter: async (g, p) => { await killOne(4000, '紅蓮', false)(g, p); g.draw(p, 1); } },
    332: {
        evolveFrom: isOni, breaks: 2,
        attack: async (g, p) => { for (const e of g.opp(p).field.filter((x) => x.item)) g.dropItem(e, '金棒くだき'); }
    },
    333: { evolveFrom: isOni, breaks: 3, enter: async (g, p) => { g.log('鬼の王 覚醒！'); await killAll(6000, '鬼の王 覚醒')(g, p); } },
    // ----- ASK-3 -----
    334: {
        enter: async (g, p) => {
            if (!p.hand.length || p.deck.length < 3) return;
            const ok = await g.ask(p, { title: '手札を 1 枚 捨てて 1 枚 引く？', options: [{ label: '捨てて 引く', value: true, score: 0.4 }], cancel: 'しない', cancelScore: 0.5 });
            if (ok) { await g.discard(p, 1, '捨てる カード'); g.draw(p, 1); }
        }
    },
    335: { blocker: true },
    336: { magic: tapOne('スパム送信'), want: (g, p) => g.opp(p).field.some((u) => !u.tapped && g.isBlocker(u)) },
    337: { enter: async (g, p) => { if (g.opp(p).shields.length > p.shields.length) g.draw(p, 1); } },
    338: {
        itemPower: (g, u) => (u.name.startsWith('KING.ASAHARA') ? 3000 : 2000),
        breakShield: async (g, p, u) => { if (u.name.startsWith('KING.ASAHARA')) await g.discard(g.opp(p), 1, 'CS城の剣：捨てる カード'); }
    },
    339: { enter: async (g, p) => { await peekDiscard(g, p); g.draw(p, 1); } },
    340: { scene: (g, owner, u) => (u.owner === owner.id && owner.shields.length <= 2 ? 3000 : 0), want: (g, p) => p.shields.length <= 3 && p.field.length >= 1 },
    341: { haste: true, enter: async (g, p) => { for (const e of g.opp(p).field) if (!e.tapped) g.tap(e); g.log('完全計算！ 相手の モンスターを すべて タップ'); } },
    342: {
        magic: async (g, p) => { await killOne(6000, 'DOPAPANCHI・改')(g, p); if (p.shields.length <= 2) await g.breakShields(g.opp(p), 2); },
        want: (g, p) => hasTarget(6000)(g, p) || (p.shields.length <= 2 && g.opp(p).shields.length > 0)
    },
    343: { breaks: 3, unblockable: (g, u) => g.players[u.owner].shields.length <= 3 },
    344: {
        magic: async (g, p) => {
            const o = g.opp(p);
            if (p.shields.length <= 1) { g.log('ASAPANCHI・ゼロ！！ 真の 一発逆転！'); await g.breakShields(o, o.shields.length); } else await g.breakShields(o, 2);
        },
        want: (g, p) => g.opp(p).shields.length > 0
    },
    // ----- 5DX -----
    345: { enter: async (g, p) => { if (g.active === p.id && p.magicCount > 0) g.draw(p, 1); } },
    346: { blocker: true, power: (g, u) => (g.active !== u.owner ? 1000 : 0) },
    347: { magic: async (g, p) => g.draw(p, p.field.some((u) => u.name.startsWith('おかがっぱ') || u.name.startsWith('ひびきまくり')) ? 2 : 1), want: canDraw },
    348: { enter: async (g, p) => graveToHand(g, p, (c) => c.kind === 'magic', '墓地から 手札に 戻す 魔法を えらんでね') },
    349: { itemPower: (g, u) => 2000 + (g.active === u.owner && g.players[u.owner].magicCount > 0 ? 2000 : 0) },
    350: { blocker: true, breaks: (g, u) => (g.players[u.owner].field.some((x) => x.name.startsWith('おかがっぱ') || x.name.startsWith('ひびきまくり')) ? 2 : 1) },
    351: { onMagicScene: async (g, p) => { if (p.liveTurn === g.turn) return; p.liveTurn = g.turn; g.log('ライブハウス：1 枚 引く'); g.draw(p, 1); }, want: (g, p) => p.hand.some((c) => c.kind === 'magic') },
    352: {
        magic: async (g, p) => {
            const n = p.field.some((u) => u.name.startsWith('ひびきまくり')) ? 3000 : 2000;
            for (const u of g.opp(p).field) u.mods.push({ amount: -n, until: thisTurn(g) });
            g.log(`響けまくり！ 相手の モンスター すべて -${n}`);
        },
        want: (g, p) => g.opp(p).field.length >= 2
    },
    353: {
        power: (g, u, ctx) => (ctx.attacking ? 2000 : 0),
        onMagic: async (g, p, u) => { if (u.echoTurn === g.turn) return; u.echoTurn = g.turn; await killOne(4000, 'おかピポMAX', false)(g, p); }
    },
    354: {
        magicLvDown: true,
        enter: async (g, p) => { for (let i = 0; i < 2; i++) if (!(await graveToHand(g, p, (c) => c.kind === 'magic', `墓地から 手札に 戻す 魔法を えらんでね（あと ${2 - i} 枚）`))) return; }
    },
    355: {
        enter: async (g, p) => {
            const list = fromGrave(p, (c) => c.kind === 'magic');
            if (!list.length) return;
            const c = await g.ask(p, { title: '3人そろって：墓地から 使う 魔法を えらんでね', options: list.map((x) => ({ label: x.name, value: x, card: x, score: x.lv })), cancel: 'やめる' });
            if (!c) return;
            p.grave.splice(p.grave.indexOf(c), 1);
            await g.castFree(p, c);
        },
        onMagic: async (g, p, u) => { u.mods.push({ amount: 2000, until: thisTurn(g) }); g.log('チーム5DXの パワーが +2000'); }
    },
    // ----- お願いマッスル -----
    356: { winBattle: async (g, p, u) => g.addMuscle(u, 1) },
    357: { blocker: (g, u) => (u.muscle || 0) > 0 },
    358: { magic: muscleOne(1), want: (g, p) => p.field.length > 0 },
    359: { blocker: true, enter: muscleOne(1) },
    360: { attach: async (g, p, u) => g.addMuscle(u, 1), itemDestroyed: async (g, p) => g.draw(p, 1) },
    361: { winBattle: async (g, p, u) => { const o = g.opp(p); if (o.shields.length) { g.log('バルクアップ！'); await g.breakShields(o, 1); } if (p.field.includes(u)) g.addMuscle(u, 1); } },
    362: { scene: (g, owner, u) => (u.owner === owner.id && (u.muscle || 0) > 0 ? 1000 + (g.active !== owner.id ? 2000 : 0) : 0), want: (g, p) => p.field.some((u) => u.muscle) },
    363: {
        magic: async (g, p) => {
            const a = await pickOwn(g, p, '合体ポーズ：筋肉 +1 する モンスターを えらんでね（1 体め）');
            if (a) g.addMuscle(a, 1);
            const b = await pickOwn(g, p, '合体ポーズ：筋肉 +1 する モンスターを えらんでね（2 体め）', (x) => x !== a);
            if (b) g.addMuscle(b, 1);
            g.draw(p, 1);
        },
        want: (g, p) => p.field.length > 0
    },
    364: { haste: true, enter: async (g, p) => { for (const u of p.field) g.addMuscle(u, 1); } },
    365: { power: (g, u) => 1000 * (u.muscle || 0), aura: (g, src, u) => (u.owner === src.owner ? 1000 * (u.muscle || 0) : 0) },
    366: { breaks: 2, enter: async (g, p) => { for (const u of p.field) g.addMuscle(u, 2); } },
    // ----- バータス -----
    367: { power: (g, u) => (g.opp(g.players[u.owner]).hand.length > g.players[u.owner].hand.length ? 1000 : 0) },
    368: { enter: tapOne('カミナリグモ', false) },
    369: { magic: async (g, p) => { await g.discardRandom(g.opp(p), 'すりかえ'); g.draw(p, 1); }, want: (g, p) => g.opp(p).hand.length > 0 || canDraw(g, p) },
    370: { enter: async (g, p) => { await peekDiscard(g, p); g.draw(p, 1); } },
    371: { itemPower: () => 1000, itemAttack: async (g, p, u) => { if (p.capeTurn === g.turn) return; p.capeTurn = g.turn; await g.discardRandom(g.opp(p), '怪盗のマント'); } },   // 1 ターンに 1 回 (2026-11-03 バランス)
    372: {
        enter: async (g, p) => {
            const o = g.opp(p);
            if (!o.hand.length) return;
            const c = o.hand.splice(Math.floor(g.rand() * o.hand.length), 1)[0];
            p.hand.push(c);
            g.log(`ノラハンが ${o.name} の 手札から 1 枚 ねこばば！`);
            await g.discard(o, 1, 'ねこまっしぐら：捨てる カード');
        }
    },
    373: { scene: (g, owner, u) => (u.owner === owner.id && g.opp(owner).hand.length <= 2 ? 1000 : 0), want: (g, p) => p.field.length >= 1 },
    374: {
        magic: async (g, p) => { for (const e of g.opp(p).field.filter((x) => x.item)) g.dropItem(e, 'ぜんぶいただき'); await g.discard(g.opp(p), 1, 'ぜんぶいただき：捨てる カード'); },
        want: (g, p) => g.opp(p).field.some((u) => u.item) || g.opp(p).hand.length > 0
    },
    375: { haste: true, attack: async (g, p) => { await tapOne('ハサミの舞', false)(g, p); await tapOne('ハサミの舞', false)(g, p); } },
    376: { breaks: 2, enter: async (g, p) => { await peekDiscard(g, p); await peekDiscard(g, p); g.draw(p, 1); } },
    377: {
        enter: async (g, p) => {
            if (p.field.length >= g.slots(p)) return;
            const t = await g.pickEnemy(p, '怪盗団：うばう 相手の モンスターを えらんでね', (u) => g.power(u) <= 5000);
            if (t) g.steal(t, p);
        }
    },
    // ----- ケモノミチ -----
    378: { blocker: true, block: async () => ({ def: 2000, log: 'オバケカボチャ：パワー +2000' }) },
    379: { blocker: true, power: (g, u) => (g.active !== u.owner ? 1000 : 0) },
    380: { magic: async (g, p) => { await tapOrUntap('けものの遠吠え', { magic: true, pump: 2000 })(g, p); g.draw(p, 1); }, want: canDraw },
    381: { attacked: () => ({ atk: -2000, log: 'バグムシの カウンター！ 攻撃してきた モンスター -2000' }) },
    382: { grantBlocker: () => true, itemPower: (g, u) => 1000 + (g.active !== u.owner ? 2000 : 0) },
    383: { blocker: true, blockWin: async (g, p) => g.draw(p, 1) },
    384: { scene: (g, owner, u, ctx) => (u.owner !== owner.id && ctx.attacking ? -1000 : 0), want: (g, p) => p.field.length >= 1 },
    385: { magic: async (g, p) => killOne(p.field.some((u) => g.isBlocker(u)) ? 7000 : 5000, '返り討ち')(g, p), want: (g, p) => hasTarget(p.field.some((u) => g.isBlocker(u)) ? 7000 : 5000)(g, p) },
    386: { allyBlock: async (g, p, s, d, u) => { if (g.power(u, { attacking: true }) <= 6000) { g.log('夜明けの遠吠え！'); await g.destroy(u, 'NAITOON・夜明けの遠吠え'); } } },
    387: { blocker: true, block: async () => ({ killAttacker: true, log: 'イシイー・獣道の王の カウンター！' }) },
    388: { blocker: true, allBlockers: true, anyBlockWin: async (g, p) => { const o = g.opp(p); if (o.shields.length) { g.log('迷宮の守護者の 反撃！'); await g.breakShields(o, 1); } } },
    // ----- ノーブランド -----
    389: { destroyed: async (g, p) => g.draw(p, 1) },
    391: { blocker: true },
    392: {
        magic: async (g, p) => {
            const n = Math.min(2, p.deck.length - 1);
            if (n <= 0) return;
            const top = p.deck.slice(-n);
            const c = await g.ask(p, { title: 'ふるカワのメモ：手札に 加える カードを えらんでね', options: top.map((x) => ({ label: x.name, value: x, card: x, score: (x.power || 3000) + x.lv * 1000 })) });
            p.deck.splice(p.deck.length - n, n);
            p.hand.push(c);
            p.deck.unshift(...top.filter((x) => x !== c));
            g.log(`${p.name} は ${c.name} を 手札に くわえた`);
        },
        want: canDraw
    },
    393: { itemPower: () => 1000 },
    394: { blocker: true },
    395: { enter: async (g, p) => { if (p.shields.length <= 4 && p.deck.length > 2) { p.shields.push(g.takeTop(p)); g.log(`フキノトン：${p.name} の シールドが 1 枚 ふえた`); } } },
    396: { magic: async (g, p) => { await pumpOne(3000)(g, p); g.draw(p, 1); }, want: (g, p) => p.field.some((u) => g.canAttack(u)) || canDraw(g, p) },
    397: { itemPower: (g, u, ctx) => (ctx.attacking ? 2000 : 0) },
    398: { attack: async (g, p) => killOne(3000, 'ハリドラ', false)(g, p) },
    399: { magic: async (g, p) => { g.draw(p, 3); await g.discard(p, 1, 'ふるカワの大応援：捨てる カード'); }, want: canDraw },
    400: { turnStart: async (g, p) => { if (p.hand.length <= 2) { g.log('石の川タウン：1 枚 引く'); g.draw(p, 1); } }, want: (g, p) => p.hand.length <= 4 },
    401: { blocker: true, magicImmune: true },
    402: { breaks: 2, magicImmune: true }
};

export const effectOf = (no) => EFFECTS[no] || {};
