import { useState, useCallback, useRef, forwardRef, useEffect } from "react";

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
      { type: "新規_フロントWAN本部",shortLabel: "フロントWAN本部",  subLabel: "既存店へのフロントWAN本部追加" },
    ],
  },
  {
    groupLabel: "端末入替",
    types: [
      { type: "端末入替", shortLabel: "端末入替（契約変更なし）", subLabel: "フロントWAN本部の入替は本部本店として申込みます" },
    ],
  },
  {
    groupLabel: "契約変更",
    disabled: true,
    types: [
      { type: "契約変更", shortLabel: "契約変更", subLabel: "準備中" },
    ],
  },
];

const TYPE_LABEL = {
  "新規_単店":           "新規（単店）",
  "新規_店舗追加":       "新規（店舗追加）",
  "新規_事務所WAN本部":  "新規（事務所WAN本部）",
  "新規_フロントWAN本部":"新規（フロントWAN本部）",
  "端末入替":            "端末入替",
  "契約変更":            "契約変更（準備中）",
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
  // フロントWAN本部同時申込チェック（単店タイプのみ）
  withFrontWan: false,
  wanMailNotUse: false,
  wanMailPrefix: "",
  wanLanEnabled: false, wanLanCount: 1,
  wanConciergeManager: "0台",
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
  nohinhopoBijitsu: "",
  nicchoseiHosoku: "",
});

