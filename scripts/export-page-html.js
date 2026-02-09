#!/usr/bin/env node

/**
 * Export rendered HTML from a Next.js page
 * Usage: node export-page-html.js <pageUrl> <outputFile>
 * Example: node export-page-html.js http://localhost:3001/about about.html
 */

const fs = require('fs');
const path = require('path');

async function exportPageHTML(pageUrl, outputFile) {
  console.log(`🚀 Exporting HTML from: ${pageUrl}\n`);

  try {
    // Fetch the page
    console.log('📥 Fetching page...');
    const response = await fetch(pageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    let html = await response.text();
    console.log(`✅ Fetched ${html.length} characters\n`);

    // Extract the main content (remove Next.js scripts and unnecessary parts)
    console.log('🔧 Processing HTML...');
    
    // Extract styles from <style> tags
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    let combinedCSS = '';
    
    styleMatches.forEach(styleTag => {
      const cssMatch = styleTag.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      if (cssMatch && cssMatch[1]) {
        combinedCSS += cssMatch[1] + '\n';
      }
    });

    // Extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : html;

    // Remove Next.js scripts
    bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove Next.js specific divs (like __next)
    bodyContent = bodyContent.replace(/<div id="__next"[^>]*>/gi, '');
    bodyContent = bodyContent.replace(/<\/div>\s*<\/body>/gi, '');
    
    // Remove header/navbar (it's already in the layout)
    bodyContent = bodyContent.replace(/<header[\s\S]*?<\/header>/gi, '');
    bodyContent = bodyContent.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    
    // Remove footer (it's already in the layout)
    bodyContent = bodyContent.replace(/<footer[\s\S]*?<\/footer>/gi, '');

    // Create clean HTML structure
    const cleanHTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Export</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Tajawal', 'Cairo', sans-serif; direction: rtl; text-align: right; margin: 0; padding: 0; }
${combinedCSS}
    </style>
</head>
<body>
${bodyContent}
</body>
</html>`;

    // Save to file
    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, cleanHTML, 'utf-8');
    
    console.log('✅ HTML exported successfully!\n');
    console.log('📊 Export details:');
    console.log('   - Output file:', outputPath);
    console.log('   - Total size:', cleanHTML.length, 'characters');
    console.log('   - CSS extracted:', combinedCSS.length > 0 ? 'Yes' : 'No');
    console.log('   - CSS size:', combinedCSS.length, 'characters');
    console.log('\n💡 You can now use this file with sync-page.js\n');

  } catch (error) {
    console.error('❌ Error exporting page:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Usage: node export-page-html.js <pageUrl> <outputFile>');
  console.error('Example: node export-page-html.js http://localhost:3001/about about.html');
  process.exit(1);
}

const [pageUrl, outputFile] = args;

// Run the script
exportPageHTML(pageUrl, outputFile);
