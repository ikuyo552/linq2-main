import { useState, useCallback, useRef, forwardRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ==================== 定数 ====================
const FONT = "'Meiryo', 'メイリオ', 'Yu Gothic', sans-serif";
const AGREEMENT_URL = "https://portal.salonpos-net.com/user_data/riyoukiyaku.php";
const STORAGE_KEY = "linq2_normal_draft";
const MY_INFO_KEY = "linq2_my_info";
const NICCHOSEISAKISAKI_LIST = ["店舗担当者", "営業"];

const PACKAGES = ["シンプルパック", "ベーシック", "ベーシックパック+"];
const PACKAGE_BASE = { "シンプルパック": 7000, "ベーシック": 11000, "ベーシックパック+": 14000 };
const CONCIERGE_BANDS = {
  "シンプルパック":    ["0台（申込なし）","1台","2台","3台","4台","5台","6〜10台","11〜20台","台数フリー"],
  "ベーシック":        ["0台（申込なし）","1台","2台","3台","4台","5台","6〜10台","11〜20台","台数フリー"],
  "ベーシックパック+": ["2台","3台","4台","5台","6〜10台","11〜20台","台数フリー"],
};
const CONCIERGE_PRICE = {
  "シンプルパック":    { "0台（申込なし）":0,"1台":3000,"2台":4000,"3台":5000,"4台":6000,"5台":7000,"6〜10台":9000,"11〜20台":11000,"台数フリー":13000 },
  "ベーシック":        { "0台（申込なし）":0,"1台":3000,"2台":4000,"3台":5000,"4台":6000,"5台":7000,"6〜10台":9000,"11〜20台":11000,"台数フリー":13000 },
  "ベーシックパック+": { "2台":0,"3台":1000,"4台":2000,"5台":3000,"6〜10台":5000,"11〜20台":7000,"台数フリー":9000 },
};
const CONCIERGE_NEEDS_ACTUAL = ["6〜10台","11〜20台","台数フリー"];

const OPTIONS_LIST = [
  { key:"cti",            label:"CTI",             price:0,    note:"cti" },
  { key:"shozai",         label:"粧材管理",         price:1000, note:"" },
  { key:"mf",             label:"MFクラウド連携",   price:300,  note:"" },
  { key:"barcode_payment",label:"バーコード決済",   price:0,    note:"" },
  { key:"barcode",        label:"バーコード",       price:0,    note:"" },
  { key:"milbon",         label:"ミルボン連携",     price:1000, note:"" },
];

// 納品データ選択肢（使用頻度順）
const NOHIN_DATA_LIST = [
  { key:"entrybook",    label:"エントリーブック",              tenpoAddOnly: false },
  { key:"keirestore",   label:"系列店コピー",                  tenpoAddOnly: true  },
  { key:"pos2",         label:"POSⅡ",                         tenpoAddOnly: false },
  { key:"tasha",        label:"他社移行",                      tenpoAddOnly: false },
  { key:"shokichi",     label:"初期値",                        tenpoAddOnly: false },
  { key:"sonota",       label:"その他（備考欄に記入）",        tenpoAddOnly: false },
];

const LAN_PRICE = 3000;
const LAN_COUNT_OPTIONS = Array.from({ length: 5 }, (_, i) => i + 1);
const REWRITE_PRICE = 1500;
const JIKI_PRICE = 500;
const CTI_PRICE = { "シンプルパック": 1000, "ベーシック": 0, "ベーシックパック+": 0 };
const WAN_HONBU_BASE = 10000;
const WAN_CONCIERGE_MANAGER_PRICE = 4500;
const WAN_CONCIERGE_MANAGER_OPTIONS = ["0台","1台","2台","3台","4台","5台"];
const NYUTAI_OPTIONS = Array.from({ length: 10 }, (_, i) => `${i+1}台`);
const HIKITORI_KIKI_LIST = [
  "POS本体","レシートプリンタ","ドロア","カスタマーディスプレイ",
  "アロハ","リライトカードリーダ","貸出機","その他",
];

// ==================== カラー（ティールテーマ） ====================
const C = {
  navy:        "#1a3358",
  navyLight:   "#274d82",
  blue:        "#1D9E75",   // ← ティールに変更（キャンペーン版はブルー）
  blueSoft:    "#E1F5EE",
  border:      "#d1dae6",
  borderFocus: "#1D9E75",
  bg:          "#eef2f7",
  white:       "#ffffff",
  text:        "#1a2535",
  muted:       "#5f7490",
  danger:      "#dc2626",
  success:     "#16a34a",
  stepDone:    "#16a34a",
  errorBg:     "#fef2f2",
  errorBorder: "#fca5a5",
  teal:        "#1D9E75",
  tealDark:    "#0F6E56",
  tealDeep:    "#085041",
  tealLight:   "#E1F5EE",
  tealMid:     "#5DCAA5",
  // 「申込書を追加する」ボタン用（キャンペーン版のpurple相当）
  campaign:     "#0F6E56",
  campaignLight:"#9FE1CB",
};

// ==================== タブ種別定義 ====================
const TAB_GROUPS = [
  {
    groupLabel: "新規申込",
    types: [
      { type: "新規_単店",           shortLabel: "単店",             subLabel: "複数店舗同時申込みも「単店」を選んでください" },
      { type: "新規_店舗追加",       shortLabel: "店舗追加",         subLabel: "既存グループに店舗を追加します" },
      { type: "新規_事務所WAN本部",  shortLabel: "事務所WAN本部",    subLabel: "" },
      { type: "新規_フロントWAN本部_既存店", shortLabel: "フロントWAN本部（既存店）", subLabel: "既存店にフロントWAN本部機能を追加" },
      { type: "新規_フロントWAN本部_新規店",  shortLabel: "フロントWAN本部（新規店）", subLabel: "新規申込店舗に本部機能を追加" },
    ],
  },
  {
    groupLabel: "端末入替",
    types: [
      { type: "端末入替",          shortLabel: "変更なし", subLabel: "" },
      { type: "端末入替_変更あり", shortLabel: "変更あり", subLabel: "端末入替と同時に契約内容を変更します" },
    ],
  },
  {
    groupLabel: "契約変更",
    types: [
      { type: "契約変更", shortLabel: "契約変更", subLabel: "パッケージ・オプションの追加・変更・解約" },
    ],
  },
  {
    groupLabel: "全解約",
    types: [
      { type: "全解約", shortLabel: "全解約", subLabel: "サービスを解約します" },
    ],
  },
];

const TYPE_LABEL = {
  "新規_単店":                    "新規（単店）",
  "新規_店舗追加":                "新規（店舗追加）",
  "新規_事務所WAN本部":           "新規（事務所WAN本部）",
  "新規_フロントWAN本部_既存店":  "新規（フロントWAN本部・既存店）",
  "新規_フロントWAN本部_新規店":  "新規（フロントWAN本部・新規店）",
  "端末入替":                     "端末入替（変更なし）",
  "端末入替_変更あり":            "端末入替（変更あり）",
  "契約変更":                     "契約変更",
  "全解約":                       "全解約",
};

// 単店ラベルをタブ構成から動的判定する共通関数
const getDynamicTantoLabel = (allTabs) => {
  const hasWan = (allTabs || []).some(t =>
    t.type === "新規_事務所WAN本部" ||
    t.type === "新規_フロントWAN本部_既存店" ||
    t.type === "新規_フロントWAN本部_新規店"
  );
  const tantoCount = (allTabs || []).filter(t => t.type === "新規_単店").length;
  if (hasWan)           return "新規（WAN）";
  if (tantoCount >= 2)  return "新規（同一企業）";
  return "新規（単店）";
};

// PDF用（申込書タイトル）
const getDynamicPdfTantoLabel = (allTabs) => {
  const hasWan = (allTabs || []).some(t =>
    t.type === "新規_事務所WAN本部" ||
    t.type === "新規_フロントWAN本部_既存店" ||
    t.type === "新規_フロントWAN本部_新規店"
  );
  const tantoCount = (allTabs || []).filter(t => t.type === "新規_単店").length;
  if (hasWan)           return "新規申込（WAN）";
  if (tantoCount >= 2)  return "新規申込（同一企業）";
  return "新規申込（単店）";
};

// ==================== データモデル ====================
let _tabIdCounter = 0;
const genTabId = () => `tab_${Date.now()}_${++_tabIdCounter}`;

// 新規申込（店舗系）の初期データ
const newTenpoData = () => ({
  tenpoName: "", tenpoNameKana: "",
  yubinBango: "", jusho: "", jusho2: "", denwa: "",
  sameAsKeiyakusha: false,
  sekininshaLastName: "", sekininshaFirstName: "",
  sekininshaLastNameKana: "", sekininshaFirstNameKana: "",
  linq2MailPrefix: "",
  // 納品データ（複数選択）
  nohinData: [],
  nohinSonota: "",
  // 他社移行追加フィールド
  tashaDataType: "",
  tashaEntryBook: "",
  // プラン
  package: "",
  conciergeCount: "",
  conciergeActualCount: "",
  options: [],
  lanEnabled: false,
  lanCount: 1,
  receiptoLogo: "",
  // 月額支払い方法（店舗追加のみ）
  shiharaiHoho: "",
  kizonTenpoName: "", kizonTenpoDenwa: "",
  keireistenName: "", keireistenDenwa: "",
  sameAsKeireis: false,
  // 日程調整
  nicchoseiSaki: "",
  nicchoseiTantosha: "", nicchoseiTantoshaKana: "", nicchoseiDenwa: "",
  chosaDate: "", donguDate: "",
  // ネット・オープン日（他社移行選択時）
  netKaiTsubiStatus: "", netKaiTsubiKakutei: "確定", netKaiTsubiMode: "date",
  netKaiTsubiDate: "", netKaiTsubiText: "",
  openStatus: "", openKakutei: "確定", openMode: "date", openDate: "", openText: "",
  pos2Hikitori: "", pos2HikitoriKiki: [], pos2HikitoriSonota: "",
  setsuzokoHoho: "",
  biko: "",
});

// 事務所WAN本部の初期データ
const newWanHonbuData = () => ({
  honbuName: "", honbuNameKana: "",
  sameAsKeiyakusha: false,
  yubinBango: "", jusho: "", jusho2: "", denwa: "",
  sekininshaLastName: "", sekininshaFirstName: "",
  sekininshaLastNameKana: "", sekininshaFirstNameKana: "",
  linq2MailNotUse: false,
  linq2MailPrefix: "",
  netKaiTsubiStatus: "", netKaiTsubiKakutei: "確定", netKaiTsubiMode: "date",
  netKaiTsubiDate: "", netKaiTsubiText: "",
  setsuzokoHoho: "",
  wanLanEnabled: false, wanLanCount: 1,
  wanConciergeManager: "0台",
  wanBarcode: false,
  wanShozai: false,
  nicchoseiSaki: "", nicchoseiTantosha: "", nicchoseiTantoshaKana: "", nicchoseiDenwa: "",
  chosaDate: "", donguDate: "",
  biko: "",
});

// フロントWAN本部（既存店追加）の初期データ
const newFrontWanData = () => ({
  honbuName: "", honbuNameKana: "",
  sameAsKeiyakusha: false,
  yubinBango: "", jusho: "", jusho2: "", denwa: "",
  sekininshaLastName: "", sekininshaFirstName: "",
  sekininshaLastNameKana: "", sekininshaFirstNameKana: "",
  linq2MailNotUse: false,
  linq2MailPrefix: "",
  wanLanEnabled: false, wanLanCount: 1,
  wanConciergeManager: "0台",
  wanBarcode: false,
  wanShozai: false,
  kizonTenpoName: "", kizonTenpoDenwa: "",
  nicchoseiSaki: "", nicchoseiTantosha: "", nicchoseiTantoshaKana: "", nicchoseiDenwa: "",
  nohinhopoBijitsu: "",  // 導入希望日時
  biko: "",
});

// 端末入替の初期データ
const newNyuukaeData = () => ({
  tenpoName: "", tenpoNameKana: "",
  yubinBango: "", jusho: "", jusho2: "", denwa: "",
  sameAsKeiyakusha: false,
  sekininshaLastName: "", sekininshaFirstName: "",
  sekininshaLastNameKana: "", sekininshaFirstNameKana: "",
  nyutaiDaisuu: "1台",
  kikiHikitori: "",
  hikitoriKiki: [],
  hikitoriSonota: "",
  kikoHosoku: "",
  nicchoseiSaki: "",
  nicchoseiTantosha: "", nicchoseiTantoshaKana: "", nicchoseiDenwa: "",
  jizenchoosa: false,
  chosaDate: "",
  nohinhopoBijitsu: "",
  nicchoseiHosoku: "",
});

// 端末入替（変更あり）の初期データ
const newNyuukaeHenkoData = () => ({
  // 店舗情報
  tenpoName: "", tenpoNameKana: "",
  yubinBango: "", jusho: "", jusho2: "", denwa: "",
  sameAsKeiyakusha: false,
  sekininshaLastName: "", sekininshaFirstName: "",
  sekininshaLastNameKana: "", sekininshaFirstNameKana: "",
  // 機器情報
  nyutaiDaisuu: "1台",
  kikiHikitori: "",
  hikitoriKiki: [],
  hikitoriSonota: "",
  kikoHosoku: "",
  // サービス選択（変更後の状態）
  package: "",
  concierge: "", conciergeActual: "",
  ctiChecked: false, ctiKeizoCount: 0, ctiAddCount: 0,
  lanChecked: false, lanKeizoCount: 0, lanAddCount: 0,
  shozai: false, mf: false, barcodePayment: false, barcode: false, milbon: false,
  rewrite: "", jiki: "",
  // 日程調整（常時表示）
  nicchoseiSaki: "",
  nicchoseiTantosha: "", nicchoseiTantoshaKana: "", nicchoseiDenwa: "",
  jizenchoosa: false, chosaDate: "",
  nohinhopoBijitsu: "",
  nicchoseiHosoku: "",
  biko: "",
});

// 契約変更の初期データ
const newKeiyakuHenkoData = () => ({
  // 申込種別（複数選択可）
  moushikomiBetsu: { packageChange: false, optionAdd: false, optionCancel: false },
  // 店舗情報
  tenpoName: "", tenpoNameKana: "",
  sameAsKeiyakusha: false,
  yubinBango: "", jusho: "", jusho2: "", denwa: "",
  // サービス選択（今後の状態）
  package: "",
  concierge: "",
  conciergeActual: "",
  ctiChecked: false, ctiKeizoCount: 0, ctiAddCount: 0,
  ctiSetsuchiSha: "",
  lanChecked: false, lanKeizoCount: 0, lanAddCount: 0,
  lanSetsuchiSha: "",
  shozai: false, mf: false, barcodePayment: false, barcode: false, milbon: false,
  rewrite: "",          // "" / "継続" / "解約"
  jiki: "",             // "" / "継続" / "解約"
  // 日程調整（CTI/LAN「新たに導入」時）
  jizenchoosa: false, chosaDate: "",
  nicchoseiSaki: "", nicchoseiTantosha: "",
  nicchoseiTantoshaKana: "", nicchoseiDenwa: "",
  donguDate: "", nicchoseiHosoku: "",
  // 変更希望日（訪問なし時）
  henkoKiboDate: "",
  // 備考
  bikoKaiyaku: "",
  biko: "",
});

// 全解約の初期データ
const newZenkaiData = () => ({
  tenpoName: "", tenpoNameKana: "",
  sameAsKeiyakusha: false,
  yubinBango: "", jusho: "", jusho2: "", denwa: "",
  kaiyakuKiboDate: "",
  biko: "",
});

// フロントWAN本部（新規店同時申込）の初期データ
const newFrontWanNewData = () => ({
  honbuName: "", honbuNameKana: "",
  linkedTabId: "",
  linq2MailNotUse: false,
  linq2MailPrefix: "",
  wanLanEnabled: false, wanLanCount: 1,
  wanConciergeManager: "0台",
  wanBarcode: false,
  wanShozai: false,
  biko: "",
});

const DATA_FN = {
  "新規_単店":                   newTenpoData,
  "新規_店舗追加":               newTenpoData,
  "新規_事務所WAN本部":          newWanHonbuData,
  "新規_フロントWAN本部_既存店": newFrontWanData,
  "新規_フロントWAN本部_新規店": newFrontWanNewData,
  "端末入替":                    newNyuukaeData,
  "端末入替_変更あり":           newNyuukaeHenkoData,
  "契約変更":                    newKeiyakuHenkoData,
  "全解約":                      newZenkaiData,
};

const newTab = () => {
  const id = genTabId();
  return { id, type: "", data: {} };
};

const initialForm = () => {
  const tab = newTab();
  return {
    eigyosho: "", tantosha: "", tantoshaKana: "", tantoshaDenwa: "", shainBango: "",
    moushikomiBi: todayStr(),
    keiyakuType: "",
    hojinName: "", hojinNameKana: "",
    hojinDaihyo_sei: "", hojinDaihyo_mei: "",
    hojinDaihyo_sei_kana: "", hojinDaihyo_mei_kana: "",
    kojin_sei: "", kojin_mei: "", kojin_sei_kana: "", kojin_mei_kana: "",
    yubinBango: "", jusho: "", jusho2: "", denwa: "", mail: "",
    tabs: [tab],
  };
};

// ==================== ユーティリティ ====================
const toKatakana = str =>
  str.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const isHiragana = str => /^[\u3040-\u309F\u30A0-\u30FF\s\u3000ー]+$/.test(str);

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const fmtPrice    = n => `¥${n.toLocaleString()}`;
const fmtPriceNum = n => n.toLocaleString();

const formatDate = s => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${y}年${m}月${d}日`;
};

const getNetKaiTsubiLabel = d => {
  if (!d.netKaiTsubiStatus) return "";
  if (d.netKaiTsubiStatus === "開通済") return "開通済";
  if (d.netKaiTsubiKakutei === "未定") return "未定";
  return d.netKaiTsubiMode === "text" ? (d.netKaiTsubiText || "") : formatDate(d.netKaiTsubiDate);
};

const getOpenDateLabel = d => {
  if (!d.openStatus) return "";
  if (d.openStatus === "営業中") return "営業中";
  // "新規開業・出店"
  const dateStr = d.openMode === "text" ? (d.openText || "") : formatDate(d.openDate);
  return dateStr ? `新規開業・出店（${dateStr}）` : "新規開業・出店";
};

const calcMonthly = d => {
  let total = PACKAGE_BASE[d.package] || 0;
  total += CONCIERGE_PRICE[d.package]?.[d.conciergeCount] ?? 0;
  OPTIONS_LIST.forEach(opt => {
    if ((d.options || []).includes(opt.key)) {
      total += opt.key === "cti" ? (CTI_PRICE[d.package] || 0) : opt.price;
    }
  });
  if (d.lanEnabled) total += LAN_PRICE * (d.lanCount || 1);
  return total;
};

const calcWanMonthly = d => {
  let total = WAN_HONBU_BASE;
  if (d.wanLanEnabled) total += LAN_PRICE * (d.wanLanCount || 1);
  const cIdx = WAN_CONCIERGE_MANAGER_OPTIONS.indexOf(d.wanConciergeManager);
  if (cIdx > 0) total += cIdx * WAN_CONCIERGE_MANAGER_PRICE;
  if (d.wanShozai) total += 1000;
  return total;
};

const pdfFileName = (name, typeLabel) => {
  const safe = (name || "名称未設定").replace(/[\\/:*?"<>|]/g, "_");
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  return `${safe}_LinQ2サービス申込書_${typeLabel}_${ds}.pdf`;
};

const getTabLabel = (tab, index, allTabs) => {
  if (!tab.type) return `申込書 ${index + 1}`;
  const d = tab.data || {};
  if (tab.type === "新規_単店" || tab.type === "新規_店舗追加") {
    return d.tenpoName ? `${d.tenpoName} - 新規申込` : "新規申込";
  }
  if (tab.type === "端末入替") {
    return d.tenpoName ? `${d.tenpoName} - 端末入替` : "端末入替（変更なし）";
  }
  if (tab.type === "端末入替_変更あり") {
    return d.tenpoName ? `${d.tenpoName} - 端末入替（変更あり）` : "端末入替（変更あり）";
  }
  if (tab.type === "契約変更") {
    return d.tenpoName ? `${d.tenpoName} - 契約変更` : "契約変更";
  }
  if (tab.type === "全解約") {
    return d.tenpoName ? `${d.tenpoName} - 全解約` : "全解約";
  }
  if (tab.type === "新規_事務所WAN本部") {
    return "事務所WAN本部";
  }
  if (tab.type === "新規_フロントWAN本部_既存店") {
    return d.kizonTenpoName ? `フロントWAN本部（${d.kizonTenpoName}）` : "フロントWAN本部";
  }
  if (tab.type === "新規_フロントWAN本部_新規店") {
    const linked = (allTabs || []).find(t => t.id === d.linkedTabId);
    const name = linked?.data?.tenpoName || "";
    return name ? `フロントWAN本部（${name}）` : "フロントWAN本部";
  }
  return TYPE_LABEL[tab.type] || tab.type;
};

// ==================== localStorage ====================
const saveMyInfo  = info  => { try { localStorage.setItem(MY_INFO_KEY,  JSON.stringify(info));           } catch(_){} };
const loadMyInfo  = ()    => { try { const s = localStorage.getItem(MY_INFO_KEY);  return s ? JSON.parse(s) : null; } catch(_){ return null; } };
const saveDraft   = (form, step) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step, savedAt: new Date().toISOString() })); } catch(_){} };
const loadDraft   = ()    => { try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch(_){ return null; } };
const clearDraft  = ()    => { try { localStorage.removeItem(STORAGE_KEY);        } catch(_){} };

// ==================== カスタムフック ====================
const useFurigana = (getKana, setKana) => {
  const baseRef = useRef(""), readRef = useRef("");
  return {
    onCompositionStart: ()  => { baseRef.current = getKana(); readRef.current = ""; },
    onCompositionUpdate: e  => { if (isHiragana(e.data||"")) { readRef.current = e.data||""; setKana(baseRef.current + toKatakana(readRef.current)); } },
    onCompositionEnd:    ()  => { if (readRef.current) setKana(baseRef.current + toKatakana(readRef.current)); readRef.current = ""; },
  };
};

const useZipLookup = (onResult, addressInputId) => {
  const [loading, setLoading] = useState(false);
  const [zipError, setZipError] = useState(false);
  const lookup = async (zip) => {
    if (zip.length !== 7) return;
    setLoading(true); setZipError(false);
    try {
      const res  = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
      const data = await res.json();
      if (data.results) { const r = data.results[0]; onResult(r.address1+r.address2+r.address3); setTimeout(() => document.getElementById(addressInputId)?.focus(), 100); }
      else { setZipError(true); }
    } catch { setZipError(true); }
    setLoading(false);
  };
  return { loading, zipError, lookup };
};

// ==================== UIコンポーネント ====================
const inputBase = (hasError, disabled) => ({
  width: "100%", padding: "9px 12px",
  border: `1.5px solid ${hasError ? C.danger : C.border}`,
  borderRadius: 8, fontSize: 14,
  color: disabled ? C.muted : C.text, outline: "none",
  background: disabled ? "#f0f2f5" : hasError ? "#fff5f5" : C.white,
  fontFamily: FONT, transition: "border-color .15s, background .15s",
  boxSizing: "border-box", cursor: disabled ? "not-allowed" : "text",
});

const UIInput = forwardRef(({ style, hasError, onlyNum, numHyphen, noZenkaku, onlyKatakana, disabled, onChange, ...props }, ref) => {
  const handleChange = e => {
    let v = e.target.value;
    if (onlyNum)       v = v.replace(/[^0-9]/g, "");
    if (numHyphen)     v = v.replace(/[^0-9\-]/g, "");
    if (noZenkaku)     v = v.replace(/[^\x00-\x7F]/g, "");
    if (onlyKatakana && !e.nativeEvent?.isComposing) v = v.replace(/[^\u30A0-\u30FF\uFF65-\uFF9F\u3000 　ー（）]/g, "");
    e.target.value = v;
    onChange && onChange(e);
  };
  const handleCompositionEnd = (e) => {
    if (onlyKatakana) {
      let v = e.target.value.replace(/[^\u30A0-\u30FF\uFF65-\uFF9F\u3000 　ー（）]/g, "");
      e.target.value = v;
      onChange && onChange(e);
    }
  };
  return (
    <input ref={ref} style={{ ...inputBase(hasError, disabled), ...style }} disabled={disabled}
      onFocus={e => { if (!disabled) e.target.style.borderColor = C.borderFocus; }}
      onBlur={e  => { if (!disabled) e.target.style.borderColor = hasError ? C.danger : C.border; }}
      onChange={handleChange} onCompositionEnd={handleCompositionEnd} {...props} />
  );
});

const UISelect = ({ children, style, ...props }) => (
  <select style={{ ...inputBase(false, false), cursor: "pointer", ...style }} {...props}>{children}</select>
);

const UITextarea = ({ style, hasError, ...props }) => (
  <textarea
    style={{ ...inputBase(hasError, false), resize: "vertical", minHeight: 68, lineHeight: 1.6, ...style }}
    onFocus={e => e.target.style.borderColor = C.borderFocus}
    onBlur={e  => e.target.style.borderColor = hasError ? C.danger : C.border}
    {...props} />
);

const Field = ({ label, required, hint, children, half, error }) => (
  <div style={{ marginBottom: 14, flex: half ? "0 0 calc(50% - 6px)" : undefined }}>
    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: error ? C.danger : C.muted, marginBottom: 5, letterSpacing: ".02em" }}>
      {label}{required && <span style={{ color: C.danger, marginLeft: 3 }}>*</span>}
    </label>
    {children}
    {error && <p style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {error}</p>}
    {!error && hint && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{hint}</p>}
  </div>
);

const FieldRow = ({ children }) => <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{children}</div>;

const Card = ({ children, style }) => (
  <div style={{ background: C.white, borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,.07),0 4px 16px rgba(0,0,0,.05)", padding: "22px 24px", marginBottom: 20, ...style }}>
    {children}
  </div>
);

const SecTitle = ({ icon, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18, paddingBottom: 12, borderBottom: `2px solid ${C.border}` }}>
    <span style={{ fontSize: 17 }}>{icon}</span>
    <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{children}</h3>
  </div>
);

const Btn = ({ children, onClick, disabled, variant = "primary", style }) => {
  const variants = {
    primary:   { background: disabled ? "#cbd5e1" : C.teal, color: "#fff" },
    secondary: { background: C.white, color: C.muted, border: `1.5px solid ${C.border}` },
    navy:      { background: C.navy, color: "#fff" },
  };
  return (
    <button style={{ padding: "11px 24px", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", transition: "opacity .15s", fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 6, ...variants[variant], ...style }}
      onClick={!disabled ? onClick : undefined} disabled={disabled}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = ".85"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
      {children}
    </button>
  );
};

const NameFields = ({ seiValue, meiValue, seiKana, meiKana, onSeiChange, onMeiChange, onSeiKanaChange, onMeiKanaChange, labelSei, labelMei, labelSeiKana="フリガナ（セイ）", labelMeiKana="フリガナ（メイ）", placeholderSei="例：山田", placeholderMei="例：太郎", placeholderSeiKana="例：ヤマダ", placeholderMeiKana="例：タロウ", required, errors={}, keyKanji_sei, keyKanji_mei, keyKana_sei, keyKana_mei }) => {
  const seiFg = useFurigana(() => seiKana, v => onSeiKanaChange(v));
  const meiFg = useFurigana(() => meiKana, v => onMeiKanaChange(v));
  return (<>
    <FieldRow>
      <Field label={labelSei} required={required} half error={errors[keyKanji_sei]}>
        <UIInput value={seiValue} hasError={!!errors[keyKanji_sei]} onChange={e => { onSeiChange(e.target.value); if (!e.target.value) onSeiKanaChange(""); }} placeholder={placeholderSei} {...seiFg} />
      </Field>
      <Field label={labelMei} required={required} half error={errors[keyKanji_mei]}>
        <UIInput value={meiValue} hasError={!!errors[keyKanji_mei]} onChange={e => { onMeiChange(e.target.value); if (!e.target.value) onMeiKanaChange(""); }} placeholder={placeholderMei} {...meiFg} />
      </Field>
    </FieldRow>
    <FieldRow>
      <Field label={labelSeiKana} required={required} half error={errors[keyKana_sei]}>
        <UIInput value={seiKana} hasError={!!errors[keyKana_sei]} onlyKatakana onChange={e => onSeiKanaChange(e.target.value)} placeholder={placeholderSeiKana} />
      </Field>
      <Field label={labelMeiKana} required={required} half error={errors[keyKana_mei]}>
        <UIInput value={meiKana} hasError={!!errors[keyKana_mei]} onlyKatakana onChange={e => onMeiKanaChange(e.target.value)} placeholder={placeholderMeiKana} />
      </Field>
    </FieldRow>
  </>);
};

const ZipField = ({ value, onChange, onAddressFound, addressInputId, required, errors={}, fieldKey, clearError, disabled }) => {
  const { loading, zipError, lookup } = useZipLookup(onAddressFound, addressInputId);
  return (
    <Field label="郵便番号" required={required} hint={!errors[fieldKey] ? "7桁の数字を入力すると住所が自動入力されます" : undefined} error={errors[fieldKey]}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <UIInput value={value} onlyNum maxLength={7} style={{ maxWidth: 180 }} hasError={!!errors[fieldKey]} disabled={disabled}
          onChange={e => { onChange(e.target.value); clearError?.(fieldKey); if (e.target.value.length === 7) lookup(e.target.value); }}
          placeholder="1234567" />
        {loading  && <span style={{ fontSize: 12, color: C.muted  }}>検索中...</span>}
        {zipError && <span style={{ fontSize: 12, color: C.danger }}>見つかりません</span>}
      </div>
    </Field>
  );
};

// ==================== ステップインジケーター ====================
const STEPS = ["基本情報", "申込書作成", "PDF出力"];
const STEP_TITLES = [
  { title: "STEP 1　契約者情報",   sub: "申込みを行う契約者の情報を入力してください" },
  { title: "STEP 2　申込書作成",   sub: "申込書を追加しながら入力してください。複数種別の混在も可能です" },
  { title: "STEP 3　PDF出力",      sub: "内容を確認してPDFを出力してください" },
];

const StepIndicator = ({ current }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", marginBottom: 32 }}>
    {STEPS.map((label, i) => {
      const n = i+1, done = n < current, active = n === current;
      return (
        <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: done ? C.stepDone : active ? C.teal : "#dde4ef", color: (done||active) ? "#fff" : "#9aaab9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, transition: "all .3s", boxShadow: active ? `0 0 0 4px ${C.tealLight}` : "none" }}>
              {done ? "✓" : n}
            </div>
            <span style={{ fontSize: 11, color: active ? C.teal : done ? C.stepDone : "#9aaab9", fontWeight: (active||done) ? 700 : 400, whiteSpace: "nowrap" }}>{label}</span>
          </div>
          {i < STEPS.length-1 && <div style={{ width: 64, height: 2, background: done ? C.stepDone : "#dde4ef", margin: "16px 8px 0", transition: "background .3s" }} />}
        </div>
      );
    })}
  </div>
);

// ==================== バリデーション（STEP1） ====================
const validateStep1 = (form) => {
  const e = {};
  if (!form.eigyosho?.trim())  e.eigyosho  = "入力してください";
  if (!form.tantosha?.trim())  e.tantosha  = "入力してください";
  if (!form.shainBango?.trim()) e.shainBango = "入力してください";
  if (!form.moushikomiBi)      e.moushikomiBi = "選択してください";
  if (!form.keiyakuType)       e.keiyakuType  = "選択してください";
  if (form.keiyakuType === "hojin") {
    if (!form.hojinName?.trim())           e.hojinName           = "入力してください";
    if (!form.hojinNameKana?.trim())       e.hojinNameKana       = "入力してください";
    if (!form.hojinDaihyo_sei?.trim())     e.hojinDaihyo_sei     = "入力してください";
    if (!form.hojinDaihyo_mei?.trim())     e.hojinDaihyo_mei     = "入力してください";
    if (!form.hojinDaihyo_sei_kana?.trim())e.hojinDaihyo_sei_kana= "入力してください";
    if (!form.hojinDaihyo_mei_kana?.trim())e.hojinDaihyo_mei_kana= "入力してください";
  } else if (form.keiyakuType === "kojin") {
    if (!form.kojin_sei?.trim())     e.kojin_sei     = "入力してください";
    if (!form.kojin_mei?.trim())     e.kojin_mei     = "入力してください";
    if (!form.kojin_sei_kana?.trim())e.kojin_sei_kana= "入力してください";
    if (!form.kojin_mei_kana?.trim())e.kojin_mei_kana= "入力してください";
  }
  if (!form.yubinBango) e.yubinBango = "入力してください";
  if (!form.jusho)      e.jusho      = "入力してください";
  if (!form.jusho2?.trim()) e.jusho2 = "番地・建物名以降を入力してください";
  if (!form.denwa)      e.denwa      = "入力してください";
  if (!form.mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.mail)) e.mail = "正しいメールアドレスを入力してください";
  return e;
};

// ==================== バリデーション（STEP2） ====================
const validateStep2 = (tabs) => {
  const tabErrors = {};
  tabs.forEach(tab => {
    if (!tab.type) return;
    const d = tab.data || {};
    const e = {};
    if (tab.type === "新規_単店" || tab.type === "新規_店舗追加") {
      const isTenpoAdd = tab.type === "新規_店舗追加";
      // 店舗情報
      if (!d.tenpoName?.trim())    e.tenpoName    = "入力してください";
      if (!d.tenpoNameKana?.trim())e.tenpoNameKana= "入力してください";
      if (!d.yubinBango)           e.yubinBango   = "入力してください";
      if (!d.jusho)                e.jusho        = "入力してください";
      if (!d.jusho2?.trim())       e.jusho2       = "入力してください";
      if (!d.denwa)                e.denwa        = "入力してください";
      // LinQ2メール
      if (!d.linq2MailPrefix?.trim()) e.linq2MailPrefix = "入力してください";
      // 納品データ
      if (!d.nohinData?.length)    e.nohinData    = "1つ以上選択してください";
      // POSⅡ引取
      if ((d.nohinData||[]).includes("pos2")) {
        if (!d.pos2Hikitori)       e.pos2Hikitori = "選択してください";
        if (d.pos2Hikitori==="あり" && !d.pos2HikitoriKiki?.length) e.pos2HikitoriKiki = "1つ以上選択してください";
        if (d.pos2Hikitori==="あり" && (d.pos2HikitoriKiki||[]).includes("その他") && !d.pos2HikitoriSonota?.trim()) e.pos2HikitoriSonota = "入力してください";
      }
      // 系列店コピー
      if (isTenpoAdd && (d.nohinData||[]).includes("keirestore")) {
        if (!d.keireistenName?.trim()) e.keireistenName = "入力してください";
        if (!d.keireistenDenwa)        e.keireistenDenwa = "入力してください";
      }
      // レシートロゴ
      if (!d.receiptoLogo)         e.receiptoLogo = "選択してください";
      // パッケージ
      if (!d.package)              e.package      = "選択してください";
      // Concierge台数（必須）
      if (d.package && !d.conciergeCount) e.conciergeCount = "選択してください";
      // Concierge台数（6〜10台・11〜20台・台数フリー選択時）
      if (["6〜10台","11〜20台","台数フリー"].includes(d.conciergeCount)) {
        if (!d.conciergeActualCount) {
          e.conciergeActualCount = "台数を選択・入力してください";
        } else if (d.conciergeCount === "台数フリー") {
          const n = Number(d.conciergeActualCount);
          if (isNaN(n) || n < 21 || n > 100) e.conciergeActualCount = "21以上100以下の整数を入力してください";
        }
      }
      // 月額支払い（店舗追加のみ）
      if (isTenpoAdd) {
        if (!d.shiharaiHoho)       e.shiharaiHoho = "選択してください";
        if (d.shiharaiHoho==="既存口座で支払う") {
          if (!d.kizonTenpoName?.trim()) e.kizonTenpoName = "入力してください";
          if (!d.kizonTenpoDenwa)        e.kizonTenpoDenwa = "入力してください";
        }
      }
      // 日程調整
      if (!d.nicchoseiSaki)        e.nicchoseiSaki = "選択してください";
      if (!d.nicchoseiTantosha?.trim()) e.nicchoseiTantosha = "入力してください";
      if (!d.nicchoseiTantoshaKana?.trim()) e.nicchoseiTantoshaKana = "入力してください";
      if (!d.nicchoseiDenwa)       e.nicchoseiDenwa = "入力してください";
      if (!d.netKaiTsubiStatus)    e.netKaiTsubiStatus = "選択してください";
      if (!d.openStatus)           e.openStatus   = "選択してください";
      if (!d.setsuzokoHoho)        e.setsuzokoHoho= "選択してください";
      if (!d.chosaDate?.trim())    e.chosaDate    = "入力してください";
      if (!d.donguDate?.trim())    e.donguDate    = "入力してください";
    }
    if (tab.type === "新規_フロントWAN本部_既存店") {
      if (!d.honbuName?.trim())     e.honbuName     = "入力してください";
      if (!d.honbuNameKana?.trim()) e.honbuNameKana = "入力してください";
      if (!d.yubinBango)            e.yubinBango    = "入力してください";
      if (!d.jusho)                 e.jusho         = "入力してください";
      if (!d.jusho2?.trim())        e.jusho2        = "入力してください";
      if (!d.denwa)                 e.denwa         = "入力してください";
      if (!d.linq2MailNotUse && !d.linq2MailPrefix?.trim()) e.linq2MailPrefix = "入力してください";
      if (!d.kizonTenpoName?.trim())    e.kizonTenpoName        = "入力してください";
      if (!d.kizonTenpoDenwa)           e.kizonTenpoDenwa       = "入力してください";
      if (!d.nicchoseiSaki)             e.nicchoseiSaki         = "選択してください";
      if (!d.nicchoseiTantosha?.trim()) e.nicchoseiTantosha     = "入力してください";
      if (!d.nicchoseiTantoshaKana?.trim()) e.nicchoseiTantoshaKana = "入力してください";
      if (!d.nicchoseiDenwa)            e.nicchoseiDenwa        = "入力してください";
      if (!d.nohinhopoBijitsu?.trim())  e.nohinhopoBijitsu      = "入力してください";
    }
    if (tab.type === "新規_フロントWAN本部_新規店") {
      if (!d.honbuName?.trim())     e.honbuName     = "入力してください";
      if (!d.honbuNameKana?.trim()) e.honbuNameKana = "入力してください";
      const linkedExists = d.linkedTabId && tabs.some(t => t.id === d.linkedTabId);
      if (!linkedExists)            e.linkedTabId   = "店舗を選択してください";
      if (!d.linq2MailNotUse && !d.linq2MailPrefix?.trim()) e.linq2MailPrefix = "入力してください";
    }
    if (tab.type === "新規_事務所WAN本部") {
      if (!d.honbuName?.trim())     e.honbuName     = "入力してください";
      if (!d.honbuNameKana?.trim()) e.honbuNameKana = "入力してください";
      if (!d.yubinBango)            e.yubinBango    = "入力してください";
      if (!d.jusho)                 e.jusho         = "入力してください";
      if (!d.jusho2?.trim())        e.jusho2        = "入力してください";
      if (!d.denwa)                 e.denwa         = "入力してください";
      if (!d.linq2MailNotUse && !d.linq2MailPrefix?.trim()) e.linq2MailPrefix = "入力してください";
      if (!d.nicchoseiSaki)             e.nicchoseiSaki         = "選択してください";
      if (!d.nicchoseiTantosha?.trim()) e.nicchoseiTantosha     = "入力してください";
      if (!d.nicchoseiTantoshaKana?.trim()) e.nicchoseiTantoshaKana = "入力してください";
      if (!d.nicchoseiDenwa)            e.nicchoseiDenwa        = "入力してください";
      if (!d.netKaiTsubiStatus)         e.netKaiTsubiStatus     = "選択してください";
      if (!d.setsuzokoHoho)             e.setsuzokoHoho         = "選択してください";
      if (!d.chosaDate?.trim())         e.chosaDate             = "入力してください";
      if (!d.donguDate?.trim())         e.donguDate             = "入力してください";
    }
    if (tab.type === "端末入替") {
      // 店舗情報
      if (!d.tenpoName?.trim())     e.tenpoName     = "入力してください";
      if (!d.tenpoNameKana?.trim()) e.tenpoNameKana = "入力してください";
      if (!d.yubinBango)            e.yubinBango    = "入力してください";
      if (!d.jusho)                 e.jusho         = "入力してください";
      if (!d.jusho2?.trim())        e.jusho2        = "入力してください";
      if (!d.denwa)                 e.denwa         = "入力してください";
      // 機器引取
      if (!d.kikiHikitori)                e.kikiHikitori  = "選択してください";
      if (d.kikiHikitori === "あり" && !d.hikitoriKiki?.length) e.hikitoriKiki = "1つ以上選択してください";
      if (d.kikiHikitori === "あり" && (d.hikitoriKiki||[]).includes("その他") && !d.hikitoriSonota?.trim()) e.hikitoriSonota = "入力してください";
      // 日程調整
      if (!d.nicchoseiSaki)             e.nicchoseiSaki         = "選択してください";
      if (!d.nicchoseiTantosha?.trim()) e.nicchoseiTantosha     = "入力してください";
      if (!d.nicchoseiTantoshaKana?.trim()) e.nicchoseiTantoshaKana = "入力してください";
      if (!d.nicchoseiDenwa)            e.nicchoseiDenwa        = "入力してください";
      if (d.jizenchoosa && !d.chosaDate?.trim()) e.chosaDate   = "入力してください";
      if (!d.nohinhopoBijitsu?.trim())  e.nohinhopoBijitsu      = "入力してください";
    }
    if (tab.type === "端末入替_変更あり") {
      // 店舗情報
      if (!d.tenpoName?.trim())     e.tenpoName     = "入力してください";
      if (!d.tenpoNameKana?.trim()) e.tenpoNameKana = "入力してください";
      if (!d.yubinBango)            e.yubinBango    = "入力してください";
      if (!d.jusho)                 e.jusho         = "入力してください";
      if (!d.jusho2?.trim())        e.jusho2        = "入力してください";
      if (!d.denwa)                 e.denwa         = "入力してください";
      // 機器引取
      if (!d.kikiHikitori)                e.kikiHikitori  = "選択してください";
      if (d.kikiHikitori === "あり" && !d.hikitoriKiki?.length) e.hikitoriKiki = "1つ以上選択してください";
      if (d.kikiHikitori === "あり" && (d.hikitoriKiki||[]).includes("その他") && !d.hikitoriSonota?.trim()) e.hikitoriSonota = "入力してください";
      // サービス選択
      if (!d.package)               e.package       = "選択してください";
      if (d.package && !d.concierge) e.concierge    = "選択してください";
      if (CONCIERGE_NEEDS_ACTUAL.includes(d.concierge) && !d.conciergeActual?.trim()) e.conciergeActual = "入力してください";
      if (d.ctiChecked && (d.ctiKeizoCount||0)===0 && (d.ctiAddCount||0)===0) e.ctiCount = "継続台数か追加台数を1台以上入力してください";
      if (d.lanChecked && (d.lanKeizoCount||0)===0 && (d.lanAddCount||0)===0) e.lanCount = "継続台数か追加台数を1台以上入力してください";
      // 日程調整（常時必須）
      if (!d.nicchoseiSaki)                 e.nicchoseiSaki         = "選択してください";
      if (!d.nicchoseiTantosha?.trim())     e.nicchoseiTantosha     = "入力してください";
      if (!d.nicchoseiTantoshaKana?.trim()) e.nicchoseiTantoshaKana = "入力してください";
      if (!d.nicchoseiDenwa)                e.nicchoseiDenwa        = "入力してください";
      if (d.jizenchoosa && !d.chosaDate?.trim()) e.chosaDate        = "入力してください";
      if (!d.nohinhopoBijitsu?.trim())      e.nohinhopoBijitsu      = "入力してください";
    }
    if (tab.type === "契約変更") {
      // 申込種別
      const mb = d.moushikomiBetsu || {};
      if (!mb.packageChange && !mb.optionAdd && !mb.optionCancel)
        e._moushikomiBetsu = "申込種別を1つ以上選択してください";
      // 店舗情報
      if (!d.tenpoName?.trim())     e.tenpoName     = "入力してください";
      if (!d.tenpoNameKana?.trim()) e.tenpoNameKana = "入力してください";
      if (!d.yubinBango)            e.yubinBango    = "入力してください";
      if (!d.jusho)                 e.jusho         = "入力してください";
      if (!d.jusho2?.trim())        e.jusho2        = "入力してください";
      if (!d.denwa)                 e.denwa         = "入力してください";
      // パッケージ・コンシェルジュ
      if (!d.package)               e.package       = "選択してください";
      if (d.package && !d.concierge) e.concierge    = "選択してください";
      if (CONCIERGE_NEEDS_ACTUAL.includes(d.concierge) && !d.conciergeActual?.trim())
        e.conciergeActual = "入力してください";
      // 設置者・状態
      if (d.ctiChecked && (d.ctiKeizoCount || 0) === 0 && (d.ctiAddCount || 0) === 0) e.ctiCount = "継続台数か追加台数を1台以上入力してください";
      if (d.ctiChecked && (d.ctiAddCount || 0) > 0 && !d.ctiSetsuchiSha) e.ctiSetsuchiSha = "選択してください";
      if (d.lanChecked && (d.lanKeizoCount || 0) === 0 && (d.lanAddCount || 0) === 0) e.lanCount = "継続台数か追加台数を1台以上入力してください";
      if (d.lanChecked && (d.lanAddCount || 0) > 0 && !d.lanSetsuchiSha) e.lanSetsuchiSha = "選択してください";
      // 日程調整 or 変更希望日
      const needsVisit = (d.ctiChecked && (d.ctiAddCount || 0) > 0) || (d.lanChecked && (d.lanAddCount || 0) > 0);
      if (needsVisit) {
        if (!d.nicchoseiSaki)                 e.nicchoseiSaki         = "選択してください";
        if (!d.nicchoseiTantosha?.trim())     e.nicchoseiTantosha     = "入力してください";
        if (!d.nicchoseiTantoshaKana?.trim()) e.nicchoseiTantoshaKana = "入力してください";
        if (!d.nicchoseiDenwa)                e.nicchoseiDenwa        = "入力してください";
        if (d.jizenchoosa && !d.chosaDate?.trim()) e.chosaDate        = "入力してください";
        if (!d.donguDate?.trim())             e.donguDate             = "入力してください";
      } else {
        if (!d.henkoKiboDate?.trim())         e.henkoKiboDate         = "入力してください";
      }
    }
    if (tab.type === "全解約") {
      if (!d.tenpoName?.trim())       e.tenpoName       = "入力してください";
      if (!d.tenpoNameKana?.trim())   e.tenpoNameKana   = "入力してください";
      if (!d.yubinBango)              e.yubinBango      = "入力してください";
      if (!d.jusho)                   e.jusho           = "入力してください";
      if (!d.jusho2?.trim())          e.jusho2          = "入力してください";
      if (!d.denwa)                   e.denwa           = "入力してください";
      if (!d.kaiyakuKiboDate?.trim()) e.kaiyakuKiboDate = "入力してください";
    }
    if (Object.keys(e).length > 0) tabErrors[tab.id] = e;
  });
  return tabErrors;
};

// ==================== STEP1 ====================
const Step1 = ({ form, setForm, errors, setErrors }) => {
  const upd    = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const clr    = (k)    => setErrors(e => { const n={...e}; delete n[k]; return n; });
  const updClr = (k, v) => { upd(k, v); clr(k); };

  const [myInfo, setMyInfo] = useState(() => loadMyInfo());
  const [editing, setEditing] = useState(false);

  const tantoshaFg = useFurigana(() => form.tantoshaKana||"", v => upd("tantoshaKana", v));

  const isDiffFromMyInfo = myInfo && (
    form.eigyosho !== myInfo.eigyosho || form.tantosha !== myInfo.tantosha ||
    form.shainBango !== myInfo.shainBango ||
    (form.tantoshaKana||"") !== (myInfo.tantoshaKana||"") ||
    (form.tantoshaDenwa||"") !== (myInfo.tantoshaDenwa||"")
  );

  const currentMyInfo = () => ({ eigyosho: form.eigyosho, tantosha: form.tantosha, shainBango: form.shainBango, tantoshaKana: form.tantoshaKana||"", tantoshaDenwa: form.tantoshaDenwa||"" });

  const handleSaveMyInfo = () => { saveMyInfo(currentMyInfo()); setMyInfo(currentMyInfo()); setEditing(false); };

  return (<>
    {/* 営業担当者情報 */}
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 12, borderBottom: `2px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 17 }}>👤</span>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>営業担当者情報</h3>
        </div>
        {myInfo && !editing && (
          <button onClick={() => setEditing(true)} style={{ fontSize: 12, fontWeight: 600, color: C.muted, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: FONT }}>
            ⚙️ マイ情報を編集
          </button>
        )}
      </div>
      {myInfo && !editing && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: "#166534", marginBottom: 14 }}>
          ✅ マイ情報から自動入力されました。変更するには「⚙️ マイ情報を編集」を押してください。
        </div>
      )}
      <FieldRow>
        <Field label="営業所" required half error={errors.eigyosho}>
          <UIInput value={form.eigyosho} hasError={!!errors.eigyosho} disabled={!!myInfo&&!editing} onChange={e => updClr("eigyosho", e.target.value)} placeholder="例：東京営業所" />
        </Field>
        <Field label="社員番号" required half hint={!errors.shainBango ? "数字のみ" : undefined} error={errors.shainBango}>
          <UIInput value={form.shainBango} hasError={!!errors.shainBango} onlyNum maxLength={10} disabled={!!myInfo&&!editing} onChange={e => updClr("shainBango", e.target.value)} placeholder="例：12345" />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="担当者名" required half error={errors.tantosha}>
          <UIInput value={form.tantosha} hasError={!!errors.tantosha} disabled={!!myInfo&&!editing} onChange={e => { updClr("tantosha", e.target.value); if (!e.target.value) upd("tantoshaKana",""); }} placeholder="例：山田 太郎" {...tantoshaFg} />
        </Field>
        <Field label="担当者名フリガナ" half hint={!editing&&myInfo ? undefined : "手動入力（カタカナ）"}>
          <UIInput value={form.tantoshaKana||""} disabled={!!myInfo&&!editing} onlyKatakana onChange={e => upd("tantoshaKana", e.target.value)} placeholder="例：ヤマダ タロウ" />
        </Field>
      </FieldRow>
      <Field label="担当者電話番号" hint={!editing&&myInfo ? undefined : "ハイフンあり・なしどちらでも可"}>
        <UIInput value={form.tantoshaDenwa||""} numHyphen disabled={!!myInfo&&!editing} onChange={e => upd("tantoshaDenwa", e.target.value)} placeholder="例：090-1234-5678" style={{ maxWidth: 260 }} />
      </Field>
      {editing && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <Btn variant="primary" onClick={handleSaveMyInfo} style={{ fontSize: 13, padding: "7px 18px" }}>💾 マイ情報を保存する</Btn>
          <Btn variant="secondary" onClick={() => { setEditing(false); setForm(f => ({ ...f, eigyosho: myInfo.eigyosho, tantosha: myInfo.tantosha, shainBango: myInfo.shainBango, tantoshaKana: myInfo.tantoshaKana||"", tantoshaDenwa: myInfo.tantoshaDenwa||"" })); }} style={{ fontSize: 13, padding: "7px 18px" }}>キャンセル</Btn>
        </div>
      )}
      {!myInfo && (form.eigyosho||form.tantosha||form.shainBango) && (
        <p style={{ marginTop: 8, fontSize: 12.5, color: C.muted }}>※「次へ」を押すと営業担当者情報を保存するか確認します</p>
      )}
      {myInfo && !editing && isDiffFromMyInfo && (
        <div style={{ marginTop: 8 }}>
          <Btn variant="secondary" onClick={() => { saveMyInfo(currentMyInfo()); setMyInfo(currentMyInfo()); }} style={{ fontSize: 12, padding: "5px 14px" }}>💾 マイ情報を更新する</Btn>
        </div>
      )}
    </Card>

    {/* 申込日 */}
    <Card>
      <SecTitle icon="📅">申込日</SecTitle>
      <Field label="申込日" required error={errors.moushikomiBi}>
        <UIInput type="date" value={form.moushikomiBi} hasError={!!errors.moushikomiBi} onChange={e => updClr("moushikomiBi", e.target.value)} style={{ maxWidth: 200 }} />
      </Field>
    </Card>

    {/* 契約者情報 */}
    <Card>
      <SecTitle icon="🏢">契約者情報</SecTitle>
      <Field label="契約種別" required error={errors.keiyakuType}>
        <div style={{ display: "flex", gap: 12 }}>
          {[["hojin","法人契約"],["kojin","個人契約"]].map(([type, label]) => (
            <label key={type} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${form.keiyakuType===type ? C.teal : errors.keiyakuType ? C.danger : C.border}`, background: form.keiyakuType===type ? C.tealLight : errors.keiyakuType ? "#fff5f5" : C.white, fontSize: 13.5, fontWeight: form.keiyakuType===type ? 700 : 400 }}>
              <input type="radio" name="keiyakuType" value={type} checked={form.keiyakuType===type} onChange={() => { upd("keiyakuType",type); clr("keiyakuType"); }} />
              {label}
            </label>
          ))}
        </div>
        {!form.keiyakuType && <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>契約種別を選択すると入力項目が表示されます</p>}
      </Field>

      {form.keiyakuType === "hojin" && (<>
        <Field label="法人名" required error={errors.hojinName}><UIInput value={form.hojinName} hasError={!!errors.hojinName} onChange={e => updClr("hojinName", e.target.value)} placeholder="例：株式会社〇〇サロン" /></Field>
        <Field label="法人名フリガナ" required hint={!errors.hojinNameKana ? "手動入力（カタカナ）" : undefined} error={errors.hojinNameKana}><UIInput value={form.hojinNameKana} hasError={!!errors.hojinNameKana} onlyKatakana onChange={e => updClr("hojinNameKana", e.target.value)} placeholder="例：カブシキガイシャ マルマルサロン" /></Field>
        <NameFields seiValue={form.hojinDaihyo_sei} meiValue={form.hojinDaihyo_mei} seiKana={form.hojinDaihyo_sei_kana} meiKana={form.hojinDaihyo_mei_kana} onSeiChange={v => updClr("hojinDaihyo_sei",v)} onMeiChange={v => updClr("hojinDaihyo_mei",v)} onSeiKanaChange={v => updClr("hojinDaihyo_sei_kana",v)} onMeiKanaChange={v => updClr("hojinDaihyo_mei_kana",v)} labelSei="法人代表者名（姓）" labelMei="法人代表者名（名）" placeholderSei="例：山田" placeholderMei="例：太郎" placeholderSeiKana="例：ヤマダ" placeholderMeiKana="例：タロウ" required errors={errors} keyKanji_sei="hojinDaihyo_sei" keyKanji_mei="hojinDaihyo_mei" keyKana_sei="hojinDaihyo_sei_kana" keyKana_mei="hojinDaihyo_mei_kana" />
      </>)}
      {form.keiyakuType === "kojin" && (
        <NameFields seiValue={form.kojin_sei} meiValue={form.kojin_mei} seiKana={form.kojin_sei_kana} meiKana={form.kojin_mei_kana} onSeiChange={v => updClr("kojin_sei",v)} onMeiChange={v => updClr("kojin_mei",v)} onSeiKanaChange={v => updClr("kojin_sei_kana",v)} onMeiKanaChange={v => updClr("kojin_mei_kana",v)} labelSei="個人事業主名（姓）" labelMei="個人事業主名（名）" placeholderSei="例：山田" placeholderMei="例：花子" placeholderSeiKana="例：ヤマダ" placeholderMeiKana="例：ハナコ" required errors={errors} keyKanji_sei="kojin_sei" keyKanji_mei="kojin_mei" keyKana_sei="kojin_sei_kana" keyKana_mei="kojin_mei_kana" />
      )}

      <ZipField value={form.yubinBango} onChange={v => upd("yubinBango",v)} onAddressFound={addr => { upd("jusho",addr); clr("jusho"); }} addressInputId="step1-jusho2" required errors={errors} fieldKey="yubinBango" clearError={clr} />
      <Field label={form.keiyakuType==="hojin" ? "法人登記上住所（自動入力）" : form.keiyakuType==="kojin" ? "個人事業主自宅住所（自動入力）" : "住所（自動入力）"} error={errors.jusho}>
        <UIInput value={form.jusho} hasError={!!errors.jusho} disabled={!form.jusho} style={{ background: form.jusho ? "#f0f4f8" : undefined, color: C.muted }} onChange={e => updClr("jusho", e.target.value)} placeholder="郵便番号を入力すると自動入力されます" />
      </Field>
      <Field label="番地・建物名以降" required hint={!errors.jusho2 ? "例：1-2-3　〇〇マンション101号室" : undefined} error={errors.jusho2}>
        <UIInput id="step1-jusho2" value={form.jusho2} hasError={!!errors.jusho2} onChange={e => updClr("jusho2", e.target.value)} placeholder="例：1-2-3　〇〇マンション101号室" />
      </Field>
      <FieldRow>
        <Field label="電話番号" required hint={!errors.denwa ? "ハイフンあり・なしどちらでも可" : undefined} half error={errors.denwa}>
          <UIInput value={form.denwa} hasError={!!errors.denwa} numHyphen onChange={e => updClr("denwa", e.target.value)} placeholder="例：03-1234-5678" />
        </Field>
        <Field label="契約書受取メールアドレス" required hint={!errors.mail ? "半角英数字と記号のみ" : undefined} half error={errors.mail}>
          <UIInput type="email" value={form.mail} hasError={!!errors.mail} noZenkaku onChange={e => updClr("mail", e.target.value)} placeholder="example@salon.com" />
        </Field>
      </FieldRow>
    </Card>
  </>);
};

// ==================== STEP2：申込種別選択UI（段階選択式） ====================
const SelectBtn = ({ label, sub, disabled, onClick, done }) => (
  <button disabled={disabled} onClick={onClick}
    style={{ padding:"14px 22px", borderRadius:12, border:`1.5px solid ${disabled?"#e2e8f0":done?C.teal:C.border}`, cursor:disabled?"not-allowed":"pointer", fontSize:14, fontWeight:600, fontFamily:FONT, background:disabled?"#f8f9fa":done?C.tealLight:C.white, color:disabled?"#b0bec5":done?C.tealDark:C.navy, textAlign:"left", minWidth:180, transition:"all .15s", opacity:disabled?0.6:1 }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor=C.teal; e.currentTarget.style.boxShadow=`0 0 0 3px ${C.tealLight}`; }}}
    onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor=done?C.teal:C.border; e.currentTarget.style.boxShadow="none"; }}}>
    <div>{label}{disabled && " 🔒"}</div>
    {sub && <div style={{ fontSize:11, color:disabled?"#b0bec5":C.muted, marginTop:4, fontWeight:400, lineHeight:1.5 }}>{sub}</div>}
    {disabled && <div style={{ fontSize:11, color:"#b0bec5", marginTop:4 }}>準備中</div>}
  </button>
);

const Breadcrumb = ({ steps, onBack }) => (
  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16, flexWrap:"wrap" }}>
    {steps.map((s, i) => (
      <span key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
        {i > 0 && <span style={{ color:C.muted, fontSize:13 }}>›</span>}
        <span style={{ fontSize:12.5, fontWeight: i===steps.length-1 ? 700 : 400, color: i===steps.length-1 ? C.tealDark : C.muted, cursor: i<steps.length-1 ? "pointer" : "default", textDecoration: i<steps.length-1 ? "underline" : "none" }}
          onClick={() => i < steps.length-1 && onBack(i)}>{s}</span>
      </span>
    ))}
  </div>
);

const TypeSelector = ({ onSelect, form, onJump }) => {
  const [step1, setStep1] = useState(""); // 新規申込 / 端末入替 / 契約変更 / 全解約
  const [step2, setStep2] = useState(""); // 店舗 / 本部
  const [step3, setStep3] = useState(""); // フロントWAN分岐

  const reset = (toStep) => {
    if (toStep <= 0) { setStep1(""); setStep2(""); setStep3(""); }
    if (toStep <= 1) { setStep2(""); setStep3(""); }
    if (toStep <= 2) { setStep3(""); }
  };

  const breadcrumb = ["申込種別を選択", step1, step2, step3].filter(Boolean);

  // 新規店舗タブ（単店・店舗追加）の一覧
  const tenpoTabs = (form?.tabs || []).filter(t => t.type === "新規_単店" || t.type === "新規_店舗追加");

  return (
    <Card>
      <SecTitle icon="📋">申込種別を選択してください</SecTitle>
      {breadcrumb.length > 1 && <Breadcrumb steps={breadcrumb} onBack={i => reset(i)} />}

      {/* 第1段階：大分類 */}
      {!step1 && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <SelectBtn label="新規申込" onClick={() => setStep1("新規申込")} />
          <SelectBtn label="端末入替" onClick={() => setStep1("端末入替")} />
          <SelectBtn label="契約変更" sub="パッケージ・オプションの変更" onClick={() => onSelect("契約変更")} />
          <SelectBtn label="全解約" onClick={() => onSelect("全解約")} />
        </div>
      )}

      {/* 端末入替：サブ選択（変更なし / 変更あり） */}
      {step1 === "端末入替" && !step2 && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:C.text, marginBottom:4 }}>契約内容の変更はありますか？</div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <SelectBtn label="変更なし" sub="フロントWAN本部の入替は本部本店として申込みます" onClick={() => onSelect("端末入替")} />
            <SelectBtn label="変更あり" sub="端末入替と同時にパッケージ・オプションを変更します" onClick={() => onSelect("端末入替_変更あり")} />
          </div>
        </div>
      )}

      {/* 第2段階：店舗 or 本部 */}
      {step1==="新規申込" && !step2 && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <SelectBtn label="🏪 店舗" onClick={() => setStep2("店舗")} />
          <SelectBtn label="🏢 本部" onClick={() => setStep2("本部")} />
        </div>
      )}

      {/* 第3段階：店舗の種別 */}
      {step1==="新規申込" && step2==="店舗" && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <SelectBtn label="単店" sub="複数店舗同時申込みも「単店」を選んでください" onClick={() => onSelect("新規_単店")} />
          <SelectBtn label="店舗追加" sub="既存グループに店舗を追加します" onClick={() => onSelect("新規_店舗追加")} />
        </div>
      )}

      {/* 第3段階：本部の種別 */}
      {step1==="新規申込" && step2==="本部" && !step3 && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <SelectBtn label="事務所WAN本部" onClick={() => onSelect("新規_事務所WAN本部")} />
          <SelectBtn label="フロントWAN本部" onClick={() => setStep3("フロントWAN本部")} />
        </div>
      )}

      {/* 第4段階：フロントWAN本部の分岐 */}
      {step1==="新規申込" && step2==="本部" && step3==="フロントWAN本部" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:C.text, marginBottom:4 }}>フロントWAN本部の追加先はどちらですか？</div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <SelectBtn label="既存店舗" sub="既存店にフロントWAN本部機能を追加" onClick={() => onSelect("新規_フロントWAN本部_既存店")} />
            <SelectBtn label="新規申込店舗" sub="同時に申込む新規店舗に本部機能を追加" onClick={() => {
              if (tenpoTabs.length === 0) {
                setStep3("新規申込店舗フロントWAN_店舗なし");
              } else {
                onSelect("新規_フロントWAN本部_新規店");
              }
            }} />
          </div>
        </div>
      )}

      {/* 新規申込店舗フロントWAN：店舗タブなし → 案内 */}
      {step1==="新規申込" && step2==="本部" && step3==="新規申込店舗フロントWAN_店舗なし" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ padding:"16px 20px", background:"#fef9c3", border:"1.5px solid #fde047", borderRadius:10, fontSize:13.5, lineHeight:1.9 }}>
            <div style={{ fontWeight:700, marginBottom:6, fontSize:14 }}>⚠️ 先に店舗の申込書を作成してください</div>
            <div style={{ color:C.text }}>
              フロントWAN本部の申込書は、店舗の申込書を作成した後に作成できます。
            </div>
          </div>
          <div>
            <button
              onClick={() => { setStep1("新規申込"); setStep2("店舗"); setStep3(""); }}
              style={{ padding:"10px 24px", borderRadius:10, border:`1.5px solid ${C.teal}`, background:C.tealLight, color:C.tealDark, fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
              ← 新規申込みに戻る（店舗を選択する）
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop:16, padding:"10px 14px", background:C.tealLight, borderLeft:`3px solid ${C.teal}`, borderRadius:"0 8px 8px 0", fontSize:12.5, color:C.tealDeep, lineHeight:1.6 }}>
        💡 種別を選択すると入力フォームが表示されます。後から変更も可能です。
      </div>
    </Card>
  );
};

// ==================== 月額計算 ====================
const calcTenpoMonthly = (d) => {
  if (!d.package) return 0;
  let total = PACKAGE_BASE[d.package] || 0;
  const cp = CONCIERGE_PRICE[d.package]?.[d.conciergeCount] ?? 0;
  total += cp;
  OPTIONS_LIST.forEach(o => { if ((d.options||[]).includes(o.key)) total += o.price; });
  if (d.lanEnabled) total += LAN_PRICE * (d.lanCount || 1);
  return total;
};

// ==================== 新規_単店 / 新規_店舗追加 フォーム ====================
// ==================== 事務所WAN本部フォーム ====================
const WanHonbuTabContent = ({ tab, form, updTab, clrTab, errors }) => {
  const d     = tab.data;
  const te    = errors || {};
  const tabId = tab.id;

  const upd  = (k, v)   => updTab(tabId, k, v);
  const updM = (updates) => updTab(tabId, "__many__", updates);
  const clr  = (k)       => clrTab(tabId, k);

  const tantoshaFg = useFurigana(
    () => d.nicchoseiTantoshaKana || "",
    v  => { upd("nicchoseiTantoshaKana", v); if (v) clr("nicchoseiTantoshaKana"); }
  );

  const wanMonthly = calcWanMonthly(d);

  return (<>
    {/* 本部情報 */}
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:17 }}>🏢</span>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy }}>本部情報</h3>
        </div>
        <button onClick={() => { if (window.confirm("入力内容をリセットします。よいですか？")) updTab(tabId, "__reset__", null); }}
          style={{ fontSize:12, fontWeight:600, color:C.muted, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:FONT }}>
          🔄 リセット
        </button>
      </div>

      <Field label="本部名" required error={te.honbuName}>
        <UIInput value={d.honbuName||""} hasError={!!te.honbuName}
          onChange={e => { upd("honbuName", e.target.value); clr("honbuName"); if (!e.target.value) upd("honbuNameKana",""); }}
          placeholder="例：株式会社〇〇サロン 本部" />
      </Field>
      <Field label="本部名フリガナ" required hint={!te.honbuNameKana ? "手動入力（カタカナ）" : undefined} error={te.honbuNameKana}>
        <UIInput value={d.honbuNameKana||""} hasError={!!te.honbuNameKana} onlyKatakana
          onChange={e => { upd("honbuNameKana", e.target.value); clr("honbuNameKana"); }}
          placeholder="例：カブシキガイシャ マルマルサロン ホンブ" />
      </Field>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
          <input type="checkbox" checked={!!d.sameAsKeiyakusha}
            onChange={e => {
              if (e.target.checked) {
                updM({ sameAsKeiyakusha:true, yubinBango:form.yubinBango, jusho:form.jusho, jusho2:form.jusho2, denwa:form.denwa });
                ["yubinBango","jusho","jusho2","denwa"].forEach(k => clr(k));
              } else {
                updM({ sameAsKeiyakusha:false, yubinBango:"", jusho:"", jusho2:"", denwa:"" });
              }
            }} />
          契約者と同じ住所・電話番号を使う
        </label>
        {d.sameAsKeiyakusha && (
          <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:6, padding:"8px 12px", fontSize:12.5, color:"#854d0e", marginTop:6 }}>
            ⚠️ 契約者の住所・電話番号がコピーされます。本部情報として正しいか確認してください。
          </div>
        )}
      </div>

      <ZipField value={d.yubinBango||""} onChange={v => { upd("yubinBango",v); clr("yubinBango"); }} onAddressFound={addr => { upd("jusho",addr); clr("jusho"); }} addressInputId={`wan-jusho2-${tabId}`} required errors={te} fieldKey="yubinBango" clearError={k => clr(k)} disabled={!!d.sameAsKeiyakusha} />
      <Field label="住所（自動入力）" error={te.jusho}>
        <UIInput value={d.jusho||""} hasError={!!te.jusho} disabled style={{ background:d.jusho?"#f0f4f8":undefined, color:C.muted }} placeholder="郵便番号を入力すると自動入力されます" />
      </Field>
      <Field label="番地・建物名以降" required hint={!te.jusho2 ? "例：1-2-3　〇〇ビル101号室" : undefined} error={te.jusho2}>
        <UIInput id={`wan-jusho2-${tabId}`} value={d.jusho2||""} hasError={!!te.jusho2} disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("jusho2", e.target.value); clr("jusho2"); }} placeholder="例：1-2-3　〇〇ビル101号室" />
      </Field>
      <Field label="電話番号" required hint={!te.denwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.denwa}>
        <UIInput value={d.denwa||""} hasError={!!te.denwa} numHyphen disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("denwa", e.target.value); clr("denwa"); }} placeholder="例：06-1234-5678" />
      </Field>

      <NameFields
        seiValue={d.sekininshaLastName} meiValue={d.sekininshaFirstName}
        seiKana={d.sekininshaLastNameKana} meiKana={d.sekininshaFirstNameKana}
        onSeiChange={v => upd("sekininshaLastName",v)} onMeiChange={v => upd("sekininshaFirstName",v)}
        onSeiKanaChange={v => upd("sekininshaLastNameKana",v)} onMeiKanaChange={v => upd("sekininshaFirstNameKana",v)}
        labelSei="責任者　姓（任意）" labelMei="責任者　名（任意）"
        placeholderSei="例：田中" placeholderMei="例：美咲" placeholderSeiKana="例：タナカ" placeholderMeiKana="例：ミサキ"
        required={false} errors={{}} keyKanji_sei="x" keyKanji_mei="x" keyKana_sei="x" keyKana_mei="x" />
    </Card>

    {/* LinQ2メールアドレス */}
    <Card>
      <SecTitle icon="✉️">LinQ2メールアドレス</SecTitle>
      <Field label="LinQ2メールアドレス" required={!d.linq2MailNotUse} error={te.linq2MailPrefix}>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          <UIInput value={d.linq2MailPrefix||""} hasError={!!te.linq2MailPrefix}
            noZenkaku inputMode="email" disabled={!!d.linq2MailNotUse}
            style={{ borderRadius:"8px 0 0 8px", flex:1, minWidth:0 }}
            onChange={e => { const v=e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g,""); upd("linq2MailPrefix",v); clr("linq2MailPrefix"); }}
            placeholder="例：salon-honbu" />
          <div style={{ padding:"9px 14px", background:"#f0f4f8", border:`1.5px solid ${te.linq2MailPrefix?C.danger:C.border}`, borderLeft:"none", borderRadius:"0 8px 8px 0", fontSize:14, color:C.muted, whiteSpace:"nowrap", flexShrink:0 }}>
            @tbqm.jp
          </div>
        </div>
        {!te.linq2MailPrefix && d.linq2MailPrefix && !d.linq2MailNotUse && (
          <div style={{ marginTop:6, fontSize:12.5, color:C.teal }}>✅ 完成形：{d.linq2MailPrefix}@tbqm.jp</div>
        )}
      </Field>
      <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none", marginBottom:14 }}>
        <input type="checkbox" checked={!!d.linq2MailNotUse} style={{ width:16, height:16, cursor:"pointer" }}
          onChange={e => { updM({ linq2MailNotUse:e.target.checked, linq2MailPrefix:e.target.checked?"":d.linq2MailPrefix }); clr("linq2MailPrefix"); }} />
        LinQ2メールアドレスは使用しない
      </label>
    </Card>

    {/* サービス選択 */}
    <Card>
      <SecTitle icon="📦">サービス選択</SecTitle>

      <div style={{ padding:"10px 14px", background:"#f0f4f8", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13.5, color:C.navy, fontWeight:600, marginBottom:14 }}>
        WAN本部　{fmtPrice(WAN_HONBU_BASE)}/月（固定）
      </div>

      <Field label="オプション">
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>

          {/* LAN */}
          <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.wanLanEnabled?C.teal:C.border}`, background:d.wanLanEnabled?C.tealLight:C.white, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.wanLanEnabled} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("wanLanEnabled", e.target.checked)} />
            <span style={{ fontSize:13, color:d.wanLanEnabled?C.tealDark:C.text, fontWeight:d.wanLanEnabled?600:400, flex:1 }}>LAN</span>
            <span style={{ fontSize:12, color:C.muted }}>{fmtPrice(LAN_PRICE)}/台</span>
          </label>
          {d.wanLanEnabled && (
            <div style={{ paddingLeft:36, marginTop:4 }}>
              <Field label="LAN台数" half>
                <UISelect value={d.wanLanCount||1} onChange={e => upd("wanLanCount", Number(e.target.value))} style={{ maxWidth:160 }}>
                  {LAN_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}台　{fmtPrice(n*LAN_PRICE)}</option>)}
                </UISelect>
              </Field>
            </div>
          )}

          {/* LinQ Concierge for Manager */}
          <Field label="LinQ Concierge for Manager">
            <UISelect value={d.wanConciergeManager||"0台"} onChange={e => upd("wanConciergeManager", e.target.value)} style={{ maxWidth:260 }}>
              {WAN_CONCIERGE_MANAGER_OPTIONS.map((opt, i) => (
                <option key={opt} value={opt}>{opt}　{i===0 ? "¥0" : fmtPrice(i*WAN_CONCIERGE_MANAGER_PRICE)}</option>
              ))}
            </UISelect>
          </Field>

          {/* バーコード決済 */}
          <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.wanBarcode?C.teal:C.border}`, background:d.wanBarcode?C.tealLight:C.white, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.wanBarcode} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("wanBarcode", e.target.checked)} />
            <span style={{ fontSize:13, color:d.wanBarcode?C.tealDark:C.text, fontWeight:d.wanBarcode?600:400, flex:1 }}>バーコード決済</span>
            <span style={{ fontSize:12, color:C.muted }}>¥0</span>
          </label>

          {/* 粧材管理 */}
          <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.wanShozai?C.teal:C.border}`, background:d.wanShozai?C.tealLight:C.white, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.wanShozai} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("wanShozai", e.target.checked)} />
            <span style={{ fontSize:13, color:d.wanShozai?C.tealDark:C.text, fontWeight:d.wanShozai?600:400, flex:1 }}>粧材管理</span>
            <span style={{ fontSize:12, color:C.muted }}>{fmtPrice(1000)}</span>
          </label>
        </div>
      </Field>

      {/* 月額合計 */}
      <div style={{ background:C.tealLight, border:`1.5px solid ${C.teal}`, borderRadius:12, padding:"14px 18px", marginTop:8 }}>
        <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:700, marginBottom:8 }}>💰 月額料金合計（税別）</div>
        <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:13 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>WAN本部</span><span>{fmtPrice(WAN_HONBU_BASE)}</span></div>
          {d.wanLanEnabled && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>LAN（{d.wanLanCount||1}台）</span><span>{fmtPrice(LAN_PRICE*(d.wanLanCount||1))}</span></div>}
          {d.wanConciergeManager && d.wanConciergeManager!=="0台" && (() => {
            const idx = WAN_CONCIERGE_MANAGER_OPTIONS.indexOf(d.wanConciergeManager);
            return <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>Concierge for Manager（{d.wanConciergeManager}）</span><span>{fmtPrice(idx*WAN_CONCIERGE_MANAGER_PRICE)}</span></div>;
          })()}
          {d.wanShozai && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>粧材管理</span><span>{fmtPrice(1000)}</span></div>}
          <div style={{ borderTop:`1px solid ${C.teal}`, marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:15 }}>
            <span>合計</span><span style={{ color:C.tealDark }}>{fmtPrice(wanMonthly)}</span>
          </div>
        </div>
      </div>
    </Card>

    {/* 日程調整 */}
    <Card>
      <SecTitle icon="🗓️">日程調整</SecTitle>
      <Field label="日程調整先" required error={te.nicchoseiSaki} hint={!te.nicchoseiSaki && loadMyInfo() ? "「営業」を選ぶとマイ情報が自動入力されます" : undefined}>
        <UISelect value={d.nicchoseiSaki||""} onChange={e => {
          const val = e.target.value;
          if (val === "営業") {
            const my = loadMyInfo();
            if (my) { updM({ nicchoseiSaki:"営業", nicchoseiTantosha:my.tantosha||"", nicchoseiTantoshaKana:my.tantoshaKana||"", nicchoseiDenwa:my.tantoshaDenwa||"" }); ["nicchoseiTantosha","nicchoseiTantoshaKana","nicchoseiDenwa"].forEach(k=>clr(k)); }
            else { upd("nicchoseiSaki",val); }
          } else {
            updM({ nicchoseiSaki:val, nicchoseiTantosha:"", nicchoseiTantoshaKana:"", nicchoseiDenwa:"" });
          }
          clr("nicchoseiSaki");
        }} style={{ maxWidth:220, borderColor:te.nicchoseiSaki?C.danger:undefined }}>
          <option value="">― 選択してください ―</option>
          {NICCHOSEISAKISAKI_LIST.map(o => <option key={o}>{o}</option>)}
        </UISelect>
      </Field>
      <FieldRow>
        <Field label="担当者名" required half error={te.nicchoseiTantosha}>
          <UIInput value={d.nicchoseiTantosha||""} hasError={!!te.nicchoseiTantosha}
            onChange={e => { upd("nicchoseiTantosha", e.target.value); clr("nicchoseiTantosha"); if (!e.target.value) upd("nicchoseiTantoshaKana",""); }}
            placeholder="例：鈴木 一郎" {...tantoshaFg} />
        </Field>
        <Field label="フリガナ" required half error={te.nicchoseiTantoshaKana}>
          <UIInput value={d.nicchoseiTantoshaKana||""} hasError={!!te.nicchoseiTantoshaKana} onlyKatakana
            onChange={e => { upd("nicchoseiTantoshaKana", e.target.value); clr("nicchoseiTantoshaKana"); }}
            placeholder="スズキ イチロウ" />
        </Field>
      </FieldRow>
      <Field label="連絡先電話番号" required hint={!te.nicchoseiDenwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.nicchoseiDenwa}>
        <UIInput value={d.nicchoseiDenwa||""} hasError={!!te.nicchoseiDenwa} numHyphen
          onChange={e => { upd("nicchoseiDenwa", e.target.value); clr("nicchoseiDenwa"); }} placeholder="例：090-1234-5678" style={{ maxWidth:240 }} />
      </Field>

      {/* ネット開通日 */}
      <Field label="ネット開通日" required error={te.netKaiTsubiStatus}>
        <div style={{ display:"flex", gap:10, marginBottom:10 }}>
          {["開通済","未開通"].map(s => (
            <label key={s} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"6px 16px", borderRadius:10, border:`1.5px solid ${d.netKaiTsubiStatus===s?C.teal:te.netKaiTsubiStatus?C.danger:C.border}`, background:d.netKaiTsubiStatus===s?C.tealLight:te.netKaiTsubiStatus?"#fff5f5":C.white, fontSize:13, fontWeight:d.netKaiTsubiStatus===s?700:400 }}>
              <input type="radio" name={`wan-netStatus-${tabId}`} value={s} checked={d.netKaiTsubiStatus===s} onChange={() => { upd("netKaiTsubiStatus",s); clr("netKaiTsubiStatus"); }} />{s}
            </label>
          ))}
        </div>
        {d.netKaiTsubiStatus==="開通済" && <div style={{ fontSize:13, color:C.muted, padding:"6px 0" }}>📝 申込書に「開通済」と記載されます</div>}
        {d.netKaiTsubiStatus==="未開通" && (
          <div style={{ marginTop:4, paddingLeft:16, borderLeft:`3px solid ${C.border}` }}>
            <div style={{ display:"flex", gap:10, marginBottom:8 }}>
              {["確定","未定"].map(s => (
                <label key={s} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"5px 14px", borderRadius:10, border:`1.5px solid ${d.netKaiTsubiKakutei===s?C.teal:C.border}`, background:d.netKaiTsubiKakutei===s?C.tealLight:C.white, fontSize:13, fontWeight:d.netKaiTsubiKakutei===s?700:400 }}>
                  <input type="radio" name={`wan-netKakutei-${tabId}`} value={s} checked={d.netKaiTsubiKakutei===s} onChange={() => upd("netKaiTsubiKakutei",s)} />{s}
                </label>
              ))}
            </div>
            {d.netKaiTsubiKakutei==="確定" && (
              <div>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  {["date","text"].map(m => (
                    <label key={m} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", fontSize:12.5, color:d.netKaiTsubiMode===m?C.teal:C.muted, fontWeight:d.netKaiTsubiMode===m?700:400 }}>
                      <input type="radio" name={`wan-netMode-${tabId}`} value={m} checked={d.netKaiTsubiMode===m} onChange={() => upd("netKaiTsubiMode",m)} />
                      {m==="date" ? "日付で入力" : "大体の日程で入力（例：5月中旬頃）"}
                    </label>
                  ))}
                </div>
                {d.netKaiTsubiMode==="date"
                  ? <UIInput type="date" value={d.netKaiTsubiDate||""} hasError={!!te.netKaiTsubiDate} onChange={e => { upd("netKaiTsubiDate",e.target.value); clr("netKaiTsubiDate"); }} style={{ maxWidth:200 }} />
                  : <UIInput value={d.netKaiTsubiText||""} hasError={!!te.netKaiTsubiText} onChange={e => { upd("netKaiTsubiText",e.target.value); clr("netKaiTsubiText"); }} placeholder="例：5月中旬頃、〇月〇日前後" style={{ maxWidth:300 }} />
                }
              </div>
            )}
            {d.netKaiTsubiKakutei==="未定" && <div style={{ fontSize:13, color:C.muted, padding:"6px 0" }}>📝 申込書に「未定」と記載されます</div>}
          </div>
        )}
      </Field>

      <Field label="LinQ2のネット接続方法" required error={te.setsuzokoHoho}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {["有線","無線","現在未定"].map(v => (
            <label key={v} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"7px 16px", borderRadius:10, border:`1.5px solid ${d.setsuzokoHoho===v?C.teal:te.setsuzokoHoho?C.danger:C.border}`, background:d.setsuzokoHoho===v?C.tealLight:te.setsuzokoHoho?"#fff5f5":C.white, fontSize:13, fontWeight:d.setsuzokoHoho===v?700:400 }}>
              <input type="radio" name={`wan-setsuzoko-${tabId}`} value={v} checked={d.setsuzokoHoho===v}
                onChange={() => { upd("setsuzokoHoho",v); clr("setsuzokoHoho"); }} />{v}
            </label>
          ))}
        </div>
      </Field>

      <Field label="調査希望日時" required error={te.chosaDate}>
        <UITextarea value={d.chosaDate||""} hasError={!!te.chosaDate}
          onChange={e => { upd("chosaDate",e.target.value); clr("chosaDate"); }}
          placeholder={"例：4月15日 午前中希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
      </Field>
      <Field label="導入希望日時" required error={te.donguDate}>
        <UITextarea value={d.donguDate||""} hasError={!!te.donguDate}
          onChange={e => { upd("donguDate",e.target.value); clr("donguDate"); }}
          placeholder={"例：5月1日 午後希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
      </Field>

      <Field label="備考">
        <UITextarea value={d.biko||""} onChange={e => upd("biko", e.target.value)} placeholder="日程調整に関する補足事項があれば記入してください" />
      </Field>
    </Card>
  </>);
};