const DATA_FN = {
  "新規_単店":           newTenpoData,
  "新規_店舗追加":       newTenpoData,
  "新規_事務所WAN本部":  newWanHonbuData,
  "新規_フロントWAN本部":newFrontWanData,
  "端末入替":            newNyuukaeData,
  "契約変更":            () => ({}),
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

const fmtPrice = n => `¥${n.toLocaleString()}`;

const getTabLabel = (tab, index) => {
  if (!tab.type) return `申込書 ${index + 1}`;
  const name = tab.data?.tenpoName || tab.data?.honbuName || "";
  const prefix = TYPE_LABEL[tab.type] || tab.type;
  return name ? name : `${prefix}`;
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

const UIInput = forwardRef(({ style, hasError, onlyNum, numHyphen, noZenkaku, disabled, onChange, ...props }, ref) => {
  const handleChange = e => {
    let v = e.target.value;
    if (onlyNum)    v = v.replace(/[^0-9]/g, "");
    if (numHyphen)  v = v.replace(/[^0-9\-]/g, "");
    if (noZenkaku)  v = v.replace(/[^\x00-\x7F]/g, "");
    e.target.value = v;
    onChange && onChange(e);
  };
  return (
    <input ref={ref} style={{ ...inputBase(hasError, disabled), ...style }} disabled={disabled}
      onFocus={e => { if (!disabled) e.target.style.borderColor = C.borderFocus; }}
      onBlur={e  => { if (!disabled) e.target.style.borderColor = hasError ? C.danger : C.border; }}
      onChange={handleChange} {...props} />
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
        <UIInput value={seiKana} hasError={!!errors[keyKana_sei]} onChange={e => onSeiKanaChange(e.target.value)} placeholder={placeholderSeiKana} />
      </Field>
      <Field label={labelMeiKana} required={required} half error={errors[keyKana_mei]}>
        <UIInput value={meiKana} hasError={!!errors[keyKana_mei]} onChange={e => onMeiKanaChange(e.target.value)} placeholder={placeholderMeiKana} />
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
    if (!tab.type || tab.type === "契約変更") return;
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
      if (!d.nohinhopoBijitsu?.trim())  e.nohinhopoBijitsu      = "入力してください";
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
          <UIInput value={form.tantoshaKana||""} disabled={!!myInfo&&!editing} onChange={e => upd("tantoshaKana", e.target.value)} placeholder="例：ヤマダ タロウ" />
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
        <Field label="法人名フリガナ" required hint={!errors.hojinNameKana ? "手動入力（カタカナ）" : undefined} error={errors.hojinNameKana}><UIInput value={form.hojinNameKana} hasError={!!errors.hojinNameKana} onChange={e => updClr("hojinNameKana", e.target.value)} placeholder="例：カブシキガイシャ マルマルサロン" /></Field>
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

const TypeSelector = ({ onSelect }) => {
  const [step1, setStep1] = useState(""); // 新規申込 / 端末入替 / 契約変更
  const [step2, setStep2] = useState(""); // 店舗 / 本部

  const reset = (toStep) => {
    if (toStep <= 0) { setStep1(""); setStep2(""); }
    if (toStep <= 1) { setStep2(""); }
  };

  const breadcrumb = ["申込種別を選択", step1, step2].filter(Boolean);

  return (
    <Card>
      <SecTitle icon="📋">申込種別を選択してください</SecTitle>
      {breadcrumb.length > 1 && <Breadcrumb steps={breadcrumb} onBack={i => reset(i)} />}

      {/* 第1段階：大分類 */}
      {!step1 && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <SelectBtn label="新規申込" onClick={() => setStep1("新規申込")} />
          <SelectBtn label="端末入替" sub="契約変更なし" onClick={() => onSelect("端末入替")} />
          <SelectBtn label="契約変更" disabled />
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
      {step1==="新規申込" && step2==="本部" && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <SelectBtn label="事務所WAN本部" onClick={() => onSelect("新規_事務所WAN本部")} />
          <SelectBtn label="フロントWAN本部" sub="既存店へのフロントWAN本部追加" onClick={() => onSelect("新規_フロントWAN本部")} />
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
        <UIInput value={d.tenpoNameKana||""} hasError={!!te.tenpoNameKana}
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
          <UIInput value={d.nicchoseiTantoshaKana||""} hasError={!!te.nicchoseiTantoshaKana}
            onChange={e => { upd("nicchoseiTantoshaKana", e.target.value); clr("nicchoseiTantoshaKana"); }}
            placeholder="スズキ イチロウ" />
        </Field>
      </FieldRow>
      <Field label="連絡先電話番号" required hint={!te.nicchoseiDenwa ? "ハイフンあり・なしどちらでも可" : undefined} error={te.nicchoseiDenwa}>
        <UIInput value={d.nicchoseiDenwa||""} hasError={!!te.nicchoseiDenwa} numHyphen
          onChange={e => { upd("nicchoseiDenwa", e.target.value); clr("nicchoseiDenwa"); }} placeholder="例：090-1234-5678" style={{ maxWidth:240 }} />
      </Field>
      <Field label="納品希望日時" required error={te.nohinhopoBijitsu}>
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
        <UIInput value={d.tenpoNameKana} hasError={!!te.tenpoNameKana}
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
        <Field label="LinQ Concierge 台数" hint={d.package==="ベーシックパック+" ? "2台まで料金込み。3台目から追加料金が発生します。" : undefined}>
          <UISelect value={d.conciergeCount||""} onChange={e => { upd("conciergeCount",e.target.value); upd("conciergeActualCount",""); }} style={{ maxWidth:260 }}>
            {(CONCIERGE_BANDS[d.package]||[]).map(b => {
              const price = CONCIERGE_PRICE[d.package]?.[b] ?? 0;
              return <option key={b} value={b}>{b}　¥{price.toLocaleString()}</option>;
            })}
          </UISelect>
          {CONCIERGE_NEEDS_ACTUAL.includes(d.conciergeCount) && (
            <div style={{ marginTop:10 }}>
              <Field label="実際の使用台数" required error={te.conciergeActualCount}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <UIInput type="number" value={d.conciergeActualCount||""} hasError={!!te.conciergeActualCount}
                    min={d.conciergeCount==="6〜10台"?6:d.conciergeCount==="11〜20台"?11:1}
                    max={d.conciergeCount==="6〜10台"?10:d.conciergeCount==="11〜20台"?20:undefined}
                    style={{ maxWidth:100 }}
                    onChange={e => { upd("conciergeActualCount",e.target.value); clr("conciergeActualCount"); }}
                    placeholder={d.conciergeCount==="6〜10台"?"6〜10":d.conciergeCount==="11〜20台"?"11〜20":"台数"} />
                  <span style={{ fontSize:13, color:C.muted }}>台</span>
                </div>
              </Field>
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
                  <span style={{ fontSize:12, color:C.muted }}>{opt.price>0?fmtPrice(opt.price):"¥0"}</span>
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
              <div key={o.key} style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.muted }}>{o.label}</span><span>{fmtPrice(o.price)}</span></div>
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
          <UIInput value={d.nicchoseiTantoshaKana||""} hasError={!!te.nicchoseiTantoshaKana}
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
    setForm(f => ({ ...f, tabs: f.tabs.filter(t => t.id !== tabId) }));
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
        const label = getTabLabel(tab, i);
        return (
          <button key={tab.id} onClick={() => { setActiveTabId(tab.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{
              padding: "8px 20px", borderRadius: 22,
              border: isActive ? "none" : `1.5px solid ${C.border}`,
              cursor: "pointer", fontSize: 13,
              fontWeight: isActive ? 700 : 400, fontFamily: FONT,
              background: isActive ? C.teal : C.white,
              color: isActive ? "#fff" : C.muted,
              boxShadow: isActive ? "0 2px 10px rgba(29,158,117,.30)" : "0 1px 3px rgba(0,0,0,.06)",
              transition: "all .2s",
            }}>
            {!tab.type && "📋 "}{label}
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
          {activeTab.type && <span style={{ marginLeft: 10, padding: "2px 10px", borderRadius: 12, background: C.tealLight, color: C.tealDark, fontSize: 12, fontWeight: 600 }}>{TYPE_LABEL[activeTab.type]}</span>}
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
        ? <TypeSelector onSelect={(type) => handleSelectType(activeTab.id, type)} />
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
                : activeTab.type === "端末入替"
                ? <NyuukaeTabContent tab={activeTab} form={form} updTab={updTab} clrTab={clrTab} errors={tabErrors} />
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

// ==================== STEP3（プレースホルダー） ====================
const Step3 = ({ form, onBack, onReset }) => (
  <Card style={{ textAlign: "center", padding: "48px 24px" }}>
    <div style={{ fontSize: 32, marginBottom: 16 }}>📄</div>
    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>PDF出力</h3>
    <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
      PDF出力機能は次フェーズで実装します。<br />
      入力された申込書：{form.tabs.filter(t => t.type).length} 枚
    </p>
    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
      <Btn variant="secondary" onClick={onBack}>← 戻る</Btn>
      <Btn variant="navy" onClick={onReset}>🔄 最初からやり直す</Btn>
    </div>
  </Card>
);

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
