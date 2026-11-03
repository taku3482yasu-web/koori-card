// =====================================================================
// 設定 (2026-11-03 ユーザー指定: 名前・データの リセット・音・CPU と 演出の 速さ)。ブラウザに 保存
// =====================================================================
const KEY = 'koori-card-settings';
export const SPEEDS = { slow: { name: 'ゆっくり', k: 1.6 }, normal: { name: 'ふつう', k: 1 }, fast: { name: 'はやい', k: 0.45 } };
export const defaults = () => ({ name: 'あなた', sound: true, cpuSpeed: 'normal', fxSpeed: 'normal' });

export function loadSettings(storage) {
    try {
        const raw = storage?.getItem(KEY);
        if (raw) return { ...defaults(), ...JSON.parse(raw) };
    } catch { /* こわれていたら はじめから */ }
    return defaults();
}
export function saveSettings(storage, s) {
    try { storage?.setItem(KEY, JSON.stringify(s)); } catch { /* 保存できなくても 遊べる */ }
}
// 名前は 1〜10 文字 (空なら「あなた」)
export const cleanName = (t) => String(t || '').replace(/[<>&"]/g, '').trim().slice(0, 10) || 'あなた';
export const speedK = (id) => (SPEEDS[id] || SPEEDS.normal).k;
