// Script to export data from Neon database
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Neon connection string
const neonUrl = 'postgresql://neondb_owner:npg_bVGvuJfK51gx@ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: neonUrl,
    },
  },
});

async function exportAllData() {
  try {
    console.log('🔍 Connecting to Neon database...');
    
    // Export Pages
    console.log('📄 Exporting Pages...');
    const pages = await prisma.page.findMany({
      include: {
        blocks: true,
      },
    });
    console.log(`✅ Found ${pages.length} pages`);
    
    // Export News
    console.log('📰 Exporting News...');
    const news = await prisma.news.findMany();
    console.log(`✅ Found ${news.length} news items`);
    
    // Export Departments
    console.log('🏢 Exporting Departments...');
    const departments = await prisma.department.findMany();
    console.log(`✅ Found ${departments.length} departments`);
    
    // Export Applications
    console.log('📝 Exporting Applications...');
    const applications = await prisma.application.findMany();
    console.log(`✅ Found ${applications.length} applications`);
    
    // Export Results
    console.log('📊 Exporting Results...');
    const results = await prisma.result.findMany();
    console.log(`✅ Found ${results.length} results`);
    
    // Export Schedules
    console.log('📅 Exporting Schedules...');
    const schedules = await prisma.schedule.findMany();
    console.log(`✅ Found ${schedules.length} schedules`);
    
    // Export Complaints
    console.log('💬 Exporting Complaints...');
    const complaints = await prisma.complaint.findMany();
    console.log(`✅ Found ${complaints.length} complaints`);
    
    // Create export object
    const exportData = {
      exportDate: new Date().toISOString(),
      source: 'Neon Database (still-band-48383921)',
      data: {
        pages,
        news,
        departments,
        applications,
        results,
        schedules,
        complaints,
      },
      summary: {
        pages: pages.length,
        news: news.length,
        departments: departments.length,
        applications: applications.length,
        results: results.length,
        schedules: schedules.length,
        complaints: complaints.length,
      },
    };
    
    // Save to file
    const outputPath = path.join(__dirname, 'neon-export-backup.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
    
    console.log('\n✅ Export completed successfully!');
    console.log(`📁 File saved: ${outputPath}`);
    console.log('\n📊 Summary:');
    console.log(JSON.stringify(exportData.summary, null, 2));
    
  } catch (error) {
    console.error('❌ Error exporting data:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportAllData();
