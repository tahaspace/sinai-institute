#!/usr/bin/env node

/**
 * Script to sync About page content to database
 * This reads the HTML file and updates the database via API
 */

const fs = require('fs');
const path = require('path');

const ABOUT_HTML_PATH = path.join(__dirname, '../../about-page-content.html');
const API_URL = 'http://localhost:3001/api/pages';
const PAGE_SLUG = 'about';

async function syncAboutPage() {
  console.log('🚀 Starting About page sync...\n');

  try {
    // 1. Read HTML file
    console.log('📖 Reading HTML file...');
    if (!fs.existsSync(ABOUT_HTML_PATH)) {
      throw new Error(`HTML file not found at: ${ABOUT_HTML_PATH}`);
    }

    const htmlContent = fs.readFileSync(ABOUT_HTML_PATH, 'utf-8');
    console.log(`✅ Read ${htmlContent.length} characters from HTML file\n`);

    // Extract body content (between <body> and </body>)
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1].trim() : htmlContent;

    console.log('📦 Extracted body content length:', bodyContent.length);

    // Extract CSS content (between <style> and </style>)
    const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const cssContent = styleMatch ? styleMatch[1].trim() : '';

    console.log('🎨 Extracted CSS length:', cssContent.length, '\n');

    // 2. Update page via API
    console.log('🔄 Updating page in database...');
    const response = await fetch(API_URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: PAGE_SLUG,
        contentAr: bodyContent,
        customCSS: cssContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Page updated successfully!\n');
    console.log('📊 Updated page details:');
    console.log('   - ID:', result.page.id);
    console.log('   - Title (AR):', result.page.titleAr);
    console.log('   - Slug:', result.page.slug);
    console.log('   - Content length:', result.page.contentAr?.length || 0, 'characters');
    console.log('   - Updated at:', new Date(result.page.updatedAt).toLocaleString('ar-EG'));
    console.log('\n✨ Done! You can now view the page at:');
    console.log('   - Live page: http://localhost:3001/about');
    console.log('   - Page builder: http://localhost:3001/cms/page-builder-grapes/' + result.page.id);
    console.log('\n💡 The GrapesJS builder will now show the same content as the live page!\n');

  } catch (error) {
    console.error('❌ Error syncing page:', error.message);
    process.exit(1);
  }
}

// Run the script
syncAboutPage();
