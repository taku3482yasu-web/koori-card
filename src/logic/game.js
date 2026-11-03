// =====================================================================
// たいせんの ルール (ルール資料 + docs/cards.md 0 章の 決まったこと)。画面には ふれない
// ---------------------------------------------------------------------
// 選ぶ 場面は すべて game.ask(pid, req) で 聞く (人は 画面で、CPU は options の score が 高いものを 選ぶ)。
//   req: { title, options: [{ label, value, card?, score }], cancel?: 'ことば' }  → value (cancel なら null)
// 勝ち負けが 決まったら GameOver を 投げて 処理を 止める。
// =====================================================================
import { cardByNo, DECKS, CARDS } from '../data/cards.js';
import { effectOf, isKoori } from './effects.js';

export const SHIELDS = 5;
export const FIRST_HAND = 6;
export const DECK_SIZE = 50;
export const MAX_LV = 3;
export const slotsOf = (lv) => lv + 2;   // Lv1 3 体・Lv2 4 体・Lv3 5 体

export class GameOver extends Error {
    constructor(winner, reason) { super(reason); this.winner = winner; this.reason = reason; }
}

let uidSeq = 0;
const inst = (no) => ({ uid: ++uidSeq, ...cardByNo(no) });

export function shuffle(list, rand = Math.random) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

// スターターデッキ 50 枚 (docs/cards.md の 一覧の 枚数。2026-11-03)
export function starterDeck(deckId) {
    return DECKS[deckId].list.flatMap(([no, n]) => Array.from({ length: n }, () => no));
}

// バディ: デッキの チームの モンスターから えらべる (2026-11-03 ユーザー指定)。えらばなければ デッキの おすすめ
//   has(no): パックの カードを 持っているか (持っていない パックの カードは えらべない。2026-11-03)
export const buddyChoices = (deckId, has = () => false) => CARDS.filter((c) => c.kind === 'monster' && c.team === deckId && (!c.pack || has(c.no)));
//   list: 自分で 作った デッキ (カード番号 50 こ。なければ スターターデッキ)
function newPlayer(id, name, deckId, cpu, rand, buddyNo = null, list = null) {
    const deck = shuffle((list || starterDeck(deckId)).map(inst), rand);
    const okBuddy = buddyNo && cardByNo(buddyNo)?.kind === 'monster' && cardByNo(buddyNo).team === deckId;
    const p = {
        id, name, cpu, deckId, deck, hand: [], shields: [], field: [], grave: [],
        buddy: inst(okBuddy ? buddyNo : DECKS[deckId].buddy), scene: null, lv: 1, broken: 0, summoned: false, magicCount: 0, lvDownTurn: 0, discardDrawTurn: 0
    };
    for (let i = 0; i < SHIELDS; i++) p.shields.push(p.deck.pop());
    for (let i = 0; i < FIRST_HAND; i++) p.hand.push(p.deck.pop());
    return p;
}

export class Game {
    // opts: { players: [{ name, deck, cpu, buddy, list }] ×2 (buddy: バディの カード番号。なければ おすすめ / list: 自分で 作った デッキ), first: 0|1, rand, ask, onChange, delay, fx }
    //   fx({ type: 'attack', unit, target }) / fx({ type: 'destroy', unit }): 画面の 演出を 待つ (ルールは 画面に ふれない)
    constructor(opts) {
        const rand = opts.rand || Math.random;
        this.rand = rand;
        this.players = opts.players.map((o, i) => newPlayer(i, o.name, o.deck, !!o.cpu, rand, o.buddy, o.list));
        this.first = opts.first ?? (rand() < 0.5 ? 0 : 1);
        this.active = this.first;
        this.turn = 0;
        this.phase = 'main';
        this.winner = null;
        this.reason = '';
        this.logs = [];
        this.askFn = opts.ask;
        this.onChange = opts.onChange || (() => {});
        this.delay = opts.delay || (() => Promise.resolve());
        this.fx = opts.fx || (() => Promise.resolve());
    }

