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
const elLastClose = document.getElementById("lastClose"); // ✅ تصحيح ID
const elRaw = document.getElementById("rawJson");

// عناصر الواجهة (Top 10)
const elTop10 = document.getElementById("top10");
const elTop10List = document.getElementById("top10List");
const elTop10Raw = document.getElementById("top10RawJson");

// أدوات مساعدة
function setStatus(type, text) {
  elStatus.className = `status ${type}`;
  elStatus.textContent = text;
}

function fmtSAR(x) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "—";
  return `${Number(x).toFixed(2)} SAR`;
}

function pct(x) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "—";
  return `${Math.round(Number(x) * 100)}%`;
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

  // إذا المستخدم كتب أرقام فقط مثل 1120 → نضيف .SR
  if (/^\d+$/.test(t)) t = `${t}.SR`;

  // إذا كتب 1120.SR أو 1120.SA.. نخليها كما هي (انت تستخدم SR)
  // لو كتب 1120 بدون .SR مع مسافات تم التعامل أعلاه

  return t;
}

function setPill(rec) {
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

// ----------------------------------------------------
// تحليل سهم واحد
// ----------------------------------------------------
elBtn.onclick = async () => {
  const ticker = normalizeTicker(elTicker.value);
  if (!ticker) {
    setStatus("err", "أدخل رمز السهم (مثال: 1120 أو 1120.SR)");
    return;
  }

  // إظهار قسم السهم الواحد وإخفاء Top10
  show(elResult);
  hide(elTop10);

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

    setStatus("ok", "تم التحليل");

    setPill(data.recommendation);
    elConf.textContent = pct(data.confidence);
    elEntry.textContent = fmtSAR(data.entry);
    elTP.textContent = fmtSAR(data.take_profit);
    elSL.textContent = fmtSAR(data.stop_loss);
    elReason.textContent = data.reason || "—";
    elLastClose.textContent = fmtSAR(data.last_close);

    elRaw.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    setStatus("err", "فشل الاتصال بالخادم (تحقق من API)");
  }
};

// ----------------------------------------------------
// 🔥 تحليل أفضل 10 أسهم
// - يتوقع endpoint: /top10?universe=all
// - لو اختلف شكل الاستجابة، الكود يتعامل مع أكثر من اسم محتمل
// ----------------------------------------------------
elTop10Btn.onclick = async () => {
  // إخفاء سهم واحد وإظهار Top10
  hide(elResult);
  show(elTop10);

  setStatus("info", "جاري تحليل السوق بالكامل...");
  elTop10List.innerHTML = "";
  elTop10Raw.textContent = "[]";

  try {
    const url = `${API_BASE}/top10?universe=all`;
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

    // يدعم أكثر من شكل:
    // { items: [...] } أو { top10: [...] } أو { results: [...] }
    const items = data.items || data.top10 || data.results || [];

    if (!Array.isArray(items) || items.length === 0) {
      setStatus("err", "لا توجد فرص حالياً");
      return;
    }

    // عرض Cards بسيطة داخل top10List
    // (بدون CSS إضافي، لكن تظهر منظمة)
    elTop10List.innerHTML = items.slice(0, 10).map((x) => {
      const rec = x.recommendation || "BUY";
      const pillClass = (rec === "BUY") ? "buy" : (rec === "SELL") ? "sell" : "no";

      return `
        <div class="kv full" style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div style="font-weight:700;">${x.ticker || "—"}</div>
            <div class="pill ${pillClass}" style="margin:0;">${rec}</div>
          </div>

          <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><strong>الثقة:</strong> ${pct(x.confidence)}</div>
            <div><strong>الدخول:</strong> ${fmtSAR(x.entry)}</div>
            <div><strong>الهدف:</strong> ${fmtSAR(x.take_profit)}</div>
            <div><strong>الوقف:</strong> ${fmtSAR(x.stop_loss)}</div>
          </div>
        </div>
      `;
    }).join("");

    elTop10Raw.textContent = JSON.stringify(data, null, 2);
    setStatus("ok", "أفضل 10 فرص جاهزة ✅");
  } catch (e) {
    setStatus("err", "فشل تحليل السوق (تحقق من endpoint /top10)");
  }
};