// ==================== フロントWAN本部フォーム ====================
const FrontWanTabContent = ({ tab, form, updTab, clrTab, errors }) => {
  const d     = tab.data;
  const te    = errors || {};
  const tabId = tab.id;

  const upd  = (k, v)   => updTab(tabId, k, v);
  const updM = (updates) => updTab(tabId, "__many__", updates);
  const clr  = (k)       => clrTab(tabId, k);

  const tantoshaFg = useFurigana(
    () => d.nicchoseiTantoshaKana || "",
    v  => { upd("nicchoseiTantoshaKana", v); if (v) clr("nicchoseiTantoshaKana"); }
  );

  const wanMonthly = calcWanMonthly(d);

  return (<>
    {/* 本部情報 */}
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:17 }}>🏢</span>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy }}>本部情報</h3>
        </div>
        <button onClick={() => { if (window.confirm("入力内容をリセットします。よいですか？")) updTab(tabId, "__reset__", null); }}
          style={{ fontSize:12, fontWeight:600, color:C.muted, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:FONT }}>
          🔄 リセット
        </button>
      </div>

      <Field label="本部名" required error={te.honbuName}>
        <UIInput value={d.honbuName||""} hasError={!!te.honbuName}
          onChange={e => { upd("honbuName", e.target.value); clr("honbuName"); if (!e.target.value) upd("honbuNameKana",""); }}
          placeholder="例：株式会社〇〇サロン 本部" />
      </Field>
      <Field label="本部名フリガナ" required hint={!te.honbuNameKana ? "手動入力（カタカナ）" : undefined} error={te.honbuNameKana}>
        <UIInput value={d.honbuNameKana||""} hasError={!!te.honbuNameKana} onlyKatakana
          onChange={e => { upd("honbuNameKana", e.target.value); clr("honbuNameKana"); }}
          placeholder="例：カブシキガイシャ マルマルサロン ホンブ" />
      </Field>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
          <input type="checkbox" checked={!!d.sameAsKeiyakusha}
            onChange={e => {
              if (e.target.checked) {
                updM({ sameAsKeiyakusha:true, yubinBango:form.yubinBango, jusho:form.jusho, jusho2:form.jusho2, denwa:form.denwa });
                ["yubinBango","jusho","jusho2","denwa"].forEach(k => clr(k));
              } else {
                updM({ sameAsKeiyakusha:false, yubinBango:"", jusho:"", jusho2:"", denwa:"" });
              }
            }} />
          契約者と同じ住所・電話番号を使う
        </label>
        {d.sameAsKeiyakusha && (
          <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:6, padding:"8px 12px", fontSize:12.5, color:"#854d0e", marginTop:6 }}>
            ⚠️ 契約者の住所・電話番号がコピーされます。本部情報として正しいか確認してください。
          </div>
        )}
      </div>

      <ZipField value={d.yubinBango||""} onChange={v => { upd("yubinBango",v); clr("yubinBango"); }} onAddressFound={addr => { upd("jusho",addr); clr("jusho"); }} addressInputId={`frontwan-jusho2-${tabId}`} required errors={te} fieldKey="yubinBango" clearError={k => clr(k)} disabled={!!d.sameAsKeiyakusha} />
      <Field label="住所（自動入力）" error={te.jusho}>
        <UIInput value={d.jusho||""} hasError={!!te.jusho} disabled style={{ background:d.jusho?"#f0f4f8":undefined, color:C.muted }} placeholder="郵便番号を入力すると自動入力されます" />
      </Field>
      <Field label="番地・建物名以降" required hint={!te.jusho2 ? "例：1-2-3　〇〇ビル101号室" : undefined} error={te.jusho2}>
        <UIInput id={`frontwan-jusho2-${tabId}`} value={d.jusho2||""} hasError={!!te.jusho2} disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("jusho2", e.target.value); clr("jusho2"); }} placeholder="例：1-2-3　〇〇ビル101号室" />
      </Field>
      <Field label="電話番号" required hint={!te.denwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.denwa}>
        <UIInput value={d.denwa||""} hasError={!!te.denwa} numHyphen disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("denwa", e.target.value); clr("denwa"); }} placeholder="例：06-1234-5678" />
      </Field>

      <NameFields
        seiValue={d.sekininshaLastName} meiValue={d.sekininshaFirstName}
        seiKana={d.sekininshaLastNameKana} meiKana={d.sekininshaFirstNameKana}
        onSeiChange={v => upd("sekininshaLastName",v)} onMeiChange={v => upd("sekininshaFirstName",v)}
        onSeiKanaChange={v => upd("sekininshaLastNameKana",v)} onMeiKanaChange={v => upd("sekininshaFirstNameKana",v)}
        labelSei="責任者　姓（任意）" labelMei="責任者　名（任意）"
        placeholderSei="例：田中" placeholderMei="例：美咲" placeholderSeiKana="例：タナカ" placeholderMeiKana="例：ミサキ"
        required={false} errors={{}} keyKanji_sei="x" keyKanji_mei="x" keyKana_sei="x" keyKana_mei="x" />
    </Card>

    {/* フロントWAN本部に切り替える既存店舗 */}
    <Card>
      <SecTitle icon="🏪">フロントWAN本部に切り替える既存店舗</SecTitle>
      <Field label="店舗名" required error={te.kizonTenpoName} hint={!te.kizonTenpoName ? "本部機能を追加したい既存店舗の名前を入力してください" : undefined}>
        <UIInput value={d.kizonTenpoName||""} hasError={!!te.kizonTenpoName}
          onChange={e => { upd("kizonTenpoName", e.target.value); clr("kizonTenpoName"); }}
          placeholder="例：ヘアサロン〇〇 渋谷店" />
      </Field>
      <Field label="電話番号" required hint={!te.kizonTenpoDenwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.kizonTenpoDenwa}>
        <UIInput value={d.kizonTenpoDenwa||""} hasError={!!te.kizonTenpoDenwa} numHyphen
          onChange={e => { upd("kizonTenpoDenwa", e.target.value); clr("kizonTenpoDenwa"); }}
          placeholder="例：03-1234-5678" />
      </Field>
    </Card>

    {/* LinQ2メールアドレス */}
    <Card>
      <SecTitle icon="✉️">LinQ2メールアドレス</SecTitle>
      <Field label="LinQ2メールアドレス" required={!d.linq2MailNotUse} error={te.linq2MailPrefix}>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          <UIInput value={d.linq2MailPrefix||""} hasError={!!te.linq2MailPrefix}
            noZenkaku inputMode="email" disabled={!!d.linq2MailNotUse}
            style={{ borderRadius:"8px 0 0 8px", flex:1, minWidth:0 }}
            onChange={e => { const v=e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""); upd("linq2MailPrefix",v); clr("linq2MailPrefix"); }}
            placeholder="例：salon-front" />
          <div style={{ padding:"9px 14px", background:"#f0f4f8", border:`1.5px solid ${te.linq2MailPrefix?C.danger:C.border}`, borderLeft:"none", borderRadius:"0 8px 8px 0", fontSize:14, color:C.muted, whiteSpace:"nowrap", flexShrink:0 }}>
            @tbqm.jp
          </div>
        </div>
        {!te.linq2MailPrefix && d.linq2MailPrefix && !d.linq2MailNotUse && (
          <div style={{ marginTop:6, fontSize:12.5, color:C.teal }}>✅ 完成形：{d.linq2MailPrefix}@tbqm.jp</div>
        )}
      </Field>
      <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none", marginBottom:14 }}>
        <input type="checkbox" checked={!!d.linq2MailNotUse} style={{ width:16, height:16, cursor:"pointer" }}
          onChange={e => { updM({ linq2MailNotUse:e.target.checked, linq2MailPrefix:e.target.checked?"":d.linq2MailPrefix }); clr("linq2MailPrefix"); }} />
        LinQ2メールアドレスは使用しない
      </label>
    </Card>

    {/* サービス選択 */}
    <Card>
      <SecTitle icon="📦">サービス選択</SecTitle>

      <div style={{ padding:"10px 14px", background:"#f0f4f8", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13.5, color:C.navy, fontWeight:600, marginBottom:14 }}>
        WAN本部　{fmtPrice(WAN_HONBU_BASE)}/月（固定）
      </div>

      <Field label="オプション">
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.wanLanEnabled?C.teal:C.border}`, background:d.wanLanEnabled?C.tealLight:C.white, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.wanLanEnabled} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("wanLanEnabled", e.target.checked)} />
            <span style={{ fontSize:13, color:d.wanLanEnabled?C.tealDark:C.text, fontWeight:d.wanLanEnabled?600:400, flex:1 }}>LAN</span>
            <span style={{ fontSize:12, color:C.muted }}>{fmtPrice(LAN_PRICE)}/台</span>
          </label>
          {d.wanLanEnabled && (
            <div style={{ paddingLeft:36, marginTop:4 }}>
              <Field label="LAN台数" half>
                <UISelect value={d.wanLanCount||1} onChange={e => upd("wanLanCount", Number(e.target.value))} style={{ maxWidth:160 }}>
                  {LAN_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}台　{fmtPrice(n*LAN_PRICE)}</option>)}
                </UISelect>
              </Field>
            </div>
          )}
          <Field label="LinQ Concierge for Manager">
            <UISelect value={d.wanConciergeManager||"0台"} onChange={e => upd("wanConciergeManager", e.target.value)} style={{ maxWidth:260 }}>
              {WAN_CONCIERGE_MANAGER_OPTIONS.map((opt, i) => (
                <option key={opt} value={opt}>{opt}　{i===0 ? "¥0" : fmtPrice(i*WAN_CONCIERGE_MANAGER_PRICE)}</option>
              ))}
            </UISelect>
          </Field>
          <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.wanBarcode?C.teal:C.border}`, background:d.wanBarcode?C.tealLight:C.white, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.wanBarcode} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("wanBarcode", e.target.checked)} />
            <span style={{ fontSize:13, color:d.wanBarcode?C.tealDark:C.text, fontWeight:d.wanBarcode?600:400, flex:1 }}>バーコード決済</span>
            <span style={{ fontSize:12, color:C.muted }}>¥0</span>
          </label>
          <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.wanShozai?C.teal:C.border}`, background:d.wanShozai?C.tealLight:C.white, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.wanShozai} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("wanShozai", e.target.checked)} />
            <span style={{ fontSize:13, color:d.wanShozai?C.tealDark:C.text, fontWeight:d.wanShozai?600:400, flex:1 }}>粧材管理</span>
            <span style={{ fontSize:12, color:C.muted }}>{fmtPrice(1000)}</span>
          </label>
        </div>
      </Field>

      {/* 月額合計 */}
      <div style={{ background:C.tealLight, border:`1.5px solid ${C.teal}`, borderRadius:12, padding:"14px 18px", marginTop:8 }}>
        <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:700, marginBottom:8 }}>💰 月額料金合計（税別）</div>
        <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:13 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>WAN本部</span><span>{fmtPrice(WAN_HONBU_BASE)}</span></div>
          {d.wanLanEnabled && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>LAN（{d.wanLanCount||1}台）</span><span>{fmtPrice(LAN_PRICE*(d.wanLanCount||1))}</span></div>}
          {d.wanConciergeManager && d.wanConciergeManager!=="0台" && (() => {
            const idx = WAN_CONCIERGE_MANAGER_OPTIONS.indexOf(d.wanConciergeManager);
            return <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>Concierge for Manager（{d.wanConciergeManager}）</span><span>{fmtPrice(idx*WAN_CONCIERGE_MANAGER_PRICE)}</span></div>;
          })()}
          {d.wanShozai && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>粧材管理</span><span>{fmtPrice(1000)}</span></div>}
          <div style={{ borderTop:`1px solid ${C.teal}`, marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:15 }}>
            <span>合計</span><span style={{ color:C.tealDark }}>{fmtPrice(wanMonthly)}</span>
          </div>
        </div>
      </div>
    </Card>

    {/* 日程調整 */}
    <Card>
      <SecTitle icon="🗓️">日程調整</SecTitle>
      <Field label="日程調整先" required error={te.nicchoseiSaki} hint={!te.nicchoseiSaki && loadMyInfo() ? "「営業」を選ぶとマイ情報が自動入力されます" : undefined}>
        <UISelect value={d.nicchoseiSaki||""} onChange={e => {
          const val = e.target.value;
          if (val === "営業") {
            const my = loadMyInfo();
            if (my) { updM({ nicchoseiSaki:"営業", nicchoseiTantosha:my.tantosha||"", nicchoseiTantoshaKana:my.tantoshaKana||"", nicchoseiDenwa:my.tantoshaDenwa||"" }); ["nicchoseiTantosha","nicchoseiTantoshaKana","nicchoseiDenwa"].forEach(k=>clr(k)); }
            else { upd("nicchoseiSaki",val); }
          } else {
            updM({ nicchoseiSaki:val, nicchoseiTantosha:"", nicchoseiTantoshaKana:"", nicchoseiDenwa:"" });
          }
          clr("nicchoseiSaki");
        }} style={{ maxWidth:220, borderColor:te.nicchoseiSaki?C.danger:undefined }}>
          <option value="">― 選択してください ―</option>
          {NICCHOSEISAKISAKI_LIST.map(o => <option key={o}>{o}</option>)}
        </UISelect>
      </Field>
      <FieldRow>
        <Field label="担当者名" required half error={te.nicchoseiTantosha}>
          <UIInput value={d.nicchoseiTantosha||""} hasError={!!te.nicchoseiTantosha}
            onChange={e => { upd("nicchoseiTantosha", e.target.value); clr("nicchoseiTantosha"); if (!e.target.value) upd("nicchoseiTantoshaKana",""); }}
            placeholder="例：鈴木 一郎" {...tantoshaFg} />
        </Field>
        <Field label="フリガナ" required half error={te.nicchoseiTantoshaKana}>
          <UIInput value={d.nicchoseiTantoshaKana||""} hasError={!!te.nicchoseiTantoshaKana} onlyKatakana
            onChange={e => { upd("nicchoseiTantoshaKana", e.target.value); clr("nicchoseiTantoshaKana"); }}
            placeholder="スズキ イチロウ" />
        </Field>
      </FieldRow>
      <Field label="連絡先電話番号" required hint={!te.nicchoseiDenwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.nicchoseiDenwa}>
        <UIInput value={d.nicchoseiDenwa||""} hasError={!!te.nicchoseiDenwa} numHyphen
          onChange={e => { upd("nicchoseiDenwa", e.target.value); clr("nicchoseiDenwa"); }} placeholder="例：090-1234-5678" style={{ maxWidth:240 }} />
      </Field>
      <Field label="導入希望日時" required error={te.nohinhopoBijitsu}>
        <UITextarea value={d.nohinhopoBijitsu||""} hasError={!!te.nohinhopoBijitsu}
          onChange={e => { upd("nohinhopoBijitsu", e.target.value); clr("nohinhopoBijitsu"); }}
          placeholder={"例：5月1日 午後希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
      </Field>
      <Field label="備考">
        <UITextarea value={d.biko||""} onChange={e => upd("biko", e.target.value)} placeholder="日程調整に関する補足事項があれば記入してください" />
      </Field>
    </Card>
  </>);
};

// ==================== フロントWAN本部（新規店）フォーム ====================
const FrontWanNewTabContent = ({ tab, form, updTab, clrTab, errors }) => {
  const d     = tab.data;
  const te    = errors || {};
  const tabId = tab.id;

  const upd  = (k, v)   => updTab(tabId, k, v);
  const updM = (updates) => updTab(tabId, "__many__", updates);
  const clr  = (k)       => clrTab(tabId, k);

  const wanMonthly = calcWanMonthly(d);

  // 同時申込中の新規店舗タブ一覧（単店・店舗追加）
  const tenpoTabs = (form?.tabs || []).filter(t =>
    t.id !== tabId && (t.type === "新規_単店" || t.type === "新規_店舗追加")
  );

  // 連携中の店舗タブ
  const linkedTab = tenpoTabs.find(t => t.id === d.linkedTabId) || null;
  const linkedData = linkedTab?.data || {};
  const linkedName = linkedData.tenpoName || "";

  return (<>
    {/* 本部情報 */}
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:17 }}>🏢</span>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy }}>本部情報</h3>
        </div>
        <button onClick={() => { if (window.confirm("入力内容をリセットします。よいですか？")) updTab(tabId, "__reset__", null); }}
          style={{ fontSize:12, fontWeight:600, color:C.muted, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:FONT }}>
          🔄 リセット
        </button>
      </div>

      <Field label="本部名" required error={te.honbuName}>
        <UIInput value={d.honbuName||""} hasError={!!te.honbuName}
          onChange={e => { upd("honbuName", e.target.value); clr("honbuName"); if (!e.target.value) upd("honbuNameKana",""); }}
          placeholder="例：株式会社〇〇サロン 本部" />
      </Field>
      <Field label="本部名フリガナ" required hint={!te.honbuNameKana ? "手動入力（カタカナ）" : undefined} error={te.honbuNameKana}>
        <UIInput value={d.honbuNameKana||""} hasError={!!te.honbuNameKana} onlyKatakana
          onChange={e => { upd("honbuNameKana", e.target.value); clr("honbuNameKana"); }}
          placeholder="例：カブシキガイシャ マルマルサロン ホンブ" />
      </Field>

      {/* フロントWAN本部申込み店舗 */}
      <Field label="フロントWAN本部申込み店舗" required error={te.linkedTabId}
        hint={!te.linkedTabId ? "本部機能を追加する店舗を選択してください" : undefined}>
        {tenpoTabs.length === 0 ? (
          <div style={{ padding:"12px 16px", background:"#fef9c3", border:"1.5px solid #fde047", borderRadius:8, fontSize:13, color:"#854d0e", lineHeight:1.7 }}>
            ⚠️ 店舗の申込書がありません。<br />
            先に単店または店舗追加の申込書を作成してください。
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {tenpoTabs.map(t => {
              const tName = t.data?.tenpoName || `（店舗名未入力：${t.id.slice(-4)}）`;
              const isSelected = d.linkedTabId === t.id;
              return (
                <label key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, border:`1.5px solid ${isSelected?C.teal:te.linkedTabId?C.danger:C.border}`, background:isSelected?C.tealLight:te.linkedTabId?"#fff5f5":C.white, cursor:"pointer", transition:"all .15s" }}>
                  <input type="radio" name={`linkedTabId-${tabId}`} value={t.id} checked={isSelected}
                    onChange={() => { upd("linkedTabId", t.id); clr("linkedTabId"); }} />
                  <span style={{ fontSize:13.5, fontWeight:isSelected?700:400, color:isSelected?C.tealDark:C.text }}>{tName}</span>
                </label>
              );
            })}
          </div>
        )}
      </Field>

      {/* 連携店舗の住所を自動反映（グレーアウト・入力不可） */}
      {linkedTab && (
        <div style={{ marginTop:4, padding:"14px 16px", background:"#f8fafc", border:`1px solid ${C.border}`, borderRadius:10 }}>
          <div style={{ fontSize:12, color:C.tealDark, fontWeight:700, marginBottom:10 }}>
            📍 {linkedName} の住所・電話番号が自動反映されます
          </div>
          <FieldRow>
            <Field label="郵便番号" half>
              <UIInput value={linkedData.yubinBango||""} disabled style={{ background:"#f0f2f5", color:C.muted }} />
            </Field>
            <Field label="電話番号" half>
              <UIInput value={linkedData.denwa||""} disabled style={{ background:"#f0f2f5", color:C.muted }} />
            </Field>
          </FieldRow>
          <Field label="住所">
            <UIInput value={linkedData.jusho||""} disabled style={{ background:"#f0f2f5", color:C.muted }} />
          </Field>
          <Field label="番地・建物名以降">
            <UIInput value={linkedData.jusho2||""} disabled style={{ background:"#f0f2f5", color:C.muted }} />
          </Field>
        </div>
      )}
    </Card>

    {/* LinQ2メールアドレス */}
    <Card>
      <SecTitle icon="✉️">LinQ2メールアドレス</SecTitle>
      <Field label="LinQ2メールアドレス" required={!d.linq2MailNotUse} error={te.linq2MailPrefix}>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          <UIInput value={d.linq2MailPrefix||""} hasError={!!te.linq2MailPrefix}
            noZenkaku inputMode="email" disabled={!!d.linq2MailNotUse}
            style={{ borderRadius:"8px 0 0 8px", flex:1, minWidth:0 }}
            onChange={e => { const v=e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g,""); upd("linq2MailPrefix",v); clr("linq2MailPrefix"); }}
            placeholder="例：salon-front" />
          <div style={{ padding:"9px 14px", background:"#f0f4f8", border:`1.5px solid ${te.linq2MailPrefix?C.danger:C.border}`, borderLeft:"none", borderRadius:"0 8px 8px 0", fontSize:14, color:C.muted, whiteSpace:"nowrap", flexShrink:0 }}>
            @tbqm.jp
          </div>
        </div>
        {!te.linq2MailPrefix && d.linq2MailPrefix && !d.linq2MailNotUse && (
          <div style={{ marginTop:6, fontSize:12.5, color:C.teal }}>✅ 完成形：{d.linq2MailPrefix}@tbqm.jp</div>
        )}
      </Field>
      <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none", marginBottom:14 }}>
        <input type="checkbox" checked={!!d.linq2MailNotUse} style={{ width:16, height:16, cursor:"pointer" }}
          onChange={e => { updM({ linq2MailNotUse:e.target.checked, linq2MailPrefix:e.target.checked?"":d.linq2MailPrefix }); clr("linq2MailPrefix"); }} />
        LinQ2メールアドレスは使用しない
      </label>
    </Card>

    {/* サービス選択 */}
    <Card>
      <SecTitle icon="📦">サービス選択</SecTitle>
      <div style={{ padding:"10px 14px", background:"#f0f4f8", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13.5, color:C.navy, fontWeight:600, marginBottom:14 }}>
        WAN本部　{fmtPrice(WAN_HONBU_BASE)}/月（固定）
      </div>
      <Field label="オプション">
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.wanLanEnabled?C.teal:C.border}`, background:d.wanLanEnabled?C.tealLight:C.white, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.wanLanEnabled} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("wanLanEnabled", e.target.checked)} />
            <span style={{ fontSize:13, color:d.wanLanEnabled?C.tealDark:C.text, fontWeight:d.wanLanEnabled?600:400, flex:1 }}>LAN</span>
            <span style={{ fontSize:12, color:C.muted }}>{fmtPrice(LAN_PRICE)}/台</span>
          </label>
          {d.wanLanEnabled && (
            <div style={{ paddingLeft:36, marginTop:4 }}>
              <Field label="LAN台数" half>
                <UISelect value={d.wanLanCount||1} onChange={e => upd("wanLanCount", Number(e.target.value))} style={{ maxWidth:160 }}>
                  {LAN_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}台　{fmtPrice(n*LAN_PRICE)}</option>)}
                </UISelect>
              </Field>
            </div>
          )}
          <Field label="LinQ Concierge for Manager">
            <UISelect value={d.wanConciergeManager||"0台"} onChange={e => upd("wanConciergeManager", e.target.value)} style={{ maxWidth:260 }}>
              {WAN_CONCIERGE_MANAGER_OPTIONS.map((opt, i) => (
                <option key={opt} value={opt}>{opt}　{i===0?"¥0":fmtPrice(i*WAN_CONCIERGE_MANAGER_PRICE)}</option>
              ))}
            </UISelect>
          </Field>
          <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.wanBarcode?C.teal:C.border}`, background:d.wanBarcode?C.tealLight:C.white, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.wanBarcode} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("wanBarcode", e.target.checked)} />
            <span style={{ fontSize:13, color:d.wanBarcode?C.tealDark:C.text, fontWeight:d.wanBarcode?600:400, flex:1 }}>バーコード決済</span>
            <span style={{ fontSize:12, color:C.muted }}>¥0</span>
          </label>
          <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.wanShozai?C.teal:C.border}`, background:d.wanShozai?C.tealLight:C.white, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.wanShozai} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("wanShozai", e.target.checked)} />
            <span style={{ fontSize:13, color:d.wanShozai?C.tealDark:C.text, fontWeight:d.wanShozai?600:400, flex:1 }}>粧材管理</span>
            <span style={{ fontSize:12, color:C.muted }}>{fmtPrice(1000)}/月</span>
          </label>
        </div>
      </Field>
      {/* 月額合計 */}
      <div style={{ background:C.tealLight, border:`1.5px solid ${C.teal}`, borderRadius:12, padding:"14px 18px", marginTop:8 }}>
        <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:700, marginBottom:8 }}>💰 月額料金合計（税別）</div>
        <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:13 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>WAN本部</span><span>{fmtPrice(WAN_HONBU_BASE)}</span></div>
          {d.wanLanEnabled && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>LAN（{d.wanLanCount||1}台）</span><span>{fmtPrice((d.wanLanCount||1)*LAN_PRICE)}</span></div>}
          {d.wanConciergeManager && d.wanConciergeManager!=="0台" && (() => {
            const idx = WAN_CONCIERGE_MANAGER_OPTIONS.indexOf(d.wanConciergeManager);
            return <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>Concierge for Manager（{d.wanConciergeManager}）</span><span>{fmtPrice(idx*WAN_CONCIERGE_MANAGER_PRICE)}</span></div>;
          })()}
          {d.wanShozai && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>粧材管理</span><span>{fmtPrice(1000)}</span></div>}
          <div style={{ borderTop:`1px solid ${C.teal}`, marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:15 }}>
            <span>合計</span><span style={{ color:C.tealDark }}>{fmtPrice(wanMonthly)}</span>
          </div>
        </div>
      </div>
    </Card>

    {/* 日程調整 */}
    <Card>
      <SecTitle icon="🗓️">日程調整</SecTitle>
      <div style={{ padding:"14px 18px", background:C.tealLight, border:`1.5px solid ${C.teal}`, borderRadius:10, fontSize:13.5, color:C.tealDeep, lineHeight:1.8 }}>
        {linkedName
          ? <>📅 日程調整は <strong>「{linkedName}」</strong> と同じになります。<br /><span style={{ fontSize:12.5, color:C.tealDark }}>必要があれば店舗の申込書タブで入力内容を確認してください。</span></>
          : <>📅 日程調整は申込み店舗と同じになります。<br /><span style={{ fontSize:12.5, color:C.tealDark }}>上で店舗を選択すると、その店舗の日程と同じになります。</span></>
        }
      </div>
    </Card>

    {/* 備考 */}
    <Card>
      <SecTitle icon="📝">備考</SecTitle>
      <Field label="備考">
        <UITextarea value={d.biko||""} onChange={e => upd("biko", e.target.value)} placeholder="特記事項があれば記入してください" />
      </Field>
    </Card>
  </>);
};

