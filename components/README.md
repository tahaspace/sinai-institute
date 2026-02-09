# 📦 EduSaas Components Library

هذا الدليل يوثق جميع المكونات المستخدمة في منصة EduSaas.

## 📁 هيكل المجلدات

```
components/
├── ui/                    # مكونات واجهة المستخدم الأساسية (shadcn/ui)
├── forms/                 # مكونات النماذج المخصصة
├── layouts/               # مكونات التخطيط
├── shared/                # مكونات مشتركة
├── providers/             # مزودي السياق
└── seo/                   # مكونات تحسين محركات البحث
```

---

## 🎨 مكونات UI الأساسية

### Button
```tsx
import { Button } from "@/components/ui/button"

<Button variant="default" size="md">
  انقر هنا
</Button>
```

#### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | نمط الزر |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | حجم الزر |
| `disabled` | `boolean` | `false` | تعطيل الزر |
| `asChild` | `boolean` | `false` | استخدام العنصر الابن |

---

### Input
```tsx
import { Input } from "@/components/ui/input"

<Input type="text" placeholder="أدخل النص" />
```

---

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>عنوان البطاقة</CardTitle>
  </CardHeader>
  <CardContent>
    محتوى البطاقة
  </CardContent>
</Card>
```

---

## 📝 مكونات النماذج المخصصة

### PasswordInput
```tsx
import { PasswordInput } from "@/components/forms/password-input"

<PasswordInput
  showStrength
  onChange={(value) => console.log(value)}
/>
```

### PhoneInput
```tsx
import { PhoneInput } from "@/components/forms/phone-input"

<PhoneInput
  countryCode="+20"
  onChange={(value) => console.log(value)}
/>
```

### CurrencyInput
```tsx
import { CurrencyInput } from "@/components/forms/currency-input"

<CurrencyInput
  currency="EGP"
  onChange={(value) => console.log(value)}
/>
```

---

## 🏗️ مكونات التخطيط

### PublicHeader
Header للصفحات العامة مع شعار وقائمة تنقل.

### PublicFooter
Footer للصفحات العامة مع روابط وحقوق النشر.

### DashboardSidebar
Sidebar قابل للطي للوحات التحكم.

### DashboardHeader
Header للوحات التحكم مع بحث وإشعارات.

---

## ♿ مكونات إمكانية الوصول

### SkipToContent
```tsx
import { SkipToContent } from "@/components/ui/accessibility"

<SkipToContent targetId="main-content" />
```

### VisuallyHidden
```tsx
import { VisuallyHidden } from "@/components/ui/accessibility"

<VisuallyHidden>نص مخفي للقراء الشاشة</VisuallyHidden>
```

### FocusTrap
```tsx
import { FocusTrap } from "@/components/ui/accessibility"

<FocusTrap active={isModalOpen}>
  <div>محتوى Modal</div>
</FocusTrap>
```

---

## 🚀 مكونات الأداء

### LazyLoad
```tsx
import { LazyLoad } from "@/components/ui/performance"

<LazyLoad threshold={0.5}>
  <HeavyComponent />
</LazyLoad>
```

### OptimizedImage
```tsx
import { OptimizedImage } from "@/components/ui/performance"

<OptimizedImage
  src="/image.jpg"
  alt="وصف الصورة"
  width={800}
  height={600}
/>
```

### VirtualList
```tsx
import { VirtualList } from "@/components/ui/performance"

<VirtualList
  items={data}
  itemHeight={50}
  containerHeight={400}
  renderItem={(item) => <ListItem item={item} />}
/>
```

---

## 📱 مكونات التصميم المتجاوب

### ResponsiveContainer
```tsx
import { ResponsiveContainer } from "@/components/ui/responsive-container"

<ResponsiveContainer maxWidth="xl" padding="md">
  محتوى
</ResponsiveContainer>
```

### ResponsiveGrid
```tsx
import { ResponsiveGrid } from "@/components/ui/responsive-container"

<ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }}>
  <div>عنصر 1</div>
  <div>عنصر 2</div>
  <div>عنصر 3</div>
</ResponsiveGrid>
```

---

## 🎯 أفضل الممارسات

1. **استخدم TypeScript** - جميع المكونات مكتوبة بـ TypeScript
2. **استخدم Tailwind CSS** - للتنسيق
3. **اتبع مبادئ a11y** - إمكانية الوصول أولاً
4. **استخدم RTL** - دعم اللغة العربية
5. **اختبر المكونات** - قبل الاستخدام

---

## 📄 الترخيص

MIT License - EduSaas Team


