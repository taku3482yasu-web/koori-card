// =====================================================================
// たいせんの ルール (ルール資料 + docs/cards.md 0 章の 決まったこと)。画面には ふれない
// ---------------------------------------------------------------------
// 選ぶ 場面は すべて game.ask(pid, req) で 聞く (人は 画面で、CPU は options の score が 高いものを 選ぶ)。
//   req: { title, options: [{ label, value, card?, score }], cancel?: 'ことば' }  → value (cancel なら null)
// 勝ち負けが 決まったら GameOver を 投げて 処理を 止める。
// =====================================================================
import { cardByNo, DECKS } from '../data/cards.js';

export const SHIELDS = 5;
export const FIRST_HAND = 6;
export const DECK_SIZE = 50;
export const MAX_LV = 3;
export const slotsOf = (lv) => lv + 2;   // Lv1 3 体・Lv2 4 体・Lv3 5 体

const HASTE = new Set([2, 32]);          // 速攻
const DOUBLE_BREAK = new Set([7, 35]);   // 2 枚割り
const NO_OF = {
    yukiusa: 2, tsurara: 4, penguin: 8, kogame: 9, okagappa: 11, zumitani: 15, sakura: 16, yasu: 18,
    koonin: 32, dake: 37, shibata: 42, nozoema: 43, hannya: 44, spam: 45, daishi: 46,
    omamori: 28, scarf: 29, hachimaki: 30, sword: 27, kanabou: 57, tane: 58, haramaki: 59, onigiri: 60
};

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

// 構築済みデッキ 50 枚: 全種 1 枚ずつ → Lv1 の カードを 足していく (4 枚まで)
export function starterDeck(deckId) {
    const kinds = Object.values(DECK_LIST[deckId]);
    const counts = new Map(kinds.map((c) => [c.no, 1]));
    for (let round = 0; round < 3 && sum(counts) < DECK_SIZE; round++) {
        for (const c of kinds) {
            if (sum(counts) >= DECK_SIZE) break;
            if (c.lv === 1 && counts.get(c.no) < c.max) counts.set(c.no, counts.get(c.no) + 1);
        }
    }
    return [...counts].flatMap(([no, n]) => Array.from({ length: n }, () => no));
}
const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);
const DECK_LIST = Object.fromEntries(Object.keys(DECKS).map((id) => [id, []]));
for (let no = 1; cardByNo(no); no++) DECK_LIST[cardByNo(no).deck].push(cardByNo(no));

function newPlayer(id, name, deckId, cpu, rand) {
    const deck = shuffle(starterDeck(deckId).map(inst), rand);
    const p = {
        id, name, cpu, deckId, deck, hand: [], shields: [], field: [], grave: [],
        buddy: inst(DECKS[deckId].buddy), scene: null, lv: 1, broken: 0, summoned: false
    };
    for (let i = 0; i < SHIELDS; i++) p.shields.push(p.deck.pop());
    for (let i = 0; i < FIRST_HAND; i++) p.hand.push(p.deck.pop());
    return p;
}