// ==================== 端末入替フォーム ====================
const NyuukaeTabContent = ({ tab, form, updTab, clrTab, errors }) => {
  const d     = tab.data;
  const te    = errors || {};
  const tabId = tab.id;

  const upd  = (k, v)   => updTab(tabId, k, v);
  const updM = (updates) => updTab(tabId, "__many__", updates);
  const clr  = (k)       => clrTab(tabId, k);

  const tantoshaFg = useFurigana(
    () => d.nicchoseiTantoshaKana || "",
    v  => { upd("nicchoseiTantoshaKana", v); if (v) clr("nicchoseiTantoshaKana"); }
  );

  return (<>
    {/* 店舗情報 */}
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:17 }}>🏪</span>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy }}>店舗情報</h3>
        </div>
        <button onClick={() => { if (window.confirm("入力内容をリセットします。よいですか？")) updTab(tabId, "__reset__", null); }}
          style={{ fontSize:12, fontWeight:600, color:C.muted, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:FONT }}>
          🔄 リセット
        </button>
      </div>

      <Field label="店舗名" required error={te.tenpoName}>
        <UIInput value={d.tenpoName||""} hasError={!!te.tenpoName}
          onChange={e => { upd("tenpoName", e.target.value); clr("tenpoName"); if (!e.target.value) upd("tenpoNameKana",""); }}
          placeholder="例：ヘアサロン〇〇 渋谷店" />
      </Field>
      <Field label="店舗名フリガナ" required hint={!te.tenpoNameKana ? "手動入力（カタカナ）" : undefined} error={te.tenpoNameKana}>
        <UIInput value={d.tenpoNameKana||""} hasError={!!te.tenpoNameKana} onlyKatakana
          onChange={e => { upd("tenpoNameKana", e.target.value); clr("tenpoNameKana"); }}
          placeholder="例：ヘアサロン マルマル シブヤテン" />
      </Field>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
          <input type="checkbox" checked={!!d.sameAsKeiyakusha}
            onChange={e => {
              if (e.target.checked) {
                updM({ sameAsKeiyakusha:true, yubinBango:form.yubinBango, jusho:form.jusho, jusho2:form.jusho2, denwa:form.denwa });
                ["yubinBango","jusho","jusho2","denwa"].forEach(k => clr(k));
              } else {
                updM({ sameAsKeiyakusha:false, yubinBango:"", jusho:"", jusho2:"", denwa:"" });
              }
            }} />
          契約者と同じ住所・電話番号を使う
        </label>
        {d.sameAsKeiyakusha && (
          <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:6, padding:"8px 12px", fontSize:12.5, color:"#854d0e", marginTop:6 }}>
            ⚠️ 契約者の住所・電話番号がコピーされます。店舗情報として正しいか確認してください。
          </div>
        )}
      </div>

      <ZipField value={d.yubinBango||""} onChange={v => { upd("yubinBango",v); clr("yubinBango"); }} onAddressFound={addr => { upd("jusho",addr); clr("jusho"); }} addressInputId={`nyuukae-jusho2-${tabId}`} required errors={te} fieldKey="yubinBango" clearError={k => clr(k)} disabled={!!d.sameAsKeiyakusha} />
      <Field label="住所（自動入力）" error={te.jusho}>
        <UIInput value={d.jusho||""} hasError={!!te.jusho} disabled style={{ background:d.jusho?"#f0f4f8":undefined, color:C.muted }} placeholder="郵便番号を入力すると自動入力されます" />
      </Field>
      <Field label="番地・建物名以降" required hint={!te.jusho2 ? "例：1-2-3　〇〇マンション101号室" : undefined} error={te.jusho2}>
        <UIInput id={`nyuukae-jusho2-${tabId}`} value={d.jusho2||""} hasError={!!te.jusho2} disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("jusho2", e.target.value); clr("jusho2"); }} placeholder="例：1-2-3　〇〇マンション101号室" />
      </Field>
      <Field label="電話番号" required hint={!te.denwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.denwa}>
        <UIInput value={d.denwa||""} hasError={!!te.denwa} numHyphen disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("denwa", e.target.value); clr("denwa"); }} placeholder="例：03-1234-5678" />
      </Field>

      <NameFields
        seiValue={d.sekininshaLastName} meiValue={d.sekininshaFirstName}
        seiKana={d.sekininshaLastNameKana} meiKana={d.sekininshaFirstNameKana}
        onSeiChange={v => upd("sekininshaLastName",v)} onMeiChange={v => upd("sekininshaFirstName",v)}
        onSeiKanaChange={v => upd("sekininshaLastNameKana",v)} onMeiKanaChange={v => upd("sekininshaFirstNameKana",v)}
        labelSei="責任者　姓（任意）" labelMei="責任者　名（任意）"
        placeholderSei="例：田中" placeholderMei="例：美咲" placeholderSeiKana="例：タナカ" placeholderMeiKana="例：ミサキ"
        required={false} errors={{}} keyKanji_sei="x" keyKanji_mei="x" keyKana_sei="x" keyKana_mei="x" />
    </Card>

    {/* 機器情報 */}
    <Card>
      <SecTitle icon="📦">機器情報</SecTitle>
      <FieldRow>
        <Field label="入替台数" required half>
          <UISelect value={d.nyutaiDaisuu||"1台"} onChange={e => upd("nyutaiDaisuu", e.target.value)}>
            {NYUTAI_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </UISelect>
        </Field>
        <Field label="機器引取" required half error={te.kikiHikitori}>
          <UISelect value={d.kikiHikitori||""} style={{ borderColor: te.kikiHikitori ? C.danger : undefined }} onChange={e => {
            upd("kikiHikitori", e.target.value);
            if (e.target.value === "なし") updM({ hikitoriKiki:[], hikitoriSonota:"" });
            if (e.target.value) clr("kikiHikitori");
          }}>
            <option value="">― 選択してください ―</option>
            <option>あり</option><option>なし</option>
          </UISelect>
        </Field>
      </FieldRow>
      {d.kikiHikitori === "あり" && (
        <Field label="引取機器（複数選択可）" required error={te.hikitoriKiki}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {HIKITORI_KIKI_LIST.map(k => {
              const checked = (d.hikitoriKiki||[]).includes(k);
              return (
                <label key={k} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, border:`1px solid ${checked?C.teal:te.hikitoriKiki?C.danger:C.border}`, background:checked?C.tealLight:C.white, cursor:"pointer", fontSize:13, fontWeight:checked?600:400, transition:"all .15s" }}>
                  <input type="checkbox" checked={checked} style={{ width:14, height:14, cursor:"pointer" }}
                    onChange={e => { const next=e.target.checked?[...(d.hikitoriKiki||[]),k]:(d.hikitoriKiki||[]).filter(x=>x!==k); upd("hikitoriKiki",next); clr("hikitoriKiki"); }} />
                  {k}
                </label>
              );
            })}
          </div>
          {(d.hikitoriKiki||[]).includes("その他") && (
            <UIInput value={d.hikitoriSonota||""} hasError={!!te.hikitoriSonota} onChange={e => { upd("hikitoriSonota", e.target.value); clr("hikitoriSonota"); }} placeholder="その他の機器名を入力" style={{ marginTop:8 }} />
          )}
          {te.hikitoriSonota && <div style={{ fontSize:12, color:C.danger, marginTop:4 }}>{te.hikitoriSonota}</div>}
        </Field>
      )}
      <Field label="備考（機器について）">
        <UITextarea value={d.kikoHosoku||""} onChange={e => upd("kikoHosoku", e.target.value)} placeholder="機器に関する補足事項があれば記入してください" />
      </Field>
    </Card>

    {/* 日程調整 */}
    <Card>
      <SecTitle icon="🗓️">日程調整</SecTitle>
      <Field label="日程調整先" required error={te.nicchoseiSaki} hint={!te.nicchoseiSaki && loadMyInfo() ? "「営業」を選ぶとマイ情報が自動入力されます" : undefined}>
        <UISelect value={d.nicchoseiSaki||""} onChange={e => {
          const val = e.target.value;
          if (val === "営業") {
            const my = loadMyInfo();
            if (my) { updM({ nicchoseiSaki:"営業", nicchoseiTantosha:my.tantosha||"", nicchoseiTantoshaKana:my.tantoshaKana||"", nicchoseiDenwa:my.tantoshaDenwa||"" }); ["nicchoseiTantosha","nicchoseiTantoshaKana","nicchoseiDenwa"].forEach(k=>clr(k)); }
            else { upd("nicchoseiSaki",val); }
          } else {
            updM({ nicchoseiSaki:val, nicchoseiTantosha:"", nicchoseiTantoshaKana:"", nicchoseiDenwa:"" });
          }
          clr("nicchoseiSaki");
        }} style={{ maxWidth:220, borderColor:te.nicchoseiSaki?C.danger:undefined }}>
          <option value="">― 選択してください ―</option>
          {NICCHOSEISAKISAKI_LIST.map(o => <option key={o}>{o}</option>)}
        </UISelect>
      </Field>
      <FieldRow>
        <Field label="担当者名" required half error={te.nicchoseiTantosha}>
          <UIInput value={d.nicchoseiTantosha||""} hasError={!!te.nicchoseiTantosha}
            onChange={e => { upd("nicchoseiTantosha", e.target.value); clr("nicchoseiTantosha"); if (!e.target.value) upd("nicchoseiTantoshaKana",""); }}
            placeholder="例：鈴木 一郎" {...tantoshaFg} />
        </Field>
        <Field label="フリガナ" required half error={te.nicchoseiTantoshaKana}>
          <UIInput value={d.nicchoseiTantoshaKana||""} hasError={!!te.nicchoseiTantoshaKana} onlyKatakana
            onChange={e => { upd("nicchoseiTantoshaKana", e.target.value); clr("nicchoseiTantoshaKana"); }}
            placeholder="スズキ イチロウ" />
        </Field>
      </FieldRow>
      <Field label="連絡先電話番号" required hint={!te.nicchoseiDenwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.nicchoseiDenwa}>
        <UIInput value={d.nicchoseiDenwa||""} hasError={!!te.nicchoseiDenwa} numHyphen
          onChange={e => { upd("nicchoseiDenwa", e.target.value); clr("nicchoseiDenwa"); }} placeholder="例：090-1234-5678" style={{ maxWidth:240 }} />
      </Field>
      <div style={{ marginBottom:12 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
          <input type="checkbox" checked={!!d.jizenchoosa}
            onChange={e => { upd("jizenchoosa", e.target.checked); if (!e.target.checked) upd("chosaDate", ""); }}
            style={{ width:15, height:15, cursor:"pointer" }} />
          事前調査を実施する
        </label>
        {d.jizenchoosa && (
          <div style={{ marginTop:8, padding:"8px 12px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, fontSize:12.5, color:"#92400e" }}>
            ※事前調査を実施する場合は別途作業料金が発生します
          </div>
        )}
      </div>
      {d.jizenchoosa && (
        <Field label="調査希望日時" required error={te.chosaDate}>
          <UITextarea value={d.chosaDate||""} hasError={!!te.chosaDate}
            onChange={e => { upd("chosaDate", e.target.value); clr("chosaDate"); }}
            placeholder={"例：4月15日 午前中希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
        </Field>
      )}
      <Field label="導入希望日時" required error={te.nohinhopoBijitsu}>
        <UITextarea value={d.nohinhopoBijitsu||""} hasError={!!te.nohinhopoBijitsu}
          onChange={e => { upd("nohinhopoBijitsu", e.target.value); clr("nohinhopoBijitsu"); }}
          placeholder={"例：4月15日 午前中希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
      </Field>
      <Field label="備考（日程について）">
        <UITextarea value={d.nicchoseiHosoku||""} onChange={e => upd("nicchoseiHosoku", e.target.value)} placeholder="日程調整に関する補足事項があれば記入してください" />
      </Field>
    </Card>
  </>);
};

// ==================== 端末入替（変更あり）フォーム ====================
const NyuukaeHenkoTabContent = ({ tab, form, updTab, clrTab, errors }) => {
  const d     = tab.data;
  const te    = errors || {};
  const tabId = tab.id;
  const upd   = (k, v)   => updTab(tabId, k, v);
  const updM  = (updates) => updTab(tabId, "__many__", updates);
  const clr   = (k)       => clrTab(tabId, k);
  const khTotal = calcKhTotal(d);

  const tantoshaFg = useFurigana(
    () => d.nicchoseiTantoshaKana || "",
    v  => { upd("nicchoseiTantoshaKana", v); if (v) clr("nicchoseiTantoshaKana"); }
  );

  const optRow = (checked) => ({
    display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8,
    border:`1px solid ${checked ? C.teal : C.border}`,
    background: checked ? C.tealLight : C.white, cursor:"pointer", transition:"all .15s",
  });

  return (<>
    {/* 店舗情報 */}
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:17 }}>🏪</span>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy }}>店舗情報</h3>
        </div>
        <button onClick={() => { if (window.confirm("入力内容をリセットします。よいですか？")) updTab(tabId, "__reset__", null); }}
          style={{ fontSize:12, fontWeight:600, color:C.muted, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:FONT }}>
          🔄 リセット
        </button>
      </div>
      <Field label="店舗名" required error={te.tenpoName}>
        <UIInput value={d.tenpoName||""} hasError={!!te.tenpoName}
          onChange={e => { upd("tenpoName", e.target.value); clr("tenpoName"); if (!e.target.value) upd("tenpoNameKana",""); }}
          placeholder="例：ヘアサロン〇〇 渋谷店" />
      </Field>
      <Field label="店舗名フリガナ" required hint={!te.tenpoNameKana ? "手動入力（カタカナ）" : undefined} error={te.tenpoNameKana}>
        <UIInput value={d.tenpoNameKana||""} hasError={!!te.tenpoNameKana} onlyKatakana
          onChange={e => { upd("tenpoNameKana", e.target.value); clr("tenpoNameKana"); }}
          placeholder="例：ヘアサロン マルマル シブヤテン" />
      </Field>
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
          <input type="checkbox" checked={!!d.sameAsKeiyakusha}
            onChange={e => {
              if (e.target.checked) {
                updM({ sameAsKeiyakusha:true, yubinBango:form.yubinBango, jusho:form.jusho, jusho2:form.jusho2, denwa:form.denwa });
                ["yubinBango","jusho","jusho2","denwa"].forEach(k => clr(k));
              } else {
                updM({ sameAsKeiyakusha:false, yubinBango:"", jusho:"", jusho2:"", denwa:"" });
              }
            }} />
          契約者と同じ住所・電話番号を使う
        </label>
        {d.sameAsKeiyakusha && (
          <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:6, padding:"8px 12px", fontSize:12.5, color:"#854d0e", marginTop:6 }}>
            ⚠️ 契約者の住所・電話番号がコピーされます。店舗情報として正しいか確認してください。
          </div>
        )}
      </div>
      <ZipField value={d.yubinBango||""} onChange={v => { upd("yubinBango",v); clr("yubinBango"); }} onAddressFound={addr => { upd("jusho",addr); clr("jusho"); }} addressInputId={`nkh-jusho2-${tabId}`} required errors={te} fieldKey="yubinBango" clearError={k => clr(k)} disabled={!!d.sameAsKeiyakusha} />
      <Field label="住所（自動入力）" error={te.jusho}>
        <UIInput value={d.jusho||""} hasError={!!te.jusho} disabled style={{ background:d.jusho?"#f0f4f8":undefined, color:C.muted }} placeholder="郵便番号を入力すると自動入力されます" />
      </Field>
      <Field label="番地・建物名以降" required hint={!te.jusho2 ? "例：1-2-3　〇〇マンション101号室" : undefined} error={te.jusho2}>
        <UIInput id={`nkh-jusho2-${tabId}`} value={d.jusho2||""} hasError={!!te.jusho2} disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("jusho2", e.target.value); clr("jusho2"); }} placeholder="例：1-2-3　〇〇マンション101号室" />
      </Field>
      <Field label="電話番号" required hint={!te.denwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.denwa}>
        <UIInput value={d.denwa||""} hasError={!!te.denwa} numHyphen disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("denwa", e.target.value); clr("denwa"); }} placeholder="例：03-1234-5678" />
      </Field>
      <NameFields
        seiValue={d.sekininshaLastName} meiValue={d.sekininshaFirstName}
        seiKana={d.sekininshaLastNameKana} meiKana={d.sekininshaFirstNameKana}
        onSeiChange={v => upd("sekininshaLastName",v)} onMeiChange={v => upd("sekininshaFirstName",v)}
        onSeiKanaChange={v => upd("sekininshaLastNameKana",v)} onMeiKanaChange={v => upd("sekininshaFirstNameKana",v)}
        labelSei="責任者　姓（任意）" labelMei="責任者　名（任意）"
        placeholderSei="例：田中" placeholderMei="例：美咲" placeholderSeiKana="例：タナカ" placeholderMeiKana="例：ミサキ"
        required={false} errors={{}} keyKanji_sei="x" keyKanji_mei="x" keyKana_sei="x" keyKana_mei="x" />
    </Card>

    {/* 機器情報 */}
    <Card>
      <SecTitle icon="📦">機器情報</SecTitle>
      <FieldRow>
        <Field label="入替台数" required half>
          <UISelect value={d.nyutaiDaisuu||"1台"} onChange={e => upd("nyutaiDaisuu", e.target.value)}>
            {NYUTAI_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </UISelect>
        </Field>
        <Field label="機器引取" required half error={te.kikiHikitori}>
          <UISelect value={d.kikiHikitori||""} style={{ borderColor: te.kikiHikitori ? C.danger : undefined }} onChange={e => {
            upd("kikiHikitori", e.target.value);
            if (e.target.value === "なし") updM({ hikitoriKiki:[], hikitoriSonota:"" });
            if (e.target.value) clr("kikiHikitori");
          }}>
            <option value="">― 選択してください ―</option>
            <option>あり</option><option>なし</option>
          </UISelect>
        </Field>
      </FieldRow>
      {d.kikiHikitori === "あり" && (
        <Field label="引取機器（複数選択可）" required error={te.hikitoriKiki}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {HIKITORI_KIKI_LIST.map(k => {
              const checked = (d.hikitoriKiki||[]).includes(k);
              return (
                <label key={k} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, border:`1px solid ${checked?C.teal:te.hikitoriKiki?C.danger:C.border}`, background:checked?C.tealLight:C.white, cursor:"pointer", fontSize:13, fontWeight:checked?600:400, transition:"all .15s" }}>
                  <input type="checkbox" checked={checked} style={{ width:14, height:14, cursor:"pointer" }}
                    onChange={e => { const next=e.target.checked?[...(d.hikitoriKiki||[]),k]:(d.hikitoriKiki||[]).filter(x=>x!==k); upd("hikitoriKiki",next); clr("hikitoriKiki"); }} />
                  {k}
                </label>
              );
            })}
          </div>
          {(d.hikitoriKiki||[]).includes("その他") && (
            <UIInput value={d.hikitoriSonota||""} hasError={!!te.hikitoriSonota} onChange={e => { upd("hikitoriSonota", e.target.value); clr("hikitoriSonota"); }} placeholder="その他の機器名を入力" style={{ marginTop:8 }} />
          )}
          {te.hikitoriSonota && <div style={{ fontSize:12, color:C.danger, marginTop:4 }}>{te.hikitoriSonota}</div>}
        </Field>
      )}
      <Field label="備考（機器について）">
        <UITextarea value={d.kikoHosoku||""} onChange={e => upd("kikoHosoku", e.target.value)} placeholder="機器に関する補足事項があれば記入してください" />
      </Field>
    </Card>

    {/* サービス選択 */}
    <Card>
      <SecTitle icon="📋">サービス選択</SecTitle>
      <p style={{ fontSize:12.5, color:C.muted, marginBottom:14 }}>入替後の契約内容をすべて選択してください。月額合計が自動計算されます。</p>

      <Field label="申込パッケージ" required error={te.package}>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {PACKAGES.map(pkg => (
            <label key={pkg} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"10px 24px", borderRadius:10, border:`1.5px solid ${d.package===pkg ? C.teal : te.package ? C.danger : C.border}`, background:d.package===pkg ? C.tealLight : te.package ? "#fff5f5" : C.white, fontSize:13.5, fontWeight:d.package===pkg?700:400 }}>
              <input type="radio" name={`nkhpkg-${tabId}`} value={pkg} checked={d.package===pkg}
                onChange={() => { updM({ package:pkg, concierge:"", conciergeActual:"" }); clr("package"); clr("concierge"); }} />
              <span>{pkg}</span>
              <span style={{ fontSize:12, color:C.muted, marginLeft:4 }}>{fmtPrice(PACKAGE_BASE[pkg])}/月</span>
            </label>
          ))}
        </div>
        {!d.package && <p style={{ fontSize:12, color:C.muted, marginTop:6 }}>パッケージを選択するとConcierge台数・オプション・月額合計が表示されます</p>}
      </Field>

      {d.package && (<>
        <Field label="LinQ Concierge 台数" required hint={d.package==="ベーシックパック+"?"2台まで料金込み。3台目から追加料金が発生します。":undefined} error={te.concierge}>
          <UISelect value={d.concierge||""} hasError={!!te.concierge}
            onChange={e => { upd("concierge",e.target.value); upd("conciergeActual",""); clr("concierge"); }}
            style={{ maxWidth:260 }}>
            <option value="">-- 選択してください --</option>
            {(CONCIERGE_BANDS[d.package]||[]).map(o => (
              <option key={o} value={o}>{o}　¥{(CONCIERGE_PRICE[d.package]?.[o]??0).toLocaleString()}/月</option>
            ))}
          </UISelect>
          {CONCIERGE_NEEDS_ACTUAL.includes(d.concierge) && (
            <div style={{ marginTop:8 }}>
              <Field label="実台数" required error={te.conciergeActual}>
                <UIInput value={d.conciergeActual||""} hasError={!!te.conciergeActual}
                  onChange={e => { upd("conciergeActual",e.target.value); clr("conciergeActual"); }}
                  placeholder="例：8" style={{ maxWidth:120 }} />
              </Field>
            </div>
          )}
        </Field>

        <Field label="オプション（複数選択可）">
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {/* CTI */}
            <label style={optRow(d.ctiChecked)}>
              <input type="checkbox" checked={!!d.ctiChecked} style={{ width:16, height:16, cursor:"pointer" }}
                onChange={e => { upd("ctiChecked", e.target.checked); if (!e.target.checked) updM({ ctiKeizoCount:0, ctiAddCount:0 }); }} />
              <span style={{ fontSize:13, color:d.ctiChecked?C.tealDark:C.text, fontWeight:d.ctiChecked?600:400, flex:1 }}>CTI</span>
              <span style={{ fontSize:12, color:C.muted }}>{d.package ? (CTI_PRICE[d.package]>0 ? fmtPrice(CTI_PRICE[d.package]) : "¥0") : "¥0"}</span>
            </label>
            {d.ctiChecked && (
              <div style={{ paddingLeft:36, marginTop:4, marginBottom:4, display:"flex", flexDirection:"column", gap:8 }}>
                {te.ctiCount && <div style={{ fontSize:12, color:C.danger }}>⚠ {te.ctiCount}</div>}
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:12.5, color:C.muted, minWidth:64 }}>継続台数</span>
                  <UISelect value={d.ctiKeizoCount||0} onChange={e => upd("ctiKeizoCount", Number(e.target.value))} style={{ maxWidth:120 }}>
                    {Array.from({length:6},(_,i)=>i).map(n => <option key={n} value={n}>{n}台</option>)}
                  </UISelect>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:12.5, color:C.muted, minWidth:64 }}>追加台数</span>
                  <UISelect value={d.ctiAddCount||0} onChange={e => upd("ctiAddCount", Number(e.target.value))} style={{ maxWidth:120 }}>
                    {Array.from({length:6},(_,i)=>i).map(n => <option key={n} value={n}>{n}台</option>)}
                  </UISelect>
                </div>
                {((d.ctiKeizoCount||0) + (d.ctiAddCount||0)) > 0 && (
                  <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:600 }}>
                    合計 {(d.ctiKeizoCount||0)+(d.ctiAddCount||0)}台　{fmtPrice(CTI_PRICE[d.package]||0)}/月
                  </div>
                )}
              </div>
            )}

            {/* 通常オプション */}
            {OPTIONS_LIST.filter(o => o.key !== "cti").map(opt => {
              const dataKey = KH_OPT_KEY[opt.key];
              return (
                <label key={opt.key} style={optRow(d[dataKey])}>
                  <input type="checkbox" checked={!!d[dataKey]} style={{ width:16, height:16, cursor:"pointer" }}
                    onChange={e => upd(dataKey, e.target.checked)} />
                  <span style={{ fontSize:13, color:d[dataKey]?C.tealDark:C.text, fontWeight:d[dataKey]?600:400, flex:1 }}>{opt.label}</span>
                  <span style={{ fontSize:12, color:C.muted }}>{opt.price>0?fmtPrice(opt.price):"¥0"}</span>
                </label>
              );
            })}

            {/* LAN */}
            <label style={optRow(d.lanChecked)}>
              <input type="checkbox" checked={!!d.lanChecked} style={{ width:16, height:16, cursor:"pointer" }}
                onChange={e => { upd("lanChecked", e.target.checked); if (!e.target.checked) updM({ lanKeizoCount:0, lanAddCount:0 }); }} />
              <span style={{ fontSize:13, color:d.lanChecked?C.tealDark:C.text, fontWeight:d.lanChecked?600:400, flex:1 }}>LAN</span>
              <span style={{ fontSize:12, color:C.muted }}>{fmtPrice(LAN_PRICE)}/台</span>
            </label>
            {d.lanChecked && (
              <div style={{ paddingLeft:36, marginTop:4, marginBottom:4, display:"flex", flexDirection:"column", gap:8 }}>
                {te.lanCount && <div style={{ fontSize:12, color:C.danger }}>⚠ {te.lanCount}</div>}
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:12.5, color:C.muted, minWidth:64 }}>継続台数</span>
                  <UISelect value={d.lanKeizoCount||0} onChange={e => upd("lanKeizoCount", Number(e.target.value))} style={{ maxWidth:120 }}>
                    {Array.from({length:6},(_,i)=>i).map(n => <option key={n} value={n}>{n}台</option>)}
                  </UISelect>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:12.5, color:C.muted, minWidth:64 }}>追加台数</span>
                  <UISelect value={d.lanAddCount||0} onChange={e => upd("lanAddCount", Number(e.target.value))} style={{ maxWidth:120 }}>
                    {Array.from({length:6},(_,i)=>i).map(n => <option key={n} value={n}>{n}台</option>)}
                  </UISelect>
                </div>
                {((d.lanKeizoCount||0) + (d.lanAddCount||0)) > 0 && (
                  <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:600 }}>
                    合計 {(d.lanKeizoCount||0)+(d.lanAddCount||0)}台　{fmtPrice(((d.lanKeizoCount||0)+(d.lanAddCount||0))*LAN_PRICE)}/月
                  </div>
                )}
              </div>
            )}

            {/* リライト・磁気 */}
            <div style={{ marginTop:8, paddingTop:10, borderTop:`1px dashed ${C.border}` }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>継続・解約される場合は選択してください</div>
              {[["rewrite","リライト",REWRITE_PRICE],["jiki","磁気",JIKI_PRICE]].map(([key,label,price]) => (
                <div key={key} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                  <span style={{ fontSize:13, color:C.text, minWidth:52 }}>{label}</span>
                  <UISelect value={d[key]||""} onChange={e => upd(key, e.target.value)} style={{ maxWidth:140 }}>
                    <option value="">選択なし</option>
                    {REWRITE_JIKI_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </UISelect>
                  <span style={{ fontSize:12, color:C.muted }}>{d[key]==="継続" ? fmtPrice(price)+"/月" : d[key]==="解約" ? "解約" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </Field>

        {/* 月額合計 */}
        {khTotal !== null && (
          <div style={{ background:C.tealLight, border:`1.5px solid ${C.teal}`, borderRadius:12, padding:"14px 18px", marginTop:8 }}>
            <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:700, marginBottom:8 }}>💰 変更後の月額合計（税別）</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:13 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>基本パッケージ（{d.package}）</span><span>{fmtPrice(PACKAGE_BASE[d.package])}</span></div>
              {d.concierge && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>LinQ Concierge（{d.concierge}）</span><span>{fmtPrice(CONCIERGE_PRICE[d.package]?.[d.concierge]??0)}</span></div>}
              {d.ctiChecked && ((d.ctiKeizoCount||0)+(d.ctiAddCount||0)) > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>CTI（{(d.ctiKeizoCount||0)+(d.ctiAddCount||0)}台）</span><span>{fmtPrice(CTI_PRICE[d.package]||0)}</span></div>}
              {OPTIONS_LIST.filter(o=>o.key!=="cti").map(o => { const k=KH_OPT_KEY[o.key]; return d[k]?<div key={o.key} style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>{o.label}</span><span>{fmtPrice(o.price)}</span></div>:null; })}
              {d.lanChecked && ((d.lanKeizoCount||0)+(d.lanAddCount||0)) > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>LAN（{(d.lanKeizoCount||0)+(d.lanAddCount||0)}台）</span><span>{fmtPrice(((d.lanKeizoCount||0)+(d.lanAddCount||0))*LAN_PRICE)}</span></div>}
              {d.rewrite==="継続" && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>リライト</span><span>{fmtPrice(REWRITE_PRICE)}</span></div>}
              {d.jiki==="継続" && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>磁気</span><span>{fmtPrice(JIKI_PRICE)}</span></div>}
              <div style={{ borderTop:`1px solid ${C.teal}`, marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:15 }}>
                <span>合計</span><span style={{ color:C.tealDark }}>{fmtPrice(khTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </>)}
    </Card>

    {/* 日程調整 */}
    <Card>
      <SecTitle icon="🗓️">日程調整</SecTitle>
      <Field label="日程調整先" required error={te.nicchoseiSaki} hint={!te.nicchoseiSaki && loadMyInfo() ? "「営業」を選ぶとマイ情報が自動入力されます" : undefined}>
        <UISelect value={d.nicchoseiSaki||""} onChange={e => {
          const val = e.target.value;
          if (val === "営業") {
            const my = loadMyInfo();
            if (my) { updM({ nicchoseiSaki:"営業", nicchoseiTantosha:my.tantosha||"", nicchoseiTantoshaKana:my.tantoshaKana||"", nicchoseiDenwa:my.tantoshaDenwa||"" }); ["nicchoseiTantosha","nicchoseiTantoshaKana","nicchoseiDenwa"].forEach(k=>clr(k)); }
            else { upd("nicchoseiSaki",val); }
          } else {
            updM({ nicchoseiSaki:val, nicchoseiTantosha:"", nicchoseiTantoshaKana:"", nicchoseiDenwa:"" });
          }
          clr("nicchoseiSaki");
        }} style={{ maxWidth:220, borderColor:te.nicchoseiSaki?C.danger:undefined }}>
          <option value="">― 選択してください ―</option>
          {NICCHOSEISAKISAKI_LIST.map(o => <option key={o}>{o}</option>)}
        </UISelect>
      </Field>
      <FieldRow>
        <Field label="担当者名" required half error={te.nicchoseiTantosha}>
          <UIInput value={d.nicchoseiTantosha||""} hasError={!!te.nicchoseiTantosha}
            onChange={e => { upd("nicchoseiTantosha", e.target.value); clr("nicchoseiTantosha"); if (!e.target.value) upd("nicchoseiTantoshaKana",""); }}
            placeholder="例：鈴木 一郎" {...tantoshaFg} />
        </Field>
        <Field label="フリガナ" required half error={te.nicchoseiTantoshaKana}>
          <UIInput value={d.nicchoseiTantoshaKana||""} hasError={!!te.nicchoseiTantoshaKana} onlyKatakana
            onChange={e => { upd("nicchoseiTantoshaKana", e.target.value); clr("nicchoseiTantoshaKana"); }}
            placeholder="スズキ イチロウ" />
        </Field>
      </FieldRow>
      <Field label="連絡先電話番号" required hint={!te.nicchoseiDenwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.nicchoseiDenwa}>
        <UIInput value={d.nicchoseiDenwa||""} hasError={!!te.nicchoseiDenwa} numHyphen
          onChange={e => { upd("nicchoseiDenwa", e.target.value); clr("nicchoseiDenwa"); }} placeholder="例：090-1234-5678" style={{ maxWidth:240 }} />
      </Field>
      <div style={{ marginBottom:12 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
          <input type="checkbox" checked={!!d.jizenchoosa}
            onChange={e => { upd("jizenchoosa", e.target.checked); if (!e.target.checked) upd("chosaDate",""); }}
            style={{ width:15, height:15, cursor:"pointer" }} />
          事前調査を実施する
        </label>
        {d.jizenchoosa && (
          <div style={{ marginTop:8, padding:"8px 12px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, fontSize:12.5, color:"#92400e" }}>
            ※事前調査を実施する場合は別途作業料金が発生します
          </div>
        )}
      </div>
      {d.jizenchoosa && (
        <Field label="調査希望日時" required error={te.chosaDate}>
          <UITextarea value={d.chosaDate||""} hasError={!!te.chosaDate}
            onChange={e => { upd("chosaDate", e.target.value); clr("chosaDate"); }}
            placeholder={"例：4月15日 午前中希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
        </Field>
      )}
      <Field label="導入希望日時" required error={te.nohinhopoBijitsu}>
        <UITextarea value={d.nohinhopoBijitsu||""} hasError={!!te.nohinhopoBijitsu}
          onChange={e => { upd("nohinhopoBijitsu", e.target.value); clr("nohinhopoBijitsu"); }}
          placeholder={"例：4月15日 午前中希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
      </Field>
      <Field label="備考（日程について）">
        <UITextarea value={d.nicchoseiHosoku||""} onChange={e => upd("nicchoseiHosoku", e.target.value)} placeholder="日程調整に関する補足事項があれば記入してください" />
      </Field>
    </Card>
  </>);
};

// ==================== 契約変更フォーム ====================
const SETSUCHI_SHA = ["作業員", "営業"];
const CTI_LAN_STATUS = ["なし", "継続", "新たに導入"];
const REWRITE_JIKI_STATUS = ["継続", "解約"];

// 設置者選択
const SetsuchiShaField = ({ value, onChange, error }) => (
  <div style={{ marginTop:8, paddingLeft:4 }}>
    <div style={{ fontSize:12, color:C.muted, marginBottom:5 }}>設置者</div>
    <div style={{ display:"flex", gap:8 }}>
      {SETSUCHI_SHA.map(v => (
        <label key={v} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer",
          padding:"5px 14px", borderRadius:8,
          border:`1.5px solid ${value===v ? C.teal : error ? C.danger : C.border}`,
          background: value===v ? C.tealLight : C.white,
          fontSize:13, fontWeight:value===v?600:400, color:value===v?C.tealDark:C.text }}>
          <input type="radio" checked={value===v} onChange={() => onChange(v)}
            style={{ width:13, height:13, cursor:"pointer", accentColor:C.teal }} />
          {v}
        </label>
      ))}
    </div>
    {error && <div style={{ fontSize:12, color:C.danger, marginTop:3 }}>⚠ {error}</div>}
  </div>
);

// 月額合計計算
const KH_OPT_KEY = { shozai:"shozai", mf:"mf", barcode_payment:"barcodePayment", barcode:"barcode", milbon:"milbon" };
const calcKhTotal = (d) => {
  if (!d.package) return null;
  let t = PACKAGE_BASE[d.package] || 0;
  if (d.concierge && CONCIERGE_PRICE[d.package]) t += CONCIERGE_PRICE[d.package][d.concierge] || 0;
  if (d.ctiChecked) t += CTI_PRICE[d.package] || 0;
  if (d.lanChecked) t += ((d.lanKeizoCount || 0) + (d.lanAddCount || 0)) * LAN_PRICE;
  OPTIONS_LIST.forEach(o => { if (o.key !== "cti") { const k = KH_OPT_KEY[o.key]; if (k && d[k]) t += o.price; } });
  if (d.rewrite === "継続") t += REWRITE_PRICE;
  if (d.jiki === "継続") t += JIKI_PRICE;
  return t;
};

const KeiyakuHenkoTabContent = ({ tab, form, updTab, clrTab, errors }) => {
  const d     = tab.data;
  const te    = errors || {};
  const tabId = tab.id;
  const upd   = (k, v) => updTab(tabId, k, v);
  const updM  = (updates) => updTab(tabId, "__many__", updates);
  const clr   = (k) => clrTab(tabId, k);
  const mb    = d.moushikomiBetsu || {};
  const needsVisit = (d.ctiChecked && (d.ctiAddCount || 0) > 0) || (d.lanChecked && (d.lanAddCount || 0) > 0);
  const khTotal = calcKhTotal(d);

  const tantoshaFg = useFurigana(
    () => d.nicchoseiTantoshaKana || "",
    v  => { upd("nicchoseiTantoshaKana", v); if (v) clr("nicchoseiTantoshaKana"); }
  );

  // 新規と同じオプション行スタイル
  const optRow = (checked) => ({
    display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8,
    border:`1px solid ${checked ? C.teal : C.border}`,
    background: checked ? C.tealLight : C.white, cursor:"pointer", transition:"all .15s",
  });

  return (<>
    {/* 店舗情報 */}
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:17 }}>🏪</span>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy }}>店舗情報</h3>
        </div>
        <button onClick={() => { if (window.confirm("入力内容をリセットします。よいですか？")) updTab(tabId, "__reset__", null); }}
          style={{ fontSize:12, fontWeight:600, color:C.muted, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:FONT }}>
          🔄 リセット
        </button>
      </div>
      <Field label="店舗名" required error={te.tenpoName}>
        <UIInput value={d.tenpoName||""} hasError={!!te.tenpoName}
          onChange={e => { upd("tenpoName", e.target.value); clr("tenpoName"); }} placeholder="例：ヘアサロン〇〇 渋谷店" />
      </Field>
      <Field label="店舗名フリガナ" required hint={!te.tenpoNameKana?"手動入力（カタカナ）":undefined} error={te.tenpoNameKana}>
        <UIInput value={d.tenpoNameKana||""} hasError={!!te.tenpoNameKana} onlyKatakana
          onChange={e => { upd("tenpoNameKana", e.target.value); clr("tenpoNameKana"); }} placeholder="例：ヘアサロン マルマル シブヤテン" />
      </Field>
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
          <input type="checkbox" checked={!!d.sameAsKeiyakusha}
            onChange={e => {
              if (e.target.checked) {
                updM({ sameAsKeiyakusha:true, yubinBango:form.yubinBango, jusho:form.jusho, jusho2:form.jusho2, denwa:form.denwa });
                ["yubinBango","jusho","jusho2","denwa"].forEach(k => clr(k));
              } else {
                updM({ sameAsKeiyakusha:false, yubinBango:"", jusho:"", jusho2:"", denwa:"" });
              }
            }} />
          契約者と同じ住所・電話番号を使う
        </label>
      </div>
      <ZipField value={d.yubinBango||""} onChange={v => { upd("yubinBango",v); clr("yubinBango"); }} onAddressFound={addr => { upd("jusho",addr); clr("jusho"); }} addressInputId={`kh-jusho2-${tabId}`} required errors={te} fieldKey="yubinBango" clearError={k => clr(k)} disabled={!!d.sameAsKeiyakusha} />
      <Field label="住所（自動入力）" error={te.jusho}>
        <UIInput value={d.jusho||""} hasError={!!te.jusho} disabled style={{ color:C.muted }} placeholder="郵便番号を入力すると自動入力されます" />
      </Field>
      <Field label="番地・建物名以降" required hint={!te.jusho2?"例：1-2-3　〇〇マンション101号室":undefined} error={te.jusho2}>
        <UIInput id={`kh-jusho2-${tabId}`} value={d.jusho2||""} hasError={!!te.jusho2} disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("jusho2", e.target.value); clr("jusho2"); }} placeholder="例：1-2-3　〇〇マンション101号室" />
      </Field>
      <Field label="電話番号" required hint={!te.denwa?"ハイフンあり・なしどちらでも可":undefined} error={te.denwa}>
        <UIInput value={d.denwa||""} hasError={!!te.denwa} numHyphen disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("denwa", e.target.value); clr("denwa"); }} placeholder="例：03-1234-5678" />
      </Field>
    </Card>

    {/* 申込種別 */}
    <Card>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
        <SecTitle icon="📋">申込種別</SecTitle>
        <span style={{ color:C.danger, fontSize:13, fontWeight:700, marginTop:-2 }}>＊</span>
      </div>
      {te._moushikomiBetsu && (
        <div style={{ padding:"8px 12px", background:"#fff5f5", border:`1px solid ${C.danger}`, borderRadius:6, fontSize:12.5, color:C.danger, marginBottom:12 }}>
          ⚠ {te._moushikomiBetsu}
        </div>
      )}
      <div style={{ fontSize:12.5, color:C.muted, marginBottom:10 }}>複数選択可</div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {[["packageChange","パッケージ変更"],["optionAdd","オプション追加"],["optionCancel","オプション解約"]].map(([key,label]) => (
          <label key={key} style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer",
            padding:"8px 18px", borderRadius:22,
            border:`1.5px solid ${mb[key] ? C.teal : te._moushikomiBetsu ? C.danger : C.border}`,
            background:mb[key] ? C.tealLight : C.white,
            fontSize:13.5, fontWeight:mb[key]?600:400, color:mb[key]?C.tealDark:C.text, userSelect:"none" }}>
            <input type="checkbox" checked={!!mb[key]}
              onChange={e => { upd("moushikomiBetsu", {...mb, [key]:e.target.checked}); clr("_moushikomiBetsu"); }}
              style={{ width:14, height:14, cursor:"pointer", accentColor:C.teal }} />
            {label}
          </label>
        ))}
      </div>
    </Card>

    {/* サービス選択 */}
    <Card>
      <SecTitle icon="📦">サービス選択</SecTitle>
      <p style={{ fontSize:12.5, color:C.muted, marginBottom:14 }}>申込後の契約内容をすべて選択してください。月額合計が自動計算されます。</p>

      {/* パッケージ */}
      <Field label="申込パッケージ" required error={te.package}>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {PACKAGES.map(pkg => (
            <label key={pkg} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"10px 24px", borderRadius:10, border:`1.5px solid ${d.package===pkg ? C.teal : te.package ? C.danger : C.border}`, background:d.package===pkg ? C.tealLight : te.package ? "#fff5f5" : C.white, fontSize:13.5, fontWeight:d.package===pkg?700:400 }}>
              <input type="radio" name={`khpkg-${tabId}`} value={pkg} checked={d.package===pkg}
                onChange={() => { updM({ package:pkg, concierge:"", conciergeActual:"" }); clr("package"); clr("concierge"); }} />
              <span>{pkg}</span>
              <span style={{ fontSize:12, color:C.muted, marginLeft:4 }}>{fmtPrice(PACKAGE_BASE[pkg])}/月</span>
            </label>
          ))}
        </div>
        {d.package && d.package !== "シンプルパック" && <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>e-Reserve込み{d.package==="ベーシックパック+"?"・LinQ Concierge 2台込み":""}</div>}
        {!d.package && <p style={{ fontSize:12, color:C.muted, marginTop:6 }}>パッケージを選択するとConcierge台数・オプション・月額合計が表示されます</p>}
      </Field>

      {d.package && (<>
        {/* コンシェルジュ */}
        <Field label="LinQ Concierge 台数" required hint={d.package==="ベーシックパック+"?"2台まで料金込み。3台目から追加料金が発生します。":undefined} error={te.concierge}>
          <UISelect value={d.concierge||""} hasError={!!te.concierge}
            onChange={e => { upd("concierge",e.target.value); upd("conciergeActual",""); clr("concierge"); }}
            style={{ maxWidth:260 }}>
            <option value="">-- 選択してください --</option>
            {(CONCIERGE_BANDS[d.package]||[]).map(o => (
              <option key={o} value={o}>{o}　¥{(CONCIERGE_PRICE[d.package]?.[o]??0).toLocaleString()}/月</option>
            ))}
          </UISelect>
          {CONCIERGE_NEEDS_ACTUAL.includes(d.concierge) && (
            <div style={{ marginTop:8 }}>
              <Field label="実台数" required error={te.conciergeActual}>
                <UIInput value={d.conciergeActual||""} hasError={!!te.conciergeActual}
                  onChange={e => { upd("conciergeActual",e.target.value); clr("conciergeActual"); }}
                  placeholder="例：8" style={{ maxWidth:120 }} />
              </Field>
            </div>
          )}
        </Field>

        {/* オプション（新規と同じスタイル） */}
        <Field label="オプション（複数選択可）">
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {/* CTI */}
            <label style={optRow(d.ctiChecked)}>
              <input type="checkbox" checked={!!d.ctiChecked} style={{ width:16, height:16, cursor:"pointer" }}
                onChange={e => { upd("ctiChecked", e.target.checked); if (!e.target.checked) updM({ ctiKeizoCount:0, ctiAddCount:0, ctiSetsuchiSha:"" }); }} />
              <span style={{ fontSize:13, color:d.ctiChecked?C.tealDark:C.text, fontWeight:d.ctiChecked?600:400, flex:1 }}>CTI</span>
              <span style={{ fontSize:12, color:C.muted }}>{d.package ? (CTI_PRICE[d.package]>0 ? fmtPrice(CTI_PRICE[d.package]) : "¥0") : "¥0"}</span>
            </label>
            {d.ctiChecked && (
              <div style={{ paddingLeft:36, marginTop:4, marginBottom:4, display:"flex", flexDirection:"column", gap:8 }}>
                {te.ctiCount && <div style={{ fontSize:12, color:C.danger }}>⚠ {te.ctiCount}</div>}
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:12.5, color:C.muted, minWidth:64 }}>継続台数</span>
                  <UISelect value={d.ctiKeizoCount||0} onChange={e => upd("ctiKeizoCount", Number(e.target.value))} style={{ maxWidth:120 }}>
                    {Array.from({length:6},(_,i)=>i).map(n => <option key={n} value={n}>{n}台</option>)}
                  </UISelect>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:12.5, color:C.muted, minWidth:64 }}>追加台数</span>
                  <UISelect value={d.ctiAddCount||0} onChange={e => { upd("ctiAddCount", Number(e.target.value)); if (Number(e.target.value)===0) upd("ctiSetsuchiSha",""); }} style={{ maxWidth:120 }}>
                    {Array.from({length:6},(_,i)=>i).map(n => <option key={n} value={n}>{n}台</option>)}
                  </UISelect>
                </div>
                {(d.ctiAddCount||0) > 0 && (
                  <div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:5 }}>設置者</div>
                    <div style={{ display:"flex", gap:8 }}>
                      {SETSUCHI_SHA.map(v => (
                        <label key={v} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", padding:"5px 13px", borderRadius:8,
                          border:`1.5px solid ${d.ctiSetsuchiSha===v ? C.teal : te.ctiSetsuchiSha ? C.danger : C.border}`,
                          background:d.ctiSetsuchiSha===v?C.tealLight:C.white, fontSize:13, fontWeight:d.ctiSetsuchiSha===v?600:400 }}>
                          <input type="radio" checked={d.ctiSetsuchiSha===v} onChange={() => { upd("ctiSetsuchiSha",v); clr("ctiSetsuchiSha"); }}
                            style={{ width:13, height:13, cursor:"pointer", accentColor:C.teal }} />
                          {v}
                        </label>
                      ))}
                    </div>
                    {te.ctiSetsuchiSha && <div style={{ fontSize:12, color:C.danger, marginTop:3 }}>⚠ {te.ctiSetsuchiSha}</div>}
                  </div>
                )}
                {((d.ctiKeizoCount||0) + (d.ctiAddCount||0)) > 0 && (
                  <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:600 }}>
                    合計 {(d.ctiKeizoCount||0)+(d.ctiAddCount||0)}台　{fmtPrice(CTI_PRICE[d.package]||0)}/月
                  </div>
                )}
              </div>
            )}

            {/* 通常オプション */}
            {OPTIONS_LIST.filter(o => o.key !== "cti").map(opt => {
              const dataKey = KH_OPT_KEY[opt.key];
              return (
                <label key={opt.key} style={optRow(d[dataKey])}>
                  <input type="checkbox" checked={!!d[dataKey]} style={{ width:16, height:16, cursor:"pointer" }}
                    onChange={e => upd(dataKey, e.target.checked)} />
                  <span style={{ fontSize:13, color:d[dataKey]?C.tealDark:C.text, fontWeight:d[dataKey]?600:400, flex:1 }}>{opt.label}</span>
                  <span style={{ fontSize:12, color:C.muted }}>{opt.price>0?fmtPrice(opt.price):"¥0"}</span>
                </label>
              );
            })}

            {/* LAN */}
            <label style={optRow(d.lanChecked)}>
              <input type="checkbox" checked={!!d.lanChecked} style={{ width:16, height:16, cursor:"pointer" }}
                onChange={e => { upd("lanChecked", e.target.checked); if (!e.target.checked) updM({ lanKeizoCount:0, lanAddCount:0, lanSetsuchiSha:"" }); }} />
              <span style={{ fontSize:13, color:d.lanChecked?C.tealDark:C.text, fontWeight:d.lanChecked?600:400, flex:1 }}>LAN</span>
              <span style={{ fontSize:12, color:C.muted }}>{fmtPrice(LAN_PRICE)}/台</span>
            </label>
            {d.lanChecked && (
              <div style={{ paddingLeft:36, marginTop:4, marginBottom:4, display:"flex", flexDirection:"column", gap:8 }}>
                {te.lanCount && <div style={{ fontSize:12, color:C.danger }}>⚠ {te.lanCount}</div>}
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:12.5, color:C.muted, minWidth:64 }}>継続台数</span>
                  <UISelect value={d.lanKeizoCount||0} onChange={e => upd("lanKeizoCount", Number(e.target.value))} style={{ maxWidth:120 }}>
                    {Array.from({length:6},(_,i)=>i).map(n => <option key={n} value={n}>{n}台</option>)}
                  </UISelect>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:12.5, color:C.muted, minWidth:64 }}>追加台数</span>
                  <UISelect value={d.lanAddCount||0} onChange={e => { upd("lanAddCount", Number(e.target.value)); if (Number(e.target.value)===0) upd("lanSetsuchiSha",""); }} style={{ maxWidth:120 }}>
                    {Array.from({length:6},(_,i)=>i).map(n => <option key={n} value={n}>{n}台</option>)}
                  </UISelect>
                </div>
                {(d.lanAddCount||0) > 0 && (
                  <div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:5 }}>設置者</div>
                    <div style={{ display:"flex", gap:8 }}>
                      {SETSUCHI_SHA.map(v => (
                        <label key={v} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", padding:"5px 13px", borderRadius:8,
                          border:`1.5px solid ${d.lanSetsuchiSha===v ? C.teal : te.lanSetsuchiSha ? C.danger : C.border}`,
                          background:d.lanSetsuchiSha===v?C.tealLight:C.white, fontSize:13, fontWeight:d.lanSetsuchiSha===v?600:400 }}>
                          <input type="radio" checked={d.lanSetsuchiSha===v} onChange={() => { upd("lanSetsuchiSha",v); clr("lanSetsuchiSha"); }}
                            style={{ width:13, height:13, cursor:"pointer", accentColor:C.teal }} />
                          {v}
                        </label>
                      ))}
                    </div>
                    {te.lanSetsuchiSha && <div style={{ fontSize:12, color:C.danger, marginTop:3 }}>⚠ {te.lanSetsuchiSha}</div>}
                  </div>
                )}
                {((d.lanKeizoCount||0) + (d.lanAddCount||0)) > 0 && (
                  <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:600 }}>
                    合計 {(d.lanKeizoCount||0)+(d.lanAddCount||0)}台　{fmtPrice(((d.lanKeizoCount||0)+(d.lanAddCount||0))*LAN_PRICE)}/月
                  </div>
                )}
              </div>
            )}

            {/* リライト・磁気 */}
            <div style={{ marginTop:8, paddingTop:10, borderTop:`1px dashed ${C.border}` }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>継続・解約される場合は選択してください</div>
              {[["rewrite","リライト",REWRITE_PRICE],["jiki","磁気",JIKI_PRICE]].map(([key,label,price]) => (
                <div key={key} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                  <span style={{ fontSize:13, color:C.text, minWidth:52 }}>{label}</span>
                  <UISelect value={d[key]||""} onChange={e => upd(key, e.target.value)} style={{ maxWidth:140 }}>
                    <option value="">選択なし</option>
                    {REWRITE_JIKI_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </UISelect>
                  <span style={{ fontSize:12, color:C.muted }}>{d[key]==="継続" ? fmtPrice(price)+"/月" : d[key]==="解約" ? "解約" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </Field>

        {/* 月額合計 */}
        {khTotal !== null && (
          <div style={{ background:C.tealLight, border:`1.5px solid ${C.teal}`, borderRadius:12, padding:"14px 18px", marginTop:8 }}>
            <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:700, marginBottom:8 }}>💰 変更後の月額合計（税別）</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:13 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>基本パッケージ（{d.package}）</span><span>{fmtPrice(PACKAGE_BASE[d.package])}</span></div>
              {d.concierge && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>LinQ Concierge（{d.concierge}）</span><span>{fmtPrice(CONCIERGE_PRICE[d.package]?.[d.concierge]??0)}</span></div>}
              {d.ctiChecked && ((d.ctiKeizoCount||0)+(d.ctiAddCount||0)) > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>CTI（{(d.ctiKeizoCount||0)+(d.ctiAddCount||0)}台）</span><span>{fmtPrice(CTI_PRICE[d.package]||0)}</span></div>}
              {OPTIONS_LIST.filter(o=>o.key!=="cti").map(o => { const k=KH_OPT_KEY[o.key]; return d[k]?<div key={o.key} style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>{o.label}</span><span>{fmtPrice(o.price)}</span></div>:null; })}
              {d.lanChecked && ((d.lanKeizoCount||0)+(d.lanAddCount||0)) > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>LAN（{(d.lanKeizoCount||0)+(d.lanAddCount||0)}台）</span><span>{fmtPrice(((d.lanKeizoCount||0)+(d.lanAddCount||0))*LAN_PRICE)}</span></div>}
              {d.rewrite==="継続" && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>リライト</span><span>{fmtPrice(REWRITE_PRICE)}</span></div>}
              {d.jiki==="継続" && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>磁気</span><span>{fmtPrice(JIKI_PRICE)}</span></div>}
              <div style={{ borderTop:`1px solid ${C.teal}`, marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:15 }}>
                <span>合計</span><span style={{ color:C.tealDark }}>{fmtPrice(khTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </>)}
    </Card>

    {/* 日程調整（CTI/LAN「新たに導入」時） */}
    {needsVisit && (
      <Card>
        <SecTitle icon="🗓️">日程調整</SecTitle>
        <Field label="日程調整先" required error={te.nicchoseiSaki} hint={!te.nicchoseiSaki && loadMyInfo() ? "「営業」を選ぶとマイ情報が自動入力されます" : undefined}>
          <UISelect value={d.nicchoseiSaki||""} onChange={e => {
            const val = e.target.value;
            if (val === "営業") {
              const my = loadMyInfo();
              if (my) { updM({ nicchoseiSaki:"営業", nicchoseiTantosha:my.tantosha||"", nicchoseiTantoshaKana:my.tantoshaKana||"", nicchoseiDenwa:my.tantoshaDenwa||"" }); ["nicchoseiTantosha","nicchoseiTantoshaKana","nicchoseiDenwa"].forEach(k=>clr(k)); }
              else { upd("nicchoseiSaki",val); }
            } else {
              updM({ nicchoseiSaki:val, nicchoseiTantosha:"", nicchoseiTantoshaKana:"", nicchoseiDenwa:"" });
            }
            clr("nicchoseiSaki");
          }} style={{ maxWidth:220, borderColor:te.nicchoseiSaki?C.danger:undefined }}>
            <option value="">― 選択してください ―</option>
            {NICCHOSEISAKISAKI_LIST.map(o => <option key={o}>{o}</option>)}
          </UISelect>
        </Field>
        <FieldRow>
          <Field label="担当者名" required half error={te.nicchoseiTantosha}>
            <UIInput value={d.nicchoseiTantosha||""} hasError={!!te.nicchoseiTantosha}
              onChange={e => { upd("nicchoseiTantosha", e.target.value); clr("nicchoseiTantosha"); if (!e.target.value) upd("nicchoseiTantoshaKana",""); }}
              placeholder="例：鈴木 一郎" {...tantoshaFg} />
          </Field>
          <Field label="フリガナ" required half error={te.nicchoseiTantoshaKana}>
            <UIInput value={d.nicchoseiTantoshaKana||""} hasError={!!te.nicchoseiTantoshaKana} onlyKatakana
              onChange={e => { upd("nicchoseiTantoshaKana", e.target.value); clr("nicchoseiTantoshaKana"); }}
              placeholder="スズキ イチロウ" />
          </Field>
        </FieldRow>
        <Field label="連絡先電話番号" required hint={!te.nicchoseiDenwa?"ハイフンあり・なしどちらでも可":undefined} error={te.nicchoseiDenwa}>
          <UIInput value={d.nicchoseiDenwa||""} hasError={!!te.nicchoseiDenwa} numHyphen
            onChange={e => { upd("nicchoseiDenwa", e.target.value); clr("nicchoseiDenwa"); }} placeholder="例：090-1234-5678" style={{ maxWidth:240 }} />
        </Field>
        <div style={{ marginBottom:12 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
            <input type="checkbox" checked={!!d.jizenchoosa}
              onChange={e => { upd("jizenchoosa", e.target.checked); if (!e.target.checked) upd("chosaDate",""); }}
              style={{ width:15, height:15, cursor:"pointer" }} />
            事前調査を実施する
          </label>
          {d.jizenchoosa && (
            <div style={{ marginTop:8, padding:"8px 12px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, fontSize:12.5, color:"#92400e" }}>
              ※事前調査を実施する場合は別途作業料金が発生します
            </div>
          )}
        </div>
        {d.jizenchoosa && (
          <Field label="調査希望日時" required error={te.chosaDate}>
            <UITextarea value={d.chosaDate||""} hasError={!!te.chosaDate}
              onChange={e => { upd("chosaDate", e.target.value); clr("chosaDate"); }}
              placeholder={"例：4月15日 午前中希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
          </Field>
        )}
        <Field label="導入希望日時" required error={te.donguDate}>
          <UITextarea value={d.donguDate||""} hasError={!!te.donguDate}
            onChange={e => { upd("donguDate", e.target.value); clr("donguDate"); }}
            placeholder={"例：4月15日 午前中希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
        </Field>
        <Field label="備考（日程について）">
          <UITextarea value={d.nicchoseiHosoku||""} onChange={e => upd("nicchoseiHosoku", e.target.value)}
            placeholder="日程調整に関する補足事項があれば記入してください" />
        </Field>
      </Card>
    )}

    {/* 変更希望日（訪問なし時） */}
    {!needsVisit && (
      <Card>
        <SecTitle icon="📅">変更希望日</SecTitle>
        <Field label="変更希望日" required error={te.henkoKiboDate}>
          <UIInput type="date" value={d.henkoKiboDate||""} hasError={!!te.henkoKiboDate}
            onChange={e => { upd("henkoKiboDate", e.target.value); clr("henkoKiboDate"); }} style={{ maxWidth:200 }} />
        </Field>
      </Card>
    )}

    {/* 備考 */}
    <Card>
      <Field label="備考（解約サービスについて）" hint="コンシェルジュ・LANを解約する場合はレジNOを入力してください">
        <UITextarea value={d.bikoKaiyaku||""} onChange={e => upd("bikoKaiyaku", e.target.value)}
          placeholder="例：コンシェルジュ解約：レジ3番　LAN解約：レジ2番" />
      </Field>
      <Field label="備考">
        <UITextarea value={d.biko||""} onChange={e => upd("biko", e.target.value)}
          placeholder="その他、変更内容に関する補足事項があれば記入してください" />
      </Field>
    </Card>
  </>);
};

// ==================== 全解約フォーム ====================
const ZenkaiTabContent = ({ tab, form, updTab, clrTab, errors }) => {
  const d     = tab.data;
  const te    = errors || {};
  const tabId = tab.id;
  const upd   = (k, v) => updTab(tabId, k, v);
  const updM  = (updates) => updTab(tabId, "__many__", updates);
  const clr   = (k)    => clrTab(tabId, k);

  return (<>
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:17 }}>🏪</span>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy }}>店舗情報</h3>
        </div>
        <button onClick={() => { if (window.confirm("入力内容をリセットします。よいですか？")) updTab(tabId, "__reset__", null); }}
          style={{ fontSize:12, fontWeight:600, color:C.muted, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:FONT }}>
          🔄 リセット
        </button>
      </div>

      <Field label="店舗名" required error={te.tenpoName}>
        <UIInput value={d.tenpoName||""} hasError={!!te.tenpoName}
          onChange={e => { upd("tenpoName", e.target.value); clr("tenpoName"); if (!e.target.value) upd("tenpoNameKana",""); }}
          placeholder="例：ヘアサロン〇〇 渋谷店" />
      </Field>
      <Field label="店舗名フリガナ" required hint={!te.tenpoNameKana ? "手動入力（カタカナ）" : undefined} error={te.tenpoNameKana}>
        <UIInput value={d.tenpoNameKana||""} hasError={!!te.tenpoNameKana} onlyKatakana
          onChange={e => { upd("tenpoNameKana", e.target.value); clr("tenpoNameKana"); }}
          placeholder="例：ヘアサロン マルマル シブヤテン" />
      </Field>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
          <input type="checkbox" checked={!!d.sameAsKeiyakusha}
            onChange={e => {
              if (e.target.checked) {
                updM({ sameAsKeiyakusha:true, yubinBango:form.yubinBango, jusho:form.jusho, jusho2:form.jusho2, denwa:form.denwa });
                ["yubinBango","jusho","jusho2","denwa"].forEach(k => clr(k));
              } else {
                updM({ sameAsKeiyakusha:false, yubinBango:"", jusho:"", jusho2:"", denwa:"" });
              }
            }} />
          契約者と同じ住所・電話番号を使う
        </label>
        {d.sameAsKeiyakusha && (
          <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:6, padding:"8px 12px", fontSize:12.5, color:"#854d0e", marginTop:6 }}>
            ⚠️ 契約者の住所・電話番号がコピーされます。店舗情報として正しいか確認してください。
          </div>
        )}
      </div>

      <ZipField value={d.yubinBango||""} onChange={v => { upd("yubinBango",v); clr("yubinBango"); }} onAddressFound={addr => { upd("jusho",addr); clr("jusho"); }} addressInputId={`zenkai-jusho2-${tabId}`} required errors={te} fieldKey="yubinBango" clearError={k => clr(k)} disabled={!!d.sameAsKeiyakusha} />
      <Field label="住所（自動入力）" error={te.jusho}>
        <UIInput value={d.jusho||""} hasError={!!te.jusho} disabled style={{ background:d.jusho?"#f0f4f8":undefined, color:C.muted }} placeholder="郵便番号を入力すると自動入力されます" />
      </Field>
      <Field label="番地・建物名以降" required hint={!te.jusho2 ? "例：1-2-3　〇〇マンション101号室" : undefined} error={te.jusho2}>
        <UIInput id={`zenkai-jusho2-${tabId}`} value={d.jusho2||""} hasError={!!te.jusho2} disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("jusho2", e.target.value); clr("jusho2"); }} placeholder="例：1-2-3　〇〇マンション101号室" />
      </Field>
      <Field label="電話番号" required hint={!te.denwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.denwa}>
        <UIInput value={d.denwa||""} hasError={!!te.denwa} numHyphen disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("denwa", e.target.value); clr("denwa"); }} placeholder="例：03-1234-5678" />
      </Field>
    </Card>

    <Card>
      <SecTitle icon="📋">解約情報</SecTitle>
      <Field label="解約希望日" required error={te.kaiyakuKiboDate}>
        <UIInput type="date" value={d.kaiyakuKiboDate||""} hasError={!!te.kaiyakuKiboDate}
          onChange={e => { upd("kaiyakuKiboDate", e.target.value); clr("kaiyakuKiboDate"); }}
          style={{ maxWidth:200 }} />
      </Field>
      <Field label="備考">
        <UITextarea value={d.biko||""} onChange={e => upd("biko", e.target.value)}
          placeholder="解約に関する補足事項があれば記入してください" />
      </Field>
    </Card>
  </>);
};