    // ---------- 小さな 道具 ----------
    opp(p) { return this.players[1 - p.id]; }
    log(msg) { this.logs.push(msg); this.onChange(); }
    async ask(p, req) {
        const opts = req.options;
        if (!opts.length && !req.cancel) return null;
        if (p.cpu) {
            let best = null;
            for (const o of opts) if (!best || (o.score ?? 0) > (best.score ?? 0)) best = o;
            if (req.cancel && (!best || (best.score ?? 0) < (req.cancelScore ?? -Infinity))) return null;
            return best ? best.value : null;
        }
        return this.askFn(p.id, req);
    }
    lose(p, reason) {
        const w = this.opp(p);
        this.winner = w.id;
        this.reason = reason;
        this.log(`${w.name} の かち！（${reason}）`);
        throw new GameOver(w.id, reason);
    }
    win(p, reason) { this.lose(this.opp(p), reason); }
    takeTop(p) {   // 山札の 上から 1 枚。0 枚に なった 瞬間に 負け
        const c = p.deck.pop();
        if (p.deck.length === 0) {
            if (c) p.hand.push(c);
            this.lose(p, `${p.name} の 山札が 0 枚に なった`);
        }
        return c;
    }
    draw(p, n = 1) {
        for (let i = 0; i < n; i++) p.hand.push(this.takeTop(p));
        this.log(`${p.name} は ${n} 枚 ひいた`);
    }

    // ---------- パワー ----------
    // ctx: { attacking, defending }。カードの 効果 (effects.js) の パワーを ぜんぶ たす。筋肉 1 こ = +1000
    power(u, ctx = {}) {
        let pw = u.power + 1000 * (u.muscle || 0);
        pw += effectOf(u.no).power?.(this, u, ctx) || 0;
        if (u.item) pw += effectOf(u.item.no).itemPower?.(this, u, ctx) || 0;
        for (const q of this.players) {
            if (q.scene) pw += effectOf(q.scene.no).scene?.(this, q, u, ctx) || 0;
            for (const s of q.field) if (s !== u) pw += effectOf(s.no).aura?.(this, s, u, ctx) || 0;
        }
        for (const m of u.mods) if (!m.oppTurnOnly || this.active !== u.owner) pw += m.amount;
        return Math.max(0, pw);
    }

