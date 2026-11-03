// 組み合わせの 絵 (背景 bg + キャラ char + エフェクト fx・land は 場面の 景色)。tools/make-combos.mjs が 作る (手で 直さない)
// 2026-11-03 ユーザー指定: 全カードで 絵が ダブらない ように。絵の 描きかたは combo-paint.js
export const COMBOS = {
    68: {bg: 'city', char: 'sprite:koori', fx: 'cards'},   // こおりくん（ばりきつよめ）
    69: {bg: 'city', char: 'sprite:onioni', fx: 'slash'},   // おにおに（ばりきつよめ）
    78: {bg: 'town', char: 'sprite:koori', fx: 'slash'},   // こおりくん・ばりきつよめのレクイエム
    80: {bg: 'city', char: 'big:dake', fx: 'sparkle'},   // ばりき全開
    82: {bg: 'city', char: 'big:yasu', fx: 'sparkle'},   // チームの絆
    84: {bg: 'city', char: 'big:richibou', fx: 'cards'},   // スーパーリーチ
    85: {bg: 'city', char: 'item:guard_scarf', fx: 'shield'},   // ばりきつよめのはっぴ
    93: {bg: 'ice', char: 'sprite:koori', fx: 'cards'},   // 氷隊、出動！
    95: {bg: 'fire', char: 'sprite:onioni', fx: 'fire'},   // おにおに・鬼神
    96: {bg: 'dark', char: 'sprite:onioni', fx: 'slash'},   // おにおに・鬼の王
    101: {bg: 'castle', char: 'big:kinmetsuki', fx: 'none', land: true},   // 金色のSE城
    102: {bg: 'cave', char: 'sprite:onioni', fx: 'fire'},   // 鬼神覚醒
    103: {bg: 'fire', char: 'big:hannyamen', fx: 'sparkle'},   // 鬼の面
    116: {bg: 'castle', char: 'big:asahara', fx: 'burst'},   // ASAPANCHI
    117: {bg: 'castle', char: 'big:sasaki', fx: 'steal'},   // CS城の命令
    118: {bg: 'castle', char: 'big:kotani', fx: 'chain'},   // 計算どおり
    119: {bg: 'cyber', char: 'big:sasaki', fx: 'steal'},   // しめきり厳守
    120: {bg: 'castle', char: 'big:asahara', fx: 'none', land: true},   // CS城
    121: {bg: 'cyber', char: 'big:asahara', fx: 'burst'},   // KINGの王冠
    134: {bg: 'stage', char: 'big:okagappa', fx: 'slash'},   // カッパのお皿ビーム
    135: {bg: 'stage', char: 'big:hibikimakuri', fx: 'cards'},   // 響きの波
    136: {bg: 'stage', char: 'big:yamamou', fx: 'slash'},   // 牛の角アタック
    137: {bg: 'sea', char: 'big:okagappa', fx: 'slash'},   // おかピポっと光線
    138: {bg: 'sea', char: 'big:hibikimakuri', fx: 'cards'},   // 5DXの作戦会議
    139: {bg: 'stage', char: 'big:harrymage', fx: 'cards'},   // 呪文の連鎖
    140: {bg: 'castle', char: 'big:otohimedai', fx: 'none', land: true},   // 竜宮城
    152: {bg: 'gym', char: 'big:proteingolem', fx: 'muscle'},   // プロテイン
    153: {bg: 'gym', char: 'big:ueno', fx: 'sparkle'},   // お願い！
    154: {bg: 'gym', char: 'big:nozoema', fx: 'none', land: true},   // 筋肉の山
    155: {bg: 'gym', char: 'big:ikekimu', fx: 'slash'},   // マッスルボム
    156: {bg: 'gym', char: 'big:dumbbellkong', fx: 'muscle'},   // ダンベル
    157: {bg: 'gym', char: 'item:power_band', fx: 'slash'},   // チャンピオンベルト
    170: {bg: 'night', char: 'big:yahami', fx: 'steal'},   // 怪盗の予告状
    171: {bg: 'night', char: 'big:makibishimushi', fx: 'chain'},   // まきびし
    172: {bg: 'night', char: 'big:geninman', fx: 'sparkle'},   // けむり玉
    173: {bg: 'night', char: 'big:norahan', fx: 'steal'},   // 宝石すり替え
    174: {bg: 'cave', char: 'big:takaramimic', fx: 'none', land: true},   // 盗賊のアジト
    175: {bg: 'dark', char: 'big:yahami', fx: 'sparkle'},   // 怪盗の仮面
    189: {bg: 'forest', char: 'big:haetorigusan', fx: 'slash'},   // 獣道のわな
    190: {bg: 'night', char: 'big:mikazukibat', fx: 'none', land: true},   // 夜の三日月
    191: {bg: 'forest', char: 'big:ishii', fx: 'chain'},   // 迷宮の待ちぶせ
    192: {bg: 'forest', char: 'big:naitoon', fx: 'sparkle'},   // しっぺ返し
    193: {bg: 'forest', char: 'big:mangetsuwolf', fx: 'sparkle'},   // けもののツメ
    197: {bg: 'beach', char: 'big:dumbbellkong', fx: 'muscle'},   // 筋トレ合宿
    198: {bg: 'beach', char: 'big:proteingolem', fx: 'muscle'},   // プロテインシェイカー
    201: {bg: 'dark', char: 'big:norahan', fx: 'steal'},   // ねこの手
    202: {bg: 'night', char: 'big:maechokkin', fx: 'slash'},   // 盗みのハサミ
    206: {bg: 'cave', char: 'big:mangetsuwolf', fx: 'shield'},   // 野生のさけび
    209: {bg: 'lab', char: 'big:asahara', fx: 'burst'},   // DOPAPANCHI
    210: {bg: 'beach', char: 'big:okagappa', fx: 'cards'},   // 5DX集合！
    211: {bg: 'beach', char: 'big:hibikimakuri', fx: 'beam'},   // 大合唱
    212: {bg: 'night', char: 'big:hibikimakuri', fx: 'note'},   // ひびきのマイク
    213: {bg: 'gym', char: 'big:muscletitan', fx: 'none', land: true},   // マッスルジム
    214: {bg: 'gym', char: 'big:shibata', fx: 'muscle'},   // パンプアップ
    215: {bg: 'gym', char: 'big:muscletitan', fx: 'muscle'},   // マッスルスーツ
    216: {bg: 'gold', char: 'sprite:koori', fx: 'portal'},   // ばりきつよめ総攻撃
    217: {bg: 'sky', char: 'sprite:koori', fx: 'portal'},   // 氷隊、緊急出動！
    218: {bg: 'night', char: 'sprite:onioni', fx: 'clash'},   // 鬼の大暴れ
    219: {bg: 'gold', char: 'big:asahara', fx: 'portal'},   // 緊急残業命令
    220: {bg: 'night', char: 'big:okagappa', fx: 'portal'},   // アンコール！
    221: {bg: 'beach', char: 'big:ueno', fx: 'portal'},   // マッスル乱入
    222: {bg: 'gold', char: 'big:yahami', fx: 'clash'},   // 怪盗の早業
    223: {bg: 'cave', char: 'big:ishii', fx: 'portal'},   // 獣道の伏兵
    224: {bg: 'town', char: 'sprite:furukawa', fx: 'portal'},   // 助っ人コール
    225: {bg: 'town', char: 'sprite:tomoishi', fx: 'clash'},   // 真剣勝負
    303: {bg: 'shrine', char: 'sprite:koori', fx: 'sparkle'},   // ばりきコール
    305: {bg: 'town', char: 'item:guard_scarf', fx: 'cards'},   // ばりきつよめのタオル
    307: {bg: 'city', char: 'big:maikumbo', fx: 'none', land: true},   // 摩天楼のてっぺん
    308: {bg: 'town', char: 'big:yasu', fx: 'cards'},   // やすさん・ばりきMAX
    309: {bg: 'city', char: 'big:tamu', fx: 'sparkle'},   // たむさん・ばりきMAX
    310: {bg: 'town', char: 'big:dake', fx: 'burst'},   // だけさん・ばりきMAX
    311: {bg: 'city', char: 'sprite:koori', fx: 'ice'},   // チームばりきつよめ・全員集合
    314: {bg: 'ice', char: 'sprite:furukawa', fx: 'cards'},   // ひんやりサポート
    316: {bg: 'ice', char: 'item:omamori', fx: 'slash'},   // 氷隊のバッジ
    318: {bg: 'ice', char: null, fx: 'none', land: true},   // 氷隊の基地
    319: {bg: 'ice', char: 'new:koori_sword', fx: 'slash'},   // コオリソード・極
    321: {bg: 'sea', char: 'sprite:koori', fx: 'slash'},   // こおりくん・絶対殺すソード
    322: {bg: 'night', char: 'sprite:koori', fx: 'slash'},   // こおりくん・レクイエム
    325: {bg: 'shrine', char: 'sprite:onioni', fx: 'fire'},   // 鬼の号令
    327: {bg: 'fire', char: 'item:haramaki', fx: 'slash'},   // 鬼鬼団のはっぴ
    329: {bg: 'cave', char: null, fx: 'none', land: true},   // 鬼鬼団のアジト
    330: {bg: 'fire', char: 'sprite:onioni', fx: 'cards'},   // 鬼神召喚
    331: {bg: 'fire', char: 'sprite:onioni', fx: 'slash'},   // おにおに・紅蓮
    332: {bg: 'fire', char: 'sprite:onioni', fx: 'burst'},   // おにおに・鬼神 金棒くだき
    333: {bg: 'fire', char: 'sprite:onioni', fx: 'chain'},   // おにおに・鬼の王 覚醒
    336: {bg: 'castle', char: 'big:spamking', fx: 'chain'},   // スパム送信
    338: {bg: 'castle', char: 'new:gold_kanabo', fx: 'burst'},   // CS城の剣
    339: {bg: 'lab', char: 'big:sasaki', fx: 'steal'},   // Mr.SASAKI・残業モード
    340: {bg: 'cyber', char: 'big:asahara', fx: 'none', land: true},   // CS城の玉座
    341: {bg: 'cyber', char: 'big:kotani', fx: 'chain'},   // Mr.KOTANI・完全計算
    342: {bg: 'dark', char: 'big:asahara', fx: 'burst'},   // DOPAPANCHI・改
    343: {bg: 'castle', char: 'big:asahara', fx: 'fire'},   // KING.ASAHARA・CS城の主
    344: {bg: 'castle', char: 'big:asahara', fx: 'chain'},   // ASAPANCHI・ゼロ
    347: {bg: 'sky', char: 'big:okagappa', fx: 'cards'},   // カッパ巻き
    349: {bg: 'sky', char: 'big:hibikimakuri', fx: 'note'},   // 5DXのギター
    350: {bg: 'sea', char: 'big:yamamou', fx: 'shield'},   // やまもぅ・牛魔王
    351: {bg: 'stage', char: 'big:otohimedai', fx: 'none', land: true},   // 5DXのライブハウス
    352: {bg: 'stage', char: 'big:hibikimakuri', fx: 'beam'},   // 響けまくり！
    353: {bg: 'stage', char: 'big:okagappa', fx: 'burst'},   // おかがっぱ・おかピポMAX
    354: {bg: 'stage', char: 'big:hibikimakuri', fx: 'note'},   // ひびきまくり・フルボリューム
    355: {bg: 'stage', char: 'big:okagappa', fx: 'note'},   // チーム5DX・3人そろって
    358: {bg: 'gym', char: 'item:onigiri', fx: 'muscle'},   // ささみ
    360: {bg: 'beach', char: 'item:power_band', fx: 'muscle'},   // プロテインバー
    361: {bg: 'beach', char: 'big:shibata', fx: 'muscle'},   // シバター・バルクアップ
    362: {bg: 'beach', char: 'big:muscletitan', fx: 'none', land: true},   // マッスルビーチ
    363: {bg: 'beach', char: 'big:ikekimu', fx: 'muscle'},   // 合体ポーズ
    364: {bg: 'fire', char: 'big:ikekimu', fx: 'muscle'},   // イケキム・ハイテンション
    365: {bg: 'fire', char: 'big:ueno', fx: 'muscle'},   // マッスルウエノーブル・神の肉体
    366: {bg: 'sky', char: 'big:ueno', fx: 'muscle'},   // お願いマッスル・最強の筋肉
    369: {bg: 'gold', char: 'big:norahan', fx: 'steal'},   // すりかえ
    371: {bg: 'night', char: 'item:guard_scarf', fx: 'steal'},   // 怪盗のマント
    372: {bg: 'city', char: 'big:norahan', fx: 'steal'},   // ノラハン・ねこまっしぐら
    373: {bg: 'night', char: 'big:yopparaigarasu', fx: 'none', land: true},   // 怪盗の夜
    374: {bg: 'city', char: 'big:yahami', fx: 'slash'},   // ぜんぶいただき
    375: {bg: 'dark', char: 'big:maechokkin', fx: 'chain'},   // マエチョッキン・ハサミの舞
    376: {bg: 'cave', char: 'big:yahami', fx: 'steal'},   // ヤーハミー・夜の女王
    377: {bg: 'night', char: 'big:yahami', fx: 'slash'},   // チームバータス・怪盗団
    380: {bg: 'night', char: 'big:mangetsuwolf', fx: 'chain'},   // けものの遠吠え
    382: {bg: 'forest', char: 'item:guard_scarf', fx: 'shield'},   // 獣道のよろい
    383: {bg: 'forest', char: 'big:mazuda', fx: 'cards'},   // マズダ・鉄壁
    384: {bg: 'forest', char: 'big:ishii', fx: 'none', land: true},   // 獣道の迷宮
    385: {bg: 'cave', char: 'big:naitoon', fx: 'slash'},   // 返り討ち
    386: {bg: 'night', char: 'big:naitoon', fx: 'slash'},   // NAITOON・夜明けの遠吠え
    387: {bg: 'night', char: 'big:ishii', fx: 'slash'},   // イシイー・獣道の王
    388: {bg: 'sky', char: 'big:ishii', fx: 'burst'},   // チーム・ケモノミチ 迷宮の守護者
    390: {bg: 'sky', char: 'big:harukirin', fx: 'thunder'},   // ミズキリン
    392: {bg: 'sky', char: 'sprite:furukawa', fx: 'sparkle'},   // ふるカワのメモ
    393: {bg: 'town', char: 'item:omamori', fx: 'sparkle'},   // てづくりお守り
    397: {bg: 'town', char: 'item:power_band', fx: 'sparkle'},   // 銀のハリ
    399: {bg: 'forest', char: 'sprite:furukawa', fx: 'steal'},   // ふるカワの大応援
    400: {bg: 'town', char: 'sprite:tomoishi', fx: 'none', land: true},   // 石の川タウン
};