const TenpoTabContent = ({ tab, form, updTab, clrTab, errors }) => {
  const d  = tab.data;
  const te = errors || {};
  const tabId = tab.id;
  const isTenpoAdd = tab.type === "新規_店舗追加";
  const hasTasha   = (d.nohinData||[]).includes("tasha");
  const monthly    = calcTenpoMonthly(d);

  const upd  = (k, v)      => updTab(tabId, k, v);
  const updM = (updates)   => updTab(tabId, "__many__", updates);
  const clr  = (k)         => clrTab(tabId, k);

  const tantoshaFg = useFurigana(
    () => d.nicchoseiTantoshaKana || "",
    v  => { upd("nicchoseiTantoshaKana", v); if (v) clr("nicchoseiTantoshaKana"); }
  );
  const { loading: zipLoading, zipError, lookup: zipLookup } = useZipLookup(
    addr => { upd("jusho", addr); clr("jusho"); },
    `tenpo-jusho2-${tabId}`
  );

  return (<>
    {/* 店舗情報 */}
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:17 }}>🏪</span>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy }}>店舗情報</h3>
        </div>
        <button onClick={() => { if (window.confirm("入力内容をリセットします。よいですか？")) updTab(tabId, "__reset__", null); }}
          style={{ fontSize:12, fontWeight:600, color:C.muted, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:FONT }}>
          🔄 リセット
        </button>
      </div>

      <Field label="店舗名" required error={te.tenpoName}>
        <UIInput value={d.tenpoName} hasError={!!te.tenpoName}
          onChange={e => { upd("tenpoName", e.target.value); clr("tenpoName"); if (!e.target.value) upd("tenpoNameKana",""); }}
          placeholder="例：ヘアサロン〇〇 渋谷店" />
      </Field>
      <Field label="店舗名フリガナ" required hint={!te.tenpoNameKana ? "手動入力（カタカナ）" : undefined} error={te.tenpoNameKana}>
        <UIInput value={d.tenpoNameKana} hasError={!!te.tenpoNameKana} onlyKatakana
          onChange={e => { upd("tenpoNameKana", e.target.value); clr("tenpoNameKana"); }}
          placeholder="例：ヘアサロン マルマル シブヤテン" />
      </Field>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13.5, fontWeight:500, color:C.text, userSelect:"none" }}>
          <input type="checkbox" checked={!!d.sameAsKeiyakusha} onChange={e => {
            if (e.target.checked) {
              updM({ sameAsKeiyakusha:true, yubinBango:form.yubinBango, jusho:form.jusho, jusho2:form.jusho2, denwa:form.denwa });
              ["yubinBango","jusho","jusho2","denwa"].forEach(k => clr(k));
            } else {
              updM({ sameAsKeiyakusha:false, yubinBango:"", jusho:"", jusho2:"", denwa:"" });
            }
          }} />
          契約者と同じ住所・電話番号を使う
        </label>
        {d.sameAsKeiyakusha && <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:6, padding:"8px 12px", fontSize:12.5, color:"#854d0e", marginTop:6 }}>⚠️ 契約者の住所・電話番号がコピーされます。店舗情報として正しいか確認してください。</div>}
      </div>

      <Field label="郵便番号" required hint={!te.yubinBango ? "7桁の数字を入力すると住所が自動入力されます" : undefined} error={te.yubinBango}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <UIInput value={d.yubinBango} onlyNum maxLength={7} style={{ maxWidth:180 }} hasError={!!te.yubinBango} disabled={!!d.sameAsKeiyakusha}
            onChange={e => { upd("yubinBango", e.target.value); clr("yubinBango"); if (e.target.value.length===7) zipLookup(e.target.value); }} placeholder="1234567" />
          {zipLoading  && <span style={{ fontSize:12, color:C.muted }}>検索中...</span>}
          {zipError    && <span style={{ fontSize:12, color:C.danger }}>見つかりません</span>}
        </div>
      </Field>
      <Field label="住所（自動入力）" error={te.jusho}>
        <UIInput value={d.jusho} hasError={!!te.jusho} disabled style={{ background:d.jusho?"#f0f4f8":undefined, color:C.muted }} placeholder="郵便番号を入力すると自動入力されます" />
      </Field>
      <Field label="番地・建物名以降" required hint={!te.jusho2 ? "例：1-2-3　〇〇マンション101号室" : undefined} error={te.jusho2}>
        <UIInput id={`tenpo-jusho2-${tabId}`} value={d.jusho2} hasError={!!te.jusho2} disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("jusho2", e.target.value); clr("jusho2"); }} placeholder="例：1-2-3　〇〇マンション101号室" />
      </Field>
      <Field label="電話番号" required hint={!te.denwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.denwa}>
        <UIInput value={d.denwa} hasError={!!te.denwa} numHyphen disabled={!!d.sameAsKeiyakusha}
          onChange={e => { upd("denwa", e.target.value); clr("denwa"); }} placeholder="例：03-1234-5678" />
      </Field>

      <NameFields
        seiValue={d.sekininshaLastName||""} meiValue={d.sekininshaFirstName||""}
        seiKana={d.sekininshaLastNameKana||""} meiKana={d.sekininshaFirstNameKana||""}
        onSeiChange={v => { upd("sekininshaLastName",v); if (!v) upd("sekininshaLastNameKana",""); }}
        onMeiChange={v => { upd("sekininshaFirstName",v); if (!v) upd("sekininshaFirstNameKana",""); }}
        onSeiKanaChange={v => upd("sekininshaLastNameKana",v)}
        onMeiKanaChange={v => upd("sekininshaFirstNameKana",v)}
        labelSei="店舗責任者（姓）任意" labelMei="店舗責任者（名）任意"
        placeholderSei="例：田中" placeholderMei="例：美咲"
        placeholderSeiKana="例：タナカ" placeholderMeiKana="例：ミサキ"
        required={false} errors={{}} keyKanji_sei="x" keyKanji_mei="x" keyKana_sei="x" keyKana_mei="x" />
    </Card>

    {/* LinQ2メール */}
    <Card>
      <SecTitle icon="✉️">LinQ2メールアドレス</SecTitle>
      <Field label="店舗用LinQ2メールアドレス" required hint={!te.linq2MailPrefix ? "8文字以上・英小文字・数字・ハイフン(-)のみ・数字のみ不可" : undefined} error={te.linq2MailPrefix}>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          <UIInput value={d.linq2MailPrefix||""} hasError={!!te.linq2MailPrefix} noZenkaku inputMode="email"
            style={{ borderRadius:"8px 0 0 8px", flex:1, minWidth:0 }}
            onChange={e => { const v=e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g,""); upd("linq2MailPrefix",v); clr("linq2MailPrefix"); }}
            placeholder="例：salon-abc" />
          <div style={{ padding:"9px 14px", background:"#f0f4f8", border:`1.5px solid ${te.linq2MailPrefix?C.danger:C.border}`, borderLeft:"none", borderRadius:"0 8px 8px 0", fontSize:14, color:C.muted, whiteSpace:"nowrap", flexShrink:0 }}>
            @tbqm.jp
          </div>
        </div>
        {!te.linq2MailPrefix && d.linq2MailPrefix && (
          <div style={{ marginTop:6, fontSize:12.5, color:C.success }}>✅ 完成形：{d.linq2MailPrefix}@tbqm.jp</div>
        )}
      </Field>
    </Card>

    {/* 納品データ */}
    <Card>
      <SecTitle icon="💾">納品データ</SecTitle>
      <Field label="納品データの種類" required hint={!te.nohinData ? "1つ以上選択してください" : undefined} error={te.nohinData}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {NOHIN_DATA_LIST.filter(n => !n.tenpoAddOnly || isTenpoAdd).map(n => {
            const checked = (d.nohinData||[]).includes(n.key);
            return (
              <label key={n.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, border:`1.5px solid ${checked?C.teal:te.nohinData?C.danger:C.border}`, background:checked?C.tealLight:te.nohinData?"#fff5f5":C.white, cursor:"pointer", transition:"all .15s" }}>
                <input type="checkbox" checked={checked} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => {
                  const next = e.target.checked ? [...(d.nohinData||[]),n.key] : (d.nohinData||[]).filter(x=>x!==n.key);
                  upd("nohinData",next); clr("nohinData");
                  if (n.key==="pos2" && !e.target.checked) updM({ pos2Hikitori:"", pos2HikitoriKiki:[], pos2HikitoriSonota:"" });
                }} />
                <span style={{ fontSize:13.5, fontWeight:checked?600:400, color:checked?C.tealDark:C.text, flex:1 }}>{n.label}</span>
              </label>
            );
          })}
        </div>
      </Field>

      {/* 系列店コピー選択時：コピー元店舗情報 */}
      {isTenpoAdd && (d.nohinData||[]).includes("keirestore") && (
        <div style={{ marginTop:4, paddingLeft:16, borderLeft:`3px solid ${C.teal}`, marginBottom:14 }}>
          <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:700, marginBottom:10 }}>系列店コピー　コピー元情報</div>
          <Field label="コピー元店舗名" required error={te.keireistenName}>
            <UIInput value={d.keireistenName||""} hasError={!!te.keireistenName}
              onChange={e => { upd("keireistenName",e.target.value); clr("keireistenName"); }}
              placeholder="例：ヘアサロン〇〇 新宿店" />
          </Field>
          <Field label="コピー元電話番号" required hint={!te.keireistenDenwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.keireistenDenwa}>
            <UIInput value={d.keireistenDenwa||""} hasError={!!te.keireistenDenwa} numHyphen
              onChange={e => { upd("keireistenDenwa",e.target.value); clr("keireistenDenwa"); }}
              placeholder="例：03-1234-5678" style={{ maxWidth:260 }} />
          </Field>
        </div>
      )}

      {/* POSⅡ選択時：引取機器 */}
      {(d.nohinData||[]).includes("pos2") && (
        <div style={{ marginTop:4, paddingLeft:16, borderLeft:`3px solid ${C.teal}`, marginBottom:14 }}>
          <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:700, marginBottom:10 }}>POSⅡ　機器引取</div>
          <Field label="機器引取" required error={te.pos2Hikitori}>
            <div style={{ display:"flex", gap:12 }}>
              {["あり","なし"].map(v => (
                <label key={v} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"9px 20px", borderRadius:10, border:`1.5px solid ${d.pos2Hikitori===v?C.teal:te.pos2Hikitori?C.danger:C.border}`, background:d.pos2Hikitori===v?C.tealLight:te.pos2Hikitori?"#fff5f5":C.white, fontSize:13.5, fontWeight:d.pos2Hikitori===v?700:400 }}>
                  <input type="radio" name={`pos2Hikitori-${tabId}`} value={v} checked={d.pos2Hikitori===v}
                    onChange={() => { upd("pos2Hikitori",v); clr("pos2Hikitori"); if (v==="なし") updM({ pos2HikitoriKiki:[], pos2HikitoriSonota:"" }); }} />{v}
                </label>
              ))}
            </div>
          </Field>
          {d.pos2Hikitori==="あり" && (
            <Field label="引取機器（複数選択可）" required error={te.pos2HikitoriKiki}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {HIKITORI_KIKI_LIST.map(k => {
                  const checked = (d.pos2HikitoriKiki||[]).includes(k);
                  return (
                    <label key={k} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, border:`1px solid ${checked?C.teal:te.pos2HikitoriKiki?C.danger:C.border}`, background:checked?C.tealLight:C.white, cursor:"pointer", fontSize:13, fontWeight:checked?600:400, transition:"all .15s" }}>
                      <input type="checkbox" checked={checked} style={{ width:14, height:14, cursor:"pointer" }}
                        onChange={e => { const next=e.target.checked?[...(d.pos2HikitoriKiki||[]),k]:(d.pos2HikitoriKiki||[]).filter(x=>x!==k); upd("pos2HikitoriKiki",next); clr("pos2HikitoriKiki"); }} />
                      {k}
                    </label>
                  );
                })}
              </div>
              {(d.pos2HikitoriKiki||[]).includes("その他") && (
                <UIInput value={d.pos2HikitoriSonota||""} hasError={!!te.pos2HikitoriSonota} onChange={e => { upd("pos2HikitoriSonota", e.target.value); clr("pos2HikitoriSonota"); }} placeholder="その他の機器名を入力" style={{ marginTop: 8 }} />
              )}
              {te.pos2HikitoriSonota && <div style={{ fontSize:12, color:C.danger, marginTop:4 }}>{te.pos2HikitoriSonota}</div>}
            </Field>
          )}
        </div>
      )}

      {/* オリジナルレシートロゴデータ提出 */}
      {(() => {
        const hasPos2 = (d.nohinData||[]).includes("pos2");
        const noshiLabel = hasPos2
          ? "提出なし（現在のPOSⅡロゴを継続使用）"
          : "提出なし（サロン名のゴシック体ロゴで納品します）";
        return (
          <Field label="オリジナルレシートロゴデータ提出" required error={te.receiptoLogo}>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { v:"提出あり", label:"提出あり" },
                { v:"提出なし", label:noshiLabel }
              ].map(({ v, label }) => (
                <label key={v} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"9px 16px", borderRadius:10, border:`1.5px solid ${d.receiptoLogo===v?C.teal:te.receiptoLogo?C.danger:C.border}`, background:d.receiptoLogo===v?C.tealLight:te.receiptoLogo?"#fff5f5":C.white, fontSize:13.5, fontWeight:d.receiptoLogo===v?700:400 }}>
                  <input type="radio" name={`receipto-${tabId}`} value={v} checked={d.receiptoLogo===v}
                    onChange={() => { upd("receiptoLogo",v); clr("receiptoLogo"); }} />{label}
                </label>
              ))}
            </div>
          </Field>
        );
      })()}

      <Field label="備考（納品データについて）">
        <UITextarea value={d.nohinSonota||""} onChange={e => upd("nohinSonota", e.target.value)} placeholder="納品データに関する補足事項があれば記入してください" />
      </Field>
    </Card>

    {/* サービス選択 */}
    <Card>
      <SecTitle icon="📦">サービス選択</SecTitle>

      <Field label="申込パッケージ" required error={te.package}>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {PACKAGES.map(pkg => (
            <label key={pkg} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"10px 24px", borderRadius:10, border:`1.5px solid ${d.package===pkg ? C.teal : te.package ? C.danger : C.border}`, background:d.package===pkg ? C.tealLight : te.package ? "#fff5f5" : C.white, fontSize:13.5, fontWeight:d.package===pkg?700:400 }}>
              <input type="radio" name={`pkg-${tabId}`} value={pkg} checked={d.package===pkg}
                onChange={() => {
                  const defaultCount = pkg==="ベーシックパック+" ? "2台" : "0台（申込なし）";
                  updM({ package:pkg, conciergeCount:defaultCount, conciergeActualCount:"" });
                  clr("package");
                }} />
              <span>{pkg}</span>
              <span style={{ fontSize:12, color:C.muted, marginLeft:4 }}>{fmtPrice(PACKAGE_BASE[pkg])}/月</span>
            </label>
          ))}
        </div>
        {d.package && d.package !== "シンプルパック" && <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>e-Reserve込み{d.package==="ベーシックパック+"?"・LinQ Concierge 2台込み":""}</div>}
        {!d.package && <p style={{ fontSize:12, color:C.muted, marginTop:6 }}>パッケージを選択するとConcierge台数・オプション・月額合計が表示されます</p>}
      </Field>

      {d.package && (<>
        <Field label="LinQ Concierge 台数" required hint={d.package==="ベーシックパック+" ? "2台まで料金込み。3台目から追加料金が発生します。" : undefined} error={te.conciergeCount}>
          <UISelect value={d.conciergeCount||""} hasError={!!te.conciergeCount} onChange={e => { upd("conciergeCount",e.target.value); upd("conciergeActualCount",""); clr("conciergeCount"); }} style={{ maxWidth:260 }}>
            <option value="">-- 選択してください --</option>
            {(CONCIERGE_BANDS[d.package]||[]).map(b => {
              const price = CONCIERGE_PRICE[d.package]?.[b] ?? 0;
              return <option key={b} value={b}>{b}　¥{price.toLocaleString()}</option>;
            })}
          </UISelect>
          {CONCIERGE_NEEDS_ACTUAL.includes(d.conciergeCount) && (
            <div style={{ marginTop:10 }}>
              {d.conciergeCount === "6〜10台" && (
                <Field label="実際の使用台数" required error={te.conciergeActualCount}>
                  <UISelect value={d.conciergeActualCount||""} style={{ maxWidth:220, borderColor:te.conciergeActualCount?C.danger:undefined }}
                    onChange={e => { upd("conciergeActualCount",e.target.value); clr("conciergeActualCount"); }}>
                    <option value="">― 選択してください ―</option>
                    {[6,7,8,9,10].map(n => <option key={n} value={String(n)}>{n}台</option>)}
                  </UISelect>
                </Field>
              )}
              {d.conciergeCount === "11〜20台" && (
                <Field label="実際の使用台数" required error={te.conciergeActualCount}>
                  <UISelect value={d.conciergeActualCount||""} style={{ maxWidth:220, borderColor:te.conciergeActualCount?C.danger:undefined }}
                    onChange={e => { upd("conciergeActualCount",e.target.value); clr("conciergeActualCount"); }}>
                    <option value="">― 選択してください ―</option>
                    {Array.from({length:10},(_,i)=>i+11).map(n => <option key={n} value={String(n)}>{n}台</option>)}
                  </UISelect>
                </Field>
              )}
              {d.conciergeCount === "台数フリー" && (
                <Field label="実際の使用台数" required hint={!te.conciergeActualCount?"21台以上100台以下":undefined} error={te.conciergeActualCount}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <UIInput type="number" value={d.conciergeActualCount||""} hasError={!!te.conciergeActualCount}
                      min={21} max={100} style={{ maxWidth:100 }}
                      onChange={e => {
                        let v = e.target.value.replace(/[^0-9]/g,"");
                        if (v !== "" && Number(v) > 100) v = "100";
                        upd("conciergeActualCount", v);
                        clr("conciergeActualCount");
                      }}
                      placeholder="21〜100" />
                    <span style={{ fontSize:13, color:C.muted }}>台</span>
                  </div>
                </Field>
              )}
            </div>
          )}
        </Field>

        <Field label="オプション（複数選択可）">
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {OPTIONS_LIST.map(opt => {
              const checked = (d.options||[]).includes(opt.key);
              return (
                <label key={opt.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${checked?C.teal:C.border}`, background:checked?C.tealLight:C.white, cursor:"pointer", transition:"all .15s" }}>
                  <input type="checkbox" checked={checked} style={{ width:16, height:16, cursor:"pointer" }}
                    onChange={e => { const next=e.target.checked?[...(d.options||[]),opt.key]:(d.options||[]).filter(x=>x!==opt.key); upd("options",next); }} />
                  <span style={{ fontSize:13, color:checked?C.tealDark:C.text, fontWeight:checked?600:400, flex:1 }}>{opt.label}</span>
                  <span style={{ fontSize:12, color:C.muted }}>{opt.key==="cti" ? (d.package?fmtPrice(CTI_PRICE[d.package]||0):"¥0") : (opt.price>0?fmtPrice(opt.price):"¥0")}</span>
                </label>
              );
            })}
            {/* LAN */}
            <label style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:`1px solid ${d.lanEnabled?C.teal:C.border}`, background:d.lanEnabled?C.tealLight:C.white, cursor:"pointer", transition:"all .15s" }}>
              <input type="checkbox" checked={!!d.lanEnabled} style={{ width:16, height:16, cursor:"pointer" }} onChange={e => upd("lanEnabled",e.target.checked)} />
              <span style={{ fontSize:13, color:d.lanEnabled?C.tealDark:C.text, fontWeight:d.lanEnabled?600:400, flex:1 }}>LAN</span>
              <span style={{ fontSize:12, color:C.muted }}>{fmtPrice(LAN_PRICE)}/台</span>
            </label>
            {d.lanEnabled && (
              <div style={{ paddingLeft:36, marginTop:4 }}>
                <Field label="LAN台数" half>
                  <UISelect value={d.lanCount||1} onChange={e => upd("lanCount",Number(e.target.value))} style={{ maxWidth:160 }}>
                    {LAN_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}台　{fmtPrice(n*LAN_PRICE)}</option>)}
                  </UISelect>
                </Field>
              </div>
            )}
          </div>
        </Field>

        {/* 月額合計 */}
        <div style={{ background:C.tealLight, border:`1.5px solid ${C.teal}`, borderRadius:12, padding:"14px 18px", marginTop:8 }}>
          <div style={{ fontSize:12.5, color:C.tealDark, fontWeight:700, marginBottom:8 }}>💰 月額料金合計（税別）</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:13 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>基本パッケージ（{d.package}）</span><span>{fmtPrice(PACKAGE_BASE[d.package])}</span></div>
            {d.conciergeCount && d.conciergeCount!=="0台（申込なし）" && (
              <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>LinQ Concierge（{d.conciergeCount}）</span><span>{fmtPrice(CONCIERGE_PRICE[d.package]?.[d.conciergeCount]??0)}</span></div>
            )}
            {OPTIONS_LIST.filter(o=>(d.options||[]).includes(o.key)).map(o => (
              <div key={o.key} style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>{o.label}</span><span>{fmtPrice(o.key==="cti"?(CTI_PRICE[d.package]||0):o.price)}</span></div>
            ))}
            {d.lanEnabled && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>LAN（{d.lanCount||1}台）</span><span>{fmtPrice(LAN_PRICE*(d.lanCount||1))}</span></div>}
            <div style={{ borderTop:`1px solid ${C.teal}`, marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:15 }}>
              <span>合計</span><span style={{ color:C.tealDark }}>{fmtPrice(monthly)}</span>
            </div>
          </div>
        </div>
      </>)}

    </Card>


    {/* 月額支払い方法（店舗追加のみ） */}
    {isTenpoAdd && (
      <Card>
        <SecTitle icon="💳">月額支払い方法</SecTitle>
        <Field label="支払い方法" required error={te.shiharaiHoho}>
          <div style={{ display:"flex", gap:12 }}>
            {["既存口座で支払う","新規口座を登録する"].map(v => (
              <label key={v} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"10px 20px", borderRadius:10, border:`1.5px solid ${d.shiharaiHoho===v?C.teal:te.shiharaiHoho?C.danger:C.border}`, background:d.shiharaiHoho===v?C.tealLight:te.shiharaiHoho?"#fff5f5":C.white, fontSize:13.5, fontWeight:d.shiharaiHoho===v?700:400 }}>
                <input type="radio" name={`shiharai-${tabId}`} value={v} checked={d.shiharaiHoho===v}
                  onChange={() => { upd("shiharaiHoho",v); clr("shiharaiHoho"); }} />{v}
              </label>
            ))}
          </div>
        </Field>
        {d.shiharaiHoho==="既存口座で支払う" && (
          <div style={{ marginTop:4, paddingLeft:16, borderLeft:`3px solid ${C.teal}` }}>
            {/* 系列店コピー選択時：「コピー元と同じ」チェックボックス */}
            {(d.nohinData||[]).includes("keirestore") && d.keireistenName && (
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"8px 14px", borderRadius:8, border:`1px solid ${d.sameAsKeireis?C.teal:C.border}`, background:d.sameAsKeireis?C.tealLight:C.white, fontSize:13.5, fontWeight:d.sameAsKeireis?600:400, width:"fit-content" }}>
                  <input type="checkbox" checked={!!d.sameAsKeireis} style={{ width:16, height:16, cursor:"pointer" }}
                    onChange={e => {
                      if (e.target.checked) {
                        updM({ sameAsKeireis:true, kizonTenpoName:d.keireistenName, kizonTenpoDenwa:d.keireistenDenwa });
                        clr("kizonTenpoName"); clr("kizonTenpoDenwa");
                      } else {
                        updM({ sameAsKeireis:false, kizonTenpoName:"", kizonTenpoDenwa:"" });
                      }
                    }} />
                  コピー元店舗（{d.keireistenName}）と同じ
                </label>
              </div>
            )}
            <Field label="既存の店舗名" required error={te.kizonTenpoName} hint={!te.kizonTenpoName ? "引き落とし口座を使用している店舗名を入力してください" : undefined}>
              <UIInput value={d.kizonTenpoName||""} hasError={!!te.kizonTenpoName} disabled={!!d.sameAsKeireis}
                onChange={e => { upd("kizonTenpoName",e.target.value); clr("kizonTenpoName"); }}
                placeholder="例：ヘアサロン〇〇 新宿店" style={{ maxWidth:320 }} />
            </Field>
            <Field label="既存の店舗電話番号" required hint={!te.kizonTenpoDenwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.kizonTenpoDenwa}>
              <UIInput value={d.kizonTenpoDenwa||""} hasError={!!te.kizonTenpoDenwa} numHyphen disabled={!!d.sameAsKeireis}
                onChange={e => { upd("kizonTenpoDenwa",e.target.value); clr("kizonTenpoDenwa"); }}
                placeholder="例：03-1234-5678" style={{ maxWidth:260 }} />
            </Field>
          </div>
        )}
      </Card>
    )}

    {/* 日程調整 */}
    <Card>
      <SecTitle icon="🗓️">日程調整</SecTitle>
      <Field label="日程調整先" required error={te.nicchoseiSaki} hint={!te.nicchoseiSaki && loadMyInfo() ? "「営業」を選ぶとマイ情報が自動入力されます" : undefined}>
        <UISelect value={d.nicchoseiSaki||""} onChange={e => {
          const val = e.target.value;
          if (val==="営業") {
            const my = loadMyInfo();
            if (my) { updM({ nicchoseiSaki:"営業", nicchoseiTantosha:my.tantosha||"", nicchoseiTantoshaKana:my.tantoshaKana||"", nicchoseiDenwa:my.tantoshaDenwa||"" }); ["nicchoseiTantosha","nicchoseiTantoshaKana","nicchoseiDenwa"].forEach(k=>clr(k)); }
            else { upd("nicchoseiSaki",val); }
          } else {
            updM({ nicchoseiSaki:val, nicchoseiTantosha:"", nicchoseiTantoshaKana:"", nicchoseiDenwa:"" });
          }
          clr("nicchoseiSaki");
        }} style={{ maxWidth:220, borderColor:te.nicchoseiSaki?C.danger:undefined }}>
          <option value="">― 選択してください ―</option>
          {NICCHOSEISAKISAKI_LIST.map(o => <option key={o}>{o}</option>)}
        </UISelect>
      </Field>
      <FieldRow>
        <Field label="担当者名" required half error={te.nicchoseiTantosha}>
          <UIInput value={d.nicchoseiTantosha||""} hasError={!!te.nicchoseiTantosha}
            onChange={e => { upd("nicchoseiTantosha",e.target.value); clr("nicchoseiTantosha"); if (!e.target.value) upd("nicchoseiTantoshaKana",""); }}
            placeholder="例：鈴木 一郎" {...tantoshaFg} />
        </Field>
        <Field label="フリガナ" required half error={te.nicchoseiTantoshaKana}>
          <UIInput value={d.nicchoseiTantoshaKana||""} hasError={!!te.nicchoseiTantoshaKana} onlyKatakana
            onChange={e => { upd("nicchoseiTantoshaKana",e.target.value); clr("nicchoseiTantoshaKana"); }}
            placeholder="スズキ イチロウ" />
        </Field>
      </FieldRow>
      <Field label="連絡先電話番号" required hint={!te.nicchoseiDenwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.nicchoseiDenwa}>
        <UIInput value={d.nicchoseiDenwa||""} hasError={!!te.nicchoseiDenwa} numHyphen
          onChange={e => { upd("nicchoseiDenwa",e.target.value); clr("nicchoseiDenwa"); }} placeholder="例：090-1234-5678" style={{ maxWidth:240 }} />
      </Field>

      {/* ネット開通日（常時表示） */}
      <Field label="ネット開通日" required error={te.netKaiTsubiStatus}>
        <div style={{ display:"flex", gap:10, marginBottom:10 }}>
          {["開通済","未開通"].map(s => (
            <label key={s} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"6px 16px", borderRadius:10, border:`1.5px solid ${d.netKaiTsubiStatus===s?C.teal:te.netKaiTsubiStatus?C.danger:C.border}`, background:d.netKaiTsubiStatus===s?C.tealLight:te.netKaiTsubiStatus?"#fff5f5":C.white, fontSize:13, fontWeight:d.netKaiTsubiStatus===s?700:400 }}>
              <input type="radio" name={`netStatus-${tabId}`} value={s} checked={d.netKaiTsubiStatus===s} onChange={() => { upd("netKaiTsubiStatus",s); clr("netKaiTsubiStatus"); }} />{s}
            </label>
          ))}
        </div>
        {d.netKaiTsubiStatus==="開通済" && <div style={{ fontSize:13, color:C.muted, padding:"6px 0" }}>📝 申込書に「開通済」と記載されます</div>}
        {d.netKaiTsubiStatus==="未開通" && (
          <div style={{ marginTop:4, paddingLeft:16, borderLeft:`3px solid ${C.border}` }}>
            <div style={{ display:"flex", gap:10, marginBottom:8 }}>
              {["確定","未定"].map(s => (
                <label key={s} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"5px 14px", borderRadius:10, border:`1.5px solid ${d.netKaiTsubiKakutei===s?C.teal:C.border}`, background:d.netKaiTsubiKakutei===s?C.tealLight:C.white, fontSize:13, fontWeight:d.netKaiTsubiKakutei===s?700:400 }}>
                  <input type="radio" name={`netKakutei-${tabId}`} value={s} checked={d.netKaiTsubiKakutei===s} onChange={() => upd("netKaiTsubiKakutei",s)} />{s}
                </label>
              ))}
            </div>
            {d.netKaiTsubiKakutei==="確定" && (
              <div>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  {["date","text"].map(m => (
                    <label key={m} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", fontSize:12.5, color:d.netKaiTsubiMode===m?C.teal:C.muted, fontWeight:d.netKaiTsubiMode===m?700:400 }}>
                      <input type="radio" name={`netMode-${tabId}`} value={m} checked={d.netKaiTsubiMode===m} onChange={() => upd("netKaiTsubiMode",m)} />
                      {m==="date" ? "日付で入力" : "大体の日程で入力（例：5月中旬頃）"}
                    </label>
                  ))}
                </div>
                {d.netKaiTsubiMode==="date"
                  ? <UIInput type="date" value={d.netKaiTsubiDate||""} hasError={!!te.netKaiTsubiDate} onChange={e => { upd("netKaiTsubiDate",e.target.value); clr("netKaiTsubiDate"); }} style={{ maxWidth:200 }} />
                  : <UIInput value={d.netKaiTsubiText||""} hasError={!!te.netKaiTsubiText} onChange={e => { upd("netKaiTsubiText",e.target.value); clr("netKaiTsubiText"); }} placeholder="例：5月中旬頃、〇月〇日前後" style={{ maxWidth:300 }} />
                }
              </div>
            )}
            {d.netKaiTsubiKakutei==="未定" && <div style={{ fontSize:13, color:C.muted, padding:"6px 0" }}>📝 申込書に「未定」と記載されます</div>}
          </div>
        )}
      </Field>

      {/* 開業・出店状況（常時表示） */}
      <Field label="開業・出店状況" required error={te.openStatus}>
        <div style={{ display:"flex", gap:12, marginBottom:10 }}>
          {["営業中","新規開業・出店"].map(s => (
            <label key={s} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"9px 20px", borderRadius:10, border:`1.5px solid ${d.openStatus===s?C.teal:te.openStatus?C.danger:C.border}`, background:d.openStatus===s?C.tealLight:te.openStatus?"#fff5f5":C.white, fontSize:13.5, fontWeight:d.openStatus===s?700:400 }}>
              <input type="radio" name={`openStatus-${tabId}`} value={s} checked={d.openStatus===s}
                onChange={() => { upd("openStatus",s); clr("openStatus"); if (s==="営業中") updM({ openMode:"date", openDate:"", openText:"" }); }} />{s}
            </label>
          ))}
        </div>
        {d.openStatus==="新規開業・出店" && (
          <div style={{ marginTop:4, paddingLeft:16, borderLeft:`3px solid ${C.teal}` }}>
            <div style={{ display:"flex", gap:10, marginBottom:8 }}>
              {["確定","未定"].map(s => (
                <label key={s} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"5px 14px", borderRadius:10, border:`1.5px solid ${d.openKakutei===s?C.teal:C.border}`, background:d.openKakutei===s?C.tealLight:C.white, fontSize:13, fontWeight:d.openKakutei===s?700:400 }}>
                  <input type="radio" name={`openKakutei-${tabId}`} value={s} checked={d.openKakutei===s} onChange={() => upd("openKakutei",s)} />{s}
                </label>
              ))}
            </div>
            {d.openKakutei==="確定" && (
              <div>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  {["date","text"].map(m => (
                    <label key={m} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", fontSize:12.5, color:d.openMode===m?C.teal:C.muted, fontWeight:d.openMode===m?700:400 }}>
                      <input type="radio" name={`openMode-${tabId}`} value={m} checked={d.openMode===m} onChange={() => upd("openMode",m)} />
                      {m==="date" ? "日付で入力" : "大体の日程で入力（例：5月中旬頃）"}
                    </label>
                  ))}
                </div>
                {d.openMode==="date"
                  ? <UIInput type="date" value={d.openDate||""} hasError={!!te.openDate} onChange={e => { upd("openDate",e.target.value); clr("openDate"); }} style={{ maxWidth:200 }} />
                  : <UIInput value={d.openText||""} hasError={!!te.openText} onChange={e => { upd("openText",e.target.value); clr("openText"); }} placeholder="例：5月末オープン予定、〇月上旬" style={{ maxWidth:300 }} />
                }
              </div>
            )}
            {d.openKakutei==="未定" && <div style={{ fontSize:13, color:C.muted, padding:"6px 0" }}>📝 申込書に「未定」と記載されます</div>}
          </div>
        )}
      </Field>

      {/* LinQ2のネット接続方法 */}
      <Field label="LinQ2のネット接続方法" required error={te.setsuzokoHoho}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {["有線","無線","現在未定"].map(v => (
            <label key={v} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"7px 16px", borderRadius:10, border:`1.5px solid ${d.setsuzokoHoho===v?C.teal:te.setsuzokoHoho?C.danger:C.border}`, background:d.setsuzokoHoho===v?C.tealLight:te.setsuzokoHoho?"#fff5f5":C.white, fontSize:13, fontWeight:d.setsuzokoHoho===v?700:400 }}>
              <input type="radio" name={`setsuzoko-${tabId}`} value={v} checked={d.setsuzokoHoho===v}
                onChange={() => { upd("setsuzokoHoho",v); clr("setsuzokoHoho"); }} />{v}
            </label>
          ))}
        </div>
      </Field>

      <Field label="調査希望日時" required error={te.chosaDate}>
        <UITextarea value={d.chosaDate||""} hasError={!!te.chosaDate}
          onChange={e => { upd("chosaDate",e.target.value); clr("chosaDate"); }}
          placeholder={"例：4月15日 午前中希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
      </Field>
      <Field label="導入希望日時" required error={te.donguDate}>
        <UITextarea value={d.donguDate||""} hasError={!!te.donguDate}
          onChange={e => { upd("donguDate",e.target.value); clr("donguDate"); }}
          placeholder={"例：5月1日 午後希望\n第一希望：〇月〇日、第二希望：〇月〇日"} />
      </Field>

      <Field label="備考（日程について）">
        <UITextarea value={d.biko||""} onChange={e => upd("biko",e.target.value)} placeholder="日程調整に関する補足事項があれば記入してください" />
      </Field>
    </Card>
  </>);
};

// ==================== STEP2 メイン ====================
const Step2 = ({ form, setForm, errors, setErrors, errorTabId, clearErrorTabId }) => {
  const [activeTabId, setActiveTabId] = useState(() => form.tabs[0]?.id || null);

  // アクティブタブが削除されたときのフォールバック
  useEffect(() => {
    if (!form.tabs.find(t => t.id === activeTabId)) {
      setActiveTabId(form.tabs[form.tabs.length - 1]?.id || null);
    }
  }, [form.tabs, activeTabId]);

  // バリデーションエラー時：エラーのある最初のタブにジャンプ
  useEffect(() => {
    if (errorTabId) {
      setActiveTabId(errorTabId);
      clearErrorTabId?.();
    }
  }, [errorTabId]);

  const activeTab = form.tabs.find(t => t.id === activeTabId) || form.tabs[0];

  // タブ追加
  const handleAddTab = () => {
    const tab = newTab();
    setForm(f => ({ ...f, tabs: [...f.tabs, tab] }));
    setActiveTabId(tab.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // タブ削除
  const handleDeleteTab = (tabId) => {
    const tab = form.tabs.find(t => t.id === tabId);
    const label = tab?.data?.tenpoName || tab?.data?.honbuName || TYPE_LABEL[tab?.type] || "この申込書";
    if (!window.confirm(`「${label}」を削除します。入力内容はすべて失われます。よいですか？`)) return;
    setForm(f => ({
      ...f,
      tabs: f.tabs
        .filter(t => t.id !== tabId)
        .map(t => {
          // 削除したタブを参照しているフロントWAN本部_新規店のlinkedTabIdをリセット
          if (t.type === "新規_フロントWAN本部_新規店" && t.data?.linkedTabId === tabId) {
            return { ...t, data: { ...t.data, linkedTabId: "" } };
          }
          return t;
        }),
    }));
  };

  // 申込種別を選択
  const handleSelectType = (tabId, type) => {
    setForm(f => ({
      ...f,
      tabs: f.tabs.map(t => t.id === tabId ? { ...t, type, data: DATA_FN[type]() } : t),
    }));
  };

  // 申込種別をリセット（変更）
  const handleResetType = (tabId) => {
    setForm(f => ({
      ...f,
      tabs: f.tabs.map(t => t.id === tabId ? { ...t, type: "", data: {} } : t),
    }));
  };

  // タブデータ更新（フォーム内から使う）
  const updTab = useCallback((tabId, key, value) => {
    setForm(f => ({
      ...f,
      tabs: f.tabs.map(t => {
        if (t.id !== tabId) return t;
        if (key === '__many__') return { ...t, data: { ...t.data, ...value } };
        if (key === '__reset__') return { ...t, data: DATA_FN[t.type]() };
        return { ...t, data: { ...t.data, [key]: value } };
      }),
    }));
  }, [setForm]);

  const clrTab = useCallback((tabId, key) => {
    setErrors(e => {
      if (!e.tabs) return e;
      const tabs = { ...e.tabs };
      if (!tabs[tabId]) return e;
      const updated = { ...tabs[tabId] };
      delete updated[key];
      tabs[tabId] = Object.keys(updated).length > 0 ? updated : null;
      const allNull = Object.values(tabs).every(v => !v);
      return allNull ? {} : { ...e, tabs };
    });
  }, [setErrors]);

  return (<>
    {/* タブバー */}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 24 }}>
      {form.tabs.map((tab, i) => {
        const isActive = tab.id === activeTabId;
        const hasErr = !!(errors && errors.tabs && errors.tabs[tab.id] && Object.keys(errors.tabs[tab.id]).length > 0);
        const label = getTabLabel(tab, i, form.tabs);
        return (
          <button key={tab.id} onClick={() => { setActiveTabId(tab.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{
              padding: "8px 20px", borderRadius: 22,
              border: isActive ? "none" : hasErr ? `1.5px solid ${C.danger}` : `1.5px solid ${C.border}`,
              cursor: "pointer", fontSize: 13,
              fontWeight: isActive ? 700 : 400, fontFamily: FONT,
              background: isActive ? C.teal : C.white,
              color: isActive ? "#fff" : hasErr ? C.danger : C.muted,
              boxShadow: isActive ? "0 2px 10px rgba(29,158,117,.30)" : hasErr ? `0 0 0 1.5px ${C.danger}` : "0 1px 3px rgba(0,0,0,.06)",
              transition: "all .2s",
            }}>
            {hasErr ? "⚠️ " : !tab.type ? "📋 " : ""}{label}
          </button>
        );
      })}
      {/* 申込書を追加するボタン */}
      <button onClick={handleAddTab}
        style={{
          padding: "8px 20px", borderRadius: 22,
          border: `2px dashed ${C.campaign}`,
          cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT,
          background: C.tealLight, color: C.campaign,
          transition: "all .2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.campaignLight; }}
        onMouseLeave={e => { e.currentTarget.style.background = C.tealLight; }}>
        ＋ 申込書を追加する
      </button>
    </div>

    {/* アクティブタブのヘッダー */}
    {activeTab && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.muted }}>
          {form.tabs.indexOf(activeTab) + 1} / {form.tabs.length} 枚目
          {activeTab.type && <span style={{ marginLeft: 10, padding: "2px 10px", borderRadius: 12, background: C.tealLight, color: C.tealDark, fontSize: 12, fontWeight: 600 }}>{activeTab.type === "新規_単店" ? getDynamicTantoLabel(form.tabs) : TYPE_LABEL[activeTab.type]}</span>}
        </div>
        {form.tabs.length > 1 && (
          <button onClick={() => handleDeleteTab(activeTab.id)}
            style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: C.danger, border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: FONT }}>
            🗑 この申込書を削除
          </button>
        )}
      </div>
    )}

    {/* タブコンテンツ */}
    {activeTab && (
      activeTab.type === ""
        ? <TypeSelector onSelect={(type) => handleSelectType(activeTab.id, type)} form={form} onJump={(tabId) => { setActiveTabId(tabId); window.scrollTo({ top:0, behavior:"smooth" }); }} />
        : (() => {
            const tabErrors = errors && errors.tabs ? (errors.tabs[activeTab.id] || {}) : {};
            return (<>
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
                <button onClick={() => { if (window.confirm("申込種別を変更すると入力内容がリセットされます。よいですか？")) handleResetType(activeTab.id); }}
                  style={{ fontSize:12, fontWeight:600, color:C.muted, background:C.white, border:`1.5px solid ${C.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontFamily:FONT }}>
                  🔄 種別を変更する
                </button>
              </div>
              {(activeTab.type === "新規_単店" || activeTab.type === "新規_店舗追加")
                ? <TenpoTabContent tab={activeTab} form={form} updTab={updTab} clrTab={clrTab} errors={tabErrors} />
                : activeTab.type === "新規_事務所WAN本部"
                ? <WanHonbuTabContent tab={activeTab} form={form} updTab={updTab} clrTab={clrTab} errors={tabErrors} />
                : activeTab.type === "新規_フロントWAN本部_既存店"
                ? <FrontWanTabContent tab={activeTab} form={form} updTab={updTab} clrTab={clrTab} errors={tabErrors} />
                : activeTab.type === "新規_フロントWAN本部_新規店"
                ? <FrontWanNewTabContent tab={activeTab} form={form} updTab={updTab} clrTab={clrTab} errors={tabErrors} />
                : activeTab.type === "端末入替"
                ? <NyuukaeTabContent tab={activeTab} form={form} updTab={updTab} clrTab={clrTab} errors={tabErrors} />
                : activeTab.type === "端末入替_変更あり"
                ? <NyuukaeHenkoTabContent tab={activeTab} form={form} updTab={updTab} clrTab={clrTab} errors={tabErrors} />
                : activeTab.type === "全解約"
                ? <ZenkaiTabContent tab={activeTab} form={form} updTab={updTab} clrTab={clrTab} errors={tabErrors} />
                : activeTab.type === "契約変更"
                ? <KeiyakuHenkoTabContent tab={activeTab} form={form} updTab={updTab} clrTab={clrTab} errors={tabErrors} />
                : <Card style={{ border:`2px dashed ${C.teal}`, background:C.tealLight }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.tealDeep, marginBottom:4 }}>🔧 {TYPE_LABEL[activeTab.type]} のフォームを実装中...</div>
                    <div style={{ fontSize:12, color:C.teal }}>次フェーズで入力フォームを追加します</div>
                  </Card>
              }
            </>);
          })()
    )}

    {/* 申込書を追加するボタン（下部） */}
    <div style={{ display:"flex", justifyContent:"center", marginTop:32 }}>
      <button onClick={handleAddTab}
        style={{
          padding:"10px 28px", borderRadius:22,
          border:`2px dashed ${C.campaign}`,
          cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:FONT,
          background:C.tealLight, color:C.campaign,
          transition:"all .2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.campaignLight; }}
        onMouseLeave={e => { e.currentTarget.style.background = C.tealLight; }}>
        ＋ 申込書を追加する
      </button>
    </div>
  </>);
};