    // ---------- 出せるか ----------
    slots(p) { return slotsOf(p.lv); }
    // 出す・使うのに いる Lv (5DX: ハリーメイジ・呪文の連鎖で 魔法は 1 下がる)
    needLv(p, card) {
        if (card.kind !== 'magic') return card.lv;
        const down = (p.field.some((u) => effectOf(u.no).magicLvDown) ? 1 : 0) + (p.lvDownTurn === this.turn ? 1 : 0);
        return Math.max(1, card.lv - down);
    }
    // 【進化】の もとに できる 自分の モンスター
    evolveBases(p, card) {
        const from = effectOf(card.no).evolveFrom;
        return from ? p.field.filter((u) => from(u) && u.power < card.power) : [];   // 進化は もとの パワーより 強く なる ときだけ
    }
    canPlay(p, card) {
        if (this.winner !== null || this.active !== p.id || this.phase !== 'main') return false;
        if (this.needLv(p, card) > p.lv) return false;
        if (card.kind === 'monster' && effectOf(card.no).evolveFrom) return !p.summoned && this.evolveBases(p, card).length > 0;
        if (card.kind === 'monster') return !p.summoned && p.field.length < this.slots(p);
        if (card.kind === 'item') return p.field.some((u) => !u.item);
        return true;
    }
    whyNot(p, card) {
        if (this.phase !== 'main') return 'アタックフェイズに なったので カードは 使えない（メインフェイズだけ）';
        if (this.needLv(p, card) > p.lv) return `Lv${this.needLv(p, card)} から（いまは Lv${p.lv}）`;
        if (card.kind === 'monster' && p.summoned) return 'モンスターは 1 ターンに 1 体まで';
        if (card.kind === 'monster' && effectOf(card.no).evolveFrom) return '進化の もとに なる モンスターが 場に いない';
        if (card.kind === 'monster') return `場が いっぱい（${this.slots(p)} 体まで）`;
        if (card.kind === 'item') return 'アイテムを 付けられる モンスターが いない';
        return '';
    }
    maxAttacks(u) { return effectOf(u.no).attacks || 1; }
    isBlocker(u) {
        const b = effectOf(u.no).blocker;
        if (b === true) return true;
        if (typeof b === 'function') return u.owner === undefined || b(this, u);   // 手札の カード (場に いない) は「ブロッカーに なれる」として 見せる
        if (u.owner !== undefined && this.players[u.owner].field.some((x) => effectOf(x.no).allBlockers)) return true;
        return Boolean(u.item && effectOf(u.item.no).grantBlocker?.(this, u));
    }
    canBlock(u) { return this.isBlocker(u) && !u.tapped; }
    canAttack(u) {
        if (this.winner !== null || u.owner !== this.active) return false;
        if (effectOf(u.no).noAttack) return false;
        if (u.attacks >= this.maxAttacks(u)) return false;
        if (u.stopTurn === this.turn) return false;
        const h = effectOf(u.no).haste;   // 条件つきの 速攻 (マグマッチョ: 手札が 2 枚以下)
        return u.enteredTurn < this.turn || u.haste || (typeof h === 'function' && h(this, u)) || Boolean(u.item && effectOf(u.item.no).grantHaste?.(this, u));
    }
    // その 相手を 攻撃できるか (シールドに 攻撃できない・出た ターンは モンスターだけ)
    canTarget(u, target) {
        const e = effectOf(u.no);
        if (target === 'shield') return !e.noShield && !(e.firstMonsterOnly && u.enteredTurn === this.turn);
        return true;
    }
    breaksOf(u) {
        const b = effectOf(u.no).breaks;
        const n = typeof b === 'function' ? b(this, u) : b || 1;
        return n + (u.item ? effectOf(u.item.no).extraBreaks?.(this, u) || 0 : 0);
    }
    addMuscle(u, n) {
        u.muscle = (u.muscle || 0) + n;
        this.log(`${u.name} に 筋肉 +${n}（パワー +${n * 1000}）`);
    }
    tap(u) { u.tapped = true; this.log(`${u.name} を タップした`); }
    dropScene(o, why) {
        if (!o.scene) return;
        this.log(`${why}：場面「${o.scene.name}」は 墓地へ`);
        o.grave.push(o.scene);
        o.scene = null;
    }
    dropItem(u, why) {
        if (!u.item) return;
        this.log(`${why}：${u.name} の ${u.item.name} は 墓地へ`);
        this.players[u.owner].grave.push(u.item);
        u.item = null;
    }
    shuffleDeck(p) { shuffle(p.deck, this.rand); }
    // 相手の モンスターを 自分の 場へ (アイテムは 持ち主の 墓地へ・この ターンは 攻撃できない。バータスの OR)
    steal(u, p) {
        const o = this.players[u.owner];
        if (!this.detach(u)) return;
        if (u.item) { o.grave.push(u.item); u.item = null; }
        u.owner = p.id;
        u.enteredTurn = this.turn;
        u.haste = false;
        u.tapped = false;
        p.field.push(u);
        this.log(`${p.name} は ${u.name} を うばった！`);
    }

