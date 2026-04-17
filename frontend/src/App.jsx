import { useState, useMemo, useEffect, useCallback } from "react";

/* ── storage helpers (localStorage版) ── */
async function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
async function saveData(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* silent */ }
}

/* ── helpers ── */
const TODAY = new Date();
const TODAY_KEY = TODAY.toISOString().split("T")[0];
const TODAY_DOW = TODAY.getDay() === 0 ? 6 : TODAY.getDay() - 1;
const DAYS = ["月", "火", "水", "木", "金", "土", "日"];
const DAY_EN = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function yt(q) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
}
function cookpadUrl(q) {
  return "https://cookpad.com/search/" + encodeURIComponent(q);
}

function getPhase(startStr, targetStr) {
  const s = new Date(startStr);
  const t = new Date(targetStr);
  const totalW = Math.max(1, Math.round((t - s) / (7 * 864e5)));
  const elapsed = Math.max(0, Math.floor((TODAY - s) / (7 * 864e5)));
  const progress = Math.min(1, elapsed / totalW);
  if (progress < 0.2) return { phase: 0, label: "P1 習慣化", color: "#2DA44E", icon: "🌱", elapsed, totalW, progress };
  if (progress < 0.45) return { phase: 1, label: "P2 基礎構築", color: "#E9C46A", icon: "🔨", elapsed, totalW, progress };
  if (progress < 0.75) return { phase: 2, label: "P3 成長加速", color: "#E76F51", icon: "🔥", elapsed, totalW, progress };
  return { phase: 3, label: "P4 仕上げ", color: "#E63946", icon: "💪", elapsed, totalW, progress };
}

/* ── equipment ── */
const EQUIP_LIST = [
  { id: "bw", label: "自重", icon: "🤸" },
  { id: "db", label: "ダンベル", icon: "🏋" },
  { id: "bb", label: "バーベル", icon: "🏗" },
  { id: "bench", label: "ベンチ", icon: "🪑" },
  { id: "band", label: "バンド", icon: "🔗" },
  { id: "gym", label: "ジムマシン", icon: "🏢" },
];
const DEFAULT_EQUIP = { bw: true, db: true, bb: true, bench: true, band: false, gym: true };
const EQ_COL = { bw: "#2DA44E", db: "#E9C46A", bb: "#F4A261", bench: "#E76F51", band: "#7C5CBF", gym: "#58A6FF" };
const EQ_LBL = { bw: "自重", db: "DB", bb: "BB", bench: "ベンチ", band: "バンド", gym: "ジム" };

/* ── part config ── */
const PARTS = [
  { key: "chest", jp: "胸", en: "CHEST", icon: "💪", color: "#E63946" },
  { key: "back", jp: "背中", en: "BACK", icon: "🔥", color: "#E76F51" },
  { key: "legs", jp: "脚・下半身", en: "LEGS", icon: "🦵", color: "#2A9D8F" },
  { key: "shoulders", jp: "肩", en: "SHOULDERS", icon: "⚡", color: "#E9C46A" },
  { key: "arms", jp: "腕", en: "ARMS", icon: "💥", color: "#7C5CBF" },
  { key: "abs", jp: "腹筋+有酸素", en: "ABS+CARDIO", icon: "🔥", color: "#F4A261" },
  { key: "rest", jp: "REST", en: "REST DAY", icon: "🧘", color: "#6C757D" },
];

const MINS = [
  ["膝つき腕立て5回", "腕立て10回", "腕立て15回x2", "腕立て20回x3"],
  ["タオルラットプル5回", "タオルラットプル10回", "スーパーマン15回x2", "スーパーマン20回x3"],
  ["スクワット5回", "スクワット15回", "スクワット20回+ランジ10", "スクワット25回x3"],
  ["パイクPU 3回", "パイクPU 8回", "パイクPU 12回x2", "パイクPU 15回x3"],
  ["壁腕立て5回", "ナロー腕立て8回", "ナロー腕立て12回x2", "ナロー腕立て15回x3"],
  ["プランク15秒", "プランク30秒", "プランク45秒x2", "プランク60秒x2"],
  ["深呼吸5回 → 休養OK", "深呼吸5回 → 休養OK", "深呼吸5回 → 休養OK", "深呼吸5回 → 休養OK"],
];

