#!/usr/bin/env node

/**
 * Master script to sync all pages
 * This will export HTML from live pages and update database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const TEMP_DIR = path.join(__dirname, '../temp-exports');

// Create temp directory if it doesn't exist
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const pages = [
  {
    name: 'عن المعهد',
    slug: 'about',
    url: `${BASE_URL}/about`,
    htmlFile: path.join(TEMP_DIR, 'about.html')
  },
  {
    name: 'التسجيل والإلتحاق',
    slug: 'admission',
    url: `${BASE_URL}/admission`,
    htmlFile: path.join(TEMP_DIR, 'admission.html')
  },
  {
    name: 'الأقسام',
    slug: 'departments',
    url: `${BASE_URL}/departments`,
    htmlFile: path.join(TEMP_DIR, 'departments.html')
  },
  {
    name: 'اتصل بنا',
    slug: 'contact',
    url: `${BASE_URL}/contact`,
    htmlFile: path.join(TEMP_DIR, 'contact.html')
  }
];

async function syncAllPages() {
  console.log('🚀 Starting batch sync for all pages...\n');
  console.log('═'.repeat(60));
  
  let successCount = 0;
  let failCount = 0;

  for (const page of pages) {
    try {
      console.log(`\n📄 Processing: ${page.name} (${page.slug})`);
      console.log('─'.repeat(60));

      // Step 1: Export HTML
      console.log(`\n1️⃣  Exporting HTML from ${page.url}...`);
      execSync(
        `node ${path.join(__dirname, 'export-page-html.js')} "${page.url}" "${page.htmlFile}"`,
        { stdio: 'inherit' }
      );

      // Step 2: Sync to database
      console.log(`\n2️⃣  Syncing to database...`);
      execSync(
        `node ${path.join(__dirname, 'sync-page.js')} "${page.slug}" "${page.htmlFile}"`,
        { stdio: 'inherit' }
      );

      successCount++;
      console.log(`\n✅ ${page.name} synced successfully!\n`);
      
    } catch (error) {
      failCount++;
      console.error(`\n❌ Failed to sync ${page.name}:`, error.message, '\n');
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SYNC SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Successful: ${successCount}/${pages.length}`);
  console.log(`❌ Failed: ${failCount}/${pages.length}`);
  console.log('═'.repeat(60));

  // Cleanup temp files
  console.log('\n🧹 Cleaning up temporary files...');
  try {
    pages.forEach(page => {
      if (fs.existsSync(page.htmlFile)) {
        fs.unlinkSync(page.htmlFile);
      }
    });
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmdirSync(TEMP_DIR);
    }
    console.log('✅ Cleanup complete!\n');
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message, '\n');
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run the script
syncAllPages();
