// =====================================================================
// オンライン対戦の 通信 (PeerJS。2026-11-03 ユーザー指定: あいことば = 6 けたの ルーム番号)
// ---------------------------------------------------------------------
// 部屋を 作る 人 (host): ルーム番号を 出して 待つ。入る 人 (guest): 番号を 入れて つなぐ。
// つながったら おたがいの { name, deck, buddy, list, ver } を 送り、host が 乱数の seed を きめて { t: 'start' } を 送る。
// つなぐ ときだけ PeerJS の 無料サーバーを 使い、対戦中は ブラウザどうしで 直接 やりとりする
// =====================================================================
import Peer from 'peerjs';
import { CARDS } from '../data/cards.js';

const PREFIX = 'koori-card-room-';
// カードの 中身が ちがう 版どうしでは 遊べない (ページの 読みこみなおしを たのむ)
export const VERSION = `${CARDS.length}-${CARDS.reduce((h, c) => (h * 31 + c.no + (c.power || 0) + c.text.length) % 1000000007, 7)}`;

function wire(conn, me, onMessage, onClose) {
    conn.on('data', (m) => onMessage(m));
    conn.on('close', () => onClose('相手との つながりが 切れた'));
    conn.on('error', () => onClose('通信の エラー'));
    return { send: (m) => { try { conn.send(m); } catch { /* 切れている */ } }, close: () => { try { conn.close(); } catch { /* */ } }, me };
}

// 部屋を 作る。onCode(番号) → 相手が 来たら resolve({ link, hello: 相手の あいさつ })
//   hello: 自分の あいさつ { name, deck, buddy, list, ver }
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
                if (!cancelled) reject(new Error(e.type === 'network' || e.type === 'server-error' ? 'サーバーに つながらない' : `つなげなかった（${e.type}）`));
            });
            peer.on('connection', (conn) => {
                conn.on('open', () => {
                    let started = false;
                    conn.on('data', function first(m) {
                        if (started || m?.t !== 'hello') return;
                        started = true;
                        conn.off('data', first);
                        if (m.ver !== hello.ver) { conn.send({ t: 'error', why: 'カードの 版が ちがう。ページを 読みこみなおしてね' }); reject(new Error('カードの 版が ちがう。ページを 読みこみなおしてね')); return; }
                        const seed = Math.floor(Math.random() * 4294967295);
                        conn.send({ t: 'start', seed, host: hello });
                        resolve({ conn, seed, peer, other: m });
                    });
                });
            });
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
        peer.on('error', (e) => { if (!cancelled) reject(new Error(e.type === 'peer-unavailable' ? 'その 番号の 部屋が ない' : e.type === 'network' || e.type === 'server-error' ? 'サーバーに つながらない' : `つなげなかった（${e.type}）`)); });
        peer.on('open', () => {
            onStatus('部屋に つないでいます…');
            const conn = peer.connect(PREFIX + code, { reliable: true });
            conn.on('open', () => {
                conn.send({ t: 'hello', ...hello });
                conn.on('data', function first(m) {
                    if (m?.t === 'error') { reject(new Error(m.why)); return; }
                    if (m?.t !== 'start') return;
                    conn.off('data', first);
                    resolve({ conn, seed: m.seed, peer, other: m.host });
                });
            });
        });
    });
    return { promise, cancel: () => { cancelled = true; peer?.destroy(); } };
}

// つながった あとの やりとり口 (lockstep へ)
export function channel({ conn, peer }, me, onMessage, onClose) {
    const ch = wire(conn, me, onMessage, onClose);
    return { ...ch, close: () => { ch.close(); peer?.destroy(); } };
}
