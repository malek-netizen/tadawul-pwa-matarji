# generate_tickers_sa.py
# يولّد tickers_sa.txt من قائمة Saudi Stock Exchange في stockanalysis.com
# المصدر يعرض رموز الأسهم مثل 2222, 1120 ... إلخ
# ثم نحفظها كسطور أرقام فقط (بدون .SR)

import re
import requests
from bs4 import BeautifulSoup

URL = "https://stockanalysis.com/list/saudi-stock-exchange/"

def main():
    html = requests.get(URL, timeout=30).text
    soup = BeautifulSoup(html, "html.parser")

    # الصفحة فيها جدول؛ نستخرج العمود الخاص بالـ Symbol
    # عادة يكون أول عمود بعد الترتيب
    rows = soup.select("table tbody tr")
    symbols = []

    for r in rows:
        cols = [c.get_text(strip=True) for c in r.select("td")]
        if not cols:
            continue

        # نحاول التقاط الرمز: يكون غالبًا مثل "2222"
        # في بعض الأحيان قد يظهر مع نص إضافي، لذلك نستعمل regex
        m = re.search(r"\b(\d{3,5})\b", " ".join(cols[:2]))
        if m:
            symbols.append(m.group(1))

    # إزالة المكرر مع الحفاظ على الترتيب
    seen = set()
    uniq = []
    for s in symbols:
        if s not in seen:
            seen.add(s)
            uniq.append(s)

    if not uniq:
        raise SystemExit("No tickers parsed. Page structure may have changed.")

    with open("tickers_sa.txt", "w", encoding="utf-8") as f:
        for s in uniq:
            f.write(s + "\n")

    print(f"Saved tickers_sa.txt with {len(uniq)} tickers.")

if __name__ == "__main__":
    main()
