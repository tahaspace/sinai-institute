const API_URL = 'http://localhost:3001/api/pages';

async function clearContent(slug) {
  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, contentAr: '', customCSS: '' })
  });
  const data = await res.json();
  console.log(`✅ ${slug}: Content cleared - page will now show default React content`);
}

// Clear all pages
const pages = ['admission', 'departments', 'contact'];
Promise.all(pages.map(clearContent)).then(() => {
  console.log('\n✨ Done! All pages cleared. They will now show default React content.');
  console.log('💡 You can edit them anytime in GrapesJS and save new content.\n');
});
