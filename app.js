// ملف app.js للواجهة الأمامية - نسخة محسنة للتوافق

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
const top10ListDiv = document.getElementById('top10List');
const top10RawJsonPre = document.getElementById('top10RawJson');

// عنوان API (يستخدم نفس النطاق)
const API_BASE = 'https://tadawul-mvp-api.onrender.com';

// دالة مساعدة لعرض حالة النشاط
function setStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// دالة لاستخراج نص التوصية من البيانات
function getRecommendationText(data) {
    if (data.recommendation === 'BUY') return 'شراء';
    if (data.status === 'APPROVED') return 'مراقبة'; // إذا لم يكن recommendation موجودًا
    return 'لا يوجد';
}

// دالة لاستخراج قيمة الثقة بشكل صحيح
function formatConfidence(value) {
    if (value === undefined || value === null) return '—';
    // إذا كانت القيمة أكبر من 1، نفترض أنها نسبة مئوية (مثل 76.66)
    if (value > 1) return value.toFixed(1) + '%';
    // إذا كانت أقل من 1، نفترض أنها كسر عشري (مثل 0.7666) ونحولها لنسبة
    return (value * 100).toFixed(1) + '%';
}

// دالة لتحديث عناصر نتيجة سهم واحد
function updateSingleResult(data) {
    // إظهار القسم
    resultSection.classList.remove('hidden');

    // تحديث الحبة (Pill)
    pillDiv.textContent = getRecommendationText(data);
    if (data.recommendation === 'BUY' || (data.status === 'APPROVED' && !data.recommendation)) {
        pillDiv.className = 'pill buy';
    } else if (data.status === 'APPROVED') {
        pillDiv.className = 'pill watch';
    } else {
        pillDiv.className = 'pill no-trade';
    }

    // تحديث الحقول مع التأكد من وجود القيم
    confidenceSpan.textContent = formatConfidence(data.confidence);
    entrySpan.textContent = data.entry ?? '—';
    tpSpan.textContent = data.tp ?? '—';
    slSpan.textContent = data.sl ?? '—';
    reasonSpan.textContent = data.reason || '—';
    lastCloseSpan.textContent = data.lastClose ?? '—';

    // عرض JSON الخام
    rawJsonPre.textContent = JSON.stringify(data, null, 2);
}

// دالة لتحديث قائمة أفضل 10
function updateTop10(data) {
    top10Section.classList.remove('hidden');

    // تحديث JSON الخام
    top10RawJsonPre.textContent = JSON.stringify(data, null, 2);

    // بناء عناصر HTML لكل سهم
    if (!data.items || data.items.length === 0) {
        top10ListDiv.innerHTML = '<p class="no-data">لا توجد فرص حالياً</p>';
        return;
    }

    let html = '';
    data.items.forEach(item => {
        // تحديد نص ولون الحبة
        const pillText = getRecommendationText(item);
        let pillClass = 'pill ';
        if (item.recommendation === 'BUY' || (item.status === 'APPROVED' && !item.recommendation)) {
            pillClass += 'buy';
        } else if (item.status === 'APPROVED') {
            pillClass += 'watch';
        } else {
            pillClass += 'no-trade';
        }

        html += `
            <div class="ticker-card">
                <div class="ticker-header">
                    <span class="ticker-symbol">${item.ticker}</span>
                    <span class="${pillClass}">${pillText}</span>
                </div>
                <div class="ticker-details">
                    <div class="detail-item">
                        <span class="detail-label">الثقة:</span>
                        <span class="detail-value">${formatConfidence(item.confidence)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">الدخول:</span>
                        <span class="detail-value">${item.entry ?? '—'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">TP:</span>
                        <span class="detail-value">${item.tp ?? '—'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">SL:</span>
                        <span class="detail-value">${item.sl ?? '—'}</span>
                    </div>
                    <div class="detail-item full">
                        <span class="detail-label">السبب:</span>
                        <span class="detail-value">${item.reason || '—'}</span>
                    </div>
                </div>
            </div>
        `;
    });
    top10ListDiv.innerHTML = html;
}

// ==================== حدث تحليل سهم واحد ====================
btnAnalyze.addEventListener('click', async () => {
    const ticker = tickerInput.value.trim();
    if (!ticker) {
        setStatus('الرجاء إدخال رمز السهم', 'error');
        return;
    }

    setStatus('جاري التحليل...', 'info');
    try {
        const response = await fetch(`${API_BASE}/predict?ticker=${encodeURIComponent(ticker)}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setStatus('تم التحليل بنجاح', 'success');
        updateSingleResult(data);
    } catch (error) {
        console.error(error);
        setStatus('حدث خطأ في الاتصال بالخادم', 'error');
    }
});

// ==================== حدث أفضل 10 ====================
btnTop10.addEventListener('click', async () => {
    setStatus('جاري مسح السوق...', 'info');
    try {
        const response = await fetch(`${API_BASE}/top10`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setStatus(`تم المسح: ${data.total_scanned} سهم`, 'success');
        updateTop10(data);
    } catch (error) {
        console.error(error);
        setStatus('حدث خطأ في جلب أفضل 10', 'error');
    }
});

// تحميل أولي (اختياري) - يمكنك تفعيله إذا أردت
// window.addEventListener('load', () => {
//     btnTop10.click();
// });
