# ربط Google Sheets بدون Google Cloud Console

هذه الطريقة تعمل في العراق وأي بلد بدون الحاجة لـ Google Cloud Console.

## الخطوة 1: افتح ملف Google Sheets الخاص بك

افتح ملف Google Sheets الذي تريد استخدامه لحفظ بيانات المرضى.

## الخطوة 2: افتح Apps Script

1. من القائمة العلوية، اضغط على **إضافات** (Extensions)
2. اختر **Apps Script**
3. سيفتح نافذة جديدة

## الخطوة 3: انسخ والصق الكود التالي

احذف أي كود موجود والصق هذا الكود:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('المرضى');
    
    // إذا لم يوجد الشيت، أنشئه
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('المرضى');
      // أضف العناوين
      sheet.getRange(1, 1, 1, 21).setValues([[
        'رقم السجل', 'الاسم', 'العمر', 'السكن', 'الهاتف',
        'اسم الطبيب', 'التشخيص', 'طلب الطبيب', 'هل يوجد عملية', 'نوع العملية',
        'نوع الرعاية', 'عدد الجلسات', 'سعر الجلسة', 'المساند الطبية', 'سعر المساند',
        'النظام الغذائي', 'خدمات أخرى', 'سعر الخدمات الأخرى', 'المبلغ الكلي', 'المبلغ المستلم', 'المتبقي'
      ]]);
    }
    
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === 'delete') {
      // حذف المريض
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({success: true}));
    }
    
    if (data.action === 'sync_all') {
      // مسح كل البيانات ما عدا العناوين
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 21).clear();
      }
      
      // إضافة كل المرضى
      var patients = data.patients;
      for (var i = 0; i < patients.length; i++) {
        var p = patients[i];
        sheet.appendRow([
          p.id, p.patientName, p.age, p.residence, p.phone,
          p.doctorName, p.diagnosis, p.doctorRequest, p.hasSurgery, p.surgeryType,
          p.careType, p.sessionCount, p.sessionPrice, p.aidType, p.aidPrice,
          p.dietPlan, p.otherServiceType, p.otherServicePrice, p.totalAmount, p.totalReceived, p.remaining
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({success: true}));
    }
    
    // إضافة أو تحديث مريض
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] == data.id) {
        rowIndex = i + 1;
        break;
      }
    }
    
    var rowData = [
      data.id, data.patientName, data.age, data.residence, data.phone,
      data.doctorName, data.diagnosis, data.doctorRequest, data.hasSurgery, data.surgeryType,
      data.careType, data.sessionCount, data.sessionPrice, data.aidType, data.aidPrice,
      data.dietPlan, data.otherServiceType, data.otherServicePrice, data.totalAmount, data.totalReceived, data.remaining
    ];
    
    if (rowIndex > 0) {
      // تحديث صف موجود
      sheet.getRange(rowIndex, 1, 1, 21).setValues([rowData]);
    } else {
      // إضافة صف جديد
      sheet.appendRow(rowData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: true}));
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()}));
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Webhook is working!');
}
```

## الخطوة 4: نشر كـ Web App

1. اضغط على زر **نشر** (Deploy) في الأعلى
2. اختر **نشر جديد** (New deployment)
3. اضغط على رمز الترس ⚙️ واختر **تطبيق ويب** (Web app)
4. في الإعدادات:
   - **الوصف**: Patient Management Webhook
   - **تنفيذ كـ**: أنا (Me)
   - **من يمكنه الوصول**: أي شخص (Anyone)
5. اضغط **نشر** (Deploy)
6. اضغط **السماح بالوصول** (Authorize access) إذا طُلب
7. **انسخ رابط Web App** الذي يظهر (يبدأ بـ https://script.google.com/...)

## الخطوة 5: أضف الرابط في Render

1. اذهب إلى [dashboard.render.com](https://dashboard.render.com)
2. اختر تطبيقك
3. اذهب إلى **Environment**
4. أضف متغير جديد:
   | Key | Value |
   |-----|-------|
   | GOOGLE_SHEETS_WEBHOOK_URL | (الصق رابط Web App هنا) |
5. اضغط **Save Changes**
6. اذهب إلى **Manual Deploy** → **Clear cache & deploy**

## اختبار

بعد النشر، جرب إضافة مريض جديد. يجب أن يظهر في ملف Google Sheets تلقائياً!

---

## ملاحظات مهمة

- الرابط يبقى صالحاً حتى تحذف المشروع من Apps Script
- إذا غيرت الكود، يجب عمل **نشر جديد** (New deployment) للحصول على رابط جديد
- هذه الطريقة آمنة ومجانية
