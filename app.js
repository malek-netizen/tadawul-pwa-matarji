// ملف app.js للواجهة الأمامية - يدعم قائمتين (صعود وقيعان)
// عنوان API (يستخدم نفس النطاق)
const API_BASE = 'https://tadawul-mvp-api.onrender.com';

// عناصر HTML
const tickerInput = document.getElementById('ticker');
const btnAnalyze = document.getElementById('btn');
const btnTop10 = document.getElementById('btnTop10');
const statusDiv = document.getElementById('status');
const resultSection = document.getElementById('result');
const top10Section = document.getElementById('top10');
const pillDiv = document.getElementById('pill');
const confidenceSpan = document.getElementById('confidence');
const entrySpan = document.getElementById('entry');
const tpSpan = document.getElementById('tp');
const slSpan = document.getElementById('sl');
const reasonSpan = document.getElementById('reason');
const lastCloseSpan = document.getElementById('lastClose');
const rawJsonPre = document.getElementById('rawJson');
const top10UptrendDiv = document.getElementById('top10Uptrend');
const top10BottomDiv = document.getElementById('top10Bottom');
const top10RawJsonPre = document.getElementById('top10RawJson');

// دالة مساعدة لعرض حالة النشاط
function setStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// دالة لتنسيق الثقة (تتعامل مع الكسور العشرية والنسب المئوية)
function formatConfidence(value) {
    if (value === undefined || value === null || value === 0) return '—';
    if (value > 1) return value.toFixed(1) + '%';      // إذا كانت نسبة مئوية
    return (value * 100).toFixed(1) + '%';              // إذا كانت كسر عشري
}

// دالة لتحديث نتيجة سهم واحد
function updateSingleResult(data) {
    resultSection.classList.remove('hidden');

    // استخدم بيانات الصعود (uptrend) كافتراضية للعرض
    const strategy = data.uptrend || { status: 'REJECTED', confidence: 0, entry: '—', tp: '—', sl: '—', reason: '—' };

    pillDiv.textContent = strategy.status === 'APPROVED' ? 'شراء' : 'لا يوجد';
    pillDiv.className = strategy.status === 'APPROVED' ? 'pill buy' : 'pill no-trade';
    confidenceSpan.textContent = formatConfidence(strategy.confidence);
    entrySpan.textContent = strategy.entry ?? '—';
    tpSpan.textContent = strategy.tp ?? '—';
    slSpan.textContent = strategy.sl ?? '—';
    reasonSpan.textContent = strategy.reason || '—';
    lastCloseSpan.textContent = data.lastClose ?? '—';
    rawJsonPre.textContent = JSON.stringify(data, null, 2);
}

// دالة لتحديث قائمة أفضل 10 (قائمتين)
function updateTop10(data) {
    top10Section.classList.remove('hidden');
    top10RawJsonPre.textContent = JSON.stringify(data, null, 2);

    // عرض قائمة الصعود (uptrend)
    if (!data.uptrend || data.uptrend.length === 0) {
        top10UptrendDiv.innerHTML = '<p class="no-data">🚫 لا توجد فرص صاعدة حالياً</p>';
    } else {
        let html = '<h4>🔥 فرص صاعدة</h4>';
        data.uptrend.forEach(item => {
            html += `
                <div class="ticker-card">
                    <div class="ticker-header">
                        <span class="ticker-symbol">${item.ticker}</span>
                        <span class="pill buy">شراء</span>
                    </div>
                    <div class="ticker-details">
                        <div class="detail-item"><span class="detail-label">الثقة:</span> <span class="detail-value">${formatConfidence(item.confidence)}</span></div>
                        <div class="detail-item"><span class="detail-label">الدخول:</span> <span class="detail-value">${item.entry || '—'}</span></div>
                        <div class="detail-item"><span class="detail-label">TP:</span> <span class="detail-value">${item.tp || '—'}</span></div>
                        <div class="detail-item"><span class="detail-label">SL:</span> <span class="detail-value">${item.sl || '—'}</span></div>
                        <div class="detail-item full"><span class="detail-label">السبب:</span> <span class="detail-value">${item.reason || '—'}</span></div>
                    </div>
                </div>
            `;
        });
        top10UptrendDiv.innerHTML = html;
    }

    // عرض قائمة القيعان (bottom)
    if (!data.bottom || data.bottom.length === 0) {
        top10BottomDiv.innerHTML = '<p class="no-data">🚫 لا توجد فرص قيعان حالياً</p>';
    } else {
        let html = '<h4>📉 فرص قيعان مرتدة</h4>';
        data.bottom.forEach(item => {
            html += `
                <div class="ticker-card">
                    <div class="ticker-header">
                        <span class="ticker-symbol">${item.ticker}</span>
                        <span class="pill watch">مراقبة</span>
                    </div>
                    <div class="ticker-details">
                        <div class="detail-item"><span class="detail-label">الثقة:</span> <span class="detail-value">${formatConfidence(item.confidence)}</span></div>
                        <div class="detail-item"><span class="detail-label">الدخول:</span> <span class="detail-value">${item.entry || '—'}</span></div>
                        <div class="detail-item"><span class="detail-label">TP:</span> <span class="detail-value">${item.tp || '—'}</span></div>
                        <div class="detail-item"><span class="detail-label">SL:</span> <span class="detail-value">${item.sl || '—'}</span></div>
                        <div class="detail-item full"><span class="detail-label">السبب:</span> <span class="detail-value">${item.reason || '—'}</span></div>
                    </div>
                </div>
            `;
        });
        top10BottomDiv.innerHTML = html;
    }
}

// حدث تحليل سهم واحد
btnAnalyze.addEventListener('click', async () => {
    const ticker = tickerInput.value.trim();
    if (!ticker) {
        setStatus('الرجاء إدخال رمز السهم', 'error');
        return;
    }
    setStatus('جاري التحليل...', 'info');
    try {
        const response = await fetch(`${API_BASE}/predict?ticker=${encodeURIComponent(ticker)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setStatus('تم التحليل بنجاح', 'success');
        updateSingleResult(data);
    } catch (error) {
        console.error(error);
        setStatus('حدث خطأ في الاتصال بالخادم', 'error');
    }
});

// حدث أفضل 10
btnTop10.addEventListener('click', async () => {
    setStatus('جاري مسح السوق...', 'info');
    try {
        const response = await fetch(`${API_BASE}/top10`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setStatus(`تم المسح: ${data.total_scanned} سهم`, 'success');
        updateTop10(data);
    } catch (error) {
        console.error(error);
        setStatus('حدث خطأ في جلب أفضل 10', 'error');
    }
});

// تحميل أولي (اختياري)
// window.addEventListener('load', () => btnTop10.click());