// ==================== PDF共通 ====================
const LOGO_BASE64 = "data:image/png;base64,/9j/4AAQSkZJRgABAgAAAQABAAD/wAARCABUAVADACIAAREBAhEB/9sAQwAIBgYHBgUIBwcHCQkICgwUDQwLCwwZEhMPFB0aHx4dGhwcICQuJyAiLCMcHCg3KSwwMTQ0NB8nOT04MjwuMzQy/9sAQwEJCQkMCwwYDQ0YMiEcITIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMAAAERAhEAPwD3+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiuQ+JepSab4MnaGV4pppEiR0YqRzk4I9lNVCLnJRXUmclGLk+h1ctxDAu6aaONfV2AH61Tk13SIoTM+qWaxBthczrjdjOM564r5klnmnbdNLJI3q7En9a2V/5EFv8AsKf+0q9N5Zyq7l26efqeesxUnZR79T3v/hKvD5/5jen/APgQn+NTw67pFwcQ6pZSH0WdT/WvmCir/sr+/wDh/wAEj+0v7v4/8A+rlZXGVYEeoOaWvluy1S9064jmtrqeMxsGwkhAODnBr3D4j39xb+CPtVncSQSNJGQ8TlTg+4rkr4KVKUY3vzaHVRxcakZStax2lFeLeG/Dni/xHpI1GPxDc20LuVjEk8hLgd+D0zkfhXL6nqviDS9UurCXW713t5DGzLcPgkdxzVLASlJwUldEvGxUVJxdmfSNFeHeFNJ8U+LLOe5t/ElxAkMnlkSTyEk4B7H3qtPJ4k0HxrZaXf6teyf6VD83nvslQsORk9Oo/A0LASc+TmV/68g+ux5efldj3qiue8Y6Vf6to6R6fqf9nPFJ5rzb2X5ApyCR9c/hXh51XxDI92bPV9Sure1+Z50lkChc4DHngH3rLD4SVdNxaNK+JjRfvJn0jRXzx4f8daxo2rxXVxe3N3b/AHZYZZS25T1xk8H0r37T7+21SwhvbSUSQTLuRh/nrSxGFnQtzbMdDEwrX5SzRWF4r0jUda0hbXTNQNjOJVcyhmGVAORxz3FeFalq3iDTNTurGTW713t5WiZluHwSDjI5p4fCuv8AC1cK+IVH4k7H0lRXmOm+KUsPhOJtQ1CU39ylxHAS5aVm3MAQevHHPavOLTWfEl9dR2trqepTTyNtREnckn86ungalSUkntoRUxkIKLfU+laK800fwR4ugvrG7vPEkhSOVJJYPOkbIBBK9cHjivS656tJU9pJ+hvTqOe8WvUKK8x+JFlqllNLrUXiGSztSqxx2qSOGd/YA4//AFV5xcax4ltBEbjUdTiEyCSMvO43qehHPSuijgpVY80ZIwq4uNKXLJM+laK8g+HPj2ZLsaRrNy8qTN+4uJWJKsf4ST2Pb0P6ev1hXoToy5ZG1GtGrHmiFFee+P8AQ9eke61qw1qS1tLa23NbpI652gkkY4ya8l/4STXP+gxf/wDgQ/8AjW1HBSrR5oyRjWxcaUrSTPpyivJU8HeJXRW/4TZRuAODcv8A41xV/rPiDSdVntP7fupXgcr5kVyzK305pwwTqO0Zpv8AryCeLUFeUWv69T6PorjPht4kvfEWhTHUG8y4tpfLMuMbwQCCcd//AK1dnXNVpypTcJbo6KdRVIqcdmFFeSfEa01fSL241ZfEc0MNzIot7OOVw3CgHGDgDqa4WfWPEtqkL3Go6nEs6eZEXmcb19Rz0rqpYGVWKlGSOapjI05csos+laK8t+Gvjp7qRdE1ednmb/j2nkbJb/YJPf0/L0r1KuatRlRnySOilVjVjzRCiiisjQKKKKACiiigArzX4yy40LToc/eui/5KR/7NXpVeW/Gc/wCiaQP9uX+S104NXrxOfFO1GR5FXXaNoWpa94Jmg0y2M8kepb2UMFwPKAzyRXI17L8Gv+QFqX/X1/7Ite7i5uFFyXS35o8bCwU6qi+t/wAmcH/wrnxX/wBAlv8Av6n+NYWp6XeaPfPZX8Pk3CAFkLA4BGR0r6jrwH4of8j5ef8AXOL/ANAFcuExs61TlkkdOKwcKUOaLZx1fSWhw22s+D9LF7bxXEb20TFJVDDO0c4NfNtfSHgk/wDFEaOSf+XZetPM9KSkt7/5iy7Wo0+xrqbPToI4VMNtCo2xpwigDsBXzh4sdJPF2rujBlN05DA5B5r3XxT4S07xYlsl9cTxi3LFfJZRndjOcg+lc5/wp/w//wA/+of9/I//AImuTBVaVNupOer6Wf5nVi6dWouSEdF5/oVvg9cwRaHqKSTRo32rO1mAONi8/pXf3ljpVzNDdXttaSSR48qWZFJXuME/nXE/8Kf8Pnrf6h/38j/+Jrotc8Haf4g0ay0y5nuFhtNuxomXccLt5yD2qcROlOt7SE9/J6aFYeNSFLklDbzWpxnxG8WvqFwnhjRpA5lYJcSIwwxJ4jB9PX8vWs/RvDPjzSbGa30wWS285PmcxPv4xgkg5HtXQ/8ACnvD44+36h/38j/+Irr/AA9odn4a0lNOtJpJIVdnDSsC2Sc9gK0dejRpclJqXe6epmqNWrV5qia7Wa0Pn/XfDOp+HzGdQjiXzWIHlyK2COxA6Vu/D3xo3h2/FleOTplw3zEn/Ut/eHt6/n9e/wBU+F+iarqlzqE17epLcSGRwjoACfTK1U/4U/oH/P8A6h/38j/+JroeLoVaXLVlv5P/AIJgsLWp1OamtvNHfreWzxeatxEY843hxjP1r5s8UusnivVnRgym7lIIOQfmNezD4c6OvhttC+1Xf2Zrn7UXLpv3bduPu4x+FZv/AAp/w/8A8/8AqH/fyP8A+Jrmwk6FCbk5+Wz8joxUK1aCioee68zgT4PubvwLaeILJpJinmC4hJztUO3zKPT1H1NZPhzX7rw3rEWoWoViBtkjbo6HqM9vrX0LoGi2vh7R4tMtZZJIYyxBlILHcST0A9a5i/8AhPoF7fS3Ky3dsJG3eVCyhFPsCpwPat6eOptyhU+HW3oYzwdRKM6e+lzptH8R6ZrenRXtrdRhHHKOwDIfQj1q3dalZWUcslzdRRLEpd9zgED6Vwv/AAp7QFIJvtQ/F0/+IrQ1z4caNr+qyajc3d2krqqkRugHAwOqn0rglSw/NpU09Gdsalfl1hr6nnWr3+q/EPxHJJYiMW1p/qI5pFVQuepzwS2OntitLWvC/jzWrWJNUWzeK35Q5iTYMeoAwPbpwK6SP4QaAsisL7UCVII+dP8A4mu31PTotV0q506ZnWK4jMbMmNwBHbNdU8XTpKMaNml3T0/4c5oYadTmdW6b81qfMt/Yz6bfS2dyFE0Rw21gw6Z4I69a9i+HXjpNTshpeqzqt7Av7uWRsecg9T/eHf16+tJ/wp7QBx9v1Af9tE/+Io/4U9oDcfb9QP8A20j/APiK2r18LWhyylr3szKjRxFGfNGOna6Ol8ZXVung/V0aeMM9nJtBYZOVOMV84dq991z4b6Rrl3FdXV1eRvFCkI8tkA2r0PKnmubuPh94ItHKXHiOSJx/C91ED/6DWWCq0KMXeer8maYulWrNWjt5o4zxL4KudChS8t5UvtOcD/SIgPkYjowGcexrm4wnmIJCwjyNxUZIHfFfQPhTTPDWmaZcaXpupQ38Fw5aRJJkkJyACMADjArMuPhF4fnuJJY7i+hV2yI45F2r7DKk4/Gt6eYU03Gb+dt/kY1MFNpSgvlfb5mz4MGgWXhy3i0e6jeF/mZnYB2c9dw7Htj2rX1HWtO0q0nuLu6iRYVLOu4bvpj1rjoPhHoVtcxXAvb8tG4cbnTGQc/3an1b4Y6JrGrXOoz3l4k1w+9hG6AA4xxlT6V59SNGdTmdTfyZ3QlVhCyp7eZ5zdnWviHrk9/AkISJgkUUsqqqLnhQD1PrWxrfhjx5rFnFFqgs2gtzmM7ok2dsAgDj2+ldRZ/CfQrS+t7qO9vmkgkWVQzoQSpBGfl9q67XNJt9d0efTbqR44ZwAzRkBhgg8ZB9K6Z4unBxjSs0vJ6f5nPDCzmpOpdN+a1PmieGewvZIXOyeCTaSjZwwPUEfzFe4eAvHEOvad9l1CZI9RtwAxYhRKv94e/qP8apf8Kf8P8A/P8A6h/38j/+JpyfCDQFdXF9qB2kHl0/+JrTEVsNXhyylr3szOhRxFGd4x07XR6HRTQygAbhx70u9f7w/OvFPXFopN6/3h+dG5f7w/OgBaKKKACvMPjNGTpmly9lmdfzUH+len1wPxctDceEI51H/HvdI5+hBX+ZFdGFly14vzMMSr0ZLyPDq9J8AeKLPwr4VvLq8hmlSW+8sCIAkHywe5HpXm1bq/8AIhN/2FP/AGlX0GIgp03F9bfmjw6E3CpzLpf8menf8Li0P/nxv/8AvlP/AIqvPfiFdpf+LJLyNWWOe3glUN1AaMEZ/OuWrc8V/wDITtf+wfa/+ilrGjhKdGalG5tVxU60GpGHXvlp4bj8QfDbSdLmnkgUwRPuQAngZ7/WvA8E8AZJ4FfTZu7Hw/ods17cJb28MaRb3OBnGBWWYzcYx5d73+40wEFKUr7WPCfGvhqPwrrUVjDdSTo8Cy7nABGWYY4/3ag8KaRYa3qsltqWpCwhWIuJWZRlgQMfNx3P5VrfE3V7DWfEsFxp10lxCtqqF06BtzHH6isfwrZ6Jfaq8WvXhtbQRFlkD7cvkYGcHtmt6M5yw/NN2evT9DGrGMa/LHbTr+pr+K/Cmi6HpaXWneIY72ZpAvkh1YkHuNp7Vc+E1zqI8Um3gaRrJoma4XPyjj5T7HPH51R8VaT4PsdMSXQtXkubsyAGItvBXuegxWd4R17UtG12zWynk8uWdEkt9xKSAkAjHTPvUJSq0JK/M33Vim4060XblS7O56B4y+Hds0OseIBqE4lCyXPlbRtyBnHrXkG4+pr3zxj4p0MaBrOmnUoPtv2eSLyc/Nv2kY/OvAqzy6dSUGp7K1jTHwhGScN3e56ToPw70nVtCs7+fXXhlnj3tGCnyn05rm/GHhWXwveRGO4NzYTj9zcDuR1U44z/AJ9a2tE0DwFdaNazanrTRXrpmaPzQu1vTBWptZ8aW2g2dpoXhWRJrO2yzXE6CTcWJOBkY4year2tT2tovm12ta3z8vxF7On7K8lbTe9/wOs174eW3iKZNUk1CeF/syLsRQRwteH5Pqa+jr3xXounQi3v9SgguTAHMbHB5HpXzhU5fOclJS2W34jx0IRacd3ueo+Cfh7banpmma9JqE6S+b5vlKo2/I5wPx2169XnXgTxboGm+DbC0vNUgguI9++NzgjLsR+hpfF3xNsbLT1j0C6iuryU/wCsAysQ9T6n0H+Tw4n21aryWvZu2h20HSpUua/RXOg8W+D4PFsdqk93Lb/Z2YgxgHOcev0rwW+0ye21i/sIN8/2R5AzKOdqHBYivbfDvjK3/wCESsNR8QahBDPctIAzDaG2sRwB7Yrzvw7rGmW/xOvtQurmNbCaS4xK/wB1gxOPzrowc6tNyg9VFP7/AFMMVGnUUZrRya+45jQdcu/D+rw6hasdyHDoTw6nqp/z6V77J4v0xPCf/CQiXNsUyqZG4v02fXPFeL+MdAttOuU1PSJFn0W8ZvIkTkIwPKfoce30qhoGnX/iC9h0WCaRbZpPOkGTsjAGGcj1xx+Qror0KeJiqidv8uv3HPRrTw8nTav/AJ9Bus3Gp6u8niC9zsup2jQ54yADtUegBA/ya7zS9IsfA2hWfjCS7muLiW2Xy7YgBWeRc4z1wP5Cs74g6hoEugaNpuhXcM0VozDbGc4GByfcnNa2oGw8W/D/AEzR9MvoptWtLeOVbYHDMUTDL9cZ/GpnUvRioq0W7fIqELVW27ytf5nA654s1nxBKz317IYiciCMlY1HptHX6nJrtvDnwkF7p0d3q93LA8qhlghADKD/AHiQefbFeYyRyQytFKjRyIcMrDBU+hFe9+HPiLomqadF9tvYbK8VQJY5m2AnuVJ4I/WqxTnh6a9grLr/AF+pOGUa9R+2d2eeeNPh1J4Ztf7Rs7lrmyVgr7wA8ZPAJxwRnisnQvHWvaDIohvHntx1t7gl1I9s8j8K7j4jeOtLvNDl0fTJ1upJyvmyx8oigg8HuSQOnvXlNraXF9cpbWkEk8znCxxqWJ/Cqw3NXpfv1f5CxFqFX9y7HtH2vSfirosdoLqWxubeQSyQDBYcEcZ6rz1rzTXPDD6d4yPh+0uDMzPGkbycZLKDzj3Nd34T8K2XglYtd8S3kdtdP+7hjLfLHkcgkdWxn2HvXN61rWnXHxXg1SG7R7FbiBjMPugKFyfwxWWHtCs4UneO/wA/U1r3lSU6itL9PQ5O1u9Q0DV1miaS3vbWQgg8EEcEEenYivXPs2nfFbSbO5a8ltLiz3LNDGASrNj17ccGsjxzpek+K4p9Z8OXMN1e2qA3cUPV07N7kY/ED2FcB4f1688OarHf2bcjh4yflkXupq9MRBVIaTX9W9OxnrQk4T1gzUtvC8c/xAbw2buQRCZ4/OAG7CqW6dO1dp4l8Jw+E/hzqkEF1LcCeeFyZAARhgO1c/4a1GLV/i/DqEKssdxPJIqt1GY24Ne5kA9RXNisRUpuCl2Ta8zpw1CnNTa7tJ+R4p4Q+Gv/AAkGiLqV7eTWyysfJVFB3KONxz75/KuP8Q6YNE8QXumpM0q277Q7DBIwD/WvozU9a03RY431G7itkkJCFzjJFfPfjG8t9Q8Xald2kqywSygo69GG0D+lbYTE1K1V83w2/wAupjisPCjTVtzZ8C+CofFsF5LPezW/2d1UCNQc5Ge9Vte8Lz+FvFtnaeY81vJJG8MpGNw3DIPuD/St/wCFniHSdFtNSTUr6K2aSRGQSHG4AGvYIJorq3iuIXWSKRQ6OOhUjIIqK+LqUa7TV4/8DuVRwtOrRTTtL/g9iTtRRRXjHrBVPVdLtNa02bT75C9vLjcoYg8HI5HuKuUU02ndCaTVmeeXXwf0OXJt7u9gPpuDj9R/Wo3+FCf2E2lx6uwBuvtHmNBn+DbjG79a9Horp+u17W5vyOf6pRvflPJv+FLt/wBB0f8AgN/9lWrf/Cm31K7inn1WVRHbxQ7UiHOxAuck98Zr0Sim8dXf2vwQlg6K0t+Zw9h8KfDtlNHM5urh42DDzJMDIOegArqdX0ax12wNlqERktywbaGK8jpyKv0VlPEVKjUpPVGsKFOCaitzj/8AhWHhT/oHyf8AgQ/+NH/CsPCn/QPk/wDAh/8AGuwop/Wa38z+8X1el/Kjj/8AhWHhT/oHyf8AgQ/+NXtK8DeHtFvVvLKwC3C/dd3Z9v0yeDXRUUniazVnJ/eNUKSd1FHL33w98N6lfT3t1ZO88zl3YTOMk+wNV/8AhWHhT/nwk/8AAh/8a7CihYiqlZSYOhSbu4o4/wD4Vh4U/wCgfJ/4EP8A40f8Kw8Kf9A+T/wIf/Guwop/Wq38z+8X1el/KjnNU8C+H9ZvBdX1o8kwRY9wlZflHTgGqX/CsPCn/PhJ/wCBD/412FFJYirFWUmN0KcndxRx/wDwrDwp/wBA+T/wIf8Axo/4Vh4U/wCgfJ/4EP8A412FFP61W/mf3i+r0v5Uc3P4E8P3OmWmnS2bm2tSzQr5zDaWOTznJqn/AMKw8Kf9A+T/AMCH/wAa7CiksRVW0mN0KT3ijGXwto6+H/7C+y50/kiNnJIOc5znPWk0Xwpo3h9Zxp1r5RnAWRi5YkemSeOtbVFT7WpZq71K9nC6dtjj/wDhWHhQf8w+T/wIf/Gr2keCNB0PUFvtPtHjuFUqGMrNwevBNdFRVPEVWrOTJVCkndRRj6x4V0XXsnULCKSTGPNA2uP+BDmuYm+EPh6RiY5r6IegkBH6iu/op08TWpq0ZCnh6U3eUThbb4TeGoGDS/a7jHaSbA/8dArrNN0XTdHiMenWUNsp6+WuC31PU1eopVMTVqK0pDhQpw1jEzNb0DTvEVrHbalCZYo38xQHK4bBHb6msL/hWHhT/oHyf+BD/wCNdhRShWqQVoyaHKlTm7yVzF0Pwpo/hySaTTLZommAV8yM2QOnU+9Zs/w28LXFxJO+nkPIxZgkzqMn0AOBXWUUKvVT5uZ3B0abXLyqxzWmeAvD2j6jDf2Vm8dxCSUYzO2Mgg8E+hNdLRRUzqSm7ydyoQjBWirGVrnhzTPEcUUWpwNKkTFkAcrgn6GsT/hWHhT/AJ8JP/Ah/wDGuwoqoV6kFaMmkTKjTk7ySZx//CsPCn/QPk/8CH/xrqrS2isrOG1gXbDDGsaKTnCgYHNTUUp1qk1aTbCFKEHeKsFFFFZmgUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB//Z";