    // ---------- ターン ----------
    async start() {
        try {
            this.log(`${this.players[this.first].name} の 先攻`);
            await this.beginTurn();
        } catch (e) { if (!(e instanceof GameOver)) throw e; }
    }
    async beginTurn() {
        this.turn++;
        const p = this.players[this.active];
        p.summoned = false;
        p.magicCount = 0;
        this.phase = 'main';   // カードを 使えるのは 引いたあとの メインフェイズだけ。はじめて 攻撃したら アタックフェイズ (2026-11-03)
        for (const u of p.field) { u.attacks = 0; if (u.lockUntap !== this.turn) u.tapped = false; }   // 自分の ターンの はじめに アンタップ (ムゲンループは しない)
        this.log(`── ${this.turn} ターン目：${p.name} ──`);
        if (this.turn > 1) this.draw(p);
        if (p.scene) await effectOf(p.scene.no).turnStart?.(this, p);   // 筋肉の山
        this.onChange();
    }
    // 人も CPU も ターンの 終わりに よぶ
    async endTurn() {
        try {
            const p = this.players[this.active];
            for (const u of [...p.field, ...this.opp(p).field]) {
                if (effectOf(u.no).endOfTurnDie) await this.sendToGrave(u, 'こおにの つっこみ');
            }
            for (const q of this.players) for (const u of q.field) u.mods = u.mods.filter((m) => m.until > this.turn);
            this.active = 1 - this.active;
            await this.sweepZero();
            await this.beginTurn();
        } catch (e) { if (!(e instanceof GameOver)) throw e; }
    }

    // ---------- カードを 使う ----------
    // from: 'hand' | 'buddy'。メインフェイズに 人や CPU が 使う
    async play(p, card, from = 'hand') {
        if (!this.canPlay(p, card)) return false;
        try {
            if (from === 'buddy') p.buddy = null;
            else p.hand.splice(p.hand.indexOf(card), 1);
            if (card.kind === 'monster') p.summoned = true;
            if (card.kind === 'monster' && effectOf(card.no).evolveFrom) {
                const bases = this.evolveBases(p, card);
                const base = await this.ask(p, { title: `${card.name} に 進化させる モンスターを えらんでね`, options: bases.map((u) => ({ label: u.name, value: u, card: u, score: this.power(u) })) });
                await this.evolve(p, base, card);
            } else await this.use(p, card, { from });
        } catch (e) { if (!(e instanceof GameOver)) throw e; }
        this.onChange();
        return true;
    }

    // 手札などから 出た カードを 解決する (trigger: シールドから タダで)
    async use(p, card, { trigger = false } = {}) {
        const head = trigger ? `⚡ ドタバタトリガー！ ${p.name} は` : `${p.name} は`;
        if (card.kind === 'monster' && effectOf(card.no).evolveFrom) {
            // トリガーで 来た 進化の カードは、もとが いれば 進化・いなければ 手札へ
            const bases = this.evolveBases(p, card);
            if (!bases.length) { p.hand.push(card); this.log(`${card.name} は 進化の もとが いないので 手札へ`); return; }
            await this.evolve(p, bases[0], card);
        } else if (card.kind === 'monster') {
            if (p.field.length >= this.slots(p)) {
                if (!trigger) { p.hand.push(card); return; }
                const out = await this.ask(p, {
                    title: `場が いっぱい。墓地へ 送る モンスターを えらんでね（${card.name} を 出す）`,
                    options: p.field.map((u) => ({ label: u.name, value: u, card: u, score: -this.power(u) }))
                });
                await this.sendToGrave(out, 'おしだし');
            }
            this.log(`${head} ${card.name} を 出した`);
            await this.enter(p, card);
        } else if (card.kind === 'field') {
            if (p.scene) p.grave.push(p.scene);
            p.scene = card;
            this.log(`${head} 場面「${card.name}」を 出した`);
        } else if (card.kind === 'item') {
            const free = p.field.filter((u) => !u.item);
            if (!free.length) { p.hand.push(card); this.log(`${card.name} は 付ける 相手が いないので 手札へ`); return; }
            const u = await this.ask(p, {
                title: `${card.name} を 付ける モンスターを えらんでね`,
                options: free.map((x) => ({ label: x.name, value: x, card: x, score: this.power(x) }))
            });
            u.item = card;
            this.log(`${head} ${card.name} を ${u.name} に 付けた`);
            await effectOf(card.no).attach?.(this, p, u);
        } else {
            this.log(`${head} 魔法「${card.name}」を 使った`);
            await this.castFree(p, card);
        }
        await this.sweepZero();
        this.onChange();
    }