/* ── video database ── */
/* ── video database (FiT24旭川大町 器具対応) ── */
/* MTS系, PL=ハンマーストレングス, スミス, パワーラック, DAP/4スタックマルチジャングル, DB1-50kg, ベンチ各種 */
const VIDEOS = {
  chest: [
    { ch: "なかやまきんに君", t: "胸＆腹筋 5分（初心者OK）", q: "なかやまきんに君 胸 腹筋 5分 初心者", time: "5分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "自宅2分 大胸筋", q: "メトロンブログ 胸 自重 2分", time: "2分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "腕立て正しいフォーム", q: "メトロンブログ 腕立て伏せ フォーム", time: "3分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "大胸筋 追い込み自重", q: "メトロンブログ 胸 大胸筋 追い込む", time: "5分", diff: 1, eq: ["bw"] },
    { ch: "なかやまきんに君", t: "胸10種目5分", q: "なかやまきんに君 胸 腹筋 10種目", time: "5分", diff: 1, eq: ["bw"] },
    { ch: "メトロンブログ", t: "胸 HIIT 脂肪燃焼", q: "メトロンブログ 胸 HIIT 脂肪燃焼", time: "6分", diff: 2, eq: ["bw"] },
    { ch: "メトロンブログ", t: "チューブで胸トレ", q: "メトロンブログ チューブ 胸", time: "5分", diff: 1, eq: ["band"] },
    { ch: "メトロンブログ", t: "胸 完全破壊 上級", q: "メトロンブログ 胸 破壊 上級", time: "8分", diff: 3, eq: ["bw"] },
    { ch: "メトロンブログ", t: "ダンベルで胸を鍛える", q: "メトロンブログ ダンベル 胸", time: "8分", diff: 1, eq: ["db"] },
    { ch: "山澤礼明", t: "ダンベルプレス解説", q: "山澤礼明 ダンベルプレス 胸", time: "8分", diff: 2, eq: ["db"] },
    { ch: "山澤礼明", t: "ダンベルフライ", q: "山澤礼明 ダンベルフライ 大胸筋", time: "6分", diff: 2, eq: ["db"] },
    { ch: "山澤礼明", t: "胸トレ上級DB", q: "山澤礼明 胸 ダンベル 上級", time: "12分", diff: 3, eq: ["db"] },
    { ch: "Sho Fitness", t: "ベンチプレス(パワーラック)", q: "Sho Fitness ベンチプレス フォーム 初心者", time: "10分", diff: 1, eq: ["bench", "bb"] },
    { ch: "山澤礼明", t: "インクラインDBプレス", q: "山澤礼明 インクライン ダンベルプレス 胸", time: "8分", diff: 2, eq: ["bench", "db"] },
    { ch: "山本義徳", t: "大胸筋 最強トレ理論", q: "山本義徳 大胸筋 最強 ベンチプレス", time: "10分", diff: 2, eq: ["bench", "bb"] },
    { ch: "Sho Fitness", t: "ベンチプレス 重量UP", q: "Sho Fitness ベンチプレス 重量 伸ばす", time: "12分", diff: 3, eq: ["bench", "bb"] },
    { ch: "Sho Fitness", t: "BBフロアプレス", q: "Sho Fitness バーベル フロアプレス 胸", time: "8分", diff: 2, eq: ["bb"] },
    { ch: "山澤礼明", t: "MTSチェストプレス", q: "チェストプレス マシン MTS 使い方 初心者", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山本義徳", t: "ペックフライ", q: "山本義徳 ペックフライ ペクトラルフライ 大胸筋", time: "8分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "ケーブルクロスオーバー(4スタック)", q: "ケーブルクロスオーバー マルチジャングル 胸", time: "6分", diff: 2, eq: ["gym"] },
    { ch: "山本義徳", t: "スミス インクラインプレス", q: "山本義徳 スミスマシン インクラインプレス 胸", time: "8分", diff: 2, eq: ["gym"] },
    { ch: "山澤礼明", t: "PLベンチプレス(HS)", q: "ハンマーストレングス ベンチプレス ホリゾンタル プレートロード 胸", time: "8分", diff: 1, eq: ["gym"] },
    { ch: "山本義徳", t: "PLインクラインプレス(HS)", q: "ハンマーストレングス インクラインプレス プレートロード", time: "8分", diff: 2, eq: ["gym"] },
    { ch: "山澤礼明", t: "PLワイドチェスト(HS)", q: "ハンマーストレングス ワイドチェスト プレートロード", time: "8分", diff: 2, eq: ["gym"] },
    { ch: "Sho Fitness", t: "ディップス(アシストディップチン)", q: "ディップス 胸 アシスト マシン フォーム", time: "8分", diff: 1, eq: ["gym"] },
  ],
  back: [
    { ch: "なかやまきんに君", t: "背筋8種目4分", q: "なかやまきんに君 背筋 4分 器具なし", time: "4分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "自重で背中", q: "メトロンブログ 背中 自重", time: "3分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "タオルで背中トレ", q: "メトロンブログ タオル 背中", time: "3分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "背中 自重完全版", q: "メトロンブログ 背中 自重 完全", time: "5分", diff: 1, eq: ["bw"] },
    { ch: "メトロンブログ", t: "背中 HIIT", q: "メトロンブログ 背中 HIIT", time: "6分", diff: 2, eq: ["bw"] },
    { ch: "メトロンブログ", t: "背中 上級自重", q: "メトロンブログ 背中 上級 追い込み", time: "8分", diff: 3, eq: ["bw"] },
    { ch: "メトロンブログ", t: "チューブで背中", q: "メトロンブログ チューブ 背中", time: "5分", diff: 1, eq: ["band"] },
    { ch: "メトロンブログ", t: "DBで広背筋", q: "メトロンブログ ダンベル 背中 広背筋", time: "8分", diff: 1, eq: ["db"] },
    { ch: "山澤礼明", t: "DBロウ解説", q: "山澤礼明 ダンベルロウ 背中", time: "8分", diff: 2, eq: ["db"] },
    { ch: "山澤礼明", t: "ワンハンドロウ", q: "山澤礼明 ワンハンドロウ 広背筋", time: "8分", diff: 2, eq: ["db"] },
    { ch: "Sho Fitness", t: "BBロウ(パワーラック)", q: "Sho Fitness バーベルロウ フォーム パワーラック", time: "10分", diff: 1, eq: ["bb"] },
    { ch: "Sho Fitness", t: "デッドリフト(パワーラック)", q: "Sho Fitness デッドリフト フォーム 初心者 パワーラック", time: "12分", diff: 2, eq: ["bb"] },
    { ch: "山本義徳", t: "背中 BB理論", q: "山本義徳 背中 バーベル 広背筋", time: "10分", diff: 2, eq: ["bb"] },
    { ch: "山澤礼明", t: "インクラインDBロウ", q: "山澤礼明 インクライン ダンベルロウ ベンチ", time: "8分", diff: 2, eq: ["bench", "db"] },
    { ch: "山澤礼明", t: "ラットプルダウン", q: "山澤礼明 ラットプルダウン フォーム 広背筋", time: "8分", diff: 0, eq: ["gym"] },
    { ch: "山本義徳", t: "MTSフロントプルダウン", q: "フロントプルダウン MTS マシン 背中 使い方", time: "8分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "PLハイロウ(HS)", q: "ハンマーストレングス ハイロウ プレートロード 背中", time: "8分", diff: 1, eq: ["gym"] },
    { ch: "山本義徳", t: "PLローロウ(HS)", q: "ハンマーストレングス ローロウ プレートロード 背中", time: "8分", diff: 1, eq: ["gym"] },
    { ch: "山澤礼明", t: "ケーブルプルオーバー(4スタック)", q: "ケーブルプルオーバー マルチジャングル 広背筋", time: "6分", diff: 2, eq: ["gym"] },
    { ch: "山本義徳", t: "45度バックEXT", q: "バックエクステンション 45度 フォーム 脊柱起立筋", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "アシスト懸垂(ディップチン)", q: "アシスト チンニング 懸垂 初心者 ディップチン マシン", time: "10分", diff: 0, eq: ["gym"] },
    { ch: "Sho Fitness", t: "懸垂 重量UP", q: "Sho Fitness 懸垂 加重 チンニング", time: "10分", diff: 3, eq: ["gym"] },
  ],
  legs: [
    { ch: "なかやまきんに君", t: "世界一楽な下半身", q: "なかやまきんに君 下半身 楽 初心者", time: "5分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "スクワット フォーム", q: "メトロンブログ スクワット フォーム", time: "3分", diff: 0, eq: ["bw"] },
    { ch: "なかやまきんに君", t: "ランジ4種目3分", q: "なかやまきんに君 ランジ 4種目 3分", time: "3分", diff: 0, eq: ["bw"] },
    { ch: "なかやまきんに君", t: "下半身9種目10分", q: "なかやまきんに君 下半身 腹筋 10分", time: "10分", diff: 1, eq: ["bw"] },
    { ch: "メトロンブログ", t: "脚 HIIT", q: "メトロンブログ 脚 HIIT", time: "5分", diff: 2, eq: ["bw"] },
    { ch: "メトロンブログ", t: "下半身 完全破壊", q: "メトロンブログ 脚 下半身 上級", time: "10分", diff: 3, eq: ["bw"] },
    { ch: "メトロンブログ", t: "バンドで脚トレ", q: "メトロンブログ バンド 脚", time: "5分", diff: 1, eq: ["band"] },
    { ch: "メトロンブログ", t: "DBスクワット", q: "メトロンブログ ダンベル スクワット", time: "8分", diff: 1, eq: ["db"] },
    { ch: "山澤礼明", t: "ブルガリアンSQ", q: "山澤礼明 ブルガリアンスクワット ダンベル", time: "8分", diff: 2, eq: ["db"] },
    { ch: "Sho Fitness", t: "BBスクワット(パワーラック)", q: "Sho Fitness バーベルスクワット フォーム パワーラック", time: "12分", diff: 1, eq: ["bb"] },
    { ch: "Sho Fitness", t: "フロントSQ(パワーラック)", q: "Sho Fitness フロントスクワット バーベル パワーラック", time: "10分", diff: 2, eq: ["bb"] },
    { ch: "山本義徳", t: "脚トレ BB理論", q: "山本義徳 脚 バーベル スクワット", time: "10分", diff: 2, eq: ["bb"] },
    { ch: "山澤礼明", t: "シーテッドレッグプレス", q: "シーテッド レッグプレス マシン フォーム 使い方", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山本義徳", t: "PLレッグプレス(HS)", q: "ハンマーストレングス リニアレッグプレス プレートロード", time: "8分", diff: 1, eq: ["gym"] },
    { ch: "山本義徳", t: "レッグカール(3種)", q: "レッグカール ライイング シーテッド ニーリング マシン", time: "8分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "レッグエクステンション", q: "レッグエクステンション マシン フォーム 大腿四頭筋", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "PLハックSQ(HS)", q: "ハンマーストレングス リニアハックスクワット プレートロード", time: "8分", diff: 2, eq: ["gym"] },
    { ch: "山本義徳", t: "スミス スクワット", q: "山本義徳 スミスマシン スクワット 脚", time: "10分", diff: 1, eq: ["gym"] },
    { ch: "山澤礼明", t: "スタンディングカーフ", q: "スタンディング カーフレイズ マシン ふくらはぎ", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "ヒップAB/AD", q: "ヒップアブダクション アダクション マシン 内もも 外もも", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "ブーティービルダー", q: "ブーティービルダー マシン ヒップスラスト お尻", time: "6分", diff: 1, eq: ["gym"] },
  ],
  shoulders: [
    { ch: "なかやまきんに君", t: "肩7種目4分", q: "なかやまきんに君 肩 三角筋 4分", time: "4分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "肩 自重基礎", q: "メトロンブログ 肩 自重 初心者", time: "3分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "肩 自重完全版", q: "メトロンブログ 肩 自重 完全", time: "5分", diff: 1, eq: ["bw"] },
    { ch: "メトロンブログ", t: "肩 HIIT", q: "メトロンブログ 肩 HIIT", time: "5分", diff: 2, eq: ["bw"] },
    { ch: "メトロンブログ", t: "肩 上級パンプ", q: "メトロンブログ 肩 上級 パンプ", time: "8分", diff: 3, eq: ["bw"] },
    { ch: "メトロンブログ", t: "チューブで肩", q: "メトロンブログ チューブ 肩", time: "5分", diff: 1, eq: ["band"] },
    { ch: "メトロンブログ", t: "DBで肩", q: "メトロンブログ ダンベル 肩", time: "8分", diff: 1, eq: ["db"] },
    { ch: "山澤礼明", t: "サイドレイズ(DB)", q: "山澤礼明 サイドレイズ ダンベル 三角筋", time: "8分", diff: 1, eq: ["db"] },
    { ch: "山澤礼明", t: "DBショルダープレス", q: "山澤礼明 ショルダープレス ダンベル", time: "8分", diff: 1, eq: ["db"] },
    { ch: "Sho Fitness", t: "BBオーバーヘッドプレス", q: "Sho Fitness オーバーヘッドプレス バーベル 肩", time: "10分", diff: 2, eq: ["bb"] },
    { ch: "山澤礼明", t: "MTSショルダープレス", q: "ショルダープレス マシン MTS 使い方 三角筋", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山本義徳", t: "PLショルダープレス(HS)", q: "ハンマーストレングス ショルダープレス プレートロード", time: "8分", diff: 2, eq: ["gym"] },
    { ch: "山澤礼明", t: "ラテラルレイズマシン", q: "ラテラルレイズ マシン サイドレイズ 三角筋 中部", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "リアデルトマシン", q: "リアデルト ペクトラルフライ リアデルトイド マシン 三角筋後部", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山本義徳", t: "ケーブルサイドレイズ(4スタック)", q: "ケーブル サイドレイズ マルチジャングル 三角筋", time: "6分", diff: 2, eq: ["gym"] },
    { ch: "山本義徳", t: "フェイスプル(4スタック)", q: "フェイスプル ケーブル マルチジャングル 三角筋後部", time: "6分", diff: 1, eq: ["gym"] },
    { ch: "山澤礼明", t: "スミス アップライトロウ", q: "山澤礼明 スミスマシン アップライトロウ 肩", time: "8分", diff: 2, eq: ["gym"] },
  ],
  arms: [
    { ch: "なかやまきんに君", t: "腕7種目4.5分", q: "なかやまきんに君 腕 力こぶ 4分", time: "4.5分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "腕 自重トレ", q: "メトロンブログ 腕 自重 二頭 三頭", time: "3分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "腕 HIIT", q: "メトロンブログ 腕 HIIT", time: "5分", diff: 2, eq: ["bw"] },
    { ch: "メトロンブログ", t: "腕 完全破壊", q: "メトロンブログ 腕 上級 破壊", time: "8分", diff: 3, eq: ["bw"] },
    { ch: "メトロンブログ", t: "チューブカール", q: "メトロンブログ チューブ 腕", time: "5分", diff: 1, eq: ["band"] },
    { ch: "メトロンブログ", t: "DBで腕", q: "メトロンブログ ダンベル 腕 二頭 三頭", time: "8分", diff: 1, eq: ["db"] },
    { ch: "山澤礼明", t: "DBカール", q: "山澤礼明 ダンベルカール 二頭筋", time: "8分", diff: 1, eq: ["db"] },
    { ch: "山澤礼明", t: "三頭筋 DB3種", q: "山澤礼明 三頭筋 ダンベル キックバック", time: "8分", diff: 2, eq: ["db"] },
    { ch: "Sho Fitness", t: "BBカール(アームカールベンチ)", q: "バーベルカール プリーチャー アームカールベンチ 二頭筋", time: "8分", diff: 1, eq: ["bb"] },
    { ch: "山澤礼明", t: "ライイングトライセプスEXT", q: "山澤礼明 ライイング トライセプス フラットベンチ", time: "6分", diff: 2, eq: ["bench", "db"] },
    { ch: "山澤礼明", t: "バイセップスカールマシン", q: "バイセップスカール マシン 二頭筋 使い方", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "ケーブルカール(4スタック)", q: "ケーブルカール マルチジャングル 二頭筋", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山本義徳", t: "プレスダウン(4スタック)", q: "プレスダウン 三頭筋 ケーブル マルチジャングル", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山本義徳", t: "オーバーヘッドEXT(4スタック)", q: "オーバーヘッド エクステンション ケーブル マルチジャングル 三頭筋", time: "8分", diff: 2, eq: ["gym"] },
    { ch: "山澤礼明", t: "ディップス三頭(アシストディップチン)", q: "ディップス 三頭筋 アシスト ディップチン マシン", time: "8分", diff: 1, eq: ["gym"] },
    { ch: "山澤礼明", t: "プリーチャーカール(アームカールベンチ+DB)", q: "プリーチャーカール ダンベル アームカールベンチ 二頭筋", time: "6分", diff: 1, eq: ["gym", "db"] },
  ],
  abs: [
    { ch: "なかやまきんに君", t: "世界一楽な全身10分", q: "なかやまきんに君 世界で一番楽 全身 10分", time: "10分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "1日2分腹筋", q: "メトロンブログ 腹筋 2分", time: "2分", diff: 0, eq: ["bw"] },
    { ch: "なかやまきんに君", t: "腹筋7種目3.5分", q: "なかやまきんに君 腹筋 7種目 3分半", time: "3.5分", diff: 0, eq: ["bw"] },
    { ch: "なかやまきんに君", t: "世界最速 有酸素6分", q: "なかやまきんに君 世界最速 有酸素 6分", time: "6分", diff: 1, eq: ["bw"] },
    { ch: "メトロンブログ", t: "腹筋 HIIT", q: "メトロンブログ 腹筋 HIIT", time: "6分", diff: 1, eq: ["bw"] },
    { ch: "なかやまきんに君", t: "世界一キツイHIIT 7.5分", q: "なかやまきんに君 HIIT 世界一キツイ", time: "7.5分", diff: 2, eq: ["bw"] },
    { ch: "メトロンブログ", t: "腹筋 上級追い込み", q: "メトロンブログ 腹筋 上級", time: "5分", diff: 2, eq: ["bw"] },
    { ch: "メトロンブログ", t: "腹筋 完全破壊", q: "メトロンブログ 腹筋 完全 破壊", time: "8分", diff: 3, eq: ["bw"] },
    { ch: "なかやまきんに君", t: "HIIT+腹筋15分フル", q: "なかやまきんに君 HIIT 腹筋 15分", time: "15分", diff: 3, eq: ["bw"] },
    { ch: "山澤礼明", t: "アブローラー解説", q: "山澤礼明 アブローラー 腹筋 フォーム", time: "8分", diff: 2, eq: ["bw"] },
    { ch: "山澤礼明", t: "MTSアブクランチ", q: "アブドミナルクランチ マシン MTS 腹筋 使い方", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山澤礼明", t: "デクラインシットアップ", q: "デクライン シットアップ アブドミナルベンチ 腹筋", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山本義徳", t: "トーソローテーション", q: "トーソローテーション マシン 腹斜筋 くびれ", time: "6分", diff: 0, eq: ["gym"] },
    { ch: "山本義徳", t: "レッグレイズ台", q: "レッグレイズ 台 ぶら下がり 腹筋 下腹", time: "6分", diff: 1, eq: ["gym"] },
    { ch: "山澤礼明", t: "ケーブルクランチ(4スタック)", q: "ケーブルクランチ マルチジャングル 腹筋", time: "6分", diff: 2, eq: ["gym"] },
  ],
  rest: [
    { ch: "なかやまきんに君", t: "座って世界一楽5分", q: "なかやまきんに君 座って 世界で一番楽 5分", time: "5分", diff: 0, eq: ["bw"] },
    { ch: "メトロンブログ", t: "全身ストレッチ", q: "メトロンブログ ストレッチ 全身", time: "5分", diff: 0, eq: ["bw"] },
    { ch: "なかやまきんに君", t: "世界一楽 全身10分", q: "なかやまきんに君 世界で一番楽 全身 10分", time: "10分", diff: 1, eq: ["bw"] },
  ],
};

function pickVideos(partKey, phase, week, equipState) {
  const pool = (VIDEOS[partKey] || []).filter(
    (v) => v.diff <= phase && v.eq.some((e) => equipState[e])
  );
  const count = partKey === "rest" ? 2 : Math.min(pool.length, 2 + Math.floor(week / 3));
  return shuffle(pool).slice(0, count);
}


/* ── meals: 1年計画 (山本式サイクル) ── */
/* 減量8週→リセット2週→減量8週→リセット2週→増量8週→ミニカット2週 x繰り返し→最終調整 */
const MEAL_DATA = [
  {
    id: "recovery", label: "副腎回復期", dates: "4/7-4/15", color: "#2DA44E", cal: "1800-2000kcal",
    desc: "P120 F60 C230 / ラム肉カルニチン / ナッツMg / 就寝前ホットミルク",
    weeks: [
      { tag: "A週", meals: [
        { n: "朝", items: ["オイコスPro(P20g)", "ゆで卵1個(P7g)", "いちご5粒"], links: [] },
        { n: "昼", items: ["鶏むね炊き込みご飯(米200g)", "冷奴150g+かつお節"], links: [["鶏むね 炊き込みご飯 簡単"]] },
        { n: "夜", items: ["ジンギスカン(ラム150g+もやし+玉ねぎ)", "米150g", "味噌汁"], links: [["ジンギスカン 簡単 フライパン"]] },
        { n: "間食/就寝前", items: ["ナッツ20g", "ホットミルク200ml", "OS-1"], links: [] },
      ]},
      { tag: "B週", meals: [
        { n: "朝", items: ["オイコスPro(P20g)", "ゆで卵1個(P7g)", "キウイ1個"], links: [] },
        { n: "昼", items: ["ツナ豆腐そぼろ丼(米150g)", "味噌汁"], links: [["ツナ 豆腐 そぼろ丼"]] },
        { n: "夜", items: ["ラム塩炒め(ラム120g+野菜)", "納豆ご飯(米150g)"], links: [["ラム肉 塩炒め 簡単"]] },
        { n: "間食/就寝前", items: ["ナッツ20g", "ホットミルク200ml", "バナナ"], links: [] },
      ]},
      { tag: "C週", meals: [
        { n: "朝", items: ["オイコスPro(P20g)", "卵かけご飯(米100g)", "いちご3粒"], links: [] },
        { n: "昼", items: ["さば缶パスタ(乾麺80g+にんにく醤油)", "冷奴150g"], links: [["さば缶 パスタ 簡単"]] },
        { n: "夜", items: ["ジンギスカン(ラム150g+キャベツ)", "鮭フレーク混ぜご飯(米150g)"], links: [["ジンギスカン 野菜"]] },
        { n: "間食/就寝前", items: ["ナッツ20g", "ホットミルク200ml", "キウイ"], links: [] },
      ]},
    ],
  },
  {
    id: "cut", label: "減量期(マンジャロ)", dates: "4/16-6/10, 6/25-8/19", color: "#E76F51", cal: "1400-1600kcal",
    desc: "P130 F40 C155 / P優先Cカット / 夜は主食なし / 8週で代謝リセットへ",
    weeks: [
      { tag: "A週 蕎麦", meals: [
        { n: "朝 P35", items: ["プロテイン1杯(P25g)", "ゆで卵1個(P7g)"], links: [] },
        { n: "昼 P40", items: ["鶏むね80g冷やしそば(乾麺60g)+温泉卵", "冷奴100g"], links: [["鶏むね そば 冷やし"]] },
        { n: "夜 P35", items: ["豆腐チャンプルー(豆腐200g+卵1個+もやし)", "納豆1P", "味噌汁"], links: [["豆腐チャンプルー 簡単"]] },
        { n: "間食 P25", items: ["プロテイン1杯", "きゅうり1本"], links: [] },
      ]},
      { tag: "B週 パスタ", meals: [
        { n: "朝 P30", items: ["オートミール30g+プロテイン1杯", "バナナ半分"], links: [["オートミール プロテイン"]] },
        { n: "昼 P38", items: ["ツナ1缶+豆腐100gパスタ(乾麺50g)醤油味"], links: [["ツナ 豆腐 パスタ"]] },
        { n: "夜 P35", items: ["鶏むね80gつけ汁そば(乾麺60g)", "納豆1P"], links: [["つけ汁 そば 鶏むね"]] },
        { n: "間食 P30", items: ["ゆで卵1個", "プロテイン1杯"], links: [] },
      ]},
      { tag: "C週 混ぜご飯", meals: [
        { n: "朝 P32", items: ["プロテイン1杯", "卵かけご飯(米75g)"], links: [] },
        { n: "昼 P38", items: ["ひじき鶏むね炊き込み(米100g分)", "豆腐味噌汁"], links: [["ひじき 鶏むね 炊き込みご飯"]] },
        { n: "夜 P30", items: ["納豆パスタ(乾麺50g+大葉+卵黄)", "もずく酢"], links: [["納豆パスタ 大葉"]] },
        { n: "間食 P25", items: ["プロテイン1杯", "ナッツ15g"], links: [] },
      ]},
      { tag: "D週 缶詰", meals: [
        { n: "朝 P30", items: ["納豆1P+豆腐100g+卵の丼(米75g)"], links: [["納豆 豆腐 丼"]] },
        { n: "昼 P35", items: ["さば缶おろしそば(乾麺60g+大根おろし)", "冷奴100g"], links: [["さば缶 蕎麦 冷やし"]] },
        { n: "夜 P35", items: ["ツナ1缶+豆腐150gレンジ蒸し", "味噌汁"], links: [["ツナ 豆腐 レンジ"]] },
        { n: "間食 P25", items: ["プロテイン1杯", "きゅうり"], links: [] },
      ]},
      { tag: "E週 丼", meals: [
        { n: "朝 P35", items: ["プロテイン1杯", "ゆで卵2個"], links: [] },
        { n: "昼 P40", items: ["麻婆豆腐丼(豆腐200g+鶏ひき60g/米75g)"], links: [["麻婆豆腐 鶏ひき肉 簡単"]] },
        { n: "夜 P30", items: ["とろろそば(乾麺60g)+温泉卵", "納豆1P"], links: [["とろろ蕎麦 温泉卵"]] },
        { n: "間食 P25", items: ["冷奴100g+かつお節", "プロテイン1杯"], links: [] },
      ]},
      { tag: "F週 ワンパン", meals: [
        { n: "朝 P28", items: ["卵2個スクランブル", "納豆1P", "味噌汁"], links: [] },
        { n: "昼 P38", items: ["鶏むね80gペペロンチーノ(乾麺50g)", "冷奴100g"], links: [["鶏むね ペペロンチーノ"]] },
        { n: "夜 P30", items: ["鮭フレーク混ぜご飯(米75g)", "豆腐きのこ味噌汁", "納豆1P"], links: [["鮭フレーク 混ぜご飯"]] },
        { n: "間食 P25", items: ["プロテイン1杯", "ゆで卵1個"], links: [] },
      ]},
    ],
  },
  {
    id: "maint", label: "代謝リセット", dates: "6/11-6/24, 8/20-9/3", color: "#58A6FF", cal: "1800-2000kcal",
    desc: "P130 F55 C220 / C戻してT3+レプチン回復 / 夜の主食復活 / トレ強度維持",
    weeks: [
      { tag: "A週 蕎麦+米", meals: [
        { n: "朝", items: ["オイコスPro(P20g)", "卵かけご飯(米150g)", "いちご"], links: [] },
        { n: "昼", items: ["鶏むね100g冷やしそば(乾麺100g)", "冷奴150g"], links: [["鶏むね そば 冷やし"]] },
        { n: "夜", items: ["豆腐チャンプルー(豆腐200g+卵+もやし)", "納豆ご飯(米150g)", "味噌汁"], links: [["豆腐チャンプルー 簡単"]] },
        { n: "間食", items: ["プロテイン1杯", "ナッツ20g", "バナナ"], links: [] },
      ]},
      { tag: "B週 パスタ+混ぜ飯", meals: [
        { n: "朝", items: ["オイコスPro(P20g)", "ゆで卵1個", "バナナ1本"], links: [] },
        { n: "昼", items: ["ツナ1缶+納豆パスタ(乾麺80g)", "冷奴100g"], links: [["ツナ 納豆 パスタ"]] },
        { n: "夜", items: ["ジンギスカン(ラム150g+野菜)", "鮭フレーク混ぜご飯(米150g)"], links: [["ジンギスカン 簡単"]] },
        { n: "間食", items: ["プロテイン1杯", "ナッツ20g"], links: [] },
      ]},
    ],
  },
  {
    id: "bulk", label: "増量期", dates: "9/4-10/29, 11/13-1/7, 1/22-3/18", color: "#7C5CBF", cal: "2200-2500kcal",
    desc: "P160 F65 C300 / トレ前後にC集中 / 同じ食材を大盛り / 8週でミニカットへ",
    weeks: [
      { tag: "A週 パスタ+米", meals: [
        { n: "朝", items: ["卵3個スクランブル", "納豆ご飯(米200g)", "味噌汁"], links: [] },
        { n: "昼", items: ["鶏むね120gペペロンチーノ(乾麺100g)", "豆腐150g"], links: [["鶏むね ペペロンチーノ"]] },
        { n: "トレ後", items: ["プロテイン1杯", "おにぎり2個(米200g)", "バナナ"], links: [] },
        { n: "夜", items: ["麻婆豆腐丼(豆腐300g+鶏ひき100g/米200g)", "納豆"], links: [["麻婆豆腐 ご飯"]] },
      ]},
      { tag: "B週 蕎麦+混ぜ飯", meals: [
        { n: "朝", items: ["卵かけご飯(米200g)", "納豆1P", "味噌汁", "バナナ"], links: [] },
        { n: "昼", items: ["肉そば(鶏もも100g+乾麺100g)", "冷奴150g"], links: [["肉蕎麦 鶏もも"]] },
        { n: "トレ後", items: ["プロテイン1杯", "餅2個", "はちみつ"], links: [] },
        { n: "夜", items: ["鮭きのこ炊き込み(米250g分)", "豆腐味噌汁", "納豆"], links: [["鮭 きのこ 炊き込みご飯"]] },
      ]},
      { tag: "C週 丼+パスタ", meals: [
        { n: "朝", items: ["オートミール50g+卵2個+チーズ", "プロテイン", "バナナ"], links: [["オートミール 卵 チーズ"]] },
        { n: "昼", items: ["ツナ納豆パスタ(乾麺100g)", "冷奴150g", "味噌汁"], links: [["ツナ 納豆 パスタ"]] },
        { n: "トレ後", items: ["プロテイン1杯", "おにぎり2個(米200g)"], links: [] },
        { n: "夜", items: ["豆腐チャンプルー(豆腐300g+卵2個+豚100g)", "ご飯200g"], links: [["豆腐チャンプルー"]] },
      ]},
      { tag: "D週 炊飯器", meals: [
        { n: "朝", items: ["納豆卵かけご飯(米200g)", "味噌汁", "ヨーグルト"], links: [] },
        { n: "昼", items: ["ひじき鶏もも炊き込み(米250g分)", "豆腐味噌汁"], links: [["ひじき 鶏もも 炊き込みご飯"]] },
        { n: "トレ後", items: ["プロテイン1杯", "餅2個", "バナナ"], links: [] },
        { n: "夜", items: ["さば缶パスタ(乾麺100g)", "納豆", "冷奴150g"], links: [["さば缶 パスタ"]] },
      ]},
    ],
  },
  {
    id: "minicut", label: "ミニカット", dates: "10/30-11/12, 1/8-1/21", color: "#E9C46A", cal: "1600-1800kcal",
    desc: "P140 F45 C180 / 減量期より緩め / 夜は米100gまでOK / インスリン感受性リセット",
    weeks: [
      { tag: "A週 蕎麦+豆腐", meals: [
        { n: "朝", items: ["オイコスPro(P20g)", "ゆで卵1個", "バナナ半分"], links: [] },
        { n: "昼", items: ["鶏むね100g冷やしそば(乾麺80g)", "冷奴100g"], links: [["鶏むね そば 冷やし"]] },
        { n: "夜", items: ["ジンギスカン(ラム120g+もやし)", "ご飯(米100g)", "味噌汁"], links: [["ジンギスカン 簡単"]] },
        { n: "間食", items: ["プロテイン1杯", "ナッツ15g"], links: [] },
      ]},
      { tag: "B週 パスタ+丼", meals: [
        { n: "朝", items: ["オイコスPro(P20g)", "卵かけご飯(米100g)"], links: [] },
        { n: "昼", items: ["ツナ1缶+納豆パスタ(乾麺70g)", "冷奴100g"], links: [["ツナ 納豆 パスタ"]] },
        { n: "夜", items: ["麻婆豆腐丼(豆腐200g+鶏ひき80g/米100g)", "味噌汁"], links: [["麻婆豆腐 鶏ひき肉 簡単"]] },
        { n: "間食", items: ["プロテイン1杯", "きゅうり"], links: [] },
      ]},
    ],
  },
  {
    id: "final", label: "最終調整", dates: "3/19-3/31", color: "#58A6FF", cal: "1800-2000kcal",
    desc: "P140 F55 C220 / 1年の着地 / 代謝リセット構成でメンテナンス体重を確認",
    weeks: [
      { tag: "A週", meals: [
        { n: "朝", items: ["オイコスPro(P20g)", "卵かけご飯(米150g)", "いちご"], links: [] },
        { n: "昼", items: ["鶏むね100g冷やしそば(乾麺100g)", "冷奴150g"], links: [["鶏むね そば 冷やし"]] },
        { n: "夜", items: ["ジンギスカン(ラム150g+野菜)", "納豆ご飯(米150g)", "味噌汁"], links: [["ジンギスカン 簡単"]] },
        { n: "間食", items: ["プロテイン1杯", "ナッツ20g", "バナナ"], links: [] },
      ]},
      { tag: "B週", meals: [
        { n: "朝", items: ["オイコスPro(P20g)", "ゆで卵1個", "キウイ"], links: [] },
        { n: "昼", items: ["ツナ1缶+豆腐パスタ(乾麺80g)", "味噌汁"], links: [["ツナ 豆腐 パスタ"]] },
        { n: "夜", items: ["豆腐チャンプルー(豆腐200g+卵+豚80g)", "鮭フレーク混ぜご飯(米150g)"], links: [["豆腐チャンプルー"]] },
        { n: "間食", items: ["プロテイン1杯", "ナッツ20g"], links: [] },
      ]},
    ],
  },
];

/* ── shopping: 業務スーパー(月2回)+週間生鮮(トライアル/イオン) ── */
const SHOP_DATA = [
  { id: "recovery", label: "副腎回復", color: "#2DA44E",
    bulk: [
      { item: "鶏むね肉2kg(冷凍)", yen: 1050, keep: "冷凍1ヶ月", note: "100gあたり¥53。200gずつ小分けで10回分", tag: "動物" },
      { item: "ラム肩ロース1kg(冷凍)", yen: 1200, keep: "冷凍1ヶ月", note: "150gずつ小分け。カルニチン190mg/100g", tag: "動物" },
      { item: "さば缶(水煮)6個", yen: 720, keep: "常温3年", note: "1個¥120。P30g+Mg55mg/缶", tag: "動物" },
      { item: "ツナ缶6個", yen: 540, keep: "常温3年", note: "1個¥90。水煮推奨", tag: "動物" },
      { item: "パスタ(乾麺)1kg", yen: 200, keep: "常温2年", note: "500g袋より1kgがコスパ◎", tag: "植物" },
      { item: "蕎麦(乾麺)4袋", yen: 600, keep: "常温1年", note: "1袋¥150。Mg60mg/60g", tag: "植物" },
      { item: "冷凍ブロッコリー500g", yen: 170, keep: "冷凍3ヶ月", note: "生より保存◎。VC+食物繊維", tag: "植物" },
      { item: "鮭フレーク", yen: 280, keep: "常温1年", note: "PB品で十分", tag: "動物" },
      { item: "ひじき(乾燥)", yen: 120, keep: "常温1年", note: "Mg640mg/100g。炊き込みに", tag: "植物" },
      { item: "OS-1 x3", yen: 600, keep: "常温1年", note: "電解質緊急用。常備必須", tag: "補給" },
    ],
    weekly: [
      { item: "卵2パック(20個)", yen: 400, keep: "冷蔵14日", note: "トライアルが安い。P7g/個", tag: "動物" },
      { item: "納豆3P", yen: 250, keep: "冷蔵7日/冷凍1ヶ月", note: "Mg50mg+VK2/P", tag: "植物" },
      { item: "豆腐3丁(木綿)", yen: 210, keep: "冷蔵5-7日", note: "Mg57mg/100g", tag: "植物" },
      { item: "オイコスPro x4", yen: 720, keep: "冷蔵14日", note: "P20g/個。朝の固定", tag: "動物" },
      { item: "豆乳1L", yen: 180, keep: "常温2ヶ月(未開封)", note: "Mg50mg/200ml。乳糖ゼロ", tag: "植物" },
      { item: "もやし", yen: 29, keep: "冷蔵2-3日", note: "最優先消費。ジンギスカンに", tag: "植物" },
      { item: "バナナ", yen: 130, keep: "常温3-5日", note: "Mg36mg+K360mg/本", tag: "植物" },
      { item: "ネギ1本", yen: 130, keep: "冷蔵7日/冷凍1ヶ月", note: "刻んで冷凍", tag: "植物" },
      { item: "きのこ類", yen: 150, keep: "冷蔵5日/冷凍1ヶ月", note: "菌界。小分け冷凍", tag: "菌" },
    ],
  },
  { id: "cut", label: "減量期", color: "#E76F51",
    bulk: [
      { item: "鶏むね肉2kg(冷凍)", yen: 1050, keep: "冷凍1ヶ月", note: "80-100gずつ小分け。2週間分", tag: "動物" },
      { item: "さば缶(水煮)6個", yen: 720, keep: "常温3年", note: "蕎麦/パスタの即席P源", tag: "動物" },
      { item: "ツナ缶8個", yen: 720, keep: "常温3年", note: "パスタ/丼の主力。2週間分", tag: "動物" },
      { item: "蕎麦(乾麺)4袋", yen: 600, keep: "常温1年", note: "1食60g。Mg+低GI", tag: "植物" },
      { item: "パスタ(乾麺)1kg", yen: 200, keep: "常温2年", note: "1食50g。2週間で250g消費", tag: "植物" },
      { item: "ひじき(乾燥)", yen: 120, keep: "常温1年", note: "Mg最強。炊き込みに", tag: "植物" },
      { item: "冷凍ブロッコリー500g", yen: 170, keep: "冷凍3ヶ月", note: "レンチンで副菜完成", tag: "植物" },
      { item: "鮭フレーク", yen: 280, keep: "常温1年", note: "混ぜご飯用", tag: "動物" },
      { item: "鶏ひき肉500g(冷凍)", yen: 400, keep: "冷凍1ヶ月", note: "麻婆豆腐用。60-80gずつ小分け", tag: "動物" },
    ],
    weekly: [
      { item: "卵2パック(20個)", yen: 400, keep: "冷蔵14日", note: "毎日2-3個", tag: "動物" },
      { item: "納豆4P", yen: 300, keep: "冷蔵7日/冷凍1ヶ月", note: "毎日1P固定", tag: "植物" },
      { item: "豆腐4丁(木綿)", yen: 280, keep: "冷蔵5-7日", note: "冷奴+チャンプルーで週4丁", tag: "植物" },
      { item: "もやし", yen: 29, keep: "冷蔵2-3日", note: "チャンプルー用", tag: "植物" },
      { item: "きゅうり2本", yen: 80, keep: "冷蔵5日", note: "間食ゼロCal枠", tag: "植物" },
      { item: "ネギ1本", yen: 130, keep: "冷蔵7日/冷凍1ヶ月", note: "刻んで冷凍", tag: "植物" },
      { item: "きのこ類", yen: 150, keep: "冷蔵5日/冷凍1ヶ月", note: "味噌汁+炊き込み。菌界", tag: "菌" },
      { item: "大根1/3本", yen: 100, keep: "冷蔵7日", note: "おろしそば用", tag: "植物" },
      { item: "長芋", yen: 250, keep: "冷蔵7日", note: "とろろそば用", tag: "植物" },
    ],
  },
  { id: "maint", label: "代謝リセット", color: "#58A6FF",
    bulk: [
      { item: "鶏むね肉2kg(冷凍)", yen: 1050, keep: "冷凍1ヶ月", note: "100gずつ。蕎麦増量分に対応", tag: "動物" },
      { item: "ラム肩ロース800g(冷凍)", yen: 960, keep: "冷凍1ヶ月", note: "ジンギスカン復活。150gx5回", tag: "動物" },
      { item: "ツナ缶6個", yen: 540, keep: "常温3年", note: "パスタ/丼のP源", tag: "動物" },
      { item: "蕎麦(乾麺)4袋", yen: 600, keep: "常温1年", note: "1食100gに増量", tag: "植物" },
      { item: "パスタ(乾麺)1kg", yen: 200, keep: "常温2年", note: "1食80gに増量", tag: "植物" },
      { item: "鮭フレーク", yen: 280, keep: "常温1年", note: "混ぜご飯用", tag: "動物" },
    ],
    weekly: [
      { item: "卵2パック(20個)", yen: 400, keep: "冷蔵14日", note: "卵かけご飯復活", tag: "動物" },
      { item: "納豆4P", yen: 300, keep: "冷蔵7日/冷凍1ヶ月", note: "納豆ご飯復活", tag: "植物" },
      { item: "豆腐4丁", yen: 280, keep: "冷蔵5-7日", note: "チャンプルー+冷奴", tag: "植物" },
      { item: "オイコスPro x4", yen: 720, keep: "冷蔵14日", note: "朝の固定は変えない", tag: "動物" },
      { item: "もやし", yen: 29, keep: "冷蔵2-3日", note: "ジンギスカン用", tag: "植物" },
      { item: "バナナ", yen: 130, keep: "常温3-5日", note: "C源復活+スムージー", tag: "植物" },
      { item: "キャベツ半玉", yen: 100, keep: "冷蔵7-10日", note: "ジンギスカン用", tag: "植物" },
      { item: "きのこ類", yen: 150, keep: "冷蔵5日/冷凍1ヶ月", note: "味噌汁。菌界", tag: "菌" },
    ],
  },
  { id: "bulk_phase", label: "増量期", color: "#7C5CBF",
    bulk: [
      { item: "鶏むね肉2kg(冷凍)", yen: 1050, keep: "冷凍1ヶ月", note: "120gずつ。消費量UP", tag: "動物" },
      { item: "鶏もも肉2kg(冷凍)", yen: 1300, keep: "冷凍1ヶ月", note: "肉そば/炊き込み用。うま味◎", tag: "動物" },
      { item: "さば缶(水煮)6個", yen: 720, keep: "常温3年", note: "パスタの具。DHA/EPA", tag: "動物" },
      { item: "ツナ缶6個", yen: 540, keep: "常温3年", note: "パスタ/丼", tag: "動物" },
      { item: "蕎麦(乾麺)4袋", yen: 600, keep: "常温1年", note: "1食100g", tag: "植物" },
      { item: "パスタ(乾麺)2kg", yen: 350, keep: "常温2年", note: "1食100g。大袋がコスパ◎", tag: "植物" },
      { item: "米5kg", yen: 2200, keep: "常温1-2ヶ月", note: "1食200g。高温多湿避ける", tag: "植物" },
      { item: "餅1パック", yen: 350, keep: "常温3ヶ月", note: "トレ後の即効C源", tag: "植物" },
      { item: "オートミール1kg", yen: 400, keep: "常温6ヶ月", note: "朝食/リゾット。Mg+食物繊維", tag: "植物" },
      { item: "鮭フレーク", yen: 280, keep: "常温1年", note: "炊き込みご飯用", tag: "動物" },
      { item: "ひじき(乾燥)", yen: 120, keep: "常温1年", note: "炊き込みに", tag: "植物" },
    ],
    weekly: [
      { item: "卵3パック(30個)", yen: 600, keep: "冷蔵14日", note: "1日3-4個。消費量UP", tag: "動物" },
      { item: "納豆4P", yen: 300, keep: "冷蔵7日/冷凍1ヶ月", note: "毎日1P固定", tag: "植物" },
      { item: "豆腐4丁", yen: 280, keep: "冷蔵5-7日", note: "チャンプルー300g+冷奴150g", tag: "植物" },
      { item: "もやし", yen: 29, keep: "冷蔵2-3日", note: "チャンプルー用", tag: "植物" },
      { item: "バナナ1房", yen: 130, keep: "常温3-5日", note: "トレ後+スムージー", tag: "植物" },
      { item: "ネギ1本", yen: 130, keep: "冷蔵7日/冷凍1ヶ月", note: "刻んで冷凍", tag: "植物" },
      { item: "きのこ類", yen: 150, keep: "冷蔵5日/冷凍1ヶ月", note: "炊き込み+味噌汁。菌界", tag: "菌" },
      { item: "チーズ", yen: 200, keep: "冷蔵14日", note: "オートミールリゾットに", tag: "動物" },
    ],
  },
  { id: "minicut", label: "ミニカット", color: "#E9C46A",
    bulk: [
      { item: "鶏むね肉2kg(冷凍)", yen: 1050, keep: "冷凍1ヶ月", note: "100gずつ。減量より少し多め", tag: "動物" },
      { item: "ラム肩ロース600g(冷凍)", yen: 720, keep: "冷凍1ヶ月", note: "ジンギスカン120gx5回", tag: "動物" },
      { item: "ツナ缶6個", yen: 540, keep: "常温3年", note: "パスタのP源", tag: "動物" },
      { item: "蕎麦(乾麺)4袋", yen: 600, keep: "常温1年", note: "1食80g(増量100gから微減)", tag: "植物" },
      { item: "パスタ(乾麺)500g", yen: 150, keep: "常温2年", note: "1食70g", tag: "植物" },
      { item: "鶏ひき肉500g(冷凍)", yen: 400, keep: "冷凍1ヶ月", note: "麻婆豆腐用", tag: "動物" },
    ],
    weekly: [
      { item: "卵2パック(20個)", yen: 400, keep: "冷蔵14日", note: "ゆで卵+卵かけ", tag: "動物" },
      { item: "納豆4P", yen: 300, keep: "冷蔵7日/冷凍1ヶ月", note: "毎日1P固定", tag: "植物" },
      { item: "豆腐4丁", yen: 280, keep: "冷蔵5-7日", note: "冷奴100g+麻婆豆腐200g", tag: "植物" },
      { item: "オイコスPro x4", yen: 720, keep: "冷蔵14日", note: "朝の固定", tag: "動物" },
      { item: "もやし", yen: 29, keep: "冷蔵2-3日", note: "ジンギスカン用", tag: "植物" },
      { item: "きゅうり2本", yen: 80, keep: "冷蔵5日", note: "間食ゼロCal枠", tag: "植物" },
      { item: "ネギ1本", yen: 130, keep: "冷蔵7日/冷凍1ヶ月", note: "刻んで冷凍", tag: "植物" },
      { item: "きのこ類", yen: 150, keep: "冷蔵5日/冷凍1ヶ月", note: "味噌汁用。菌界", tag: "菌" },
    ],
  },
];

/* ── calendar: 全11フェーズ ── */
const PHASE_DATES = [
  { label: "副腎回復", color: "#2DA44E", start: "2026-04-07", end: "2026-04-15" },
  { label: "減量①", color: "#E76F51", start: "2026-04-16", end: "2026-06-10" },
  { label: "代謝リセット①", color: "#58A6FF", start: "2026-06-11", end: "2026-06-24" },
  { label: "減量②", color: "#E76F51", start: "2026-06-25", end: "2026-08-19" },
  { label: "代謝リセット②", color: "#58A6FF", start: "2026-08-20", end: "2026-09-03" },
  { label: "増量①", color: "#7C5CBF", start: "2026-09-04", end: "2026-10-29" },
  { label: "ミニカット①", color: "#E9C46A", start: "2026-10-30", end: "2026-11-12" },
  { label: "増量②", color: "#7C5CBF", start: "2026-11-13", end: "2027-01-07" },
  { label: "ミニカット②", color: "#E9C46A", start: "2027-01-08", end: "2027-01-21" },
  { label: "増量③", color: "#7C5CBF", start: "2027-01-22", end: "2027-03-18" },
  { label: "最終調整", color: "#58A6FF", start: "2027-03-19", end: "2027-03-31" },
];

function getPhaseForDate(dateStr) {
  for (const p of PHASE_DATES) {
    if (dateStr >= p.start && dateStr <= p.end) return p;
  }
  return null;
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const WEEKDAY_HEADS = ["日","月","火","水","木","金","土"];

/* ═══ MAIN COMPONENT ═══ */
export default function App() {
  const [tab, setTab] = useState("train");
  const [startDate, setStartDate] = useState("2026-04-07");
  const [targetDate, setTargetDate] = useState("2026-09-03");
  const [viewDay, setViewDay] = useState(null);
  const [motiv, setMotiv] = useState(null);
  const [completed, setCompleted] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [equip, setEquip] = useState(DEFAULT_EQUIP);
  const [showEquip, setShowEquip] = useState(false);
  const [mealPhIdx, setMealPhIdx] = useState(0);
  const [mealWkIdx, setMealWkIdx] = useState(0);
  const [shopPhIdx, setShopPhIdx] = useState(0);
  const [shopChecked, setShopChecked] = useState({});
  const [weights, setWeights] = useState({});
  const [weightInput, setWeightInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [calYear, setCalYear] = useState(TODAY.getFullYear());
  const [calMonth, setCalMonth] = useState(TODAY.getMonth());
  const [liftLog, setLiftLog] = useState({});

  /* ── load from storage on mount ── */
  useEffect(() => {
    (async () => {
      const data = await loadData("fitness-hub-state", null);
      if (data) {
        if (data.completed) setCompleted(data.completed);
        if (data.equip) setEquip(data.equip);
        if (data.weights) setWeights(data.weights);
        if (data.startDate) setStartDate(data.startDate);
        if (data.targetDate) setTargetDate(data.targetDate);
        if (data.liftLog) setLiftLog(data.liftLog);
      }
      setLoaded(true);
    })();
  }, []);

  /* ── save to storage on change ── */
  useEffect(() => {
    if (!loaded) return;
    saveData("fitness-hub-state", { completed, equip, weights, startDate, targetDate, liftLog });
  }, [completed, equip, weights, startDate, targetDate, loaded, liftLog]);

  const isSunday = TODAY_DOW === 6;

  const pi = getPhase(startDate, targetDate);
  const dayIdx = viewDay !== null ? viewDay : TODAY_DOW;
  const part = PARTS[dayIdx];
  const isToday = dayIdx === TODAY_DOW;
  const todayDone = !!completed[TODAY_KEY];
  const daysLeft = Math.max(0, Math.ceil((new Date(targetDate) - TODAY) / 864e5));

  const equipJSON = JSON.stringify(equip);
  const videos = useMemo(
    () => pickVideos(part.key, pi.phase, pi.elapsed, equip),
    [part.key, pi.phase, pi.elapsed, refreshKey, equipJSON]
  );

  const streak = (() => {
    let c = 0;
    const d = new Date(TODAY);
    if (completed[d.toISOString().split("T")[0]]) c++;
    d.setDate(d.getDate() - 1);
    while (completed[d.toISOString().split("T")[0]]) { c++; d.setDate(d.getDate() - 1); }
    return c;
  })();

  const curMealPhase = MEAL_DATA[mealPhIdx];
  const curMealWeek = curMealPhase.weeks[mealWkIdx % curMealPhase.weeks.length];

  /* ── styles ── */
  const cardStyle = (borderColor) => ({
    background: "#11141B",
    border: "1px solid " + (borderColor || "#1A1F2E"),
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 6,
  });

  /* ── render ── */
  if (!loaded) {
    return (
      <div style={{ fontFamily: "'Noto Sans JP',sans-serif", background: "#08090D", color: "#5A6577", minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"🏋"}</div>
          <div style={{ fontSize: 12 }}>読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Noto Sans JP',sans-serif", background: "#08090D", color: "#B8C0CC", minHeight: "100vh", maxWidth: 480, margin: "0 auto", paddingBottom: 65 }}>

      {/* ═══ TRAIN TAB ═══ */}
      {tab === "train" && (
        <div>
          {/* Header */}
          <div style={{ background: "#0D1016", padding: "14px 14px 0", borderBottom: "1px solid #1A1F2E" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 3, color: "#5A6577" }}>DAILY WORKOUT</div>
                <h1 style={{ fontSize: 17, fontWeight: 900, margin: "2px 0 0", background: "linear-gradient(90deg," + pi.color + ",#F4A261)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  朝トレ習慣プランナー
                </h1>
              </div>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <div style={{ textAlign: "center", background: streak > 0 ? "linear-gradient(135deg," + pi.color + ",#F4A261)" : "#1A1F2E", borderRadius: 8, padding: "4px 9px", color: streak > 0 ? "#fff" : "#5A6577" }}>
                  <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{streak}</div>
                  <div style={{ fontSize: 7, letterSpacing: 1 }}>STREAK</div>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} style={{ background: "none", border: "1px solid #1A1F2E", borderRadius: 6, color: "#5A6577", fontSize: 13, padding: "4px 6px", cursor: "pointer" }}>
                  {"⚙"}
                </button>
              </div>
            </div>
            {/* Phase bar */}
            <div style={{ margin: "8px 0 6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, color: pi.color }}>{pi.icon} {pi.label}</span>
                <span style={{ color: "#5A6577" }}>Week {pi.elapsed + 1}/{pi.totalW} - 残{daysLeft}日</span>
              </div>
              <div style={{ height: 3, background: "#1A1F2E", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, width: Math.min(100, pi.progress * 100) + "%", background: "linear-gradient(90deg," + pi.color + ",#F4A261)", transition: "width 0.3s" }} />
              </div>
            </div>
            {/* Day tabs */}
            <div style={{ display: "flex", gap: 2, paddingBottom: 7 }}>
              {DAYS.map((d, i) => {
                const sel = i === dayIdx;
                const isT = i === TODAY_DOW;
                return (
                  <button key={d} onClick={() => { setViewDay(i === TODAY_DOW ? null : i); setMotiv(null); setRefreshKey((r) => r + 1); }}
                    style={{ flex: 1, padding: "4px 0", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", background: sel ? PARTS[i].color : "transparent", color: sel ? "#fff" : "#5A6577", fontWeight: sel ? 800 : 500, fontSize: 11 }}>
                    <div style={{ fontSize: 7, letterSpacing: 1 }}>{DAY_EN[i]}</div>
                    {d}
                    {isT && <div style={{ width: 4, height: 4, borderRadius: "50%", margin: "2px auto 0", background: todayDone ? "#2DA44E" : "#F4A261" }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings */}
          {showSettings && (
            <div style={{ ...cardStyle("#1A1F2E"), margin: "8px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{"⚙"} 日程設定</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: "#5A6577", display: "block", marginBottom: 2 }}>開始日</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", background: "#08090D", border: "1px solid #1A1F2E", borderRadius: 5, padding: 5, color: "#B8C0CC", fontSize: 11, fontFamily: "inherit" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: "#5A6577", display: "block", marginBottom: 2 }}>目標日</label>
                  <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ width: "100%", background: "#08090D", border: "1px solid #1A1F2E", borderRadius: 5, padding: 5, color: "#B8C0CC", fontSize: 11, fontFamily: "inherit" }} />
                </div>
              </div>
            </div>
          )}

          <div style={{ padding: "10px 14px" }}>
            {/* Hero */}
            <div style={{ background: "linear-gradient(135deg," + part.color + "14," + part.color + "04)", border: "1px solid " + part.color + "22", borderRadius: 11, padding: "16px 14px", marginBottom: 10, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -6, top: -8, fontSize: 56, opacity: 0.05, pointerEvents: "none" }}>{part.icon}</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: part.color, fontWeight: 600 }}>{part.en}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#E6EDF3" }}>{part.jp}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {isToday && <span style={{ background: "#F4A261", color: "#08090D", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 3 }}>TODAY</span>}
                  <div style={{ fontSize: 9, color: pi.color, fontWeight: 700, marginTop: 4, background: pi.color + "18", padding: "2px 6px", borderRadius: 3, display: "inline-block" }}>
                    {pi.icon} Lv.{pi.phase + 1}
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment filter */}
            <button onClick={() => setShowEquip(!showEquip)} style={{ width: "100%", padding: 7, border: "1px solid #1A1F2E", borderRadius: 7, background: "transparent", color: "#5A6577", fontSize: 10, fontFamily: "inherit", cursor: "pointer", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{"🔧"} 器具: {EQUIP_LIST.filter((e) => equip[e.id]).map((e) => e.label).join(" / ") || "なし"}</span>
              <span>{showEquip ? "▲" : "▼"}</span>
            </button>
            {showEquip && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                {EQUIP_LIST.map((e) => (
                  <button key={e.id} onClick={() => setEquip((p) => ({ ...p, [e.id]: !p[e.id] }))}
                    style={{ padding: "7px 10px", border: equip[e.id] ? "2px solid " + EQ_COL[e.id] : "1px solid #1A1F2E", borderRadius: 7, background: equip[e.id] ? EQ_COL[e.id] + "14" : "#11141B", color: equip[e.id] ? "#E6EDF3" : "#5A6577", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: equip[e.id] ? 700 : 400 }}>
                    {e.icon} {e.label}
                  </button>
                ))}
              </div>
            )}

            {/* Motivation */}
            {isToday && !todayDone && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "#5A6577", marginBottom: 5 }}>今日のやる気は？</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[{ k: "max", l: "🔥 フル", d: "全メニュー", c: "#E63946" }, { k: "mid", l: "⚡ 普通", d: "1本だけ", c: "#E9C46A" }, { k: "low", l: "😩 低い", d: "最低ライン", c: "#6C757D" }].map((m) => (
                    <button key={m.k} onClick={() => setMotiv(m.k)}
                      style={{ flex: 1, padding: "8px 3px", border: motiv === m.k ? "2px solid " + m.c : "1px solid #1A1F2E", borderRadius: 7, background: motiv === m.k ? m.c + "12" : "#11141B", color: motiv === m.k ? "#E6EDF3" : "#5A6577", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
                      <div>{m.l}</div>
                      <div style={{ fontSize: 8 }}>{m.d}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isToday && todayDone && (
              <div style={{ background: "#2DA44E10", border: "1px solid #2DA44E22", borderRadius: 9, padding: 14, textAlign: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 26 }}>{"✅"}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#2DA44E" }}>完了!</div>
              </div>
            )}

            {/* Videos */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ fontSize: 10, color: "#5A6577" }}>{"📺"} 動画メニュー({videos.length}本)</div>
                <button onClick={() => setRefreshKey((r) => r + 1)} style={{ background: "none", border: "1px solid #1A1F2E", borderRadius: 5, color: "#5A6577", fontSize: 9, padding: "2px 7px", cursor: "pointer", fontFamily: "inherit" }}>
                  {"🔀"} シャッフル
                </button>
              </div>
              {videos.length === 0 && (
                <div style={cardStyle("#1A1F2E")}>
                  <div style={{ fontSize: 11, color: "#5A6577", textAlign: "center", padding: 10 }}>該当する動画がありません。器具フィルターを確認してください。</div>
                </div>
              )}
              {videos.map((v, i) => {
                const dim = motiv === "low";
                const logKey = v.t;
                const prev = liftLog[logKey];
                return (
                  <div key={String(i) + "-" + String(refreshKey)} style={{ ...cardStyle(dim ? "#1A1F2E22" : "#1A1F2E"), opacity: dim ? 0.35 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 8, color: part.color, fontWeight: 700, letterSpacing: 1, marginBottom: 1 }}>{v.ch}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#E6EDF3", lineHeight: 1.3, marginBottom: 3 }}>{v.t}</div>
                        <div>
                          {v.eq.map((e) => (
                            <span key={e} style={{ display: "inline-block", background: EQ_COL[e] + "18", color: EQ_COL[e], fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginRight: 3 }}>{EQ_LBL[e]}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, marginLeft: 8 }}>
                        <div style={{ background: part.color + "18", color: part.color, padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800 }}>{v.time}</div>
                        <a href={yt(v.q)} target="_blank" rel="noopener noreferrer" style={{ background: part.color, color: "#fff", borderRadius: 5, padding: "4px 9px", fontSize: 10, fontWeight: 700, textDecoration: "none" }}>{"▶"} 検索</a>
                        <a href={yt(v.q + " テレビ")} target="_blank" rel="noopener noreferrer" style={{ fontSize: 8, color: "#5A6577", textDecoration: "none" }}>{"📺"} TV</a>
                      </div>
                    </div>
                    {/* Lift Log */}
                    {!dim && (
                      <div style={{ marginTop: 6, borderTop: "1px solid #1A1F2E", paddingTop: 6 }}>
                        {prev && (
                          <div style={{ fontSize: 9, color: "#5A6577", marginBottom: 4 }}>
                            {"前回: " + prev.kg + "kg x " + prev.reps + "回" + (prev.sets ? " x " + prev.sets + "set" : "") + " (" + prev.date + ")"}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input type="number" placeholder="kg" step="0.5"
                            id={"lift-kg-" + i}
                            style={{ width: 50, background: "#08090D", border: "1px solid #1A1F2E", borderRadius: 4, padding: "4px 6px", color: "#E6EDF3", fontSize: 11, fontFamily: "inherit" }} />
                          <span style={{ fontSize: 9, color: "#5A6577" }}>x</span>
                          <input type="number" placeholder="回" step="1"
                            id={"lift-reps-" + i}
                            style={{ width: 40, background: "#08090D", border: "1px solid #1A1F2E", borderRadius: 4, padding: "4px 6px", color: "#E6EDF3", fontSize: 11, fontFamily: "inherit" }} />
                          <span style={{ fontSize: 9, color: "#5A6577" }}>x</span>
                          <input type="number" placeholder="set" step="1"
                            id={"lift-sets-" + i}
                            style={{ width: 35, background: "#08090D", border: "1px solid #1A1F2E", borderRadius: 4, padding: "4px 6px", color: "#E6EDF3", fontSize: 11, fontFamily: "inherit" }} />
                          <button onClick={() => {
                            const kg = parseFloat(document.getElementById("lift-kg-" + i).value);
                            const reps = parseInt(document.getElementById("lift-reps-" + i).value);
                            const sets = parseInt(document.getElementById("lift-sets-" + i).value) || 0;
                            if (kg > 0 && reps > 0) {
                              setLiftLog((p) => ({ ...p, [logKey]: { kg, reps, sets, date: TODAY_KEY } }));
                              document.getElementById("lift-kg-" + i).value = "";
                              document.getElementById("lift-reps-" + i).value = "";
                              document.getElementById("lift-sets-" + i).value = "";
                            }
                          }}
                            style={{ background: part.color, color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 9, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 }}>
                            {"✓"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Minimum */}
            <div style={{ ...cardStyle(motiv === "low" ? part.color + "44" : "#1A1F2E"), background: motiv === "low" ? part.color + "0C" : "#11141B" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <span style={{ fontSize: 11 }}>{"🛟"}</span>
                <span style={{ fontSize: 9, color: "#F4A261", fontWeight: 800 }}>最低ライン(これだけで勝ち)</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#E6EDF3" }}>{MINS[dayIdx][pi.phase]}</div>
            </div>

            {isToday && !todayDone && (
              <button onClick={() => { setCompleted((p) => ({ ...p, [TODAY_KEY]: true })); setMotiv(null); }}
                style={{ width: "100%", padding: 13, border: "none", borderRadius: 9, background: "linear-gradient(135deg," + part.color + "," + part.color + "BB)", color: "#fff", fontSize: 14, fontWeight: 900, fontFamily: "inherit", cursor: "pointer", letterSpacing: 2, marginTop: 8 }}>
                {"✓"} 完了
              </button>
            )}

            {/* Rules */}
            <button onClick={() => setShowRules(!showRules)} style={{ width: "100%", padding: 8, border: "1px solid #1A1F2E", borderRadius: 7, background: "transparent", color: "#5A6577", fontSize: 10, fontFamily: "inherit", cursor: "pointer", marginTop: 8 }}>
              {showRules ? "▲ ルール閉じる" : "▼ 運動習慣ルール一覧"}
            </button>
            {showRules && (
              <div style={{ ...cardStyle("#1A1F2E"), fontSize: 10, lineHeight: 1.7, marginTop: 4 }}>
                <div style={{ marginBottom: 5 }}><span style={{ color: "#E63946", fontWeight: 800 }}>■ 絶対ルール</span><br />運動前スマホ禁止 / 起床→トイレ→水→運動 / 前夜ウェア準備</div>
                <div style={{ marginBottom: 5 }}><span style={{ color: "#F4A261", fontWeight: 800 }}>■ if-then</span><br />やる気ない→最低ライン / 体調悪い→ストレッチ1分 / 寝坊→昼散歩10分</div>
                <div style={{ marginBottom: 5 }}><span style={{ color: "#2DA44E", fontWeight: 800 }}>■ 報酬</span><br />運動後コーヒー解禁 / 週5達成→ご褒美 / 30日連続→新ウェア</div>
                <div><span style={{ color: "#E9C46A", fontWeight: 800 }}>■ 安全弁</span><br />月2-3日OFFあり / 2日連続休→黄信号 / 3日連続→最低ライン強制</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MEALS TAB ═══ */}
      {tab === "meals" && (
        <div style={{ padding: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 10px", color: "#E6EDF3" }}>{"🍽️"} 食事管理</h2>
          <div style={{ display: "flex", gap: 3, marginBottom: 10, flexWrap: "wrap" }}>
            {MEAL_DATA.map((p, i) => (
              <button key={p.id} onClick={() => { setMealPhIdx(i); setMealWkIdx(0); }}
                style={{ padding: "5px 9px", border: mealPhIdx === i ? "2px solid " + p.color : "1px solid #1A1F2E", borderRadius: 6, background: mealPhIdx === i ? p.color + "14" : "#11141B", color: mealPhIdx === i ? "#E6EDF3" : "#5A6577", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: mealPhIdx === i ? 800 : 400 }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ ...cardStyle(curMealPhase.color + "28"), background: curMealPhase.color + "08" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: curMealPhase.color }}>{curMealPhase.label}</div>
            <div style={{ fontSize: 9, color: "#5A6577", marginBottom: 3 }}>{curMealPhase.dates} / {curMealPhase.cal}</div>
            <div style={{ fontSize: 10, lineHeight: 1.4 }}>{curMealPhase.desc}</div>
          </div>
          <div style={{ display: "flex", gap: 3, margin: "8px 0", flexWrap: "wrap" }}>
            {curMealPhase.weeks.map((w, i) => (
              <button key={i} onClick={() => setMealWkIdx(i)}
                style={{ padding: "5px 10px", border: mealWkIdx === i ? "2px solid " + curMealPhase.color : "1px solid #1A1F2E", borderRadius: 6, background: mealWkIdx === i ? curMealPhase.color + "14" : "#11141B", color: mealWkIdx === i ? "#E6EDF3" : "#5A6577", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: mealWkIdx === i ? 700 : 400 }}>
                {w.tag}
              </button>
            ))}
          </div>
          {curMealWeek.meals.map((m, mi) => (
            <div key={mi} style={cardStyle("#1A1F2E")}>
              <div style={{ fontSize: 10, fontWeight: 800, color: curMealPhase.color, marginBottom: 3 }}>{m.n}</div>
              {m.items.map((item, ii) => (
                <div key={ii} style={{ fontSize: 11, lineHeight: 1.6, color: "#B8C0CC" }}>・{item}</div>
              ))}
              {m.links.length > 0 && (
                <div style={{ marginTop: 5, display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {m.links.map((linkArr, li) => (
                    <a key={li} href={cookpadUrl(linkArr[0])} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-block", background: curMealPhase.color + "18", color: curMealPhase.color, fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 3, textDecoration: "none" }}>
                      {"📖"} レシピ
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ SHOP TAB ═══ */}
      {tab === "shop" && (
        <div style={{ padding: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 10px", color: "#E6EDF3" }}>{"🛒"} 買い出しリスト</h2>
          <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
            {SHOP_DATA.map((p, i) => (
              <button key={p.id} onClick={() => { setShopPhIdx(i); setShopChecked({}); }}
                style={{ flex: 1, padding: "7px 5px", border: shopPhIdx === i ? "2px solid " + p.color : "1px solid #1A1F2E", borderRadius: 6, background: shopPhIdx === i ? p.color + "14" : "#11141B", color: shopPhIdx === i ? "#E6EDF3" : "#5A6577", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: shopPhIdx === i ? 800 : 400 }}>
                {p.label}
              </button>
            ))}
          </div>
          {["bulk", "weekly"].map((day) => {
            const sp = SHOP_DATA[shopPhIdx];
            const items = sp[day];
            const dayTotal = items.reduce((s, x) => s + x.yen, 0);
            return (
              <div key={day} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: sp.color }}>
                    {day === "bulk" ? "🏪 業務スーパー(月2回)" : "🛒 週間生鮮(トライアル)"}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#F4A261" }}>
                    {"¥" + dayTotal.toLocaleString()}
                  </span>
                </div>
                {items.map((entry, i) => {
                  const k = shopPhIdx + "-" + day + "-" + i;
                  const chk = !!shopChecked[k];
                  const tagCol = { "動物": "#E63946", "植物": "#2DA44E", "菌": "#7C5CBF", "鉱物": "#E9C46A", "補給": "#58A6FF" };
                  return (
                    <div key={i} onClick={() => setShopChecked((prev) => ({ ...prev, [k]: !prev[k] }))}
                      style={{ ...cardStyle(chk ? "#2DA44E28" : "#1A1F2E"), cursor: "pointer", padding: "9px 11px", background: chk ? "#2DA44E06" : "#11141B" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (chk ? "#2DA44E" : "#1A1F2E"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#2DA44E", flexShrink: 0 }}>
                          {chk ? "✓" : ""}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, textDecoration: chk ? "line-through" : "none", color: chk ? "#5A6577" : "#B8C0CC" }}>{entry.item}</span>
                            {entry.yen > 0 && (
                              <span style={{ fontSize: 10, color: "#5A6577", fontWeight: 600, flexShrink: 0 }}>{"¥" + entry.yen}</span>
                            )}
                          </div>
                          {!chk && (
                            <div style={{ marginTop: 3 }}>
                              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                                {entry.tag && (
                                  <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: (tagCol[entry.tag] || "#5A6577") + "18", color: tagCol[entry.tag] || "#5A6577" }}>{entry.tag}</span>
                                )}
                                {entry.keep && (
                                  <span style={{ fontSize: 8, color: "#5A6577", background: "#1A1F2E", padding: "1px 5px", borderRadius: 3 }}>{entry.keep}</span>
                                )}
                              </div>
                              {entry.note && (
                                <div style={{ fontSize: 9, color: "#4A5568", marginTop: 2, lineHeight: 1.4 }}>{entry.note}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {(() => {
            const sp = SHOP_DATA[shopPhIdx];
            const bulkTotal = sp.bulk.reduce((s, x) => s + x.yen, 0);
            const weeklyTotal = sp.weekly.reduce((s, x) => s + x.yen, 0);
            const monthBulk = bulkTotal * 2;
            const monthWeekly = Math.round(weeklyTotal * 4.3);
            const monthFood = monthBulk + monthWeekly;
            const fixedMonthly = 3500 + 2900 + 800 + 200 + 300;
            return (
              <div style={{ ...cardStyle("#F4A261" + "22"), background: "#F4A261" + "06", marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#5A6577" }}>業務スーパー(x2回/月)</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#E6EDF3" }}>{"¥" + monthBulk.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#5A6577" }}>週間生鮮(x4.3週/月)</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#E6EDF3" }}>{"¥" + monthWeekly.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#5A6577" }}>固定費(プロテイン/オイコス/ナッツ/VC/調味料)</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#E6EDF3" }}>{"¥" + fixedMonthly.toLocaleString()}</span>
                </div>
                <div style={{ borderTop: "1px solid #1A1F2E", paddingTop: 4, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: monthFood + fixedMonthly <= 25000 ? "#2DA44E" : "#F4A261" }}>月間合計</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: monthFood + fixedMonthly <= 25000 ? "#2DA44E" : "#F4A261" }}>{"¥" + (monthFood + fixedMonthly).toLocaleString()}</span>
                </div>
                {monthFood + fixedMonthly <= 25000 && (
                  <div style={{ textAlign: "center", fontSize: 9, color: "#2DA44E", marginTop: 4 }}>{"✓ ¥25,000以下 達成"}</div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ CALENDAR TAB ═══ */}
      {tab === "cal" && (
        <div style={{ padding: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 10px", color: "#E6EDF3" }}>{"📅"} スケジュール</h2>

          {/* Month navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => { if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); } else { setCalMonth(calMonth - 1); } }}
              style={{ background: "none", border: "1px solid #1A1F2E", borderRadius: 6, color: "#5A6577", fontSize: 14, padding: "6px 12px", cursor: "pointer" }}>{"<"}</button>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#E6EDF3" }}>
              {calYear}年 {MONTH_NAMES[calMonth]}
            </span>
            <button onClick={() => { if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); } else { setCalMonth(calMonth + 1); } }}
              style={{ background: "none", border: "1px solid #1A1F2E", borderRadius: 6, color: "#5A6577", fontSize: 14, padding: "6px 12px", cursor: "pointer" }}>{">"}</button>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {PHASE_DATES.map((p) => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
                <span style={{ fontSize: 9, color: "#5A6577" }}>{p.label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#F4A261" }} />
              <span style={{ fontSize: 9, color: "#5A6577" }}>今日</span>
            </div>
          </div>

          {/* Calendar grid */}
          <div style={{ ...cardStyle("#1A1F2E"), padding: "10px" }}>
            {/* Weekday headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              {WEEKDAY_HEADS.map((w, i) => (
                <div key={w} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: i === 0 ? "#E63946" : i === 6 ? "#58A6FF" : "#5A6577", padding: "4px 0" }}>
                  {w}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {getMonthDays(calYear, calMonth).map((day, idx) => {
                if (day === null) {
                  return <div key={"e" + idx} />;
                }
                const mm = String(calMonth + 1).padStart(2, "0");
                const dd = String(day).padStart(2, "0");
                const dateStr = calYear + "-" + mm + "-" + dd;
                const phase = getPhaseForDate(dateStr);
                const isT = dateStr === TODAY_KEY;
                const isDone = !!completed[dateStr];
                const hasWeight = !!weights[dateStr];
                const dow = new Date(calYear, calMonth, day).getDay();

                return (
                  <div key={dateStr} style={{
                    textAlign: "center",
                    padding: "6px 2px",
                    borderRadius: 6,
                    background: isT ? "#F4A261" + "30" : phase ? phase.color + "12" : "transparent",
                    border: isT ? "2px solid #F4A261" : phase ? "1px solid " + phase.color + "22" : "1px solid transparent",
                    position: "relative",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: isT ? 900 : 500, color: isT ? "#F4A261" : dow === 0 ? "#E63946" : dow === 6 ? "#58A6FF" : "#B8C0CC" }}>
                      {day}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2 }}>
                      {isDone && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#2DA44E" }} />}
                      {hasWeight && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#F4A261" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase timeline */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "#5A6577", marginBottom: 6 }}>{"📋"} フェーズ一覧</div>
            {PHASE_DATES.map((p) => {
              const s = new Date(p.start);
              const e = new Date(p.end);
              const days = Math.round((e - s) / 864e5);
              const isActive = TODAY_KEY >= p.start && TODAY_KEY <= p.end;
              return (
                <div key={p.label} style={{ ...cardStyle(isActive ? p.color + "44" : "#1A1F2E"), background: isActive ? p.color + "0C" : "#11141B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: isActive ? p.color : "#B8C0CC" }}>
                      {isActive ? "● " : ""}{p.label}
                    </div>
                    <div style={{ fontSize: 9, color: "#5A6577", marginTop: 2 }}>
                      {p.start} ~ {p.end}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: isActive ? p.color : "#5A6577" }}>{days}日間</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ WEIGHT TAB ═══ */}
      {tab === "weight" && (
        <div style={{ padding: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 10px", color: "#E6EDF3" }}>{"⚖"} 体重記録</h2>
          <div style={{ ...cardStyle("#1A1F2E"), fontSize: 10, lineHeight: 1.6, color: "#5A6577", marginBottom: 12 }}>
            毎週日曜・朝トレ休みの日に計測。起床→トイレ後。それ以外の日は乗らない。数字はただのデータ。
          </div>

          {/* Sunday input */}
          {isSunday && !weights[TODAY_KEY] && (
            <div style={{ ...cardStyle("#F4A261" + "33"), background: "#F4A261" + "08", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#F4A261", marginBottom: 8 }}>{"📊"} 今日は計測日</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="体重 kg"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  style={{ flex: 1, background: "#08090D", border: "1px solid #1A1F2E", borderRadius: 6, padding: "10px 12px", color: "#E6EDF3", fontSize: 16, fontFamily: "inherit", fontWeight: 700 }}
                />
                <button
                  onClick={() => {
                    const v = parseFloat(weightInput);
                    if (v > 30 && v < 200) {
                      setWeights((prev) => ({ ...prev, [TODAY_KEY]: v }));
                      setWeightInput("");
                    }
                  }}
                  style={{ background: "#F4A261", color: "#08090D", border: "none", borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
                  記録
                </button>
              </div>
            </div>
          )}

          {isSunday && weights[TODAY_KEY] && (
            <div style={{ ...cardStyle("#2DA44E" + "33"), background: "#2DA44E08", textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#2DA44E" }}>{weights[TODAY_KEY]} kg</div>
              <div style={{ fontSize: 10, color: "#5A6577", marginTop: 4 }}>今週の記録完了</div>
            </div>
          )}

          {!isSunday && (
            <div style={{ ...cardStyle("#1A1F2E"), textAlign: "center", padding: 20, marginBottom: 12 }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{"🚫"}</div>
              <div style={{ fontSize: 12, color: "#5A6577" }}>計測は日曜日だけ。今日は乗らない。</div>
            </div>
          )}

          {/* Weight history */}
          <div style={{ fontSize: 11, color: "#5A6577", marginBottom: 6 }}>{"📈"} 記録一覧</div>
          {(() => {
            const entries = Object.entries(weights).sort((a, b) => b[0].localeCompare(a[0]));
            if (entries.length === 0) {
              return (
                <div style={{ ...cardStyle("#1A1F2E"), textAlign: "center", padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#5A6577" }}>まだ記録がありません。次の日曜に最初の記録を。</div>
                </div>
              );
            }
            const first = entries[entries.length - 1][1];
            const latest = entries[0][1];
            const diff = latest - first;
            return (
              <div>
                {entries.length >= 2 && (
                  <div style={{ ...cardStyle(diff < 0 ? "#2DA44E33" : "#E6394633"), background: diff < 0 ? "#2DA44E08" : "#E6394608", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#5A6577" }}>初回からの変化</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: diff < 0 ? "#2DA44E" : "#E63946" }}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                    </span>
                  </div>
                )}
                {entries.map(([date, w], idx) => {
                  const prev = idx < entries.length - 1 ? entries[idx + 1][1] : null;
                  const weekDiff = prev !== null ? w - prev : null;
                  return (
                    <div key={date} style={{ ...cardStyle("#1A1F2E"), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#5A6577" }}>{date}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {weekDiff !== null && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: weekDiff < 0 ? "#2DA44E" : weekDiff > 0 ? "#E63946" : "#5A6577" }}>
                            {weekDiff > 0 ? "+" : ""}{weekDiff.toFixed(1)}
                          </span>
                        )}
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#E6EDF3" }}>{w} kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ BOTTOM NAV ═══ */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0D1016", borderTop: "1px solid #1A1F2E", display: "flex", zIndex: 100 }}>
        {[{ id: "train", icon: "🏋", label: "トレ" }, { id: "meals", icon: "🍽", label: "食事" }, { id: "shop", icon: "🛒", label: "買物" }, { id: "cal", icon: "📅", label: "計画" }, { id: "weight", icon: "⚖", label: "体重" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "10px 0 8px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: tab === t.id ? "#F4A261" : "#5A6577" }}>
            <div style={{ fontSize: 17, lineHeight: 1 }}>{t.icon}</div>
            <div style={{ fontSize: 8, fontWeight: tab === t.id ? 800 : 500, marginTop: 2 }}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
