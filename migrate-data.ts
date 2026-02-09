// Script لنقل البيانات من SQLite إلى PostgreSQL
import { PrismaClient as SQLiteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '@prisma/client';

// SQLite connection (old database)
const sqlite = new SQLiteClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db',
    },
  },
});

// PostgreSQL connection (new database)
const postgres = new PostgresClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL!,
    },
  },
});

async function migrateData() {
  try {
    console.log('🚀 بدء نقل البيانات من SQLite إلى PostgreSQL...\n');

    // 1. نقل المستخدمين (Users)
    console.log('📊 نقل المستخدمين...');
    const users = await sqlite.user.findMany();
    console.log(`   وجدت ${users.length} مستخدم`);
    
    for (const user of users) {
      await postgres.user.upsert({
        where: { email: user.email },
        update: user,
        create: user,
      });
    }
    console.log('   ✅ تم نقل المستخدمين\n');

    // 2. نقل الأقسام (Departments)
    console.log('📊 نقل الأقسام...');
    const departments = await sqlite.department.findMany();
    console.log(`   وجدت ${departments.length} قسم`);
    
    for (const dept of departments) {
      await postgres.department.upsert({
        where: { id: dept.id },
        update: dept,
        create: dept,
      });
    }
    console.log('   ✅ تم نقل الأقسام\n');

    // 3. نقل التخصصات (Specializations)
    console.log('📊 نقل التخصصات...');
    const specializations = await sqlite.specialization.findMany();
    console.log(`   وجدت ${specializations.length} تخصص`);
    
    for (const spec of specializations) {
      await postgres.specialization.upsert({
        where: { id: spec.id },
        update: spec,
        create: spec,
      });
    }
    console.log('   ✅ تم نقل التخصصات\n');

    // 4. نقل الصفحات (Pages)
    console.log('📊 نقل الصفحات...');
    const pages = await sqlite.page.findMany();
    console.log(`   وجدت ${pages.length} صفحة`);
    
    for (const page of pages) {
      await postgres.page.upsert({
        where: { id: page.id },
        update: page,
        create: page,
      });
    }
    console.log('   ✅ تم نقل الصفحات\n');

    // 5. نقل الأخبار (News)
    console.log('📊 نقل الأخبار...');
    const news = await sqlite.news.findMany();
    console.log(`   وجدت ${news.length} خبر`);
    
    for (const item of news) {
      await postgres.news.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log('   ✅ تم نقل الأخبار\n');

    // 6. نقل طلبات التقديم (Applications)
    console.log('📊 نقل طلبات التقديم...');
    const applications = await sqlite.application.findMany();
    console.log(`   وجدت ${applications.length} طلب`);
    
    for (const app of applications) {
      await postgres.application.upsert({
        where: { id: app.id },
        update: app,
        create: app,
      });
    }
    console.log('   ✅ تم نقل طلبات التقديم\n');

    // 7. نقل الشكاوى (Complaints)
    console.log('📊 نقل الشكاوى...');
    const complaints = await sqlite.complaint.findMany();
    console.log(`   وجدت ${complaints.length} شكوى`);
    
    for (const complaint of complaints) {
      await postgres.complaint.upsert({
        where: { id: complaint.id },
        update: complaint,
        create: complaint,
      });
    }
    console.log('   ✅ تم نقل الشكاوى\n');

    // 8. نقل رسائل الاتصال (ContactMessages)
    console.log('📊 نقل رسائل الاتصال...');
    const contacts = await sqlite.contactMessage.findMany();
    console.log(`   وجدت ${contacts.length} رسالة`);
    
    for (const contact of contacts) {
      await postgres.contactMessage.upsert({
        where: { id: contact.id },
        update: contact,
        create: contact,
      });
    }
    console.log('   ✅ تم نقل رسائل الاتصال\n');

    // 9. نقل الإعدادات (Settings)
    console.log('📊 نقل الإعدادات...');
    const settings = await sqlite.setting.findMany();
    console.log(`   وجدت ${settings.length} إعداد`);
    
    for (const setting of settings) {
      await postgres.setting.upsert({
        where: { id: setting.id },
        update: setting,
        create: setting,
      });
    }
    console.log('   ✅ تم نقل الإعدادات\n');

    console.log('🎉 تم نقل جميع البيانات بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في نقل البيانات:', error);
    throw error;
  } finally {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  }
}

migrateData()
  .then(() => {
    console.log('\n✅ انتهى النقل بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل النقل:', error);
    process.exit(1);
  });