    // 魔法を 使う (効果 → 墓地へ → 「魔法を 使ったとき」の 効果)
    async castFree(p, card) {
        await effectOf(card.no).magic?.(this, p);
        p.grave.push(card);
        p.magicCount++;
        for (const u of [...p.field]) if (p.field.includes(u)) await effectOf(u.no).onMagic?.(this, p, u);
        if (p.scene) await effectOf(p.scene.no).onMagicScene?.(this, p);
    }

    async enter(p, card) {
        const u = { ...card, card, owner: p.id, item: null, enteredTurn: this.turn, attacks: 0, tapped: false, mods: [], stopTurn: 0, muscle: 0, under: [], haste: effectOf(card.no).haste === true };
        p.field.push(u);
        this.onChange();
        await effectOf(card.no).enter?.(this, p, u);
        return u;
    }
    // 【進化】: もとの モンスターの 上に 重ねる。タップ・アイテム・筋肉は 引きつぎ、出た ターンも 攻撃できる (2026-11-03 ユーザー回答)
    async evolve(p, base, card) {
        const i = p.field.indexOf(base);
        const u = { ...card, card, owner: p.id, item: base.item, enteredTurn: base.enteredTurn, attacks: base.attacks, tapped: base.tapped, mods: base.mods, stopTurn: base.stopTurn,
            muscle: base.muscle || 0, under: [...(base.under || []), base.card], haste: true };
        p.field[i] = u;
        this.log(`${base.name} が ${card.name} に 進化した！`);
        this.onChange();
        await effectOf(card.no).enter?.(this, p, u);
        return u;
    }

    // ---------- 場から 離れる ----------
    detach(u) {
        const p = this.players[u.owner];
        const i = p.field.indexOf(u);
        if (i < 0) return false;
        p.field.splice(i, 1);
        return true;
    }
    async sendToGrave(u, why = '') {
        const p = this.players[u.owner];
        if (!this.detach(u)) return;
        if (u.item) p.grave.push(u.item);
        p.grave.push(...(u.under || []), u.card);
        this.log(`${u.name} は 墓地へ${why ? `（${why}）` : ''}`);
    }
    async bounce(u) {
        const p = this.players[u.owner];
        if (!this.detach(u)) return;
        if (u.item) p.grave.push(u.item);
        p.grave.push(...(u.under || []));
        p.hand.push(u.card);
        this.log(`${u.name} は ${p.name} の 手札に もどった`);
    }
    // パワーが 0 以下の モンスターは やられる (お守りは 効かない・ふっかつのたねは 効く。2026-10-29 ユーザー回答)
    async sweepZero() {
        for (let more = true; more;) {
            more = false;
            for (const q of this.players) {
                for (const u of [...q.field]) {
                    if (q.field.includes(u) && this.power(u) <= 0) more = (await this.destroy(u, 'パワーが 0', { guard: false })) || more;
                }
            }
        }
    }
    // やられる (バトル・効果)。守られたら false (guard: false なら お守り・ベルト・ヒョウガメは 効かない)
    //   by: バトルで たおした 相手 (ツララボウの みちづれ)
    async destroy(u, why = '', { guard = true, battle = false, by = null } = {}) {
        const p = this.players[u.owner];
        if (!p.field.includes(u)) return false;
        const ig = u.item && effectOf(u.item.no).guard;
        if (guard && ig && (ig === true || ig(this, u))) {
            p.grave.push(u.item);
            this.log(`${u.item.name}が ${u.name} を まもった`);
            u.item = null;
            return false;
        }
        const keeper = guard && isKoori(u) && p.field.find((x) => x !== u && effectOf(x.no).protectKoori);
        if (keeper) {
            this.log(`${keeper.name}が こおりくんの かわりに やられた！`);
            await this.destroy(keeper, 'みがわり', { guard: false });
            return false;
        }
        await this.fx({ type: 'destroy', unit: u });
        const item = u.item;
        if (item && effectOf(item.no).revive) {
            this.detach(u);
            p.grave.push(item, ...(u.under || []));
            p.hand.push(u.card);
            this.log(`${u.name} は やられたが、ふっかつのたねで 手札に もどった`);
        } else {
            await this.sendToGrave(u, why);
        }
        if (item) await effectOf(item.no).itemDestroyed?.(this, p, u);
        await effectOf(u.no).destroyed?.(this, p, u, { battle, by });
        return true;
    }

