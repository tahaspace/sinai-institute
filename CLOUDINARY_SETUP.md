# 🔑 إعداد Cloudinary - دليل سريع

---

## 📝 **الخطوات:**

### **1️⃣ إنشاء حساب مجاني:**

1. افتح: https://cloudinary.com/users/register_free
2. املأ البيانات:
   - Email: `mohamed.taha.abdelsalam@gmail.com`
   - Password: (اختر كلمة مرور قوية)
   - Cloud Name: `sinai-institute` (أو أي اسم تريده)
3. اضغط "Create Account"
4. تحقق من البريد الإلكتروني وفعّل الحساب

---

### **2️⃣ الحصول على API Keys:**

بعد تسجيل الدخول:

1. ستجد في Dashboard الرئيسية:
   ```
   Cloud Name: sinai-institute
   API Key: [رقم طويل]
   API Secret: [نص عشوائي]
   ```

2. انسخ هذه القيم الثلاثة

---

### **3️⃣ إضافة Environment Variables محلياً:**

في ملف `.env`:
```env
CLOUDINARY_CLOUD_NAME=sinai-institute
CLOUDINARY_API_KEY=YOUR_API_KEY_HERE
CLOUDINARY_API_SECRET=YOUR_API_SECRET_HERE
```

---

### **4️⃣ إضافة Environment Variables في Vercel:**

1. افتح: https://vercel.com/tahaspaces-projects/sinai-institute/settings/environment-variables
2. أضف المتغيرات الثلاثة:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. اختر Environment: **Production**, **Preview**, **Development**
4. اضغط "Save"

---

## ⚡ **بعد الإعداد:**

سأقوم بالنشر على Vercel وسيعمل رفع الصور فوراً! ✅

---

**ملاحظة:** Cloudinary مجاني لحد:
- ✅ 25 GB storage
- ✅ 25 GB bandwidth/month
- ✅ غير محدود من التحميلات
