// =====================================================================
// オンライン対戦の しくみ (2026-11-03 ユーザー指定: あいことば + PeerJS)。画面・通信には ふれない
// ---------------------------------------------------------------------
// 2 台で 同じ Game を 同じ 乱数 (seed) で 動かし、「行動」と「選んだ 答え」だけを 送りあう (ロックステップ)。
//   行動: { t: 'act', a: 'play' | 'attack' | 'end', ... } / 答え: { t: 'ans', i } (えらんだ 番号。-1 = やめる)
//   ターン終了の ときに 2 台の 場の ようすを くらべて、ずれていたら 知らせる (sum)
//   send(msg): 相手へ 送る / receive(msg): 相手から とどいた
// =====================================================================

// 同じ 数の 乱数 (seed から)
export function seeded(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

// 場の ようすを みじかい 文字に する (ずれ 見つけ)
export function checksum(g) {
    const zone = (list) => list.map((c) => c.uid).join(',');
    return g.players.map((p) => [p.lv, p.shields.length, p.deck.length, zone(p.hand), zone(p.grave), p.field.map((u) => `${u.uid}${u.tapped ? 't' : ''}${u.muscle || ''}`).join(',')].join('/')).join('|') + `|${g.turn}`;
}

export class Lockstep {
    // me: 自分の プレイヤー番号 (部屋を 作った 人 = 0・入った 人 = 1)
    constructor(send, me) {
        this.send = send;
        this.me = me;
        this.inbox = [];
        this.waiting = null;
        this.onDesync = () => {};
        this.onQuit = () => {};
    }
    receive(msg) {
        if (msg.t === 'quit') { this.onQuit(msg); return; }
        if (this.waiting) { const w = this.waiting; this.waiting = null; w(msg); } else this.inbox.push(msg);
    }
    next() {
        if (this.inbox.length) return Promise.resolve(this.inbox.shift());
        return new Promise((r) => { this.waiting = r; });
    }
    async expect(t) {
        const m = await this.next();
        if (m.t !== t) { this.onDesync(`${t} を まっていたのに ${m.t} が きた`); throw new Error('desync'); }
        return m;
    }

    // Game の ask: 自分の ときは 画面 (localAsk) で 聞いて 答えを 送る。相手の ときは とどいた 答えを 使う
    askFn(localAsk) {
        return async (pid, req) => {
            if (pid === this.me) {
                const v = await localAsk(req);
                const i = v === null || v === undefined ? -1 : req.options.findIndex((o) => o.value === v);
                this.send({ t: 'ans', i });
                return i < 0 ? null : req.options[i].value;
            }
            const m = await this.expect('ans');
            return m.i < 0 ? null : req.options[m.i]?.value ?? null;
        };
    }

    // 自分の 行動 (相手に 送ってから 自分の Game で 動かす)。cpuTurn にも わたせる
    actor(g) {
        return {
            play: (p, card, from = 'hand') => { this.send({ t: 'act', a: 'play', uid: card.uid, from }); return g.play(p, card, from); },
            attack: (u, target) => { this.send({ t: 'act', a: 'attack', uid: u.uid, target: target === 'shield' ? 'shield' : target.uid }); return g.attack(u, target); },
            endTurn: () => { this.send({ t: 'act', a: 'end', sum: checksum(g) }); return g.endTurn(); }
        };
    }

    // 相手の 行動を 1 つ 待って 動かす
    async remoteStep(g) {
        const m = await this.expect('act');
        const p = g.players[1 - this.me];
        const o = g.players[this.me];
        if (m.a === 'play') {
            const card = m.from === 'buddy' ? p.buddy : p.hand.find((c) => c.uid === m.uid);
            if (!card || card.uid !== m.uid) return this.onDesync('出す カードが 見つからない');
            await g.play(p, card, m.from);
        } else if (m.a === 'attack') {
            const u = p.field.find((x) => x.uid === m.uid);
            const t = m.target === 'shield' ? 'shield' : o.field.find((x) => x.uid === m.target);
            if (!u || !t) return this.onDesync('こうげきが 見つからない');
            await g.attack(u, t);
        } else if (m.a === 'end') {
            if (m.sum !== checksum(g)) this.onDesync('場の ようすが ずれた');
            await g.endTurn();
        }
    }
    // 相手の ターンの あいだ 相手の 行動を 動かしつづける
    async remoteTurn(g) {
        while (g.winner === null && g.active !== this.me) await this.remoteStep(g);
    }
}
