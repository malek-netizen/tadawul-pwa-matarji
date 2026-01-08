const API_BASE = "https://tadawul-mvp-api.onrender.com";

// عناصر الواجهة (سهم واحد)
const elTicker = document.getElementById("ticker");
const elBtn = document.getElementById("btn");
const elTop10Btn = document.getElementById("btnTop10");

const elStatus = document.getElementById("status");
const elResult = document.getElementById("result");
const elPill = document.getElementById("pill");
const elConf = document.getElementById("confidence");
const elEntry = document.getElementById("entry");
const elTP = document.getElementById("tp");
const elSL = document.getElementById("sl");
const elReason = document.getElementById("reason");
const elLastClose = document.getElementById("lastClose");
const elRaw = document.getElementById("rawJson");

// عناصر Top10 (لازم تكون موجودة في index.html إذا تبغى عرض مرتب)
const elTop10 = document.getElementById("top10");
const elTop10List = document.getElementById("top10List");
const elTop10Raw = document.getElementById("top10RawJson");

// ---------- Helpers ----------
function setStatus(type, text) {
  elStatus.className = `status ${type}`;
  elStatus.textContent = text;
}

function fmtSAR(x) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "—";
  return `${Number(x).toFixed(2)} SAR`;
}

function pctInt(x) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "—";
  return `${Math.round(Number(x))}%`;
}

function show(el) {
  if (!el) return;
  el.classList.remove("hidden");
}

function hide(el) {
  if (!el) return;
  el.classList.add("hidden");
}

function normalizeTicker(input) {
  let t = (input || "").trim().toUpperCase();
  if (!t) return "";

  // المستخدم يدخل بدون .SR (مثل 4140) → نضيف .SR
  if (/^\d+$/.test(t)) t = `${t}.SR`;

  // لو كتب 4140.SR خلاص
  return t;
}

function setPillFromRec(rec) {
  elPill.className = "pill";
  if (rec === "BUY") {
    elPill.classList.add("buy");
    elPill.textContent = "BUY";
  } else if (rec === "SELL") {
    elPill.classList.add("sell");
    elPill.textContent = "SELL";
  } else {
    elPill.classList.add("no");
    elPill.textContent = "NO_TRADE";
  }
}

// شارة حالة السهم (PASSED/REJECTED)
function statusBadgeHTML(status) {
  const s = (status || "").toUpperCase();
  const isPass = (s === "PASSED");
  const bg = isPass ? "#DCFCE7" : "#FEE2E2";
  const fg = isPass ? "#166534" : "#991B1B";
  const label = isPass ? "✅ PASSED" : "⛔ REJECTED";
  return `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${bg};color:${fg};font-weight:700;font-size:12px;">${label}</span>`;
}

// لون الثقة
function confidenceColor(pct) {
  const n = Number(pct);
  if (Number.isNaN(n)) return "#111827";
  if (n >= 70) return "#065F46";      // أخضر قوي
  if (n >= 55) return "#0F766E";      // أخضر/تركوازي
  if (n >= 45) return "#92400E";      // برتقالي
  return "#991B1B";                   // أحمر
}

// ---------- Render Single Result ----------
function renderSingle(data) {
  // recommendation + pill
  setPillFromRec(data.recommendation);

  // confidence: نفضل confidence_pct (int) ثم fallback
  const cp = (data.confidence_pct !== undefined && data.confidence_pct !== null)
    ? Number(data.confidence_pct)
    : (data.confidence !== undefined && data.confidence !== null)
      ? Math.round(Number(data.confidence) * 100)
      : null;

  elConf.innerHTML = `<span style="font-weight:800;color:${confidenceColor(cp)}">${pctInt(cp)}</span>`;

  elEntry.textContent = fmtSAR(data.entry);
  elTP.textContent = fmtSAR(data.take_profit);
  elSL.textContent = fmtSAR(data.stop_loss);
  elLastClose.textContent = fmtSAR(data.last_close);

  // reason + status badge
  const st = data.status || "";
  const reason = data.reason || "—";
  elReason.innerHTML = `${statusBadgeHTML(st)} <div style="margin-top:10px;line-height:1.5;">${escapeHtml(reason)}</div>`;

  elRaw.textContent = JSON.stringify(data, null, 2);
}