const ps = {
  page:      { width: "210mm", minHeight: "297mm", padding: "10mm 12mm", boxSizing: "border-box", fontFamily: FONT, fontSize: "9pt", color: "#1a2535", background: "#fff", lineHeight: 1.4, letterSpacing: "0.04em" },
  secHeader: { fontSize: "9pt", fontWeight: 700, background: "#1a3358", color: "#fff", padding: "3px 8px", marginTop: "2mm", marginBottom: "1mm" },
  subHeader: { fontSize: "8.5pt", fontWeight: 700, color: "#1a3358", marginTop: "3mm", marginBottom: "1mm", paddingLeft: "2px" },
  table:     { width: "100%", borderCollapse: "collapse", marginBottom: "1mm" },
  tdLabel:   { width: "28%", padding: "2.5px 7px", background: "#f0f4f8", border: "1px solid #b0bec5", fontSize: "8pt", fontWeight: 600, verticalAlign: "top", color: "#374151" },
  tdVal:     { padding: "2.5px 7px", border: "1px solid #b0bec5", fontSize: "8.5pt", verticalAlign: "top" },
  moushikomType: { fontSize: "10pt", fontWeight: 700, marginBottom: "2mm" },
  agreement:     { padding: "3px 8px", background: "#f0f6ff", borderLeft: "3px solid #2563eb", fontSize: "7.5pt", color: "#333", lineHeight: 1.7 },
};

