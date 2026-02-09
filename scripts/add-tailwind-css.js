#!/usr/bin/env node

const TAILWIND_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');

* { box-sizing: border-box; }
body { font-family: 'Tajawal', 'Cairo', sans-serif; line-height: 1.6; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
.grid { display: grid; gap: 1.5rem; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.text-center { text-align: center; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.text-sm { font-size: 0.875rem; }
.text-base { font-size: 1rem; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }
.text-3xl { font-size: 1.875rem; }
.text-4xl { font-size: 2.25rem; }
.text-5xl { font-size: 3rem; }
.m-0 { margin: 0; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-8 { margin-bottom: 2rem; }
.mb-16 { margin-bottom: 4rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.pt-32 { padding-top: 8rem; }
.pb-20 { padding-bottom: 5rem; }
.rounded { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.shadow { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.bg-white { background-color: #fff; }
.bg-blue-50 { background-color: #eff6ff; }
.bg-blue-500 { background-color: #3b82f6; }
.bg-blue-600 { background-color: #2563eb; }
.bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
.text-white { color: #fff; }
.text-gray-600 { color: #4b5563; }
.text-gray-700 { color: #374151; }
.text-gray-900 { color: #111827; }
.text-blue-600 { color: #2563eb; }
.border { border: 1px solid #e5e7eb; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }
.max-w-2xl { max-width: 42rem; }
.max-w-4xl { max-width: 56rem; }
.max-w-6xl { max-width: 72rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.w-full { width: 100%; }
.h-full { height: 100%; }
.space-y-4 > * + * { margin-top: 1rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }
.transition { transition-property: all; transition-duration: 150ms; }
.hover\\:shadow-xl:hover { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.hover\\:scale-105:hover { transform: scale(1.05); }
`;

const API_URL = 'http://localhost:3001/api/pages';
const pages = ['admission', 'departments', 'contact'];

async function addTailwindToPages() {
  console.log('🎨 Adding Tailwind CSS to pages...\n');
  
  for (const slug of pages) {
    try {
      const res = await fetch(API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, customCSS: TAILWIND_CSS })
      });
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`✅ ${slug}: CSS updated (${TAILWIND_CSS.length} characters)`);
    } catch (err) {
      console.error(`❌ ${slug}: ${err.message}`);
    }
  }
  
  console.log('\n✨ Done! Refresh the GrapesJS builder pages to see the styles.\n');
}

addTailwindToPages();
