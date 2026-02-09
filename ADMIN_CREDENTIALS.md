# 🔐 بيانات الدخول - حساب Admin

## معلومات تسجيل الدخول:

```
البريد الإلكتروني: admin@sainaiinstitute.com
كلمة المرور: admin123
الصلاحيات: SUPER_ADMIN (كل الصلاحيات)
```

## صفحة الدخول:

```
http://localhost:3001/login
```

---

## ملاحظة مهمة:

قاعدة البيانات MySQL تواجه مشكلة authentication حالياً.

**للاختبار الآن:**
- يمكنك استخدام الموقع كـ **Frontend Only** (بدون database)
- صفحة التقديم `/apply` تعمل بشكل كامل
- لكن الـ CMS `/cms` يحتاج قاعدة بيانات

**لإصلاح MySQL:**
```bash
# إعادة تعيين MySQL root password
sudo systemctl stop mysql
sudo mysqld_safe --skip-grant-tables &
mysql -u root
# في MySQL:
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
FLUSH PRIVILEGES;
EXIT;
# ثم:
sudo systemctl restart mysql
```

---

## بديل: استخدام Mock Login (مؤقت)

في ملف `lib/auth.ts` يمكن إضافة hardcoded users للتطوير:

```typescript
if (credentials.email === 'admin@sainaiinstitute.com' && 
    credentials.password === 'admin123') {
  return {
    id: 'temp-admin',
    email: 'admin@sainaiinstitute.com',
    name: 'Super Admin',
    role: 'SUPER_ADMIN'
  };
}
```

الملف: `/root/cybersecurity/27/eduhigher-institute/ADMIN_CREDENTIALS.md`