const TR = ({ label, value }) => (
  <tr>
    <td style={ps.tdLabel}>{label}</td>
    <td style={ps.tdVal}>{value ?? ""}</td>
  </tr>
);

const TakaraBox = () => (
  <div style={{ marginTop: "5mm" }}>
    <div style={{ fontSize: "9px", fontWeight: "bold", color: "#5f7490", marginBottom: "4px" }}>タカラベルモント記入欄</div>
    <div style={{ display: "flex", gap: "3px", alignItems: "stretch", width: "fit-content" }}>
      <div style={{ display: "grid", gridTemplateColumns: "150px 150px", gridTemplateRows: "37px 37px", gap: "3px" }}>
        {["案件NO", "企業CD", "サロンCD", "納品日時"].map(lbl => (
          <div key={lbl} style={{ border: "1px solid #b0bec5", fontSize: "9px", color: "#5f7490", padding: "2px 6px", boxSizing: "border-box" }}>{lbl}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "3px", alignItems: "stretch" }}>
        {["オ", "発注", "完了", "確認"].map(lbl => (
          <div key={lbl} style={{ border: "1px solid #b0bec5", width: "77px", height: "77px", fontSize: "9px", color: "#5f7490", padding: "2px 4px", boxSizing: "border-box", flexShrink: 0 }}>{lbl}</div>
        ))}
      </div>
    </div>
  </div>
);

const PdfHeader = ({ typeLabel, form }) => (
  <>
    <div style={{ display: "flex", alignItems: "center", marginBottom: "3mm", paddingBottom: "2mm", borderBottom: "2px solid #1a3358" }}>
      <div style={{ flex: 1 }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "11.5pt", fontWeight: 800, color: "#1a3358", lineHeight: 1.4 }}>SALONPOS LinQ2 サービス申込書</div>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <img src={LOGO_BASE64} alt="" style={{ width: "40mm", height: "auto" }} />
      </div>
    </div>
    <div style={ps.moushikomType}>{typeLabel}</div>
    <div style={{ display: "flex", gap: "6mm", alignItems: "flex-end", marginBottom: "2mm" }}>
      <div style={{ flex: 1 }}>
        <div style={ps.agreement}>
          「SALONPOS　LINQ2」ASPサービス規約に同意のうえ申し込みます。<br />
          利用規約：<span style={{ color: "#2563eb", textDecoration: "underline" }}>{AGREEMENT_URL}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "40mm", flexShrink: 0 }}>
        {[["営業所", form.eigyosho], ["担当者", form.tantosha], ["社員番号", form.shainBango]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "8pt" }}>
            <span style={{ display: "inline-block", width: "14mm", textAlign: "right", whiteSpace: "nowrap", flexShrink: 0, color: "#5f7490", fontSize: "7.5pt" }}>{l}</span>
            <span style={{ fontWeight: 700, borderBottom: "1px solid #b0bec5", flex: 1, paddingBottom: "1px" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  </>
);

const KeiyakushaRows = ({ form }) => {
  const isHojin = form.keiyakuType === "hojin";
  const name = isHojin
    ? `${form.hojinDaihyo_sei || ""} ${form.hojinDaihyo_mei || ""}`.trim()
    : `${form.kojin_sei || ""} ${form.kojin_mei || ""}`.trim();
  const kana = isHojin
    ? `${form.hojinDaihyo_sei_kana || ""} ${form.hojinDaihyo_mei_kana || ""}`.trim()
    : `${form.kojin_sei_kana || ""} ${form.kojin_mei_kana || ""}`.trim();
  return (<>
    <TR label="お申込日"        value={formatDate(form.moushikomiBi)} />
    <TR label="契約種別"        value={isHojin ? "法人契約" : "個人契約"} />
    {isHojin && <TR label="法人名"         value={form.hojinName} />}
    {isHojin && <TR label="法人名フリガナ" value={form.hojinNameKana} />}
    <TR label={isHojin ? "法人代表者名" : "個人事業主名"} value={name} />
    <TR label="フリガナ"        value={kana} />
    <TR label="郵便番号"        value={form.yubinBango ? `〒${form.yubinBango}` : ""} />
    <TR label={isHojin ? "法人登記上住所" : "個人事業主自宅住所"} value={[form.jusho, form.jusho2].filter(Boolean).join(" ")} />
    <TR label="電話番号"        value={form.denwa} />
    <TR label="メールアドレス"  value={form.mail} />
  </>);
};

// ==================== ScaledPreview ====================
const ScaledPreview = ({ children, previewId }) => {
  const containerRef = useRef(null);
  const innerRef     = useRef(null);
  const [scale, setScale]           = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !innerRef.current) return;
      const s = Math.min(1, containerRef.current.offsetWidth / (210 * 3.7795));
      setScale(s);
      setInnerHeight(innerRef.current.scrollHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return (
    <div ref={containerRef} style={{ width: "100%", overflow: "hidden", height: innerHeight * scale || "auto" }}>
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: "210mm", display: "inline-block" }}>
        <div id={previewId} style={{ background: "#fff", width: "210mm" }}>{children}</div>
      </div>
    </div>
  );
};