// ---------- Render Top10 ----------
function renderTop10(items, raw) {
  if (!elTop10List) {
    // إذا ما عندك عناصر Top10 في index.html، نعرض في rawJson فقط
    elRaw.textContent = JSON.stringify(raw, null, 2);
    return;
  }

  elTop10List.innerHTML = items.slice(0, 10).map((x) => {
    const rec = (x.recommendation || "NO_TRADE").toUpperCase();
    const st = (x.status || "").toUpperCase();

    const cp = (x.confidence_pct !== undefined && x.confidence_pct !== null)
      ? Number(x.confidence_pct)
      : (x.confidence !== undefined && x.confidence !== null)
        ? Math.round(Number(x.confidence) * 100)
        : null;

    const pillBg = rec === "BUY" ? "#DCFCE7" : "#FEE2E2";
    const pillFg = rec === "BUY" ? "#166534" : "#991B1B";

    const statusChip = statusBadgeHTML(st);

    return `
      <div style="border:1px solid #E5E7EB;border-radius:14px;padding:12px;margin:10px 0;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div style="font-weight:900;font-size:16px;">${escapeHtml(x.ticker || "—")}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${statusChip}
            <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${pillBg};color:${pillFg};font-weight:800;font-size:12px;">${rec}</span>
          </div>
        </div>

        <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
          <div><strong>الثقة:</strong> <span style="font-weight:900;color:${confidenceColor(cp)}">${pctInt(cp)}</span></div>
          <div><strong>الدخول:</strong> ${fmtSAR(x.entry)}</div>
          <div><strong>الهدف:</strong> ${fmtSAR(x.take_profit)}</div>
          <div><strong>الوقف:</strong> ${fmtSAR(x.stop_loss)}</div>
        </div>

        <div style="margin-top:8px;font-size:13px;color:#374151;line-height:1.4;">
          <strong>سبب مختصر:</strong> ${escapeHtml((x.reason || "").split("|")[0] || "—")}
        </div>
      </div>
    `;
  }).join("");

  if (elTop10Raw) elTop10Raw.textContent = JSON.stringify(raw, null, 2);
}

// ---------- Safe HTML ----------
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ----------------------------------------------------
// تحليل سهم واحد
// ----------------------------------------------------
elBtn.onclick = async () => {
  const ticker = normalizeTicker(elTicker.value);
  if (!ticker) {
    setStatus("err", "أدخل رمز السهم (مثال: 4140 أو 4140.SR)");
    return;
  }

  show(elResult);
  if (elTop10) hide(elTop10);

  setStatus("info", "جاري التحليل...");
  elRaw.textContent = "{}";

  try {
    const url = `${API_BASE}/predict?ticker=${encodeURIComponent(ticker)}`;
    const res = await fetch(url, { method: "GET" });

    let data;
    try {
      data = await res.json();
    } catch {
      setStatus("err", "الرد ليس JSON (مشكلة بالخادم)");
      return;
    }

    if (!res.ok) {
      setStatus("err", data?.error || `خطأ بالخادم: ${res.status}`);
      return;
    }

    if (data.error) {
      setStatus("err", data.error);
      return;
    }

    setStatus("ok", "تم التحليل ✅");
    renderSingle(data);

  } catch (e) {
    setStatus("err", "فشل الاتصال بالخادم (تحقق من API)");
  }
};

// ----------------------------------------------------
// Top10
// ----------------------------------------------------
if (elTop10Btn) {
  elTop10Btn.onclick = async () => {
    hide(elResult);
    if (elTop10) show(elTop10);

    setStatus("info", "جاري تحليل أفضل 10...");
    if (elTop10List) elTop10List.innerHTML = "";
    if (elTop10Raw) elTop10Raw.textContent = "[]";

    try {
      const url = `${API_BASE}/top10`;
      const res = await fetch(url, { method: "GET" });

      let data;
      try {
        data = await res.json();
      } catch {
        setStatus("err", "الرد ليس JSON (مشكلة بالخادم)");
        return;
      }

      if (!res.ok) {
        setStatus("err", data?.error || `خطأ بالخادم: ${res.status}`);
        return;
      }

      const items = data.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        setStatus("err", data.error || "لا توجد فرص حالياً");
        return;
      }

      // نعرض أول 10
      renderTop10(items, data);
      setStatus("ok", "تم عرض أفضل 10 ✅");

    } catch (e) {
      setStatus("err", "فشل الاتصال بـ /top10");
    }
  };
}