    // ---------- 選ぶ 道具 ----------
    // 相手の モンスターを 1 体 (magic: はらまきの モンスターは 選べない)
    //   コオリノカガミ (氷隊): こおりくんが 選ばれたら かわりに コオリノカガミ
    async pickEnemy(p, title, filter = () => true, { magic = false } = {}) {
        const o = this.opp(p);
        const list = o.field.filter((u) => filter(u) && !(magic && ((u.item && effectOf(u.item.no).haramaki) || effectOf(u.no).magicImmune)));
        if (!list.length) { this.log('えらべる 相手が いない'); return null; }
        let t = await this.ask(p, { title, options: list.map((u) => ({ label: `${u.name}（${this.power(u)}）`, value: u, card: u, score: this.power(u) })) });
        const decoy = t && isKoori(t) && o.field.find((x) => x !== t && effectOf(x.no).decoy);
        if (decoy) { this.log(`${decoy.name}が こおりくんの かわりに うけた！`); t = decoy; }
        return t;
    }
    async discard(p, n, title) {
        for (let i = 0; i < n && p.hand.length; i++) {
            const c = await this.ask(p, {
                title: `${title}（あと ${n - i} 枚）`,
                options: p.hand.map((x) => ({ label: x.name, value: x, card: x, score: -cardValue(x) }))
            });
            p.hand.splice(p.hand.indexOf(c), 1);
            p.grave.push(c);
            this.log(`${p.name} は ${c.name} を 捨てた`);
            await this.afterDiscard(p);
        }
    }
    // 相手の 手札を 見て 1 枚 えらんで 捨てさせる
    async chooseDiscard(p, o) {
        if (!o.hand.length) return;
        const c = await this.ask(p, { title: `${o.name} の 手札：捨てさせる カードを えらんでね`, options: o.hand.map((x) => ({ label: x.name, value: x, card: x, score: cardValue(x) })) });
        o.hand.splice(o.hand.indexOf(c), 1);
        o.grave.push(c);
        this.log(`${o.name} は ${c.name} を 捨てさせられた`);
        await this.afterDiscard(o);
    }
    async discardRandom(o, why) {
        if (!o.hand.length) return;
        const c = o.hand.splice(Math.floor(this.rand() * o.hand.length), 1)[0];
        o.grave.push(c);
        this.log(`${why}：${o.name} は ${c.name} を 捨てた`);
        await this.afterDiscard(o);
    }
    // 盗賊のアジト (バータス): 相手が 捨てたら 1 枚 引く (1 ターンに 1 回)
    async afterDiscard(who) {
        const q = this.opp(who);
        if (q.scene && effectOf(q.scene.no).oppDiscardScene && q.discardDrawTurn !== this.turn && q.deck.length > 1) {
            q.discardDrawTurn = this.turn;
            this.log('盗賊のアジト：1 枚 引く');
            this.draw(q, 1);
        }
    }
    // 次の 相手の ターンに 攻撃できない
    stop(u) {
        u.stopTurn = this.active === u.owner ? this.turn + 2 : this.turn + 1;
        this.log(`${u.name} は 次の ターン 攻撃できない`);
    }

