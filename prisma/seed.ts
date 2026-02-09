import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء إضافة البيانات التجريبية...');

  // 1. إنشاء مستخدم Admin
  const hashedPassword = await hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sainaiinstitute.com' },
    update: {},
    create: {
      email: 'admin@sainaiinstitute.com',
      name: 'مدير النظام',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ تم إنشاء مستخدم Admin:', admin.email);

  // 2. حذف الأقسام القديمة وإنشاء أقسام جديدة
  await prisma.department.deleteMany({});
  
  const departments = [
    {
      nameAr: 'إدارة الضيافة',
      nameEn: 'Hospitality Management',
      description: 'برنامج إدارة الضيافة يهدف إلى تأهيل الطلاب للعمل في مجال الفنادق والمطاعم',
      order: 1,
      isActive: true,
    },
    {
      nameAr: 'الإرشاد السياحي',
      nameEn: 'Tourism Guidance',
      description: 'برنامج الإرشاد السياحي لتأهيل مرشدين سياحيين محترفين',
      order: 2,
      isActive: true,
    },
    {
      nameAr: 'الدراسات السياحية',
      nameEn: 'Tourism Studies',
      description: 'برنامج الدراسات السياحية والفندقية',
      order: 3,
      isActive: true,
    },
    {
      nameAr: 'اللغة الإنجليزية',
      nameEn: 'English Language',
      description: 'برنامج اللغة الإنجليزية وآدابها',
      order: 4,
      isActive: true,
    },
    {
      nameAr: 'اللغة الفرنسية',
      nameEn: 'French Language',
      description: 'برنامج اللغة الفرنسية وآدابها',
      order: 5,
      isActive: true,
    },
    {
      nameAr: 'العلوم الإدارية',
      nameEn: 'Business Administration',
      description: 'برنامج العلوم الإدارية وإدارة الأعمال',
      order: 6,
      isActive: true,
    },
  ];

  const createdDepartments = [];
  for (const dept of departments) {
    const department = await prisma.department.create({
      data: dept,
    });
    createdDepartments.push(department);
  }

  console.log('✅ تم إنشاء 6 أقسام علمية');

  // 3. إنشاء أخبار تجريبية
  await prisma.news.deleteMany({});
  
  const dept1 = createdDepartments[0];
  
  if (dept1) {
    await prisma.news.create({
      data: {
        titleAr: 'بدء التسجيل للعام الدراسي 2026/2027',
        titleEn: 'Registration Open for Academic Year 2026/2027',
        contentAr: 'تعلن إدارة معهد سيناء العالي للدراسات النوعية عن بدء قبول طلبات الالتحاق للعام الدراسي 2026/2027 في جميع التخصصات. يمكن للطلاب التقديم عبر الموقع الإلكتروني أو زيارة مقر المعهد.',
        contentEn: 'Sinai Higher Institute announces the opening of applications for the academic year 2026/2027.',
        category: 'ANNOUNCEMENTS',
        isPublished: true,
        isFeatured: true,
        isInTicker: true,
        publishDate: new Date(),
      },
    });

    await prisma.news.create({
      data: {
        titleAr: 'مواعيد امتحانات الفصل الدراسي الثاني',
        titleEn: 'Second Semester Exam Schedule',
        contentAr: 'تبدأ امتحانات الفصل الدراسي الثاني يوم السبت 15 مايو 2026. يرجى من الطلاب مراجعة الجداول على الموقع الإلكتروني.',
        contentEn: 'Second semester exams start on Saturday, May 15, 2026.',
        category: 'NEWS',
        isPublished: true,
        isFeatured: false,
        isInTicker: true,
        publishDate: new Date(),
      },
    });

    await prisma.news.create({
      data: {
        titleAr: 'ندوة علمية حول مستقبل السياحة في مصر',
        titleEn: 'Seminar on the Future of Tourism in Egypt',
        contentAr: 'ينظم معهد سيناء العالي ندوة علمية بعنوان "مستقبل السياحة في مصر" بحضور خبراء متخصصين يوم الأربعاء القادم.',
        contentEn: 'Sinai Institute organizes a seminar on "The Future of Tourism in Egypt".',
        category: 'EVENTS',
        isPublished: true,
        isFeatured: true,
        isInTicker: false,
        publishDate: new Date(),
      },
    });

    console.log('✅ تم إنشاء 3 أخبار تجريبية');
  }

  console.log('🎉 تم إضافة جميع البيانات التجريبية بنجاح!');
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
