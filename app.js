/* =========================
   Tadawul PWA - app.js
   - Single ticker: /predict?ticker=XXXX
   - Top10: /top10
   - Final decision based on status:
       ACCEPTED => BUY
       else => NO_TRADE or WATCH (if watch mode triggered)
   ========================= */

const API_BASE = "https://tadawul-mvp-api.onrender.com"; // عدّلها لو تغيرت

// WATCH MODE thresholds (تقدر تعدلها)
const WATCH_MIN_CONFIDENCE_PCT = 65;   // إذا الثقة >= 65% نعتبرها Watch (حتى لو مرفوضة)
const WATCH_MIN_RULES_SCORE = 55;      // أو إذا قواعدها قوية نسبياً
const WATCH_MAX_BAD_REASONS = 2;       // لو الأسباب كثيرة/قاسية ما نحطها Watch

// DOM
const elTicker = document.getElementById("ticker");
const elBtn = document.getElementById("btn");
const elBtnTop10 = document.getElementById("btnTop10");
const elStatus = document.getElementById("status");

const elResult = document.getElementById("result");
const elPill = document.getElementById("pill");
const elConfidence = document.getElementById("confidence");
const elEntry = document.getElementById("entry");
const elTP = document.getElementById("tp");
const elSL = document.getElementById("sl");
const elReason = document.getElementById("reason");
const elLastClose = document.getElementById("lastClose");
const elRawJson = document.getElementById("rawJson");

const elTop10 = document.getElementById("top10");
const elTop10List = document.getElementById("top10List");
const elTop10RawJson = document.getElementById("top10RawJson");

// helpers
function setStatus(text, type = "info") {
  elStatus.textContent = text;
  elStatus.className = `status ${type}`;
}

function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}

function fmtMoney(x) {
  if (x === null || x === undefined || x === "") return "—";
  const n = Number(x);
  if (Number.isNaN(n)) return String(x);
  return n.toFixed(2);
}

function fmtPct(x) {
  if (x === null || x === undefined || x === "") return "—";
  const n = Number(x);
  if (Number.isNaN(n)) return "—";
  return `${Math.round(n)}%`;
}

function safeText(x) {
  if (x === null || x === undefined) return "—";
  return String(x);
}

function parseReasonsCount(reasonStr) {
  if (!reasonStr) return 0;
  // الأسباب غالباً مفصولة بـ " | "
  return String(reasonStr).split("|").map(s => s.trim()).filter(Boolean).length;
}

/**
 * القرار النهائي للعرض (IMPORTANT)
 * - لا نعرض recommendation لوحده أبداً
 * - نعتمد status أولاً
 * - WATCH MODE: إذا مرفوض لكن قريب جداً من الدخول
 */
function computeDisplayDecision(item) {
  const status = (item.status || "").toUpperCase(); // ACCEPTED / REJECTED / FILTERED ...
  const confPct = Number(item.confidence_pct ?? item.confidence ?? 0);
  const rulesScore = Number(item.rules_score ?? 0);
  const reasonsCount = parseReasonsCount(item.reason);

  // الحكم النهائي
  if (status === "ACCEPTED") {
    return { decision: "BUY", badge: "ACCEPTED", pillClass: "buy" };
  }

  // WATCH MODE (حتى لو REJECTED / FILTERED)
  // شروط Watch: ثقة عالية أو قواعد قوية + أسباب ليست كثيرة
  const watchOk =
    (confPct >= WATCH_MIN_CONFIDENCE_PCT || rulesScore >= WATCH_MIN_RULES_SCORE) &&
    reasonsCount <= WATCH_MAX_BAD_REASONS;

  if (watchOk) {
    return { decision: "WATCH", badge: "WATCH", pillClass: "watch" };
  }

  return { decision: "NO_TRADE", badge: status || "REJECTED", pillClass: "no-trade" };
}

function applyPillUI(decisionObj, pillEl) {
  pillEl.textContent = decisionObj.decision;
  // reset classes
  pillEl.classList.remove("buy", "no-trade", "watch");
  pillEl.classList.add(decisionObj.pillClass);
}

