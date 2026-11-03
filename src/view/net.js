// =====================================================================
// オンライン対戦の 通信 (PeerJS。2026-11-03 ユーザー指定: あいことば = 6 けたの ルーム番号)
// ---------------------------------------------------------------------
// 部屋を 作る 人 (host): ルーム番号を 出して 待つ。入る 人 (guest): 番号を 入れて つなぐ。
// ランダムマッチ (2026-11-03): 待ち合わせの 部屋 (LOBBY 0〜7) を じゅんに さがし、だれも いなければ 自分が 部屋を 作って 待つ。
//   待っている あいだも ときどき ほかの 部屋を さがす (2 人が べつべつの 部屋で 待たない ように)
// つながったら おたがいの { name, deck, buddy, list, secret, ver } を 送り、host が 乱数の seed を きめて { t: 'start' } を 送る。
// つなぎなおし (2026-11-03): 対戦中の 行動には 番号 (seq) を つけて 送り、とっておく。切れたら guest が つなぎなおし、
//   { t: 'resume', recvSeq } で おたがいが 受けとった ところを 知らせて、とどいて いない ぶんを 送りなおす。60 秒で あきらめる
// つなぐ ときだけ PeerJS の 無料サーバーを 使い、対戦中は ブラウザどうしで 直接 やりとりする
// =====================================================================
import Peer from 'peerjs';
import { CARDS } from '../data/cards.js';

const PREFIX = 'koori-card-room-';
const LOBBY = 'koori-card-lobby-';
const LOBBY_N = 8;
export const RESUME_LIMIT = 60000;   // つなぎなおしを 待つ 時間 (ミリ秒)
// カードの 中身が ちがう 版どうしでは 遊べない (ページの 読みこみなおしを たのむ)
export const VERSION = `${CARDS.length}-${CARDS.reduce((h, c) => (h * 31 + c.no + (c.power || 0) + c.text.length) % 1000000007, 7)}`;
const errText = (e) => (e.type === 'peer-unavailable' ? 'その 番号の 部屋が ない' : e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? 'サーバーに つながらない' : `つなげなかった（${e.type}）`);

// host の 待ちうけ: さいしょの hello で 対戦を はじめる。対戦中に 来た hello は ことわる
function listen(peer, hello, onMatch, onReject) {
    let matched = false;
    peer.on('connection', (conn) => {
        conn.on('open', () => {
            conn.on('data', function first(m) {
                if (m?.t !== 'hello') return;   // resume は channel が うけとる
                conn.off('data', first);
                if (matched) { conn.send({ t: 'busy' }); setTimeout(() => conn.close(), 300); return; }
                if (m.ver !== hello.ver) { conn.send({ t: 'error', why: 'カードの 版が ちがう。ページを 読みこみなおしてね' }); onReject?.('カードの 版が ちがう。ページを 読みこみなおしてね'); return; }
                matched = true;
                const seed = Math.floor(Math.random() * 4294967295);
                conn.send({ t: 'start', seed, host: hello });
                onMatch({ conn, seed, peer, other: m, hostId: null });
            });
        });
    });
    return { stop: () => { matched = true; } };
}
// guest: つないで hello → start を 待つ。busy (対戦中) や つながらない ときは reject
function knock(peer, id, hello, timeout = 4000) {
    return new Promise((resolve, reject) => {
        const conn = peer.connect(id, { reliable: true });
        // いない 相手は Peer の ほうに peer-unavailable が 来る (すぐ つぎへ)
        const gone = (e) => { if (e.type === 'peer-unavailable' && String(e.message).includes(id)) { clearTimeout(timer); peer.off('error', gone); reject(new Error('gone')); } };
        peer.on('error', gone);
        const timer = setTimeout(() => { peer.off('error', gone); try { conn.close(); } catch { /* */ } reject(new Error('timeout')); }, timeout);
        conn.on('error', () => { clearTimeout(timer); peer.off('error', gone); reject(new Error('error')); });
        conn.on('open', () => {
            conn.send({ t: 'hello', ...hello });
            conn.on('data', function first(m) {
                if (m?.t === 'busy') { clearTimeout(timer); peer.off('error', gone); conn.off('data', first); reject(new Error('busy')); return; }
                if (m?.t === 'error') { clearTimeout(timer); reject(new Error(m.why)); return; }
                if (m?.t !== 'start') return;
                clearTimeout(timer);
                peer.off('error', gone);
                conn.off('data', first);
                resolve({ conn, seed: m.seed, peer, other: m.host, hostId: id });
            });
        });
    });
}

// 部屋を 作る。onCode(番号) → 相手が 来たら resolve
export function hostRoom(hello, { onCode, onStatus }) {
    let peer = null;
    let cancelled = false;
    const promise = new Promise((resolve, reject) => {
        const tryOpen = (n) => {
            const code = String(Math.floor(100000 + Math.random() * 900000));
            peer = new Peer(PREFIX + code);
            peer.on('open', () => { onCode(code); onStatus('相手を まっています…'); });
            peer.on('error', (e) => {
                if (e.type === 'unavailable-id' && n < 5) { peer.destroy(); tryOpen(n + 1); return; }
                if (!cancelled) reject(new Error(errText(e)));
            });
            listen(peer, hello, resolve, (why) => reject(new Error(why)));
        };
        tryOpen(0);
    });
    return { promise, cancel: () => { cancelled = true; peer?.destroy(); } };
}

