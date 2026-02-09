# ⚡ مرجع سريع - معهد سيناء

**للتوثيق الكامل، اقرأ:** `COMPLETE_DEPLOYMENT_GUIDE.md`

---

## 🔗 الروابط المهمة

### الموقع:
```
Production: https://test.sinaiinstitute.com
Alternative: https://sinai-institute.vercel.app
CMS: https://test.sinaiinstitute.com/cms/dashboard
Login: https://test.sinaiinstitute.com/login
```

### لوحات التحكم:
```
Vercel: https://vercel.com/tahaspaces-projects/sinai-institute
Neon.tech: https://console.neon.tech
A2Hosting: https://my.a2hosting.com
```

---

## 🔐 بيانات الاتصال

### قاعدة البيانات (Neon.tech):
```
Host: ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech
Database: neondb
User: neondb_owner
Password: npg_bVGvuJfK51gx
Port: 5432

Connection String:
postgresql://neondb_owner:npg_bVGvuJfK51gx@ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### Vercel:
```
Token: UyqoZ6rn8p2kDRuBbkbFVIuQ
Account: tahaspace
Project: sinai-institute
```

### CMS Login:
```
Email: admin@sainaiinstitute.com
Password: [محمي]
```

---

## 🚀 أوامر سريعة

### تحديث المشروع:
```bash
cd /root/cybersecurity/27/eduhigher-institute
vercel --token UyqoZ6rn8p2kDRuBbkbFVIuQ --prod
```

### الاتصال بقاعدة البيانات:
```bash
psql "postgresql://neondb_owner:npg_bVGvuJfK51gx@ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

### Prisma:
```bash
# توليد Client
npx prisma generate

# مزامنة Schema
npx prisma db push

# فتح Studio
npx prisma studio
```

### DNS Check:
```bash
nslookup test.sinaiinstitute.com
```

---

## 🛠️ استكشاف الأخطاء

### المشكلة: الموقع لا يعمل
```bash
# تحقق من Deployment Status
vercel ls --token UyqoZ6rn8p2kDRuBbkbFVIuQ

# راجع Logs
vercel logs --token UyqoZ6rn8p2kDRuBbkbFVIuQ
```

### المشكلة: Database Connection Error
```bash
# اختبر الاتصال
psql "postgresql://..."

# تحقق من Environment Variables في Vercel Dashboard
```

### المشكلة: DNS لا يعمل
```bash
# تحقق من DNS
nslookup test.sinaiinstitute.com

# انتظر 5-30 دقيقة للـ DNS Propagation
```

---

## 📊 الملفات المهمة

```
eduhigher-institute/
├── .env                          # Development environment
├── .env.production               # Production environment
├── vercel.json                   # Vercel configuration
├── prisma/schema.prisma          # Database schema
├── COMPLETE_DEPLOYMENT_GUIDE.md  # دليل كامل
├── DEPLOYMENT_SUCCESS.md         # تقرير النشر
└── QUICK_REFERENCE.md           # هذا الملف
```

---

## 🔄 سير العمل

### إضافة ميزة جديدة:
```bash
1. تعديل الكود محلياً
2. اختبار: npm run dev
3. بناء: npm run build
4. نشر: vercel --prod
```

### تحديث قاعدة البيانات:
```bash
1. تعديل prisma/schema.prisma
2. npx prisma db push
3. npx prisma generate
4. vercel --prod
```

---

## ⚠️ ملاحظات مهمة

1. ✅ الـ DNS مُدار في **A2Hosting** وليس Hostgator
2. ✅ Nameservers تشير إلى A2Hosting
3. ✅ TypeScript checking معطل في Production
4. ✅ Prisma generate يعمل تلقائياً عند Build

---

**آخر تحديث:** 30 يناير 2026