    // ---------- 攻撃 ----------
    // target: 相手の モンスター か 'shield'
    async attack(u, target) {
        if (!this.canAttack(u) || !this.canTarget(u, target)) return false;
        const p = this.players[u.owner];
        const o = this.opp(p);
        try {
            this.phase = 'attack';
            u.attacks++;
            u.tapped = true;   // 攻撃したら タップ (次の 自分の ターンまで ブロックできない)
            let atkBonus = 0;
            await effectOf(u.no).attack?.(this, p, u, { target });
            if (u.item) await effectOf(u.item.no).itemAttack?.(this, p, u);
            for (const s of [...p.field]) if (s !== u) atkBonus += (await effectOf(s.no).allyAttack?.(this, p, s, u)) || 0;
            if (p.scene) await effectOf(p.scene.no).sceneAttack?.(this, p, u);
            await this.attackChance(p, u);
            if (!p.field.includes(u)) { this.onChange(); return true; }
            if (target !== 'shield' && !o.field.includes(target)) target = 'shield';
            const noBlock = (u.item && effectOf(u.item.no).unblockable) || effectOf(u.no).unblockable?.(this, u);
            const blocked = noBlock ? target : await this.askBlock(u, target);
            const isBlock = blocked !== target;
            target = blocked;
            if (target === 'shield') {
                if (o.shields.length === 0) { await this.fx({ type: 'attack', unit: u, target }); this.win(p, `${u.name} の ダイレクトアタック`); }
                const n = this.breaksOf(u);
                this.log(`${u.name} が シールドを こうげき！`);
                await this.fx({ type: 'attack', unit: u, target });
                const before = o.shields.length;
                await this.breakShields(o, n);
                if (u.item) for (let k = 0; k < before - o.shields.length; k++) await effectOf(u.item.no).breakShield?.(this, p, u);
            } else if (o.field.includes(target)) {
                await this.battle(p, o, u, target, { isBlock, atkBonus });
            }
            if (p.field.includes(u)) await effectOf(u.no).afterAttack?.(this, p, u);
            await this.sweepZero();
        } catch (e) { if (!(e instanceof GameOver)) throw e; }
        this.onChange();
        return true;
    }

    // アタックチャンス: u の 攻撃で 条件に 合う 手札の 魔法を ただで (Lv に 関係なく) 1 枚 使える (2026-11-03)
    chances(p, u) { return p.hand.filter((c) => effectOf(c.no).attackChance?.(this, u)); }
    async attackChance(p, u) {
        if (!p.field.includes(u)) return;
        const list = this.chances(p, u);
        if (!list.length) return;
        const c = await this.ask(p, {
            title: `⚔ アタックチャンス！ ${u.name} の 攻撃で ただで 使える`,
            options: list.map((x) => ({ label: x.name, value: x, card: x, score: effectOf(x.no).want?.(this, p) ? 1 : 0 })),
            cancel: '使わない', cancelScore: 0.5
        });
        if (!c) return;
        p.hand.splice(p.hand.indexOf(c), 1);
        this.log(`⚔ アタックチャンス！ ${p.name} は 魔法「${c.name}」を ただで 使った`);
        await this.castFree(p, c);
        await this.sweepZero();
        this.onChange();
    }
    // 効果で バトルさせる (ブロックなし。a が 攻撃する がわ)
    async fight(p, a, d) {
        const o = this.players[d.owner];
        if (!p.field.includes(a) || !o.field.includes(d)) return;
        await this.battle(p, o, a, d, { isBlock: false, atkBonus: 0 });
    }

    // モンスターどうしの バトル (攻撃した u と うけた d)
    async battle(p, o, u, d, { isBlock, atkBonus }) {
        let atk = atkBonus, def = 0, trap = false, killAttacker = false;
        const eff = (r) => { if (!r) return; if (r.log) this.log(r.log); atk += r.atk || 0; def += r.def || 0; if (r.trap) trap = true; if (r.killAttacker) killAttacker = true; };
        if (isBlock) {
            eff(await effectOf(d.no).block?.(this, o, d, u));
            for (const s of [...o.field]) if (s !== d) await effectOf(s.no).allyBlock?.(this, o, s, d, u);
            if (d.item) def += effectOf(d.item.no).blockPower || 0;
        }
        eff(await effectOf(d.no).attacked?.(this, o, d, u));
        if (!p.field.includes(u) || !o.field.includes(d)) return;   // カウンターで いなく なった
        if (killAttacker) { await this.destroy(u, 'カウンター'); return; }   // イシイー・獣道の王: バトルせず 墓地へ
        if (trap) {
            // ハエトリグサーン: 攻撃して きた モンスターと いっしょに 墓地へ
            await this.destroy(u, 'ハエトリグサーン');
            await this.destroy(d, 'ハエトリグサーン');
            return;
        }
        const ap = this.power(u, { attacking: true }) + atk;
        const dp = this.power(d, { defending: true }) + def;
        this.log(`${u.name}（${ap}）が ${d.name}（${dp}）に こうげき！`);
        await this.fx({ type: 'attack', unit: u, target: d });
        await this.delay();
        if (ap >= dp) {
            const won = await this.destroy(d, 'バトルで まけた', { battle: true, by: u });
            if (won && p.field.includes(u)) await effectOf(u.no).winBattle?.(this, p, u, d);
        }
        if (ap <= dp) {
            const lost = await this.destroy(u, ap === dp ? 'あいうち' : 'バトルで まけた', { battle: true, by: d });
            if (lost && isBlock && o.field.includes(d) && ap < dp) {
                await effectOf(d.no).blockWin?.(this, o, d, u);
                for (const s of [...o.field]) await effectOf(s.no).anyBlockWin?.(this, o, s, d);   // ケモノミチの OR
            }
        }
    }

