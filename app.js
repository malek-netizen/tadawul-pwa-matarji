/* =========================
   Tadawul PWA - app.js
   Clean Top10 + Status + WATCH MODE
   ========================= */

const API_BASE = "https://tadawul-mvp-api.onrender.com";

const $ = (id) => document.getElementById(id);

const elTicker = $("ticker");
const btnAnalyze = $("btn");
const btnTop10 = $("btnTop10");

const statusEl = $("status");

const resultSection = $("result");
const pillEl = $("pill");
const confidenceEl = $("confidence");
const entryEl = $("entry");
const tpEl = $("tp");
const slEl = $("sl");
const reasonEl = $("reason");
const lastCloseEl = $("lastClose");
const rawJsonEl = $("rawJson");

const top10Section = $("top10");
const top10ListEl = $("top10List");
const top10RawEl = $("top10RawJson");

/* -------------------------
   Helpers
------------------------- */

function setStatus(text, type = "info") {
  // type: info | ok | err
  statusEl.textContent = text;
  statusEl.classList.remove("info", "ok", "err");
  statusEl.classList.add(type);
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtPrice(v) {
  const n = safeNum(v);
  if (n === null) return "—";
  return `SAR ${n.toFixed(2)}`;
}

function fmtPct(v) {
  const n = safeNum(v);
  if (n === null) return "—";
  return `${Math.round(n)}%`;
}

function normalizeTickerInput(t) {
  const s = String(t || "").trim().toUpperCase();
  if (!s) return "";
  if (s.includes(".")) return s;
  // allow "4140" => "4140.SR"
  return `${s}.SR`;
}

/* -------------------------
   Status / Recommendation Logic
   هدف: ما يطلع "BUY + REJECTED" مع بعض
   + WATCH MODE
------------------------- */

function computeDisplayState(item) {
  const rec = String(item?.recommendation || "NO_TRADE").toUpperCase();
  const apiStatus = item?.status ? String(item.status).toUpperCase() : "";

  // ثقة: نقرأ confidence_pct (الجديد) أو confidence (القديم 0..1)
  let confPct = safeNum(item?.confidence_pct);
  if (confPct === null) {
    const c = safeNum(item?.confidence);
    confPct = c === null ? null : Math.round(c * 100);
  }

  const rulesScore = safeNum(item?.rules_score);

  // الحالة الأساسية من API إن وجدت
  let status = apiStatus || (rec === "BUY" ? "ACCEPTED" : "REJECTED");

  // WATCH MODE (واجهة فقط):
  // إذا مرفوض لكن "قريب من الدخول" (rules_score عالي أو ثقة عالية) نخليه WATCH بدل REJECTED
  // (تقدر تغيّر الأرقام لاحقاً)
  if (status === "REJECTED") {
    const near =
      (rulesScore !== null && rulesScore >= 60) ||
      (confPct !== null && confPct >= 60);
    if (near) status = "WATCH";
  }

  // recommendation المعروضة للمستخدم
  let displayRec = "NO_TRADE";
  if (status === "ACCEPTED") displayRec = "BUY";
  if (status === "WATCH") displayRec = "WATCH";

  return { status, displayRec, confPct, rulesScore };
}

function pillStyle(status) {
  // نستخدم نفس عنصر .pill في CSS، ونغير اللون عبر inline بسيط
  if (status === "ACCEPTED") {
    return { text: "BUY", bg: "#D1FAE5", fg: "#065F46", border: "#34D399" };
  }
  if (status === "WATCH") {
    return { text: "WATCH", bg: "#FEF3C7", fg: "#92400E", border: "#F59E0B" };
  }
  return { text: "NO_TRADE", bg: "#FEE2E2", fg: "#991B1B", border: "#FCA5A5" };
}

function shortReason(item) {
  const r = String(item?.reason || "").trim();
  if (!r) return "—";
  // اختصار لطيف
  if (r.length <= 140) return r;
  return r.slice(0, 140) + "…";
}

/* -------------------------
   Rendering: Single Result
------------------------- */

function renderSingle(item) {
  const { status, displayRec, confPct } = computeDisplayState(item);
  const p = pillStyle(status);

  resultSection.classList.remove("hidden");

  pillEl.textContent = p.text;
  pillEl.style.background = p.bg;
  pillEl.style.color = p.fg;
  pillEl.style.border = `1px solid ${p.border}`;

  confidenceEl.textContent = confPct === null ? "—" : `${confPct}%`;
  entryEl.textContent = fmtPrice(item?.entry);
  tpEl.textContent = fmtPrice(item?.take_profit);
  slEl.textContent = fmtPrice(item?.stop_loss);

  // نعرض "الحالة" داخل السبب كعنوان صغير (بدل BUY + REJECTED)
  const reason = shortReason(item);
  const statusBadge =
    status === "ACCEPTED" ? "✅ ACCEPTED" : status === "WATCH" ? "👀 WATCH" : "⛔ REJECTED";

  reasonEl.textContent = `${statusBadge} — ${reason}`;
  lastCloseEl.textContent = fmtPrice(item?.last_close);

  rawJsonEl.textContent = JSON.stringify(item, null, 2);
}

/* -------------------------
   Rendering: Top10 Clean
------------------------- */

function clearTop10() {
  top10ListEl.innerHTML = "";
  top10RawEl.textContent = "[]";
}

function top10SortKey(item) {
  const { status, confPct } = computeDisplayState(item);
  const rank =
    status === "ACCEPTED" ? 3 : status === "WATCH" ? 2 : 1; // ACCEPTED أعلى
  const c = confPct === null ? 0 : confPct;
  return { rank, c };
}

function renderTop10(items) {
  top10Section.classList.remove("hidden");
  clearTop10();

  const arr = Array.isArray(items) ? items.slice() : [];

  // ترتيب نظيف
  arr.sort((a, b) => {
    const ka = top10SortKey(a);
    const kb = top10SortKey(b);
    if (kb.rank !== ka.rank) return kb.rank - ka.rank;
    return kb.c - ka.c;
  });

  // نبني كروت نظيفة
  for (const it of arr) {
    const { status, displayRec, confPct } = computeDisplayState(it);
    const p = pillStyle(status);

    const card = document.createElement("div");
    card.className = "kv full";
    card.style.border = "1px solid #E5E7EB";
    card.style.borderRadius = "14px";
    card.style.padding = "12px";
    card.style.background = "#FFFFFF";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "10px";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.flexDirection = "column";

    const t = document.createElement("div");
    t.style.fontWeight = "800";
    t.style.fontSize = "16px";
    t.textContent = String(it?.ticker || "—");

    const sub = document.createElement("div");
    sub.style.fontSize = "13px";
    sub.style.color = "#6B7280";
    sub.textContent = `الثقة: ${confPct === null ? "—" : confPct + "%"}`;

    left.appendChild(t);
    left.appendChild(sub);

    const badge = document.createElement("span");
    badge.textContent = displayRec; // BUY / WATCH / NO_TRADE
    badge.style.padding = "6px 10px";
    badge.style.borderRadius = "999px";
    badge.style.background = p.bg;
    badge.style.color = p.fg;
    badge.style.border = `1px solid ${p.border}`;
    badge.style.fontWeight = "800";
    badge.style.fontSize = "12px";
    badge.style.whiteSpace = "nowrap";

    header.appendChild(left);
    header.appendChild(badge);

    const body = document.createElement("div");
    body.style.display = "grid";
    body.style.gridTemplateColumns = "1fr 1fr";
    body.style.gap = "8px";
    body.style.marginTop = "10px";

    const mkRow = (label, value) => {
      const wrap = document.createElement("div");
      wrap.style.border = "1px solid #F3F4F6";
      wrap.style.borderRadius = "12px";
      wrap.style.padding = "10px";
      const k = document.createElement("div");
      k.style.fontSize = "12px";
      k.style.color = "#6B7280";
      k.textContent = label;
      const v = document.createElement("div");
      v.style.fontSize = "14px";
      v.style.fontWeight = "800";
      v.textContent = value;
      wrap.appendChild(k);
      wrap.appendChild(v);
      return wrap;
    };

    body.appendChild(mkRow("الدخول", fmtPrice(it?.entry)));
    body.appendChild(mkRow("الهدف", fmtPrice(it?.take_profit)));
    body.appendChild(mkRow("الوقف", fmtPrice(it?.stop_loss)));
    body.appendChild(mkRow("آخر إغلاق", fmtPrice(it?.last_close)));

    const reasonBox = document.createElement("div");
    reasonBox.style.marginTop = "10px";
    reasonBox.style.padding = "10px";
    reasonBox.style.borderRadius = "12px";
    reasonBox.style.background = "#F9FAFB";
    reasonBox.style.border = "1px solid #F3F4F6";
    reasonBox.style.fontSize = "13px";
    reasonBox.style.color = "#111827";
    reasonBox.textContent = shortReason(it);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(reasonBox);

    top10ListEl.appendChild(card);
  }

  top10RawEl.textContent = JSON.stringify(arr, null, 2);
}

/* -------------------------
   API Calls
------------------------- */

async function apiGet(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${txt}`.trim());
  }
  return res.json();
}

/* -------------------------
   Actions
------------------------- */

async function onAnalyze() {
  const t = normalizeTickerInput(elTicker.value);
  if (!t) {
    setStatus("اكتب رمز السهم أولاً", "err");
    return;
  }

  try {
    btnAnalyze.disabled = true;
    btnTop10.disabled = true;
    setStatus("جاري التحليل…", "info");

    const data = await apiGet(`/predict?ticker=${encodeURIComponent(t)}`);

    setStatus("✅ تم التحليل", "ok");
    renderSingle(data);
  } catch (e) {
    console.error(e);
    setStatus("فشل التحليل. تأكد من API ثم جرّب مرة أخرى.", "err");
  } finally {
    btnAnalyze.disabled = false;
    btnTop10.disabled = false;
  }
}

async function onTop10() {
  try {
    btnAnalyze.disabled = true;
    btnTop10.disabled = true;

    setStatus("جاري تحليل السوق (أفضل 10)…", "info");
    top10Section.classList.remove("hidden");
    clearTop10();

    const data = await apiGet(`/top10`);

    const items = data?.items || [];
    renderTop10(items);

    setStatus("✅ تم عرض أفضل 10", "ok");
  } catch (e) {
    console.error(e);
    setStatus("فشل الاتصال بـ /top10", "err");
    // نخلي القسم ظاهر لكن فاضي
    top10Section.classList.remove("hidden");
    clearTop10();
  } finally {
    btnAnalyze.disabled = false;
    btnTop10.disabled = false;
  }
}

/* -------------------------
   Events
------------------------- */

btnAnalyze?.addEventListener("click", onAnalyze);
btnTop10?.addEventListener("click", onTop10);

elTicker?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onAnalyze();
});

// Ready
setStatus("جاهز", "info");