export class Game {
    // opts: { players: [{ name, deck, cpu }] ×2, first: 0|1, rand, ask, onChange, delay }
    constructor(opts) {
        const rand = opts.rand || Math.random;
        this.rand = rand;
        this.players = opts.players.map((o, i) => newPlayer(i, o.name, o.deck, !!o.cpu, rand));
        this.first = opts.first ?? (rand() < 0.5 ? 0 : 1);
        this.active = this.first;
        this.turn = 0;
        this.winner = null;
        this.reason = '';
        this.logs = [];
        this.askFn = opts.ask;
        this.onChange = opts.onChange || (() => {});
        this.delay = opts.delay || (() => Promise.resolve());
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
    power(u, { attacking = false } = {}) {
        const p = this.players[u.owner];
        const o = this.opp(p);
        const no = u.no;
        let pw = u.power;
        if (u.item) {
            const it = u.item.no;
            if (it === NO_OF.sword) pw += u.race === 'こおり' ? 3000 : 1000;
            if (it === NO_OF.kanabou) pw += u.race === 'ほのお' ? 3000 : 1000;
            if (it === NO_OF.hachimaki) pw += 2000;
            if (it === NO_OF.onigiri) pw += 1000;
            if (it === NO_OF.scarf && this.active !== p.id) pw += 3000;
        }
        pw += sceneBonus(p.scene, u, true) + sceneBonus(o.scene, u, false);
        if (u.race === 'しぜん') pw += 1000 * p.field.filter((x) => x !== u && x.no === NO_OF.sakura).length;
        if (this.active !== p.id) {
            if (no === NO_OF.kogame) pw += 2000;
            if (no === NO_OF.dake) pw += 3000;
        }
        if (p.shields.length <= 2) {
            if (no === NO_OF.hannya) pw += 2000;
            if (no === NO_OF.daishi) pw += 3000;
        }
        if (attacking && no === NO_OF.okagappa) pw += 2000;
        for (const m of u.mods) pw += m.amount;
        return Math.max(0, pw);
    }

    // ---------- 出せるか ----------
    slots(p) { return slotsOf(p.lv); }
    canPlay(p, card) {
        if (this.winner !== null || this.active !== p.id) return false;
        if (card.lv > p.lv) return false;
        if (card.kind === 'monster') return !p.summoned && p.field.length < this.slots(p);
        if (card.kind === 'item') return p.field.some((u) => !u.item);
        return true;
    }
    whyNot(p, card) {
        if (card.lv > p.lv) return `Lv${card.lv} から（いまは Lv${p.lv}）`;
        if (card.kind === 'monster' && p.summoned) return 'モンスターは 1 ターンに 1 体まで';
        if (card.kind === 'monster') return `場が いっぱい（${this.slots(p)} 体まで）`;
        if (card.kind === 'item') return 'アイテムを 付けられる モンスターが いない';
        return '';
    }
    maxAttacks(u) { return u.no === NO_OF.zumitani ? 2 : 1; }
    canAttack(u) {
        if (this.winner !== null || u.owner !== this.active) return false;
        if (u.attacks >= this.maxAttacks(u)) return false;
        if (u.stopTurn === this.turn) return false;
        return u.enteredTurn < this.turn || u.haste;
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
        for (const u of p.field) u.attacks = 0;
        this.log(`── ${this.turn} ターン目：${p.name} ──`);
        if (this.turn > 1) this.draw(p);
        this.onChange();
    }
    // 人も CPU も ターンの 終わりに よぶ
    async endTurn() {
        try {
            const p = this.players[this.active];
            for (const u of [...p.field, ...this.opp(p).field]) {
                if (u.no === NO_OF.koonin) await this.sendToGrave(u, 'こおにの つっこみ');
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
            await this.use(p, card, { from });
        } catch (e) { if (!(e instanceof GameOver)) throw e; }
        this.onChange();
        return true;
    }

    // 手札などから 出た カードを 解決する (trigger: シールドから タダで)
    async use(p, card, { trigger = false } = {}) {
        const head = trigger ? `⚡ ドタバタトリガー！ ${p.name} は` : `${p.name} は`;
        if (card.kind === 'monster') {
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
        } else {
            this.log(`${head} 魔法「${card.name}」を 使った`);
            await MAGIC[card.no]?.(this, p);
            p.grave.push(card);
        }
        await this.sweepZero();
        this.onChange();
    }

    async enter(p, card) {
        const u = { ...card, card, owner: p.id, item: null, enteredTurn: this.turn, attacks: 0, mods: [], stopTurn: 0, haste: HASTE.has(card.no) };
        p.field.push(u);
        this.onChange();
        await ENTER[card.no]?.(this, p, u);
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
        p.grave.push(u.card);
        this.log(`${u.name} は 墓地へ${why ? `（${why}）` : ''}`);
    }
    async bounce(u) {
        const p = this.players[u.owner];
        if (!this.detach(u)) return;
        if (u.item) p.grave.push(u.item);
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
    // やられる (バトル・効果)。お守りで 守られたら false (guard: false なら お守りは 効かない)
    async destroy(u, why = '', { guard = true } = {}) {
        const p = this.players[u.owner];
        if (!p.field.includes(u)) return false;
        if (guard && u.item?.no === NO_OF.omamori) {
            p.grave.push(u.item);
            u.item = null;
            this.log(`ふるカワのお守りが ${u.name} を まもった`);
            return false;
        }
        if (u.item?.no === NO_OF.tane) {
            this.detach(u);
            p.grave.push(u.item);
            p.hand.push(u.card);
            this.log(`${u.name} は やられたが、ふっかつのたねで 手札に もどった`);
        } else {
            await this.sendToGrave(u, why);
        }
        if (u.no === NO_OF.yasu && p.deck.length) {
            p.shields.push(this.takeTop(p));
            this.log(`やすさんの 応急手当：${p.name} の シールドが 1 枚 ふえた`);
        }
        if (u.no === NO_OF.spam) {
            const next = p.hand.find((c) => c.no === NO_OF.spam);
            if (next && p.field.length < this.slots(p)) {
                const ok = await this.ask(p, {
                    title: 'スパムダマが 分裂！ 手札の スパムダマを 出す？',
                    options: [{ label: '出す', value: true, card: next, score: 1 }], cancel: '出さない'
                });
                if (ok) {
                    p.hand.splice(p.hand.indexOf(next), 1);
                    this.log(`スパムダマが 分裂した`);
                    await this.enter(p, next);
                }
            }
        }
        return true;
    }

    // ---------- 選ぶ 道具 ----------
    // 相手の モンスターを 1 体 (magic: はらまきの モンスターは 選べない)
    async pickEnemy(p, title, filter = () => true, { magic = false } = {}) {
        const list = this.opp(p).field.filter((u) => filter(u) && !(magic && u.item?.no === NO_OF.haramaki));
        if (!list.length) { this.log('えらべる 相手が いない'); return null; }
        return this.ask(p, { title, options: list.map((u) => ({ label: `${u.name}（${this.power(u)}）`, value: u, card: u, score: this.power(u) })) });
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
        if (!this.canAttack(u)) return false;
        const p = this.players[u.owner];
        const o = this.opp(p);
        try {
            u.attacks++;
            if (u.no === NO_OF.nozoema) {
                this.log('ノゾエマの 鏡筋一刀斬り！');
                for (const x of o.field.filter((x) => this.power(x) <= 2000)) await this.destroy(x, '鏡筋一刀斬り');
            }
            if (target === 'shield') {
                if (o.shields.length === 0) this.win(p, `${u.name} の ダイレクトアタック`);
                const n = DOUBLE_BREAK.has(u.no) ? 2 : 1;
                this.log(`${u.name} が シールドを こうげき！`);
                await this.breakShields(o, n);
            } else if (o.field.includes(target)) {
                const ap = this.power(u, { attacking: true });
                const dp = this.power(target);
                this.log(`${u.name}（${ap}）が ${target.name}（${dp}）に こうげき！`);
                await this.delay();
                if (ap >= dp) {
                    const won = await this.destroy(target, 'バトルで まけた');
                    if (won && u.no === NO_OF.shibata && o.shields.length) {
                        this.log('シバターの 追いうち！');
                        await this.breakShields(o, 1);
                    }
                    if (won && target.no === NO_OF.tsurara) await this.destroy(u, 'ツララボウの みちづれ');
                }
                if (ap <= dp) {
                    const lost = await this.destroy(u, ap === dp ? 'あいうち' : 'バトルで まけた');
                    if (lost && u.no === NO_OF.tsurara && ap < dp) await this.destroy(target, 'ツララボウの みちづれ');
                }
            }
            if (u.no === NO_OF.yukiusa && p.field.includes(u)) await this.bounce(u);
            await this.sweepZero();
        } catch (e) { if (!(e instanceof GameOver)) throw e; }
        this.onChange();
        return true;
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

function sceneBonus(scene, u, mine) {
    if (!scene) return 0;
    const own = { 25: 'こおり', 26: 'みず', 55: 'ほのお', 56: 'ふしぎ' }[scene.no];
    const enemy = { 26: 'ほのお', 55: 'こおり' }[scene.no];
    if (mine) return u.race === own ? 1000 : 0;
    return u.race === enemy ? -1000 : 0;
}

// ---------- 【出たとき】 ----------
const ENTER = {
    1: async (g, p) => { const t = await g.pickEnemy(p, 'コオリソード！ パワー3000以下の 相手を えらんでね', (u) => g.power(u) <= 3000); if (t) await g.destroy(t, 'コオリソード'); },
    6: async (g, p) => {
        const t = await g.pickEnemy(p, 'パワーを -3000 する 相手を えらんでね');
        if (t) { t.mods.push({ amount: -3000, until: g.active === p.id ? g.turn + 2 : g.turn + 1 }); g.log(`${t.name} の パワーが -3000`); }
    },
    8: async (g, p, u) => {
        if (!p.hand.length || g.active !== p.id) return;
        const ok = await g.ask(p, { title: '手札を 1 枚 捨てて、このターン 速攻に する？', options: [{ label: '捨てて 速攻', value: true, score: 0 }], cancel: 'しない', cancelScore: 0.5 });
        if (ok) { await g.discard(p, 1, '捨てる カード'); u.haste = true; g.log('ペンギンナイトは 速攻に なった'); }
    },
    10: async (g, p) => {
        const list = p.grave.filter((c) => c.kind === 'monster');
        if (!list.length) return;
        const c = await g.ask(p, { title: '墓地から 手札に 戻す モンスターを えらんでね', options: list.map((x) => ({ label: x.name, value: x, card: x, score: cardValue(x) })) });
        p.grave.splice(p.grave.indexOf(c), 1);
        p.hand.push(c);
        g.log(`${c.name} を 墓地から 手札に 戻した`);
    },
    12: async (g, p) => { const t = await g.pickEnemy(p, 'アクアブレス！ 墓地へ 送る 相手を えらんでね'); if (t) await g.destroy(t, 'アクアブレス'); },
    13: async (g, p) => g.draw(p, 1),
    14: async (g, p) => { const t = await g.pickEnemy(p, 'たむキック！ 止める 相手を えらんでね'); if (t) g.stop(t); },
    17: async (g, p) => {
        const list = p.grave.filter((c) => c.kind === 'monster' && c.lv === 1);
        if (!list.length || p.field.length >= g.slots(p)) return;
        const c = await g.ask(p, { title: '墓地から 場に 出す Lv1 の モンスターを えらんでね', options: list.map((x) => ({ label: x.name, value: x, card: x, score: cardValue(x) })) });
        p.grave.splice(p.grave.indexOf(c), 1);
        g.log(`ハル麒麟が ${c.name} を よんだ`);
        await g.enter(p, c);
    },
    31: async (g, p) => { const o = g.opp(p); g.log('「お金かえせ！」'); await g.discard(o, 1, 'おにおにに とられる カード'); },
    33: async (g, p) => { const t = await g.pickEnemy(p, 'パワー2000以下の 相手を えらんでね', (u) => g.power(u) <= 2000); if (t) await g.destroy(t, 'オニビン'); },
    36: async (g, p) => g.discard(p, 1, '金滅鬼：捨てる カード'),
    39: async (g, p) => {
        const o = g.opp(p);
        if (!o.scene) return;
        g.log(`おには そと！ 場面「${o.scene.name}」は 墓地へ`);
        o.grave.push(o.scene);
        o.scene = null;
    },
    41: async (g, p) => { g.draw(p, 2); await g.discard(p, 1, 'ゴールド金面犬：捨てる カード'); },
    47: async (g, p) => { const t = await g.pickEnemy(p, '手札に 戻す 相手を えらんでね'); if (t) await g.bounce(t); },
    48: async (g, p) => g.discard(p, 2, '大魔王ASO：捨てる カード')
};

// ---------- 魔法 ----------
const killOne = (max, why) => async (g, p) => {
    const t = await g.pickEnemy(p, `${why}：${max ? `パワー${max}以下の ` : ''}相手を えらんでね`, (u) => !max || g.power(u) <= max, { magic: true });
    if (t) await g.destroy(t, why);
};
const killAll = (max, why) => async (g, p) => {
    for (const u of g.opp(p).field.filter((u) => g.power(u) <= max)) await g.destroy(u, why);
};
const stopOne = (why) => async (g, p) => { const t = await g.pickEnemy(p, `${why}：止める 相手を えらんでね`, () => true, { magic: true }); if (t) g.stop(t); };
const MAGIC = {
    19: killOne(4000, 'コオリハンマー'),
    20: killOne(0, '四天王絶対殺す剣'),
    21: stopOne('こおりのいき'),
    22: async (g, p) => {
        if (p.shields.length > 4) return g.log('シールドが 5 枚 あるので なにも おきない');
        p.shields.push(g.takeTop(p));
        g.log(`${p.name} の シールドが 1 枚 ふえた`);
    },
    23: async (g, p) => { const t = await g.pickEnemy(p, 'ワープ玉：手札に 戻す 相手を えらんでね', () => true, { magic: true }); if (t) await g.bounce(t); },
    24: async (g, p) => g.draw(p, 2),
    49: killOne(4000, '鬼鬼の金棒'),
    50: killAll(5000, '亜祖宇激烈破'),
    51: killOne(2000, '鬼火'),
    52: killAll(2000, '一網打尽玉'),
    53: async (g, p) => g.draw(p, 2),
    54: stopOne('腐ったおにぎり')
};
