// =====================================================================
// 効果音 (2026-11-03 ユーザー指定: 音の オン・オフ)。音の ファイルは 使わず、ブラウザで ピコピコ 鳴らす
//   play(name): click / card (カードを 出す) / attack / break (シールドが 割れる) / destroy / trigger / chance / win / lose / pack / rare
// =====================================================================
let ctx = null;
let on = true;
export const setSound = (v) => { on = v; };

// [周波数, 長さ(秒), 波の 形, 音量] を じゅんに 鳴らす
const SFX = {
    click: [[880, 0.04, 'square', 0.05]],
    card: [[523, 0.06, 'triangle', 0.12], [784, 0.08, 'triangle', 0.12]],
    attack: [[220, 0.05, 'sawtooth', 0.1], [330, 0.05, 'sawtooth', 0.1], [440, 0.09, 'sawtooth', 0.1]],
    break: [[660, 0.05, 'square', 0.08], [330, 0.05, 'square', 0.08], [165, 0.12, 'square', 0.08]],
    destroy: [[200, 0.06, 'sawtooth', 0.1], [120, 0.16, 'sawtooth', 0.1]],
    trigger: [[988, 0.06, 'square', 0.07], [1319, 0.06, 'square', 0.07], [1760, 0.12, 'square', 0.07]],
    chance: [[392, 0.07, 'square', 0.08], [523, 0.07, 'square', 0.08], [659, 0.07, 'square', 0.08], [784, 0.16, 'square', 0.08]],
    win: [[523, 0.12, 'triangle', 0.14], [659, 0.12, 'triangle', 0.14], [784, 0.12, 'triangle', 0.14], [1047, 0.35, 'triangle', 0.14]],
    lose: [[392, 0.18, 'triangle', 0.12], [330, 0.18, 'triangle', 0.12], [262, 0.4, 'triangle', 0.12]],
    pack: [[440, 0.05, 'square', 0.06], [554, 0.05, 'square', 0.06], [659, 0.05, 'square', 0.06], [880, 0.12, 'square', 0.06]],
    rare: [[784, 0.08, 'triangle', 0.13], [988, 0.08, 'triangle', 0.13], [1175, 0.08, 'triangle', 0.13], [1568, 0.4, 'triangle', 0.13]]
};

export function play(name) {
    if (!on || !SFX[name]) return;
    try {
        ctx ||= new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        let t = ctx.currentTime + 0.01;
        for (const [f, d, type, vol] of SFX[name]) {
            const o = ctx.createOscillator();
            const gn = ctx.createGain();
            o.type = type;
            o.frequency.value = f;
            gn.gain.setValueAtTime(vol, t);
            gn.gain.exponentialRampToValueAtTime(0.001, t + d);
            o.connect(gn).connect(ctx.destination);
            o.start(t);
            o.stop(t + d + 0.02);
            t += d;
        }
    } catch { /* 音が 出せない ブラウザ */ }
}
