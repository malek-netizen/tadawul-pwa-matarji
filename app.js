// ملف app.js للواجهة الأمامية - يدعم ثلاث استراتيجيات (صعود، قيعان، AI)
const API_BASE = 'https://tadawul-mvp-api.onrender.com'; // أو الرابط المباشر

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
const top10AiDiv = document.getElementById('top10Ai');
const top10RawJsonPre = document.getElementById('top10RawJson');

// دالة مساعدة لعرض حالة النشاط
function setStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// دالة لتنسيق الثقة
function formatConfidence(value) {
    if (value === undefined || value === null || value === 0) return '—';
    if (value > 1) return value.toFixed(1) + '%';
    return (value * 100).toFixed(1) + '%';
}

// دالة لتحديث نتيجة سهم واحد (تعرض أسباب جميع الاستراتيجيات)
function updateSingleResult(data) {
    resultSection.classList.remove('hidden');
    console.log('بيانات السهم:', data);

    // دالة مساعدة لبناء نص الأسباب
    const buildReason = (strategy) => {
        if (strategy.status === 'APPROVED') {
            return `✅ ${strategy.reason} (ثقة: ${formatConfidence(strategy.confidence)})`;
        } else {
            return `❌ ${strategy.reason}`;
        }
    };

    // تجميع الأسباب من الاستراتيجيات الثلاث
    const reasons = [
        `📊 شروط المتوسطات: ${buildReason(data.uptrend)}`,
        `🎯 صيد القيعان: ${buildReason(data.bottom)}`,
        `🤖 الذكاء الاصطناعي: ${buildReason(data.ai)}`
    ].join(' | ');

    // نحدد التوصية الرئيسية (مثلاً إذا كانت أي استراتيجية APPROVED نعرض شراء)
    const anyApproved = data.uptrend.status === 'APPROVED' || data.bottom.status === 'APPROVED' || data.ai.status === 'APPROVED';
    pillDiv.textContent = anyApproved ? 'شراء' : 'لا يوجد';
    pillDiv.className = anyApproved ? 'pill buy' : 'pill no-trade';

    // نعرض أول استراتيجية كبيانات رقمية (يمكن عرض أي منها)
    const primary = data.uptrend.status === 'APPROVED' ? data.uptrend : (data.bottom.status === 'APPROVED' ? data.bottom : data.ai);
    confidenceSpan.textContent = formatConfidence(primary.confidence);
    entrySpan.textContent = primary.entry ?? '—';
    tpSpan.textContent = primary.tp ?? '—';
    slSpan.textContent = primary.sl ?? '—';
    reasonSpan.textContent = reasons;  // عرض الأسباب المجمعة
    lastCloseSpan.textContent = data.lastClose ?? '—';

    // عرض JSON الخام
    rawJsonPre.textContent = JSON.stringify(data, null, 2);
}

// دالة لتحديث قائمة أفضل 10 (ثلاث قوائم)
function updateTop10(data) {
    top10Section.classList.remove('hidden');
    top10RawJsonPre.textContent = JSON.stringify(data, null, 2);

    // دالة مساعدة لإنشاء بطاقات القائمة
    const renderList = (list, container, title) => {
        if (!list || list.length === 0) {
            container.innerHTML = `<h4>${title}</h4><p class="no-data">لا توجد فرص حالياً</p>`;
            return;
        }
        let html = `<h4>${title}</h4>`;
        list.forEach(item => {
            html += `
                <div class="ticker-card">
                    <div class="ticker-header">
                        <span class="ticker-symbol">${item.ticker}</span>
                        <span class="pill buy">فرصة</span>
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
        container.innerHTML = html;
    };

    renderList(data.uptrend, top10UptrendDiv, '📊 شروط المتوسطات');
    renderList(data.bottom, top10BottomDiv, '🎯 صيد القيعان');
    renderList(data.ai, top10AiDiv, '🤖 الذكاء الاصطناعي');
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
