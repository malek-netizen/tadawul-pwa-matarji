const API_BASE = "https://tadawul-mvp-api.onrender.com/predict?ticker=";

const elTicker = document.getElementById("ticker");
const elBtn = document.getElementById("btn");
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

function setStatus(type, text){
  elStatus.className = `status ${type}`;
  elStatus.textContent = text;
}

function setPill(rec){
  elPill.className = "pill";
  if(rec === "BUY"){ elPill.classList.add("buy"); elPill.textContent = "شراء (BUY)"; }
  else if(rec === "SELL"){ elPill.classList.add("sell"); elPill.textContent = "بيع (SELL)"; }
  else { elPill.classList.add("no"); elPill.textContent = "لا صفقة (NO_TRADE)"; }
}

function fmtSAR(x){
  if(x === null || x === undefined || Number.isNaN(x)) return "—";
  const n = Number(x);
  if(!Number.isFinite(n)) return "—";
  return `${n.toFixed(3)} ر.س`;
}

function fmtPct(x){
  if(x === null || x === undefined || Number.isNaN(x)) return "—";
  const n = Number(x);
  if(!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

async function analyze(){
  const ticker = (elTicker.value || "").trim().toUpperCase();

  if(!ticker){
    setStatus("warn", "الرجاء إدخال رمز السهم مثل: 1120.SR");
    elResult.classList.add("hidden");
    return;
  }

  if(!ticker.endsWith(".SR")){
    setStatus("warn", "صيغة الرمز غير صحيحة. استخدم مثل: 1120.SR");
    elResult.classList.add("hidden");
    return;
  }

  elBtn.disabled = true;
  setStatus("info", "جاري الاتصال بالـ API وتحليل السهم...");
  elResult.classList.add("hidden");

  try{
    const url = API_BASE + encodeURIComponent(ticker);
    const res = await fetch(url, { method:"GET", headers:{ "Accept":"application/json" } });

    if(!res.ok){
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    // أخطاء مزود البيانات
    if(data.error){
      setStatus("err", `خطأ: ${data.error}`);
      elBtn.disabled = false;
      return;
    }
    if(data.reason && String(data.reason).toLowerCase().includes("no price data")){
      setStatus("err", "لم يتم جلب بيانات السعر. جرّب رمزًا آخر مثل 1120.SR أو انتظر قليلًا.");
      elBtn.disabled = false;
      return;
    }

    setStatus("ok", "تم التحليل بنجاح ✅");
    setPill(data.recommendation || "NO_TRADE");

    elConf.textContent = fmtPct(data.confidence);
    elEntry.textContent = fmtSAR(data.entry);
    elTP.textContent = fmtSAR(data.take_profit);
    elSL.textContent = fmtSAR(data.stop_loss);
    elReason.textContent = data.reason ? String(data.reason) : "—";
    elLastClose.textContent = fmtSAR(data.last_close);

    elRaw.textContent = JSON.stringify(data, null, 2);
    elResult.classList.remove("hidden");

  }catch(err){
    console.error(err);
    setStatus("err", "فشل الطلب. قد يكون السيرفر في وضع السكون. جرّب مرة أخرى بعد 20 ثانية.");
  }finally{
    elBtn.disabled = false;
  }
}

elBtn.addEventListener("click", analyze);
elTicker.addEventListener("keydown", (e)=>{ if(e.key === "Enter") analyze(); });

// تسجيل Service Worker (PWA)
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}
