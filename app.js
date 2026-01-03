const API_BASE = "https://tadawul-mvp-api.onrender.com";

// عناصر الواجهة
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
const elLastClose = document.getElementById("lastclose");
const elRaw = document.getElementById("rawJson");

// أدوات مساعدة
function setStatus(type, text) {
  elStatus.className = `status ${type}`;
  elStatus.textContent = text;
}

function fmtSAR(x) {
  if (x === null || x === undefined || isNaN(x)) return "-";
  return `${Number(x).toFixed(2)} SAR`;
}

function setPill(rec) {
  elPill.className = "pill";
  if (rec === "BUY") {
    elPill.classList.add("buy");
    elPill.textContent = "BUY";
  } else {
    elPill.classList.add("no");
    elPill.textContent = "NO TRADE";
  }
}

// -------------------------------
// تحليل سهم واحد
// -------------------------------
elBtn.onclick = async () => {
  let ticker = (elTicker.value || "").trim().toUpperCase();
  if (!ticker) {
    setStatus("err", "أدخل رمز السهم");
    return;
  }

  // بدون .SR → نضيفها تلقائيًا
  if (/^\d+$/.test(ticker)) ticker = ticker + ".SR";

  setStatus("info", "جاري التحليل...");
  elResult.style.display = "block";

  try {
    const res = await fetch(`${API_BASE}/predict?ticker=${ticker}`);
    const data = await res.json();

    if (data.error) {
      setStatus("err", data.error);
      return;
    }

    setStatus("ok", "تم التحليل");
    setPill(data.recommendation);
    elConf.textContent = Math.round(data.confidence * 100) + "%";
    elEntry.textContent = fmtSAR(data.entry);
    elTP.textContent = fmtSAR(data.take_profit);
    elSL.textContent = fmtSAR(data.stop_loss);
    elReason.textContent = data.reason || "-";
    elLastClose.textContent = fmtSAR(data.last_close);
    elRaw.textContent = JSON.stringify(data, null, 2);

  } catch (e) {
    setStatus("err", "فشل الاتصال بالخادم");
  }
};

// -------------------------------
// 🔥 تحليل أفضل 10 أسهم في السوق
// -------------------------------
elTop10Btn.onclick = async () => {
  setStatus("info", "جاري تحليل السوق بالكامل...");
  elResult.style.display = "none";
  elRaw.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/top10?universe=all`);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      setStatus("err", "لا توجد فرص حالياً");
      return;
    }

    let html = `
      <table class="top10">
        <tr>
          <th>السهم</th>
          <th>التوصية</th>
          <th>الثقة</th>
          <th>الدخول</th>
          <th>الهدف</th>
          <th>وقف الخسارة</th>
        </tr>
    `;

    data.items.forEach(x => {
      html += `
        <tr>
          <td>${x.ticker}</td>
          <td class="buy">BUY</td>
          <td>${Math.round(x.confidence * 100)}%</td>
          <td>${fmtSAR(x.entry)}</td>
          <td>${fmtSAR(x.take_profit)}</td>
          <td>${fmtSAR(x.stop_loss)}</td>
        </tr>
      `;
    });

    html += "</table>";
    elRaw.innerHTML = html;
    setStatus("ok", "أفضل 10 فرص جاهزة");

  } catch (e) {
    setStatus("err", "فشل تحليل السوق");
  }
};