// 部屋に 入る
export function joinRoom(code, hello, { onStatus }) {
    let peer = null;
    let cancelled = false;
    const promise = new Promise((resolve, reject) => {
        peer = new Peer();
        peer.on('error', (e) => { if (!cancelled) reject(new Error(errText(e))); });
        peer.on('open', () => {
            onStatus('部屋に つないでいます…');
            knock(peer, PREFIX + code, hello, 10000).then(resolve, (e) => { if (!cancelled) reject(new Error(e.message === 'busy' ? 'その 部屋は 対戦中' : e.message === 'timeout' || e.message === 'gone' ? 'その 番号の 部屋が ない' : e.message)); });
        });
    });
    return { promise, cancel: () => { cancelled = true; peer?.destroy(); } };
}

// ランダムマッチ (2026-11-03 ユーザー指定)
export function randomMatch(hello, { onStatus }) {
    let peer = null;
    let cancelled = false;
    let scanTimer = null;
    const promise = new Promise((resolve, reject) => {
        let done = false;
        const finish = (res) => { if (done) return; done = true; clearTimeout(scanTimer); resolve(res); };
        const order = () => Array.from({ length: LOBBY_N }, (_, i) => i).sort(() => Math.random() - 0.5);
        // まっている 人を さがす (自分の 部屋は のぞく)
        async function scan(p, mine = -1) {
            for (const i of order()) {
                if (cancelled || done || i === mine) return null;
                try { return await knock(p, LOBBY + i, hello, 2500); } catch { /* いない・対戦中 */ }
            }
            return null;
        }
        // だれも いなければ あいている 待ち合わせの 部屋を 作って 待つ
        function host(slots) {
            if (cancelled || done) return;
            if (!slots.length) { reject(new Error('待ち合わせの 部屋が いっぱい。少し まってね')); return; }
            const i = slots[0];
            const hp = new Peer(LOBBY + i);
            hp.on('error', (e) => {
                if (e.type === 'unavailable-id') { hp.destroy(); host(slots.slice(1)); return; }
                if (e.type === 'peer-unavailable') return;   // さがしに 行った 先が いない
                if (!cancelled && !done) reject(new Error(errText(e)));
            });
            hp.on('open', () => {
                peer?.destroy();
                peer = hp;
                onStatus('相手を さがしています…（待ち合わせ中）');
                const l = listen(hp, hello, (res) => { finish(res); });
                // ときどき ほかの 部屋も さがす (べつべつに 待たない ように)
                const again = async () => {
                    if (cancelled || done) return;
                    const res = await scan(hp, i);
                    if (res && !done) { l.stop(); finish(res); return; }
                    scanTimer = setTimeout(again, 6000 + Math.random() * 4000);
                };
                scanTimer = setTimeout(again, 3000 + Math.random() * 3000);
            });
        }
        peer = new Peer();
        peer.on('error', (e) => { if (e.type !== 'peer-unavailable' && !cancelled && !done) reject(new Error(errText(e))); });
        peer.on('open', async () => {
            onStatus('相手を さがしています…');
            const res = await scan(peer);
            if (res) { finish(res); return; }
            host(order());
        });
    });
    return { promise, cancel: () => { cancelled = true; clearTimeout(scanTimer); peer?.destroy(); } };
}

// つながった あとの やりとり口 (lockstep へ)。onStatus(ことば | null): つなぎなおし中の 知らせ・onGiveUp(なぜ): あきらめた
export function channel(res, me, onMessage, onStatus, onGiveUp) {
    const { peer } = res;
    let conn = res.conn;
    let sendSeq = 0, recvSeq = 0, downSince = null, giveUp = null, alive = true;
    const outbox = [];
    const resendAfter = (n) => { for (const x of outbox) if (x.seq > n) try { conn.send(x); } catch { /* */ } };
    function onData(m) {
        if (m?.t === 'resume') {
            if (!m.ack) try { conn.send({ t: 'resume', recvSeq, ack: true }); } catch { /* */ }
            resendAfter(m.recvSeq);
            if (downSince) { downSince = null; clearTimeout(giveUp); onStatus(null); }
            return;
        }
        if (m && m.seq) {
            if (m.seq <= recvSeq) return;   // もう うけとった
            recvSeq = m.seq;
            onMessage(m.body);
            return;
        }
        onMessage(m);
    }
    function attach(c) {
        conn = c;
        c.on('data', onData);
        c.on('close', () => { if (conn === c) lost(); });
        c.on('error', () => { if (conn === c) lost(); });
    }
    // guest: 部屋の 人に つなぎなおす
    function retry() {
        if (!alive || !downSince) return;
        try {
            const c = peer.connect(res.hostId, { reliable: true });
            c.on('open', () => { if (!downSince) return; attach(c); c.send({ t: 'resume', recvSeq }); });
        } catch { /* サーバーに つながって いない */ }
        setTimeout(retry, 4000);
    }
    function lost() {
        if (!alive || downSince) return;
        downSince = Date.now();
        onStatus('相手との つながりが 切れた… つなぎなおしています');
        giveUp = setTimeout(() => { if (downSince && alive) { alive = false; onGiveUp('相手との つながりが 切れた'); } }, RESUME_LIMIT);
        if (me === 1 && res.hostId) setTimeout(retry, 1000);
    }
    // host: つなぎなおしに 来た guest を うけとる
    peer.on('connection', (c) => {
        c.on('open', () => {
            c.on('data', function first(m) {
                if (m?.t !== 'resume') return;
                c.off('data', first);
                attach(c);
                onData(m);
            });
        });
    });
    peer.on('disconnected', () => { if (alive) try { peer.reconnect(); } catch { /* */ } });
    attach(conn);
    return {
        me,
        send: (body) => { const x = { seq: ++sendSeq, body }; outbox.push(x); try { if (conn.open) conn.send(x); } catch { /* 切れている */ } },
        close: () => { alive = false; clearTimeout(giveUp); try { conn.close(); } catch { /* */ } peer?.destroy(); },
        // テスト用: いまの つながりを 切る
        drop: () => { try { conn.close(); } catch { /* */ } }
    };
}