// ==================== PDF: 新規_単店・新規_店舗追加 ====================
const PdfTenpoPage = ({ form, tab }) => {
  const d    = tab.data || {};
  const type = tab.type;
  const isTenpoAdd = type === "新規_店舗追加";
  // 単店の場合：タブ構成からラベルを自動判定
  const allTabs    = form.tabs || [];
  const typeLabel = isTenpoAdd ? "新規申込（店舗追加）" : getDynamicPdfTantoLabel(allTabs);
  const monthly        = calcMonthly(d);
  const conciergePrice = CONCIERGE_PRICE[d.package]?.[d.conciergeCount] ?? 0;
  const selectedOptions = OPTIONS_LIST.filter(o => (d.options || []).includes(o.key));
  const nohinLabels    = (d.nohinData || [])
    .map(k => NOHIN_DATA_LIST.find(n => n.key === k)?.label || k)
    .join("、");
  const hasPos2  = (d.nohinData || []).includes("pos2");
  const hasTasha = (d.nohinData || []).includes("tasha");

  return (
    <div style={ps.page}>
      <PdfHeader typeLabel={typeLabel} form={form} />

      <div style={ps.secHeader}>申込内容</div>

      <div style={ps.subHeader}>契約者情報</div>
      <table style={ps.table}><tbody><KeiyakushaRows form={form} /></tbody></table>

      <div style={ps.subHeader}>店舗情報</div>
      <table style={ps.table}><tbody>
        <TR label="店舗名"   value={d.tenpoName} />
        <TR label="フリガナ" value={d.tenpoNameKana} />
        <TR label="郵便番号" value={d.yubinBango ? `〒${d.yubinBango}` : ""} />
        <TR label="住所"     value={[d.jusho, d.jusho2].filter(Boolean).join(" ")} />
        <TR label="電話番号" value={d.denwa} />
        {(d.sekininshaLastName || d.sekininshaFirstName) && (
          <TR label="店舗責任者" value={`${d.sekininshaLastName || ""} ${d.sekininshaFirstName || ""}`.trim()} />
        )}
        {(d.sekininshaLastNameKana || d.sekininshaFirstNameKana) && (
          <TR label="フリガナ" value={`${d.sekininshaLastNameKana || ""} ${d.sekininshaFirstNameKana || ""}`.trim()} />
        )}
      </tbody></table>

      <div style={ps.subHeader}>LinQ2基本情報</div>
      <table style={ps.table}><tbody>
        <TR label="LinQ2メールアドレス" value={d.linq2MailPrefix ? `${d.linq2MailPrefix}@tbqm.jp` : ""} />
      </tbody></table>

      <div style={ps.subHeader}>納品データ</div>
      <table style={ps.table}><tbody>
        <TR label="納品データ種別" value={nohinLabels} />
        {hasPos2 && <>
          <TR label="POSⅡ引取り" value={d.pos2Hikitori} />
          {d.pos2Hikitori === "あり" && (
            <TR label="引取り機器" value={[
              ...(d.pos2HikitoriKiki || []),
              d.pos2HikitoriSonota ? `その他：${d.pos2HikitoriSonota}` : ""
            ].filter(Boolean).join("、")} />
          )}
        </>}
        {hasTasha && <>
          <TR label="他社移行データ種別"   value={d.tashaDataType} />
          <TR label="エントリーブック提出" value={d.tashaEntryBook} />
        </>}
        <TR label="レシートロゴデータ" value={d.receiptoLogo} />
        {d.nohinSonota && <TR label="備考（納品）" value={d.nohinSonota} />}
      </tbody></table>

      {isTenpoAdd && (
        <>
          <div style={ps.subHeader}>月額支払い方法</div>
          <table style={ps.table}><tbody>
            <TR label="支払い方法" value={d.shiharaiHoho} />
            {d.shiharaiHoho === "既存口座で支払う" && <>
              <TR label="支払い店舗名" value={d.kizonTenpoName} />
              <TR label="電話番号"     value={d.kizonTenpoDenwa} />
            </>}
            {d.shiharaiHoho === "系列店の口座で支払う" && <>
              <TR label="系列店名"   value={d.keireistenName} />
              <TR label="電話番号"   value={d.keireistenDenwa} />
            </>}
          </tbody></table>
        </>
      )}

      <div style={ps.subHeader}>サービス選択　<span style={{ fontSize: "7pt", fontWeight: 400, color: "#5f7490" }}>※ 月額・税別</span></div>
      <table style={ps.table}><tbody>
        <TR label="申込パッケージ"  value={`${d.package}　¥${(PACKAGE_BASE[d.package] || 0).toLocaleString()}`} />
        <TR label="LinQ Concierge" value={`${d.conciergeCount}${d.conciergeActualCount ? `（実際 ${d.conciergeActualCount}台）` : ""}　¥${conciergePrice.toLocaleString()}`} />
        {selectedOptions.length > 0 && (
          <TR label="オプション" value={selectedOptions.map(o => `${o.label}　¥${o.price.toLocaleString()}`).join("　／　")} />
        )}
        {d.lanEnabled && <TR label="LAN" value={`${d.lanCount}台　¥${(LAN_PRICE * (d.lanCount || 1)).toLocaleString()}`} />}
        <tr>
          <td style={{ ...ps.tdLabel, background: "#1a3358", color: "#fff", fontWeight: 700 }}>月額合計（税別）</td>
          <td style={{ ...ps.tdVal, fontWeight: 800, fontSize: "10pt" }}>¥{monthly.toLocaleString()}</td>
        </tr>
      </tbody></table>

      <div style={ps.secHeader}>手配内容</div>

      <div style={ps.subHeader}>日程調整</div>
      <table style={ps.table}><tbody>
        <TR label="調整先"              value={d.nicchoseiSaki} />
        <TR label="担当者名"            value={d.nicchoseiTantosha} />
        <TR label="フリガナ"            value={d.nicchoseiTantoshaKana} />
        <TR label="連絡先電話番号"      value={d.nicchoseiDenwa} />
        <TR label="ネット開通日"        value={getNetKaiTsubiLabel(d)} />
        <TR label="開業・出店状況"      value={getOpenDateLabel(d)} />
        <TR label="LinQ2のネット接続方法" value={d.setsuzokoHoho} />
        <TR label="調査希望日時"        value={d.chosaDate} />
        <TR label="導入希望日時"        value={d.donguDate} />
        {d.biko && <TR label="備考" value={d.biko} />}
      </tbody></table>

      <TakaraBox />
    </div>
  );
};

// ==================== PDF: 新規_事務所WAN本部 ====================
const PdfWanHonbuPage = ({ form, tab }) => {
  const d       = tab.data || {};
  const monthly = calcWanMonthly(d);
  const cmIdx   = WAN_CONCIERGE_MANAGER_OPTIONS.indexOf(d.wanConciergeManager);

  return (
    <div style={ps.page}>
      <PdfHeader typeLabel="新規申込（事務所WAN本部）" form={form} />

      <div style={ps.secHeader}>申込内容</div>

      <div style={ps.subHeader}>契約者情報</div>
      <table style={ps.table}><tbody><KeiyakushaRows form={form} /></tbody></table>

      <div style={ps.subHeader}>本部情報</div>
      <table style={ps.table}><tbody>
        <TR label="本部名"   value={d.honbuName} />
        <TR label="フリガナ" value={d.honbuNameKana} />
        <TR label="郵便番号" value={d.yubinBango ? `〒${d.yubinBango}` : ""} />
        <TR label="住所"     value={[d.jusho, d.jusho2].filter(Boolean).join(" ")} />
        <TR label="電話番号" value={d.denwa} />
        {(d.sekininshaLastName || d.sekininshaFirstName) && (
          <TR label="責任者名" value={`${d.sekininshaLastName || ""} ${d.sekininshaFirstName || ""}`.trim()} />
        )}
        {(d.sekininshaLastNameKana || d.sekininshaFirstNameKana) && (
          <TR label="フリガナ" value={`${d.sekininshaLastNameKana || ""} ${d.sekininshaFirstNameKana || ""}`.trim()} />
        )}
      </tbody></table>

      <div style={ps.subHeader}>LinQ2基本情報</div>
      <table style={ps.table}><tbody>
        <TR label="LinQ2メールアドレス" value={d.linq2MailNotUse ? "使用しない" : d.linq2MailPrefix ? `${d.linq2MailPrefix}@tbqm.jp` : ""} />
      </tbody></table>

      <div style={ps.subHeader}>サービス選択　<span style={{ fontSize: "7pt", fontWeight: 400, color: "#5f7490" }}>※ 月額・税別</span></div>
      <table style={ps.table}><tbody>
        <TR label="WAN本部" value={`¥${WAN_HONBU_BASE.toLocaleString()}`} />
        {d.wanLanEnabled && <TR label="LAN" value={`${d.wanLanCount || 1}台　¥${(LAN_PRICE * (d.wanLanCount || 1)).toLocaleString()}`} />}
        {cmIdx > 0 && <TR label="Concierge for Manager" value={`${d.wanConciergeManager}　¥${(cmIdx * WAN_CONCIERGE_MANAGER_PRICE).toLocaleString()}`} />}
        {d.wanBarcode && <TR label="バーコード" value="¥0" />}
        {d.wanShozai  && <TR label="粧材管理"   value="¥1,000" />}
        <tr>
          <td style={{ ...ps.tdLabel, background: "#1a3358", color: "#fff", fontWeight: 700 }}>月額合計（税別）</td>
          <td style={{ ...ps.tdVal, fontWeight: 800, fontSize: "10pt" }}>¥{monthly.toLocaleString()}</td>
        </tr>
      </tbody></table>

      <div style={ps.secHeader}>手配内容</div>

      <div style={ps.subHeader}>日程調整</div>
      <table style={ps.table}><tbody>
        <TR label="調整先"              value={d.nicchoseiSaki} />
        <TR label="担当者名"            value={d.nicchoseiTantosha} />
        <TR label="フリガナ"            value={d.nicchoseiTantoshaKana} />
        <TR label="連絡先電話番号"      value={d.nicchoseiDenwa} />
        <TR label="ネット開通日"        value={getNetKaiTsubiLabel(d)} />
        <TR label="LinQ2のネット接続方法" value={d.setsuzokoHoho} />
        <TR label="調査希望日時"        value={d.chosaDate} />
        <TR label="導入希望日時"        value={d.donguDate} />
        {d.biko && <TR label="備考" value={d.biko} />}
      </tbody></table>

      <TakaraBox />
    </div>
  );
};

// ==================== PDF: 新規_フロントWAN本部_既存店 ====================
const PdfFrontWanPage = ({ form, tab }) => {
  const d       = tab.data || {};
  const monthly = calcWanMonthly(d);
  const cmIdx   = WAN_CONCIERGE_MANAGER_OPTIONS.indexOf(d.wanConciergeManager);

  return (
    <div style={ps.page}>
      <PdfHeader typeLabel="新規申込（フロントWAN本部・既存店）" form={form} />

      <div style={ps.secHeader}>申込内容</div>

      <div style={ps.subHeader}>契約者情報</div>
      <table style={ps.table}><tbody><KeiyakushaRows form={form} /></tbody></table>

      <div style={ps.subHeader}>本部情報</div>
      <table style={ps.table}><tbody>
        <TR label="本部名"   value={d.honbuName} />
        <TR label="フリガナ" value={d.honbuNameKana} />
        <TR label="郵便番号" value={d.yubinBango ? `〒${d.yubinBango}` : ""} />
        <TR label="住所"     value={[d.jusho, d.jusho2].filter(Boolean).join(" ")} />
        <TR label="電話番号" value={d.denwa} />
        {(d.sekininshaLastName || d.sekininshaFirstName) && (
          <TR label="責任者名" value={`${d.sekininshaLastName || ""} ${d.sekininshaFirstName || ""}`.trim()} />
        )}
        {(d.sekininshaLastNameKana || d.sekininshaFirstNameKana) && (
          <TR label="フリガナ" value={`${d.sekininshaLastNameKana || ""} ${d.sekininshaFirstNameKana || ""}`.trim()} />
        )}
      </tbody></table>

      <div style={ps.subHeader}>既存店舗情報</div>
      <table style={ps.table}><tbody>
        <TR label="既存店舗名" value={d.kizonTenpoName} />
        <TR label="電話番号"   value={d.kizonTenpoDenwa} />
      </tbody></table>

      <div style={ps.subHeader}>LinQ2基本情報</div>
      <table style={ps.table}><tbody>
        <TR label="LinQ2メールアドレス" value={d.linq2MailNotUse ? "使用しない" : d.linq2MailPrefix ? `${d.linq2MailPrefix}@tbqm.jp` : ""} />
      </tbody></table>

      <div style={ps.subHeader}>サービス選択　<span style={{ fontSize: "7pt", fontWeight: 400, color: "#5f7490" }}>※ 月額・税別</span></div>
      <table style={ps.table}><tbody>
        <TR label="WAN本部" value={`¥${WAN_HONBU_BASE.toLocaleString()}`} />
        {d.wanLanEnabled && <TR label="LAN" value={`${d.wanLanCount || 1}台　¥${(LAN_PRICE * (d.wanLanCount || 1)).toLocaleString()}`} />}
        {cmIdx > 0 && <TR label="Concierge for Manager" value={`${d.wanConciergeManager}　¥${(cmIdx * WAN_CONCIERGE_MANAGER_PRICE).toLocaleString()}`} />}
        {d.wanBarcode && <TR label="バーコード" value="¥0" />}
        {d.wanShozai  && <TR label="粧材管理"   value="¥1,000" />}
        <tr>
          <td style={{ ...ps.tdLabel, background: "#1a3358", color: "#fff", fontWeight: 700 }}>月額合計（税別）</td>
          <td style={{ ...ps.tdVal, fontWeight: 800, fontSize: "10pt" }}>¥{monthly.toLocaleString()}</td>
        </tr>
      </tbody></table>

      <div style={ps.secHeader}>手配内容</div>

      <div style={ps.subHeader}>日程調整</div>
      <table style={ps.table}><tbody>
        <TR label="調整先"         value={d.nicchoseiSaki} />
        <TR label="担当者名"       value={d.nicchoseiTantosha} />
        <TR label="フリガナ"       value={d.nicchoseiTantoshaKana} />
        <TR label="連絡先電話番号" value={d.nicchoseiDenwa} />
        <TR label="導入希望日時"   value={d.nohinhopoBijitsu} />
        {d.biko && <TR label="備考" value={d.biko} />}
      </tbody></table>

      <TakaraBox />
    </div>
  );
};

// ==================== PDF: 新規_フロントWAN本部_新規店 ====================
const PdfFrontWanNewPage = ({ form, tab }) => {
  const d         = tab.data || {};
  const monthly   = calcWanMonthly(d);
  const cmIdx     = WAN_CONCIERGE_MANAGER_OPTIONS.indexOf(d.wanConciergeManager);
  const linkedTab = (form.tabs || []).find(t => t.id === d.linkedTabId);
  const ld        = linkedTab?.data || {};

  return (
    <div style={ps.page}>
      <PdfHeader typeLabel="新規申込（フロントWAN本部・新規店）" form={form} />

      <div style={ps.secHeader}>申込内容</div>

      <div style={ps.subHeader}>契約者情報</div>
      <table style={ps.table}><tbody><KeiyakushaRows form={form} /></tbody></table>

      <div style={ps.subHeader}>本部情報</div>
      <table style={ps.table}><tbody>
        <TR label="本部名"   value={d.honbuName} />
        <TR label="フリガナ" value={d.honbuNameKana} />
        <TR label="申込み店舗" value={ld.tenpoName || "（未選択）"} />
        <TR label="郵便番号" value={ld.yubinBango ? `〒${ld.yubinBango}` : ""} />
        <TR label="住所"     value={[ld.jusho, ld.jusho2].filter(Boolean).join(" ")} />
        <TR label="電話番号" value={ld.denwa} />
      </tbody></table>

      <div style={ps.subHeader}>LinQ2基本情報</div>
      <table style={ps.table}><tbody>
        <TR label="LinQ2メールアドレス" value={d.linq2MailNotUse ? "使用しない" : d.linq2MailPrefix ? `${d.linq2MailPrefix}@tbqm.jp` : ""} />
      </tbody></table>

      <div style={ps.subHeader}>サービス選択　<span style={{ fontSize: "7pt", fontWeight: 400, color: "#5f7490" }}>※ 月額・税別</span></div>
      <table style={ps.table}><tbody>
        <TR label="WAN本部" value={`¥${WAN_HONBU_BASE.toLocaleString()}`} />
        {d.wanLanEnabled && <TR label="LAN" value={`${d.wanLanCount || 1}台　¥${(LAN_PRICE * (d.wanLanCount || 1)).toLocaleString()}`} />}
        {cmIdx > 0 && <TR label="Concierge for Manager" value={`${d.wanConciergeManager}　¥${(cmIdx * WAN_CONCIERGE_MANAGER_PRICE).toLocaleString()}`} />}
        {d.wanBarcode && <TR label="バーコード" value="¥0" />}
        {d.wanShozai  && <TR label="粧材管理"   value="¥1,000" />}
        <tr>
          <td style={{ ...ps.tdLabel, background: "#1a3358", color: "#fff", fontWeight: 700 }}>月額合計（税別）</td>
          <td style={{ ...ps.tdVal, fontWeight: 800, fontSize: "10pt" }}>¥{monthly.toLocaleString()}</td>
        </tr>
      </tbody></table>

      <div style={ps.secHeader}>手配内容</div>

      <div style={ps.subHeader}>日程調整</div>
      <table style={ps.table}><tbody>
        <tr>
          <td colSpan={2} style={{ ...ps.tdVal, color: "#5f7490", fontStyle: "italic" }}>
            ※ 申込み店舗（{ld.tenpoName || "未選択"}）の日程と同じになります
          </td>
        </tr>
        {d.biko && <TR label="備考" value={d.biko} />}
      </tbody></table>

      <TakaraBox />
    </div>
  );
};

// ==================== PDF: 端末入替 ====================
const PdfNyuukaePage = ({ form, tab }) => {
  const d = tab.data || {};

  return (
    <div style={ps.page}>
      <PdfHeader typeLabel="端末入替（契約変更なし）" form={form} />

      <div style={ps.secHeader}>申込内容</div>

      <div style={ps.subHeader}>契約者情報</div>
      <table style={ps.table}><tbody><KeiyakushaRows form={form} /></tbody></table>

      <div style={ps.subHeader}>店舗情報</div>
      <table style={ps.table}><tbody>
        <TR label="店舗名"   value={d.tenpoName} />
        <TR label="フリガナ" value={d.tenpoNameKana} />
        <TR label="郵便番号" value={d.yubinBango ? `〒${d.yubinBango}` : ""} />
        <TR label="住所"     value={[d.jusho, d.jusho2].filter(Boolean).join(" ")} />
        <TR label="電話番号" value={d.denwa} />
        {(d.sekininshaLastName || d.sekininshaFirstName) && (
          <TR label="店舗責任者" value={`${d.sekininshaLastName || ""} ${d.sekininshaFirstName || ""}`.trim()} />
        )}
        {(d.sekininshaLastNameKana || d.sekininshaFirstNameKana) && (
          <TR label="フリガナ" value={`${d.sekininshaLastNameKana || ""} ${d.sekininshaFirstNameKana || ""}`.trim()} />
        )}
      </tbody></table>

      <div style={ps.subHeader}>入替内容</div>
      <table style={ps.table}><tbody>
        <TR label="入替台数"   value={d.nyutaiDaisuu} />
        <TR label="機器引取り" value={d.kikiHikitori} />
        {d.kikiHikitori === "あり" && (
          <TR label="引取り機器" value={[
            ...(d.hikitoriKiki || []),
            d.hikitoriSonota ? `その他：${d.hikitoriSonota}` : ""
          ].filter(Boolean).join("、")} />
        )}
        {d.kikoHosoku && <TR label="機器補足" value={d.kikoHosoku} />}
      </tbody></table>

      <div style={ps.secHeader}>手配内容</div>

      <div style={ps.subHeader}>日程調整</div>
      <table style={ps.table}><tbody>
        <TR label="調整先"         value={d.nicchoseiSaki} />
        <TR label="担当者名"       value={d.nicchoseiTantosha} />
        <TR label="フリガナ"       value={d.nicchoseiTantoshaKana} />
        <TR label="連絡先電話番号" value={d.nicchoseiDenwa} />
        {d.jizenchoosa && <TR label="事前調査"     value="実施する" />}
        {d.jizenchoosa && d.chosaDate && <TR label="調査希望日時" value={d.chosaDate} />}
        <TR label="導入希望日時"   value={d.nohinhopoBijitsu} />
        {d.nicchoseiHosoku && <TR label="補足" value={d.nicchoseiHosoku} />}
      </tbody></table>

      <TakaraBox />
    </div>
  );
};

// ==================== STEP3 ====================
const PDF_COMPONENT = {
  "新規_単店":                   PdfTenpoPage,
  "新規_店舗追加":               PdfTenpoPage,
  "新規_事務所WAN本部":          PdfWanHonbuPage,
  "新規_フロントWAN本部_既存店": PdfFrontWanPage,
  "新規_フロントWAN本部_新規店": PdfFrontWanNewPage,
  "端末入替":                    PdfNyuukaePage,
};

const PDF_TYPE_LABEL = {
  "新規_単店":                   "新規申込（単店）",
  "新規_店舗追加":               "新規申込（店舗追加）",
  "新規_事務所WAN本部":          "事務所WAN本部",
  "新規_フロントWAN本部_既存店": "フロントWAN本部（既存店）",
  "新規_フロントWAN本部_新規店": "フロントWAN本部（新規店）",
  "端末入替":                    "端末入替",
};

const getTabDisplayName = (tab) => {
  const d = tab.data || {};
  if (tab.type === "新規_単店" || tab.type === "新規_店舗追加") return d.tenpoName || "（店舗名未入力）";
  if (tab.type === "端末入替") return d.tenpoName || "（店舗名未入力）";
  if (tab.type === "新規_事務所WAN本部") return d.honbuName || "（本部名未入力）";
  if (tab.type === "新規_フロントWAN本部_既存店") return d.honbuName || "（本部名未入力）";
  if (tab.type === "新規_フロントWAN本部_新規店") return d.honbuName || "（本部名未入力）";
  return "（未選択）";
};

const Step3 = ({ form, onBack, onReset }) => {
  const activeTabs = form.tabs.filter(t => !!t.type);
  const [confirmed, setConfirmed]     = useState(() => activeTabs.map(() => false));
  const [printing, setPrinting]       = useState(null); // tab.id | null
  const [printingAll, setPrintingAll] = useState(false);
  const [pdfError, setPdfError]       = useState("");
  const [successMsg, setSuccessMsg]   = useState("");

  const allConfirmed = confirmed.every(Boolean);

  const showSuccess = msg => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  const downloadOnePdf = async (tab, idx) => {
    const el = document.getElementById(`pdf-preview-${tab.id}`);
    if (!el) throw new Error(`要素が見つかりません (pdf-preview-${tab.id})`);
    const canvas = await Promise.race([
      html2canvas(el, { scale: 3, useCORS: true, allowTaint: true, logging: false, backgroundColor: "#ffffff" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("タイムアウト（30秒）")), 30000)),
    ]);
    if (!canvas || canvas.width === 0) throw new Error("キャプチャ失敗");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
    pdf.link(12, 37, 170, 5, { url: AGREEMENT_URL });
    const blob = pdf.output("blob");
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const displayName = getTabDisplayName(tab);
    const typeLabel   = PDF_TYPE_LABEL[tab.type] || tab.type;
    a.href = url;
    a.download = pdfFileName(displayName, typeLabel);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  };

  const handleDownload = async (tab, idx) => {
    setPdfError("");
    setPrinting(tab.id);
    try {
      await downloadOnePdf(tab, idx);
      showSuccess("✅ PDFを保存しました！");
    } catch(e) {
      console.error("PDF error:", e);
      setPdfError("❌ PDF生成エラー：" + e.message);
    }
    setPrinting(null);
  };

  const handleDownloadAll = async () => {
    setPdfError("");
    setPrintingAll(true);
    try {
      for (let i = 0; i < activeTabs.length; i++) {
        await downloadOnePdf(activeTabs[i], i);
        if (i < activeTabs.length - 1) await new Promise(r => setTimeout(r, 600));
      }
      showSuccess(`✅ 全${activeTabs.length}件のダウンロードが完了しました！`);
    } catch(e) {
      console.error("PDF error:", e);
      setPdfError("❌ PDF生成エラー：" + e.message);
    }
    setPrintingAll(false);
  };

  return (<>
    {/* 成功メッセージ */}
    {successMsg && (
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 9999,
        background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "14px 20px",
        boxShadow: "0 4px 20px rgba(0,0,0,.15)", color: "#15803d", maxWidth: 340,
        animation: "fadeIn .3s ease" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{successMsg}</div>
        <div style={{ fontSize: 12.5 }}>ダウンロードフォルダをご確認のうえ、クラウドサインでの手続きを行ってください。</div>
      </div>
    )}

    {/* エラー表示 */}
    {pdfError && (
      <div style={{ background: C.errorBg, border: `1.5px solid ${C.errorBorder}`, borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: C.danger }}>
        {pdfError}
      </div>
    )}

    {/* 操作説明 */}
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.tealLight, borderLeft: `4px solid ${C.teal}`, borderRadius: "0 8px 8px 0", padding: "8px 14px", marginBottom: 12 }}>
        <span style={{ fontSize: 15 }}>👀</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tealDeep }}>最終確認</span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.8, marginBottom: 4 }}>申込書の内容を確認して、PDFを保存してください。</p>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, marginBottom: 16 }}>保存したPDFを使用してクラウドサインでの手続きを行ってください。</p>
      <ul style={{ fontSize: 13, color: C.muted, lineHeight: 2, margin: "0 0 16px 0", paddingLeft: 18 }}>
        <li>各申込書のチェックボックスを確認後、「PDF保存」が押せるようになります。</li>
        <li>全件チェック済みにすると「まとめてダウンロード」で一括保存できます。</li>
      </ul>

      {/* まとめてダウンロード（複数件の場合のみ表示） */}
      {activeTabs.length > 1 && (
        <Btn variant="navy"
          onClick={handleDownloadAll}
          disabled={!allConfirmed || printingAll || printing !== null}
          style={{ opacity: (!allConfirmed || printingAll || printing !== null) ? 0.5 : 1 }}>
          {printingAll ? "⏳ 生成中..." : `📥　全${activeTabs.length}件まとめてダウンロード`}
        </Btn>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <Btn variant="secondary" onClick={onBack}>← 申込内容を修正する</Btn>
        <Btn variant="secondary" onClick={onReset}>🔄　新しい申込を始める</Btn>
      </div>
    </div>

    {/* 各申込書プレビュー */}
    {activeTabs.map((tab, i) => {
      const PdfComp     = PDF_COMPONENT[tab.type];
      const displayName = getTabDisplayName(tab);
      // 単店ラベルはタブ構成から動的に判定
      const allTabs2    = form.tabs || [];
      const hasWanHonbu2 = allTabs2.some(t =>
        t.type === "新規_事務所WAN本部" ||
        t.type === "新規_フロントWAN本部_既存店" ||
        t.type === "新規_フロントWAN本部_新規店"
      );
      const tantoTabs2  = allTabs2.filter(t => t.type === "新規_単店");
      const typeLabel = tab.type === "新規_単店"
        ? getDynamicPdfTantoLabel(form.tabs)
        : PDF_TYPE_LABEL[tab.type] || tab.type;
      const isChecked   = confirmed[i] || false;
      const isPrinting  = printing === tab.id;
      const isDisabled  = !isChecked || printing !== null || printingAll;

      return (
        <Card key={tab.id} style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>{typeLabel}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: 0 }}>
                {activeTabs.length > 1 ? `${i + 1}件目：` : ""}{displayName}
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <span style={{ fontSize: 11, color: C.muted }}>📄 {pdfFileName(displayName, typeLabel)}</span>
              <Btn variant="navy"
                onClick={() => handleDownload(tab, i)}
                disabled={isDisabled}
                style={{ opacity: isDisabled ? 0.5 : 1 }}>
                {isPrinting ? "⏳ 生成中..." : "🖨️　PDF保存"}
              </Btn>
            </div>
          </div>

          {/* 確認チェックボックス */}
          <label style={{
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
            padding: "10px 16px", marginBottom: 12, borderRadius: 10,
            border: `1.5px solid ${isChecked ? C.teal : "#93c5d0"}`,
            background: isChecked ? C.tealLight : "#f0f9fb",
            fontSize: 13.5, fontWeight: isChecked ? 700 : 400,
            color: isChecked ? C.tealDeep : C.text, userSelect: "none",
          }}>
            <input type="checkbox" checked={isChecked}
              onChange={e => setConfirmed(arr => arr.map((v, j) => j === i ? e.target.checked : v))}
              style={{ width: 17, height: 17, cursor: "pointer", accentColor: C.teal, flexShrink: 0 }} />
            申込書の内容に誤りがないことを確認しました
          </label>

          {/* PDFプレビュー */}
          {PdfComp ? (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              <ScaledPreview previewId={`pdf-preview-${tab.id}`}>
                <PdfComp form={form} tab={tab} />
              </ScaledPreview>
            </div>
          ) : (
            <div style={{ padding: "24px", textAlign: "center", color: C.muted, fontSize: 13 }}>
              この申込種別のPDFは準備中です（{tab.type}）
            </div>
          )}
        </Card>
      );
    })}

    <div style={{ marginTop: 8, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
      <Btn variant="secondary" onClick={onBack}>← 申込内容を修正する</Btn>
    </div>
  </>);
};

// ==================== メインApp ====================
export default function App() {
  const [draft]       = useState(() => loadDraft());
  const [form, setFormRaw]  = useState(() => initialForm());
  const [step, setStep]     = useState(1);
  const [errors, setErrors] = useState({});
  const [step2ErrorTabId, setStep2ErrorTabId] = useState(null);

  const setForm = useCallback((updater) => {
    setFormRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveDraft(next, step);
      return next;
    });
  }, [step]);

  const handleRestoreDraft  = () => { setFormRaw(draft.form); setStep(draft.step || 1); };
  const handleDiscardDraft  = () => { clearDraft(); };

  const handleNext = () => {
    if (step === 1) {
      const e = validateStep1(form);
      if (Object.keys(e).length > 0) { setErrors(e); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      // マイ情報が未保存の場合に確認
      if (!loadMyInfo() && (form.eigyosho || form.tantosha || form.shainBango)) {
        if (window.confirm("営業担当者情報を保存しますか？\n次回から自動入力されます。")) {
          saveMyInfo({ eigyosho: form.eigyosho, tantosha: form.tantosha, shainBango: form.shainBango, tantoshaKana: form.tantoshaKana||"", tantoshaDenwa: form.tantoshaDenwa||"" });
        }
      }
    }
    if (step === 2) {
      const hasUnselected = form.tabs.some(t => !t.type);
      if (hasUnselected) {
        if (!window.confirm("申込種別が未選択のタブがあります。このままPDF出力に進みますか？")) return;
      }
      const tabErrors = validateStep2(form.tabs);
      if (Object.keys(tabErrors).length > 0) {
        setErrors(e => ({ ...e, tabs: tabErrors }));
        // エラーがある最初のタブのIDを取得してStep2に伝える
        const firstErrTabId = form.tabs.find(t => tabErrors[t.id])?.id;
        if (firstErrTabId) {
          // Step2コンポーネントにエラータブIDを伝えるためstep2ErrorTabをstateで管理
          setStep2ErrorTabId(firstErrTabId);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setErrors({}); setStep(s => s+1); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack  = () => { setErrors({}); setStep(s => s-1); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleReset = () => {
    if (window.confirm("入力内容をすべてリセットして新しい申込を始めますか？")) {
      clearDraft(); setFormRaw(initialForm()); setErrors({}); setStep(1); window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const errCount = Object.keys(errors).length;
  const step2ErrTabCount = errors.tabs ? Object.values(errors.tabs).filter(Boolean).length : 0;
  const errMessage = step === 1 && errCount > 0
    ? `未入力または入力エラーの項目が ${errCount} 件あります。赤くなっている項目を確認してください。`
    : step === 2 && step2ErrTabCount > 0
    ? `${step2ErrTabCount} 枚の申込書に未入力・エラーがあります。各タブを確認してください。`
    : "";

  const savedAtLabel = (() => {
    if (!draft?.savedAt) return "";
    const d = new Date(draft.savedAt);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} 保存`;
  })();

  return (
    <div style={{ fontFamily: FONT, minHeight: "100vh", background: C.bg }}>

      {/* ヘッダー */}
      <div style={{ background: `linear-gradient(135deg, ${C.tealDeep} 0%, ${C.tealDark} 60%, ${C.teal} 100%)`, padding: "18px 24px", boxShadow: "0 2px 8px rgba(0,0,0,.18)" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, background: "rgba(255,255,255,.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📋</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-.3px" }}>SALONPOS LinQ2</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.85)", marginTop: 1 }}>サービス申込書</div>
          </div>
          {/* 通常版バッジ */}
          <div style={{ marginLeft: "auto", padding: "4px 14px", background: "rgba(255,255,255,.2)", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#fff", border: "1px solid rgba(255,255,255,.35)" }}>
            通常版
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 840, margin: "0 auto", padding: "32px 16px 80px" }}>

        {/* 下書き復元バナー */}
        {draft && step === 1 && (
          <div style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>💾 前回の入力データがあります</span>
              <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{savedAtLabel}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="primary" onClick={handleRestoreDraft} style={{ padding: "7px 18px", fontSize: 13 }}>続きから入力する</Btn>
              <Btn variant="secondary" onClick={handleDiscardDraft} style={{ padding: "7px 18px", fontSize: 13 }}>新しい申込を始める</Btn>
            </div>
          </div>
        )}

        <StepIndicator current={step} />

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>{STEP_TITLES[step-1].title}</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>{STEP_TITLES[step-1].sub}</p>
          {step < 3 && <p style={{ fontSize: 12, color: C.muted }}><span style={{ color: C.danger }}>*</span> は入力必須項目です</p>}
        </div>

        {errMessage && (
          <div style={{ background: C.errorBg, border: `1.5px solid ${C.errorBorder}`, borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: C.danger }}>
            ⚠️ {errMessage}
          </div>
        )}

        {step === 1 && <Step1 form={form} setForm={setForm} errors={errors} setErrors={setErrors} />}
        {step === 2 && <Step2 form={form} setForm={setForm} errors={errors} setErrors={setErrors} errorTabId={step2ErrorTabId} clearErrorTabId={() => setStep2ErrorTabId(null)} />}
        {step === 3 && <Step3 form={form} onBack={handleBack} onReset={handleReset} />}

        {/* ナビゲーションボタン */}
        {step < 3 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24 }}>
            {step > 1
              ? <Btn variant="secondary" onClick={handleBack}>← 戻る</Btn>
              : <div />
            }
            {step === 1 && (
              <Btn variant="primary" onClick={handleNext}>次へ →</Btn>
            )}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <p style={{ fontSize: 12, color: C.muted, margin: 0, textAlign: "right" }}>
                  入力内容に誤りがないことをご確認のうえ、<br />『申込書を作成する』を押してください
                </p>
                <Btn variant="primary" style={{ background: C.campaign }} onClick={handleNext}>
                  申込書を作成する →
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
