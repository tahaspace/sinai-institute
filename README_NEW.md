# 🎓 معهد سيناء العالي للدراسات النوعية

## EduHigher Institute Platform

منصة تعليمية حديثة مبنية بـ Next.js لمؤسسات التعليم العالي.

**الحالة:** ✅ **مُنشر ويعمل بنجاح على Production**

---

## 🌐 الروابط المباشرة

### **الموقع المباشر:**
🔗 **https://test.sinaiinstitute.com**

### **لوحة التحكم (CMS):**
🔗 **https://test.sinaiinstitute.com/cms/dashboard**

### **Vercel Dashboard:**
🔗 **https://vercel.com/tahaspaces-projects/sinai-institute**

### **Database (Neon.tech):**
🔗 **https://console.neon.tech**

---

## 📚 التوثيق الكامل

### 🚀 **للبدء السريع:**
👉 اقرأ: **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)**
- روابط مهمة، أوامر سريعة، بيانات الاتصال

### 📘 **الدليل الشامل:**
👉 اقرأ: **[COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)**
- كل شيء من البداية للنهاية، المشاكل والحلول

### 🏗️ **البنية التقنية:**
👉 اقرأ: **[ARCHITECTURE.md](./ARCHITECTURE.md)**
- رسومات البنية، تدفق البيانات، Schema

### 📊 **تقرير النشر:**
👉 اقرأ: **[DEPLOYMENT_SUCCESS.md](./DEPLOYMENT_SUCCESS.md)**
- ملخص النشر، Checklist، استكشاف أخطاء

### 📖 **فهرس التوثيق:**
👉 اقرأ: **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)**
- دليل لجميع ملفات التوثيق

---

## 🛠️ التقنيات المستخدمة

- **Frontend:** Next.js 16.1.5, React 19, Tailwind CSS
- **Backend:** Next.js API Routes, NextAuth.js
- **Database:** PostgreSQL (Neon.tech)
- **ORM:** Prisma 5.22.0
- **CMS:** GrapesJS, Tiptap
- **Deployment:** Vercel
- **CDN:** Vercel Edge Network

---

## ⚡ البدء السريع

### تشغيل محلي (Development):

```bash
# 1. تثبيت Dependencies
npm install

# 2. تكوين Environment Variables
cp .env.example .env
# عدّل .env بقيم قاعدة البيانات

# 3. مزامنة Database
npx prisma db push
npx prisma generate

# 4. تشغيل Development Server
npm run dev
```

**الموقع المحلي:** http://localhost:3001

---

## 🚀 النشر على Production

### تحديث المشروع على Vercel:

```bash
cd /root/cybersecurity/27/eduhigher-institute
vercel --prod
```

**للتفاصيل الكاملة:** راجع [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)

---

## 📊 البنية التحتية

```
sinaiinstitute.com (Hostgator)
  │
  ├─> Main: sinaiinstitute.com → A2Hosting
  │
  └─> Subdomain: test.sinaiinstitute.com → Vercel
                                           │
                                           ├─> Next.js App
                                           └─> Neon PostgreSQL
```

---

## 🔐 الأمان

- ✅ HTTPS/SSL (Auto-managed by Vercel)
- ✅ Database: SSL/TLS required
- ✅ Passwords: bcrypt hashing
- ✅ Environment Variables: Encrypted in Vercel
- ✅ No credentials exposed in code

---

## 📝 الميزات الرئيسية

### ✅ نظام إدارة المحتوى (CMS):
- إدارة الصفحات مع GrapesJS
- محرر نصوص متقدم (Tiptap)
- إدارة الأخبار والأقسام
- نظام الأذونات (Roles)

### ✅ البوابة التعليمية:
- التسجيل والالتحاق
- عرض النتائج والجداول
- نظام التقديم الإلكتروني
- إدارة الشكاوى

### ✅ لوحات التحكم:
- Dashboard للطلاب
- Dashboard للإداريين
- Dashboard للمعهد
- Dashboard لأولياء الأمور

### ✅ مزايا تقنية:
- Responsive Design (Mobile-first)
- RTL Support (Arabic)
- SEO Optimized
- PWA Ready

---

## 📊 قاعدة البيانات

### الجداول الرئيسية:
- **Users:** مستخدمي CMS
- **Pages:** الصفحات الديناميكية
- **Departments:** الأقسام الأكاديمية
- **News:** الأخبار والفعاليات
- **Applications:** طلبات التقديم
- **Complaints:** الشكاوى والاقتراحات
- ... (12+ جدول آخر)

**للتفاصيل:** راجع [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🔄 التحديثات والصيانة

### أوامر Prisma:
```bash
# توليد Prisma Client
npx prisma generate

# مزامنة Schema
npx prisma db push

# فتح Prisma Studio
npx prisma studio
```

### التحقق من DNS:
```bash
nslookup test.sinaiinstitute.com
```

**للمزيد:** راجع [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

## 🆘 استكشاف الأخطاء

### مشكلة شائعة: Build Failed
```bash
# تحقق من Logs
vercel logs

# أعد البناء محلياً
npm run build
```

### مشكلة: Database Connection
```bash
# اختبر الاتصال
psql "postgresql://..."
```

**للمزيد:** راجع [DEPLOYMENT_SUCCESS.md](./DEPLOYMENT_SUCCESS.md) - قسم "استكشاف الأخطاء"

---

## 📞 الدعم والمساعدة

### الوثائق:
- [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md) - دليل شامل
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - مرجع سريع
- [ARCHITECTURE.md](./ARCHITECTURE.md) - البنية التقنية

### المراجع الخارجية:
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Neon.tech Docs](https://neon.tech/docs)

---

## 📈 الحالة الحالية

| المكون | الحالة |
|--------|--------|
| Website | ✅ Live |
| CMS Dashboard | ✅ Working |
| Database | ✅ Connected |
| SSL/HTTPS | ✅ Active |
| Custom Domain | ✅ Configured |
| Backups | ⚠️ Manual |

**آخر نشر:** 30 يناير 2026  
**الإصدار:** 1.0.0  
**Build Status:** ✅ Passing

---

## 🎉 الإنجازات

- ✅ نشر ناجح على Vercel
- ✅ قاعدة بيانات PostgreSQL (Neon.tech)
- ✅ نقل كامل للبيانات (22 سجل)
- ✅ ربط subdomain من A2Hosting
- ✅ إصلاحات أمنية
- ✅ توثيق شامل (5+ ملفات)
- ✅ CMS جاهز للاستخدام
- ✅ Performance Optimized

---

## 👥 الفريق

**المطور:** Mohamed Taha  
**المنظمة:** Smart Innovation  
**المشروع:** معهد سيناء العالي  

---

## 📄 الترخيص

هذا المشروع خاص بمعهد سيناء العالي للدراسات النوعية.

---

## 🌟 مواصفات تقنية

```javascript
{
  "name": "eduhigher-institute",
  "version": "1.0.0",
  "status": "✅ Production",
  "framework": "Next.js 16.1.5",
  "database": "PostgreSQL 16",
  "hosting": "Vercel",
  "domain": "test.sinaiinstitute.com"
}
```

---

**🎓 معهد سيناء العالي للدراسات النوعية**  
**Powered by Smart Innovation**  
**© 2026 - All Rights Reserved**
