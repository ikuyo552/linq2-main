import { useState, useCallback, useRef, forwardRef, useEffect } from "react";

// ==================== 定数 ====================
const FONT = "'Meiryo', 'メイリオ', 'Yu Gothic', sans-serif";
const AGREEMENT_URL = "https://portal.salonpos-net.com/user_data/riyoukiyaku.php";
const STORAGE_KEY = "linq2_normal_draft";
const MY_INFO_KEY = "linq2_my_info";
const NICCHOSEISAKISAKI_LIST = ["店舗担当者", "営業"];

const PACKAGES = ["ベーシック", "ベーシックパック+"];
const PACKAGE_BASE = { "ベーシック": 11000, "ベーシックパック+": 14000 };
const CONCIERGE_BANDS = {
  "ベーシック":        ["0台（申込なし）","1台","2台","3台","4台","5台","6〜10台","11〜20台","台数フリー"],
  "ベーシックパック+": ["2台","3台","4台","5台","6〜10台","11〜20台","台数フリー"],
};
const CONCIERGE_PRICE = {
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
  kizonTenpoName: "",
  kizonTenpoDenwa: "",
  // 日程調整
  nicchoseiSaki: "",
  nicchoseiTantosha: "", nicchoseiTantoshaKana: "", nicchoseiDenwa: "",
  chosaDate: "", donguDate: "",
  // ネット・オープン日（他社移行選択時）
  netKaiTsubiStatus: "", netKaiTsubiKakutei: "確定", netKaiTsubiMode: "date",
  netKaiTsubiDate: "", netKaiTsubiText: "",
  openStatus: "", openMode: "date", openDate: "", openText: "",
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
  kikiHikitori: "あり",
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
        <Field label="営業担当者名" required half error={errors.tantosha}>
          <UIInput value={form.tantosha} hasError={!!errors.tantosha} disabled={!!myInfo&&!editing} onChange={e => { updClr("tantosha", e.target.value); if (!e.target.value) upd("tantoshaKana",""); }} placeholder="例：山田 太郎" {...tantoshaFg} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="担当者名フリガナ" half hint={!editing&&myInfo ? undefined : "手動入力（カタカナ）"}>
          <UIInput value={form.tantoshaKana||""} disabled={!!myInfo&&!editing} onChange={e => upd("tantoshaKana", e.target.value)} placeholder="例：ヤマダ タロウ" />
        </Field>
        <Field label="担当者電話番号" half hint={!editing&&myInfo ? undefined : "ハイフンあり・なしどちらでも可"}>
          <UIInput value={form.tantoshaDenwa||""} numHyphen disabled={!!myInfo&&!editing} onChange={e => upd("tantoshaDenwa", e.target.value)} placeholder="例：090-1234-5678" />
        </Field>
      </FieldRow>
      <Field label="社員番号" required hint={!errors.shainBango ? "数字のみ" : undefined} error={errors.shainBango}>
        <UIInput value={form.shainBango} hasError={!!errors.shainBango} onlyNum maxLength={10} disabled={!!myInfo&&!editing} onChange={e => updClr("shainBango", e.target.value)} placeholder="例：12345" style={{ maxWidth: 200 }} />
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

// ==================== STEP2：申込種別選択UI ====================
const TypeSelector = ({ onSelect }) => (
  <Card>
    <SecTitle icon="📋">申込種別を選択してください</SecTitle>
    {TAB_GROUPS.map(group => (
      <div key={group.groupLabel} style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, letterSpacing: ".06em", textTransform: "uppercase" }}>
          {group.groupLabel}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {group.types.map(({ type, shortLabel, subLabel }) => (
            <button key={type}
              disabled={!!group.disabled}
              onClick={() => !group.disabled && onSelect(type)}
              style={{
                padding: "14px 20px", borderRadius: 12,
                border: `1.5px solid ${group.disabled ? C.border : C.border}`,
                cursor: group.disabled ? "not-allowed" : "pointer",
                fontSize: 14, fontWeight: 600, fontFamily: FONT,
                background: group.disabled ? "#f8f9fa" : C.white,
                color: group.disabled ? "#b0bec5" : C.navy,
                textAlign: "left", minWidth: 200,
                transition: "all .15s",
                opacity: group.disabled ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!group.disabled) { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.tealLight}`; }}}
              onMouseLeave={e => { if (!group.disabled) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}}
            >
              <div>{shortLabel}</div>
              {subLabel && <div style={{ fontSize: 11, color: group.disabled ? "#b0bec5" : C.muted, marginTop: 5, fontWeight: 400, lineHeight: 1.5 }}>{subLabel}</div>}
              {group.disabled && <div style={{ fontSize: 11, color: "#b0bec5", marginTop: 5, fontWeight: 500 }}>🔒 準備中</div>}
            </button>
          ))}
        </div>
      </div>
    ))}
    <div style={{ marginTop: 4, padding: "10px 14px", background: C.tealLight, borderLeft: `3px solid ${C.teal}`, borderRadius: "0 8px 8px 0", fontSize: 12.5, color: C.tealDeep, lineHeight: 1.6 }}>
      💡 種別を選択すると入力フォームが表示されます。後から変更も可能です。
    </div>
  </Card>
);

// ==================== STEP2：フォームプレースホルダー ====================
// ※ 各種別のフォームは次フェーズで実装
const FormPlaceholder = ({ tab, onChangeType }) => (
  <Card style={{ border: `2px dashed ${C.teal}`, background: C.tealLight }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.tealDeep, marginBottom: 4 }}>
          🔧 {TYPE_LABEL[tab.type]} のフォームを実装中...
        </div>
        <div style={{ fontSize: 12, color: C.teal }}>次フェーズで入力フォームを追加します</div>
      </div>
      <button onClick={() => { if (window.confirm("申込種別を変更すると入力内容がリセットされます。よいですか？")) onChangeType(); }}
        style={{ fontSize: 12, fontWeight: 600, color: C.muted, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: FONT }}>
        🔄 種別を変更する
      </button>
    </div>
  </Card>
);

// ==================== STEP2 メイン ====================
const Step2 = ({ form, setForm, errors, setErrors }) => {
  const [activeTabId, setActiveTabId] = useState(() => form.tabs[0]?.id || null);

  // アクティブタブが削除されたときのフォールバック
  useEffect(() => {
    if (!form.tabs.find(t => t.id === activeTabId)) {
      setActiveTabId(form.tabs[form.tabs.length - 1]?.id || null);
    }
  }, [form.tabs, activeTabId]);

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
        : <FormPlaceholder tab={activeTab} onChangeType={() => handleResetType(activeTab.id)} />
    )}
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
      // STEP2のバリデーションは次フェーズで実装
      const hasUnselected = form.tabs.some(t => !t.type);
      if (hasUnselected) {
        if (!window.confirm("申込種別が未選択のタブがあります。このままPDF出力に進みますか？")) return;
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
  const errMessage = errCount > 0 && step === 1
    ? `未入力または入力エラーの項目が ${errCount} 件あります。赤くなっている項目を確認してください。`
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
        {step === 2 && <Step2 form={form} setForm={setForm} errors={errors} setErrors={setErrors} />}
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
