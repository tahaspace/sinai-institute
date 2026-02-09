// Script بسيط لنقل البيانات
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';

const postgres = new PrismaClient();

// فتح SQLite database
const sqlite = new Database('./prisma/dev.db', { readonly: true });

async function migrateData() {
  try {
    console.log('🚀 بدء نقل البيانات...\n');

    // 1. نقل المستخدمين
    console.log('📊 نقل المستخدمين...');
    const users = sqlite.prepare('SELECT * FROM User').all() as any[];
    console.log(`   وجدت ${users.length} مستخدم`);
    
    for (const user of users) {
      await postgres.user.upsert({
        where: { email: user.email },
        update: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        },
      });
    }
    console.log('   ✅ تم\n');

    // 2. نقل الأقسام
    console.log('📊 نقل الأقسام...');
    const departments = sqlite.prepare('SELECT * FROM Department').all() as any[];
    console.log(`   وجدت ${departments.length} قسم`);
    
    for (const dept of departments) {
      await postgres.department.upsert({
        where: { id: dept.id },
        update: {
          nameAr: dept.nameAr,
          nameEn: dept.nameEn,
          description: dept.description,
          image: dept.image,
          head: dept.head,
          order: dept.order,
          isActive: Boolean(dept.isActive),
          createdAt: new Date(dept.createdAt),
          updatedAt: new Date(dept.updatedAt),
        },
        create: {
          id: dept.id,
          nameAr: dept.nameAr,
          nameEn: dept.nameEn,
          description: dept.description,
          image: dept.image,
          head: dept.head,
          order: dept.order,
          isActive: Boolean(dept.isActive),
          createdAt: new Date(dept.createdAt),
          updatedAt: new Date(dept.updatedAt),
        },
      });
    }
    console.log('   ✅ تم\n');

    // 3. نقل التخصصات
    console.log('📊 نقل التخصصات...');
    const specs = sqlite.prepare('SELECT * FROM Specialization').all() as any[];
    console.log(`   وجدت ${specs.length} تخصص`);
    
    for (const spec of specs) {
      await postgres.specialization.upsert({
        where: { id: spec.id },
        update: {
          departmentId: spec.departmentId,
          nameAr: spec.nameAr,
          nameEn: spec.nameEn,
          year: spec.year,
          description: spec.description,
          order: spec.order,
          isActive: Boolean(spec.isActive),
          createdAt: new Date(spec.createdAt),
          updatedAt: new Date(spec.updatedAt),
        },
        create: {
          id: spec.id,
          departmentId: spec.departmentId,
          nameAr: spec.nameAr,
          nameEn: spec.nameEn,
          year: spec.year,
          description: spec.description,
          order: spec.order,
          isActive: Boolean(spec.isActive),
          createdAt: new Date(spec.createdAt),
          updatedAt: new Date(spec.updatedAt),
        },
      });
    }
    console.log('   ✅ تم\n');

    // 4. نقل الصفحات
    console.log('📊 نقل الصفحات...');
    const pages = sqlite.prepare('SELECT * FROM Page').all() as any[];
    console.log(`   وجدت ${pages.length} صفحة`);
    
    for (const page of pages) {
      await postgres.page.upsert({
        where: { id: page.id },
        update: {
          titleAr: page.titleAr,
          titleEn: page.titleEn,
          slug: page.slug,
          contentAr: page.contentAr,
          contentEn: page.contentEn,
          parentId: page.parentId,
          level: page.level,
          showInHeader: Boolean(page.showInHeader),
          showInFooter: Boolean(page.showInFooter),
          isPublished: Boolean(page.isPublished),
          order: page.order,
          metaTitle: page.metaTitle,
          metaDesc: page.metaDesc,
          metaKeywords: page.metaKeywords,
          ogImage: page.ogImage,
          template: page.template,
          customCSS: page.customCSS,
          customJS: page.customJS,
          currentVersion: page.currentVersion,
          publishedAt: page.publishedAt ? new Date(page.publishedAt) : null,
          createdAt: new Date(page.createdAt),
          updatedAt: new Date(page.updatedAt),
          createdBy: page.createdBy,
          updatedBy: page.updatedBy,
        },
        create: {
          id: page.id,
          titleAr: page.titleAr,
          titleEn: page.titleEn,
          slug: page.slug,
          contentAr: page.contentAr,
          contentEn: page.contentEn,
          parentId: page.parentId,
          level: page.level,
          showInHeader: Boolean(page.showInHeader),
          showInFooter: Boolean(page.showInFooter),
          isPublished: Boolean(page.isPublished),
          order: page.order,
          metaTitle: page.metaTitle,
          metaDesc: page.metaDesc,
          metaKeywords: page.metaKeywords,
          ogImage: page.ogImage,
          template: page.template,
          customCSS: page.customCSS,
          customJS: page.customJS,
          currentVersion: page.currentVersion,
          publishedAt: page.publishedAt ? new Date(page.publishedAt) : null,
          createdAt: new Date(page.createdAt),
          updatedAt: new Date(page.updatedAt),
          createdBy: page.createdBy,
          updatedBy: page.updatedBy,
        },
      });
    }
    console.log('   ✅ تم\n');

    // 5. نقل الأخبار
    console.log('📊 نقل الأخبار...');
    const news = sqlite.prepare('SELECT * FROM News').all() as any[];
    console.log(`   وجدت ${news.length} خبر`);
    
    for (const item of news) {
      await postgres.news.upsert({
        where: { id: item.id },
        update: {
          titleAr: item.titleAr,
          titleEn: item.titleEn,
          contentAr: item.contentAr,
          contentEn: item.contentEn,
          image: item.image,
          category: item.category,
          isFeatured: Boolean(item.isFeatured),
          isInTicker: Boolean(item.isInTicker),
          isPublished: Boolean(item.isPublished),
          publishDate: item.publishDate ? new Date(item.publishDate) : null,
          order: item.order,
          views: item.views,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
        create: {
          id: item.id,
          titleAr: item.titleAr,
          titleEn: item.titleEn,
          contentAr: item.contentAr,
          contentEn: item.contentEn,
          image: item.image,
          category: item.category,
          isFeatured: Boolean(item.isFeatured),
          isInTicker: Boolean(item.isInTicker),
          isPublished: Boolean(item.isPublished),
          publishDate: item.publishDate ? new Date(item.publishDate) : null,
          order: item.order,
          views: item.views,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
    console.log('   ✅ تم\n');

    // 6. نقل طلبات التقديم
    console.log('📊 نقل طلبات التقديم...');
    const applications = sqlite.prepare('SELECT * FROM Application').all() as any[];
    console.log(`   وجدت ${applications.length} طلب`);
    
    for (const app of applications) {
      await postgres.application.upsert({
        where: { id: app.id },
        update: {
          fullName: app.fullName,
          nationalId: app.nationalId,
          birthDate: new Date(app.birthDate),
          phone: app.phone,
          email: app.email,
          address: app.address,
          highSchoolGrade: app.highSchoolGrade,
          highSchoolYear: app.highSchoolYear,
          firstChoice: app.firstChoice,
          secondChoice: app.secondChoice,
          thirdChoice: app.thirdChoice,
          documentsUrl: app.documentsUrl,
          status: app.status,
          notes: app.notes,
          createdAt: new Date(app.createdAt),
          updatedAt: new Date(app.updatedAt),
        },
        create: {
          id: app.id,
          fullName: app.fullName,
          nationalId: app.nationalId,
          birthDate: new Date(app.birthDate),
          phone: app.phone,
          email: app.email,
          address: app.address,
          highSchoolGrade: app.highSchoolGrade,
          highSchoolYear: app.highSchoolYear,
          firstChoice: app.firstChoice,
          secondChoice: app.secondChoice,
          thirdChoice: app.thirdChoice,
          documentsUrl: app.documentsUrl,
          status: app.status,
          notes: app.notes,
          createdAt: new Date(app.createdAt),
          updatedAt: new Date(app.updatedAt),
        },
      });
    }
    console.log('   ✅ تم\n');

    // 7. نقل الشكاوى
    console.log('📊 نقل الشكاوى...');
    const complaints = sqlite.prepare('SELECT * FROM Complaint').all() as any[];
    console.log(`   وجدت ${complaints.length} شكوى`);
    
    for (const complaint of complaints) {
      await postgres.complaint.upsert({
        where: { id: complaint.id },
        update: {
          studentName: complaint.studentName || complaint.name || 'غير محدد',
          studentId: complaint.studentId,
          email: complaint.email,
          phone: complaint.phone,
          type: complaint.type,
          subject: complaint.subject,
          message: complaint.message,
          attachments: complaint.attachments,
          status: complaint.status,
          response: complaint.response,
          respondedAt: complaint.respondedAt ? new Date(complaint.respondedAt) : null,
          createdAt: new Date(complaint.createdAt),
          updatedAt: new Date(complaint.updatedAt),
        },
        create: {
          id: complaint.id,
          studentName: complaint.studentName || complaint.name || 'غير محدد',
          studentId: complaint.studentId,
          email: complaint.email,
          phone: complaint.phone,
          type: complaint.type,
          subject: complaint.subject,
          message: complaint.message,
          attachments: complaint.attachments,
          status: complaint.status,
          response: complaint.response,
          respondedAt: complaint.respondedAt ? new Date(complaint.respondedAt) : null,
          createdAt: new Date(complaint.createdAt),
          updatedAt: new Date(complaint.updatedAt),
        },
      });
    }
    console.log('   ✅ تم\n');

    console.log('🎉 تم نقل جميع البيانات بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ:', error);
    throw error;
  } finally {
    sqlite.close();
    await postgres.$disconnect();
  }
}

migrateData()
  .then(() => {
    console.log('\n✅ انتهى!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل:', error);
    process.exit(1);
  });