function buildStatusLabel(decisionObj) {
  // يظهر فوق السبب كحالة
  if (decisionObj.badge === "ACCEPTED") return "ACCEPTED ✅";
  if (decisionObj.badge === "WATCH") return "WATCH 👀";
  return "REJECTED ⛔";
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${txt}`);
  }
  return r.json();
}

/* =========================
   Single Ticker
   ========================= */
async function analyzeTicker() {
  const raw = (elTicker.value || "").trim();
  if (!raw) {
    setStatus("اكتب رمز السهم أولاً", "warn");
    return;
  }

  // دعم إدخال 4140 بدون .SR
  const ticker = raw.toUpperCase().endsWith(".SR") ? raw.toUpperCase() : `${raw.toUpperCase()}.SR`;

  setStatus("⏳ جاري التحليل...", "info");
  hide(elTop10);

  try {
    const data = await fetchJson(`${API_BASE}/predict?ticker=${encodeURIComponent(ticker)}`);

    // عرض النتيجة
    show(elResult);

    const decisionObj = computeDisplayDecision(data);
    applyPillUI(decisionObj, elPill);

    elConfidence.textContent = fmtPct(data.confidence_pct ?? (Number(data.confidence) * 100));
    elEntry.textContent = `SAR ${fmtMoney(data.entry)}`;
    elTP.textContent = `SAR ${fmtMoney(data.take_profit)}`;
    elSL.textContent = `SAR ${fmtMoney(data.stop_loss)}`;

    // السبب + حالة
    const statusLine = buildStatusLabel(decisionObj);
    elReason.innerHTML = `
      <span class="status-badge ${decisionObj.pillClass}">${statusLine}</span>
      <div style="margin-top:8px;">${safeText(data.reason)}</div>
    `;

    elLastClose.textContent = `SAR ${fmtMoney(data.last_close)}`;
    elRawJson.textContent = JSON.stringify(data, null, 2);

    setStatus("✅ تم التحليل", "ok");
  } catch (e) {
    show(elResult);
    elRawJson.textContent = "{}";
    setStatus("❌ فشل التحليل (تحقق من الـ API)", "error");
  }
}

/* =========================
   Top10
   ========================= */
function renderTop10(items) {
  elTop10List.innerHTML = "";

  // ترتيب العرض: BUY أولاً ثم WATCH ثم NO_TRADE
  const rank = (d) => (d.decision === "BUY" ? 2 : d.decision === "WATCH" ? 1 : 0);

  const normalized = (items || []).map((it) => {
    const decisionObj = computeDisplayDecision(it);
    return { it, decisionObj };
  });

  normalized.sort((a, b) => {
    const ra = rank(a.decisionObj);
    const rb = rank(b.decisionObj);
    if (rb !== ra) return rb - ra;

    const ca = Number(a.it.confidence_pct ?? 0);
    const cb = Number(b.it.confidence_pct ?? 0);
    return cb - ca;
  });

  for (const row of normalized.slice(0, 10)) {
    const it = row.it;
    const d = row.decisionObj;

    const card = document.createElement("div");
    card.className = "kv full top10-card";

    const conf = fmtPct(it.confidence_pct ?? (Number(it.confidence) * 100));
    const ticker = safeText(it.ticker || "—").replace(".SR", "");
    const entry = `SAR ${fmtMoney(it.entry)}`;
    const tp = `SAR ${fmtMoney(it.take_profit)}`;
    const sl = `SAR ${fmtMoney(it.stop_loss)}`;
    const reason = safeText(it.reason || "");

    card.innerHTML = `
      <div class="top10-head">
        <span class="pill ${d.pillClass}">${d.decision}</span>
        <span class="pill ${d.pillClass}" style="opacity:.85">${buildStatusLabel(d)}</span>
        <div class="top10-ticker">SR.${ticker}</div>
      </div>

      <div class="top10-grid">
        <div><div class="k">الثقة</div><div class="v">${conf}</div></div>
        <div><div class="k">الدخول</div><div class="v">${entry}</div></div>
        <div><div class="k">الوقف</div><div class="v">${sl}</div></div>
        <div><div class="k">الهدف</div><div class="v">${tp}</div></div>
      </div>

      <div class="top10-reason">
        <div class="k">سبب مختصر</div>
        <div class="v">${reason}</div>
      </div>
    `;

    elTop10List.appendChild(card);
  }
}

async function analyzeTop10() {
  setStatus("⏳ جاري تحليل أفضل 10...", "info");
  hide(elResult);

  try {
    const data = await fetchJson(`${API_BASE}/top10`);

    // بعض السيرفرات ترجع items
    const items = data.items || [];
    elTop10RawJson.textContent = JSON.stringify(data, null, 2);

    // عرض القسم
    show(elTop10);
    renderTop10(items);

    setStatus("✅ تم عرض أفضل 10", "ok");
  } catch (e) {
    show(elTop10);
    elTop10List.innerHTML = "";
    elTop10RawJson.textContent = "[]";
    setStatus("❌ فشل الاتصال بـ /top10", "error");
  }
}

/* =========================
   Events
   ========================= */
elBtn.addEventListener("click", analyzeTicker);
elBtnTop10.addEventListener("click", analyzeTop10);

elTicker.addEventListener("keydown", (e) => {
  if (e.key === "Enter") analyzeTicker();
});

/* =========================
   Optional: small styles injection for WATCH badge
   (إذا ما ودك تعدّل style.css الآن)
   ========================= */
(function injectWatchCss() {
  const css = `
    .pill.watch { background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
    .pill.buy { background: #DCFCE7; color: #166534; border: 1px solid #22C55E; }
    .pill.no-trade { background: #FDE2E2; color: #991B1B; border: 1px solid #EF4444; }

    .status-badge { display:inline-block; padding:6px 10px; border-radius:999px; font-weight:700; font-size:13px; }
    .status-badge.buy { background:#DCFCE7; color:#166534; border:1px solid #22C55E; }
    .status-badge.watch { background:#FEF3C7; color:#92400E; border:1px solid #F59E0B; }
    .status-badge.no-trade { background:#FDE2E2; color:#991B1B; border:1px solid #EF4444; }

    .top10-card { padding:12px; border-radius:16px; border:1px solid rgba(0,0,0,.08); }
    .top10-head { display:flex; align-items:center; gap:8px; justify-content:space-between; }
    .top10-ticker { font-weight:800; }
    .top10-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; }
    .top10-reason { margin-top:10px; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

// Init UI
setStatus("جاهز", "info");
hide(elResult);
hide(elTop10);