    // ブロック: 相手は アンタップの ブロッカーで 攻撃を かわりに うけられる (ブロックした モンスターは タップ)
    async askBlock(u, target) {
        const o = this.opp(this.players[u.owner]);
        const list = o.field.filter((b) => b !== target && this.canBlock(b));
        if (!list.length) return target;
        const ap = this.power(u, { attacking: true });
        const direct = target === 'shield' && o.shields.length === 0;
        const what = target === 'shield' ? (direct ? 'ダイレクトアタック' : 'シールドへの こうげき') : `${target.name} への こうげき`;
        const b = await this.ask(o, {
            title: `${u.name}（${ap}）の ${what}！ ブロックする？`,
            options: list.map((x) => {
                const dp = this.power(x);
                const res = dp > ap ? 'かてる' : dp === ap ? 'あいうち' : 'まける';
                return { label: `${x.name}（${dp}）で ブロック → ${res}`, value: x, card: x, score: (dp > ap ? 2 : dp === ap ? 1 : 0) + (direct ? 5 : 0) + dp / 100000 };
            }),
            cancel: 'ブロックしない', cancelScore: 1
        });
        if (!b) return target;
        b.tapped = true;
        this.log(`${b.name} が ブロックした！`);
        return b;
    }

    // シールドを 割る。2 枚目・4 枚目で Lv アップ、ドタバタトリガーは タダで 使える (Lv に 関係なく)
    async breakShields(o, n) {
        for (let i = 0; i < n && o.shields.length; i++) {
            const card = o.shields.pop();
            o.broken++;
            const lvTime = (o.broken === 2 || o.broken === 4) && o.lv < MAX_LV;
            this.log(`${o.name} の シールドが 割れた（のこり ${o.shields.length} 枚）`);
            await this.delay();
            const options = [];
            if (card.dt && this.canTrigger(o, card)) options.push({ label: '⚡ トリガーで 使う', value: 'trigger', card, score: 3 });
            if (lvTime) options.push({ label: '手札に 入れて、1 枚 捨てて Lv アップ', value: 'level', card, score: 2 });
            options.push({ label: '手札に 入れる', value: 'hand', card, score: 1 });
            const pick = options.length > 1
                ? await this.ask(o, { title: `シールドから「${card.name}」${lvTime ? '（Lv アップの チャンス）' : ''}`, options })
                : 'hand';
            if (pick === 'trigger') {
                await this.use(o, card, { trigger: true });
            } else {
                o.hand.push(card);
                if (pick === 'level') {
                    await this.discard(o, 1, 'Lv アップの ために 捨てる カード');
                    o.lv++;
                    this.log(`${o.name} は Lv${o.lv} に なった！（場に ${this.slots(o)} 体まで）`);
                }
            }
            this.onChange();
        }
    }
    canTrigger(p, card) {
        if (card.kind === 'item') return p.field.some((u) => !u.item);
        return true;
    }
}

const cardValue = (c) => (c.power || 3000) + c.lv * 1000;

