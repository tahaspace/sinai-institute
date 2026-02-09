#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const API_URL = 'http://localhost:3001/api/pages';
const BASE_URL = 'http://localhost:3001';

async function resetAndExportPage(slug, pageUrl) {
  console.log(`\n🔄 Resetting and re-exporting: ${slug}\n`);

  try {
    // Step 1: Clear CMS content temporarily
    console.log('1️⃣  Clearing CMS content temporarily...');
    const clearResponse = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, contentAr: '' })
    });
    
    if (!clearResponse.ok) throw new Error('Failed to clear content');
    console.log('✅ Content cleared\n');

    // Step 2: Wait a bit for changes to take effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Export fresh HTML from React component
    console.log('2️⃣  Exporting fresh HTML...');
    const htmlFile = `/root/cybersecurity/27/${slug}-fresh.html`;
    execSync(
      `node ${path.join(__dirname, 'export-page-html.js')} "${pageUrl}" "${htmlFile}"`,
      { stdio: 'inherit' }
    );

    // Step 4: Sync back to database
    console.log('\n3️⃣  Syncing to database...');
    execSync(
      `node ${path.join(__dirname, 'sync-page.js')} "${slug}" "${htmlFile}"`,
      { stdio: 'inherit' }
    );

    console.log('\n✅ Done! Page reset and exported successfully.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node reset-and-export-page.js <slug> <url>');
  console.error('Example: node reset-and-export-page.js admission http://localhost:3001/admission');
  process.exit(1);
}

const [slug, pageUrl] = args;
resetAndExportPage(slug, pageUrl);
