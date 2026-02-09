# 🚀 دليل نشر المشروع على Vercel

**التاريخ:** 30 يناير 2026  
**المشروع:** EduHigher Institute

---

## 📋 الخطوات المطلوبة

### **المرحلة 1: إنشاء قاعدة بيانات PostgreSQL (Neon.tech - مجاني)**

#### الخطوة 1: إنشاء حساب على Neon.tech

1. اذهب إلى: https://neon.tech
2. اضغط **"Sign Up"** أو **"Get Started"**
3. سجل باستخدام:
   - GitHub (موصى به)
   - أو Google
   - أو Email

#### الخطوة 2: إنشاء Project جديد

1. بعد التسجيل، اضغط **"New Project"**
2. املأ البيانات:
   ```
   Project Name: sinai-institute
   Database Name: sinai_db
   Region: Frankfurt (الأقرب لمصر)
   PostgreSQL Version: 16 (أحدث إصدار)
   ```
3. اضغط **"Create Project"**

#### الخطوة 3: الحصول على Connection String

1. بعد إنشاء المشروع، ستجد صفحة **"Connection Details"**
2. انسخ **"Connection String"** الكامل
3. يكون بهذا الشكل:
   ```
   postgresql://username:password@ep-xxxx.eu-central-1.aws.neon.tech/sinai_db?sslmode=require
   ```
4. **احفظه في مكان آمن!** (سنستخدمه بعد قليل)

---

### **المرحلة 2: تحديث المشروع للإنتاج**

سيتم تنفيذ هذه الخطوات تلقائياً...

#### ما سيتم عمله:
1. ✅ تحديث `prisma/schema.prisma` لاستخدام PostgreSQL
2. ✅ إنشاء ملف `.env.production` للمتغيرات البيئية
3. ✅ تصدير البيانات من SQLite
4. ✅ استيراد البيانات إلى PostgreSQL
5. ✅ تثبيت Vercel CLI
6. ✅ نشر المشروع على Vercel

---

### **المرحلة 3: النشر على Vercel**

#### سيتم تلقائياً:
1. تسجيل الدخول إلى Vercel باستخدام التوكن
2. إنشاء مشروع جديد
3. رفع المشروع
4. تكوين المتغيرات البيئية
5. النشر

#### ستحصل على:
```
🎉 رابط المشروع على Vercel:
https://sinai-institute.vercel.app
```

---

### **المرحلة 4: ربط Subdomain من Hostgator**

#### الخطوة 1: إنشاء Subdomain على Hostgator

1. **تسجيل الدخول إلى cPanel:**
   - اذهب إلى: https://sinaiinstitute.com/cpanel
   - أدخل بيانات الدخول

2. **إنشاء Subdomain:**
   - ابحث عن **"Subdomains"** في cPanel
   - اضغط عليها
   - املأ البيانات:
     ```
     Subdomain: test
     Domain: sinaiinstitute.com
     Document Root: public_html/test (اتركه كما هو)
     ```
   - اضغط **"Create"**

#### الخطوة 2: إعداد DNS Records

1. **في cPanel، اذهب إلى "Zone Editor"**
2. **ابحث عن `sinaiinstitute.com`**
3. **احذف أي A Record خاص بـ `test.sinaiinstitute.com`** (إن وجد)

4. **أضف CNAME Record جديد:**
   ```
   Type: CNAME
   Name: test
   CNAME: cname.vercel-dns.com
   TTL: 3600 (أو اتركه افتراضي)
   ```
5. اضغط **"Add Record"**

#### الخطوة 3: إضافة Domain في Vercel

1. **افتح مشروعك على Vercel:**
   - اذهب إلى: https://vercel.com/dashboard
   - اختر المشروع `sinai-institute`

2. **اذهب إلى Settings → Domains**

3. **أضف Domain جديد:**
   ```
   test.sinaiinstitute.com
   ```
4. اضغط **"Add"**

5. **Vercel ستتحقق من الـ DNS:**
   - إذا كان صحيح، سيظهر ✅
   - إذا كان خاطئ، سيعطيك تعليمات إضافية

#### الخطوة 4: انتظر التفعيل

- **الوقت المتوقع:** 5-60 دقيقة (حسب سرعة DNS propagation)
- **التحقق:**
  ```bash
  # في Terminal أو CMD:
  nslookup test.sinaiinstitute.com
  
  # يجب أن يظهر:
  Name: test.sinaiinstitute.com
  Address: 76.76.21.21 (Vercel IP)
  ```

#### الخطوة 5: اختبار الموقع

افتح المتصفح:
```
https://test.sinaiinstitute.com
```

**يجب أن يعمل بنجاح! 🎉**

---

### **المرحلة 5: التعديل على المشروع في المستقبل**

#### لتحديث المشروع:

1. **عدّل الملفات كما تريد محلياً**

2. **ارفع التحديثات إلى Vercel:**
   ```bash
   cd /root/cybersecurity/27/eduhigher-institute
   vercel --prod
   ```

3. **سيتم النشر تلقائياً!**

#### ملاحظات مهمة:
- ✅ أي تعديل تعمله هنا يمكن رفعه بأمر واحد
- ✅ Vercel ستبني المشروع تلقائياً
- ✅ التحديث يأخذ 1-3 دقائق فقط
- ✅ لن يتم حذف البيانات (لأنها في Neon.tech)

---

## 🔐 المتغيرات البيئية المطلوبة

سيتم إضافة هذه المتغيرات تلقائياً إلى Vercel:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://test.sinaiinstitute.com"
NEXTAUTH_SECRET="<random-secret-key>"

# Optional: OpenAI (إذا كنت تستخدم AI)
OPENAI_API_KEY="<your-key-if-needed>"
```

---

## 📊 ملخص سريع

### ما تم عمله:
✅ إنشاء قاعدة بيانات PostgreSQL (Neon.tech)  
✅ نقل البيانات من SQLite إلى PostgreSQL  
✅ نشر المشروع على Vercel  
✅ ربط subdomain من Hostgator  

### الروابط النهائية:
- **Vercel:** https://sinai-institute.vercel.app
- **Custom Domain:** https://test.sinaiinstitute.com
- **CMS Dashboard:** https://test.sinaiinstitute.com/cms/dashboard

### بيانات الدخول:
```
Email: admin@sainaiinstitute.com
Password: <الباسورد الحالي>
```

---

## 🆘 استكشاف الأخطاء

### المشكلة 1: Domain لا يعمل
**الحل:**
1. تأكد من CNAME Record صحيح
2. انتظر 15-30 دقيقة للـ DNS propagation
3. امسح cache المتصفح (Ctrl+Shift+Del)
4. جرب Incognito Mode

### المشكلة 2: Database Connection Error
**الحل:**
1. تأكد من `DATABASE_URL` صحيح في Vercel
2. تحقق من أن Neon.tech Database شغال
3. افتح Vercel Dashboard → Settings → Environment Variables

### المشكلة 3: Build Failed
**الحل:**
1. تحقق من Vercel Build Logs
2. تأكد من `npm install` يعمل محلياً
3. تأكد من `npm run build` يعمل محلياً

---

## 📞 الدعم

إذا واجهت أي مشكلة، تحقق من:
- Vercel Logs: https://vercel.com/dashboard
- Neon.tech Console: https://console.neon.tech
- Hostgator cPanel: https://sinaiinstitute.com/cpanel

---

**آخر تحديث:** 30 يناير 2026  
**الحالة:** ✅ جاهز للتنفيذ
