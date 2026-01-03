# دليل النشر على Render.com

## الخطوة 1: إنشاء حساب Google Service Account

### 1.1 الذهاب لـ Google Cloud Console
1. اذهب إلى: https://console.cloud.google.com
2. أنشئ مشروع جديد أو اختر مشروع موجود

### 1.2 تفعيل APIs
1. اذهب إلى **APIs & Services** > **Library**
2. ابحث عن وفعّل:
   - **Google Sheets API**
   - **Google Drive API**

### 1.3 إنشاء Service Account
1. اذهب إلى **APIs & Services** > **Credentials**
2. اضغط **Create Credentials** > **Service Account**
3. أدخل اسم مثل: `alsayer-sheets-sync`
4. اضغط **Create and Continue**
5. اضغط **Done**

### 1.4 إنشاء مفتاح JSON
1. اضغط على Service Account الذي أنشأته
2. اذهب لتاب **Keys**
3. اضغط **Add Key** > **Create new key**
4. اختر **JSON** واضغط **Create**
5. احفظ ملف JSON الذي يتم تحميله

### 1.5 مشاركة Google Sheet
1. افتح ملف JSON وانسخ `client_email`
2. اذهب لملف Google Sheets الخاص بالمرضى
3. اضغط **Share** وأضف البريد الإلكتروني بصلاحيات **Editor**

---

## الخطوة 2: تصدير البيانات من Replit

> **تحذير أمني**: لا تحفظ ملف النسخة الاحتياطية في Git! البيانات الطبية حساسة.

### 2.1 تصدير قاعدة البيانات
في Replit Shell، شغّل:
```bash
pg_dump $DATABASE_URL > backup.sql
```

### 2.2 تحميل الملف
1. انقر يمين على `backup.sql` واختر **Download**
2. **مهم**: احذف الملف من Replit بعد التحميل:
```bash
rm backup.sql
```

---

## الخطوة 3: إعداد Render.com

### 3.1 إنشاء حساب
1. اذهب إلى: https://render.com
2. سجّل بحساب GitHub

### 3.2 ربط المشروع
1. اضغط **New** > **Web Service**
2. اربط GitHub repo أو استخدم **Deploy from Git URL**
3. أدخل رابط المشروع

### 3.3 إعداد الخدمة
- **Name**: alsayer-patient-management
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free (أو Starter بـ $7/شهر للعمل الدائم)

### 3.4 إنشاء قاعدة البيانات
1. اذهب لـ **New** > **PostgreSQL**
2. اختر **Free** plan
3. احفظ **Internal Database URL**

### 3.5 إضافة Environment Variables
في صفحة الخدمة، اذهب لـ **Environment**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | رابط قاعدة البيانات من Render |
| `TELEGRAM_BOT_TOKEN` | توكن البوت من @BotFather |
| `TELEGRAM_CHAT_ID` | معرف الشات |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | محتوى ملف JSON (سطر واحد) |
| `GOOGLE_SPREADSHEET_ID` | معرف ملف Google Sheets (اختياري) |

### 3.6 تحويل JSON لسطر واحد
```bash
cat service-account.json | tr -d '\n'
```
أو استخدم: https://www.textfixer.com/tools/remove-line-breaks.php

---

## الخطوة 4: استيراد البيانات

### 4.1 الاتصال بقاعدة البيانات الجديدة
استخدم **External Database URL** من Render:
```bash
psql "postgres://user:password@host:port/database"
```

### 4.2 استيراد البيانات
```bash
psql "RENDER_DATABASE_URL" < backup.sql
```

---

## الخطوة 5: النشر

1. اضغط **Manual Deploy** > **Deploy latest commit**
2. انتظر اكتمال البناء
3. افتح الرابط المُعطى

---

## ملاحظات مهمة

### الخطة المجانية (Free)
- التطبيق "ينام" بعد 15 دقيقة من عدم الاستخدام
- يستيقظ عند أول طلب (قد يأخذ 30 ثانية)
- مناسب للاستخدام الخفيف

### الخطة المدفوعة (Starter - $7/شهر)
- التطبيق يعمل 24/7 بدون توقف
- أفضل للاستخدام المستمر

---

## التكلفة الشهرية التقديرية

| الخدمة | المجاني | المدفوع |
|--------|---------|---------|
| Web Service | $0 (ينام) | $7/شهر |
| PostgreSQL | $0 (محدود) | $7/شهر |
| **المجموع** | **$0** | **$14/شهر** |

---

## استكشاف الأخطاء

### التطبيق لا يعمل
- تحقق من **Logs** في Render Dashboard
- تأكد من صحة `DATABASE_URL`

### Google Sheets لا يعمل
- تأكد من مشاركة الملف مع Service Account email
- تحقق من صحة `GOOGLE_SERVICE_ACCOUNT_KEY`

### Telegram لا يعمل
- تأكد من صحة `TELEGRAM_BOT_TOKEN`
- تأكد أن البوت مضاف للمجموعة
