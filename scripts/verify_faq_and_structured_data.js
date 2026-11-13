const fs = require('fs');
const path = require('path');

let errors = 0;

console.log('=== 1. VERIFY public/subsidy/index.html STRUCTURED DATA ===');
const subPath = path.resolve('public/subsidy/index.html');
const subHtml = fs.readFileSync(subPath, 'utf8');

// Canonical check
if (subHtml.includes('<link rel="canonical" href="https://t-smile.co.jp/subsidy/" />')) {
  console.log('PASS: Canonical link correctly defined');
} else {
  console.error('FAIL: Canonical link missing or incorrect');
  errors++;
}

// JSON-LD extraction
const subLdMatches = subHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
if (!subLdMatches || subLdMatches.length === 0) {
  console.error('FAIL: No JSON-LD found in subsidy page');
  errors++;
} else {
  console.log(`PASS: Found ${subLdMatches.length} JSON-LD script(s) in subsidy page`);
  subLdMatches.forEach((script, idx) => {
    const jsonStr = script.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
    try {
      const data = JSON.parse(jsonStr);
      console.log(`  Script ${idx + 1} parsed successfully`);
      const graph = data['@graph'] || [data];
      const types = graph.map(g => g['@type']);
      console.log('  Found types:', types);

      const requiredTypes = ['BreadcrumbList', 'HomeAndConstructionBusiness', 'SoftwareApplication', 'FAQPage'];
      requiredTypes.forEach(rt => {
        if (types.includes(rt)) {
          console.log(`  PASS: Found @type = ${rt}`);
        } else {
          console.error(`  FAIL: Missing @type = ${rt}`);
          errors++;
        }
      });

      const faq = graph.find(g => g['@type'] === 'FAQPage');
      if (faq && faq.mainEntity && faq.mainEntity.length === 5) {
        console.log(`  PASS: FAQPage contains 5 questions`);
        faq.mainEntity.forEach((q, qIdx) => {
          console.log(`    Q${qIdx + 1}: ${q.name}`);
        });
      } else {
        console.error(`  FAIL: FAQPage questions count is not 5`);
        errors++;
      }
    } catch (e) {
      console.error(`FAIL: JSON-LD parse error:`, e.message);
      errors++;
    }
  });
}

console.log('\n=== 2. VERIFY public/index.html FAQ DOM & JSON-LD MATCH ===');
const indexPath = path.resolve('public/index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

// Check section existence
if (indexHtml.includes('id="faq"') && indexHtml.includes('faq-accordion-container')) {
  console.log('PASS: <section id="faq"> exists in visible DOM');
} else {
  console.error('FAIL: <section id="faq"> not found');
  errors++;
}

// Extract JSON-LD FAQ items
const indexLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const indexLd = JSON.parse(indexLdMatch[1]);
const indexFaq = indexLd['@graph'].find(g => g['@type'] === 'FAQPage');

console.log(`Checking all ${indexFaq.mainEntity.length} FAQ items against DOM:`);
indexFaq.mainEntity.forEach((item, idx) => {
  const qExists = indexHtml.includes(item.name);
  const aExists = indexHtml.includes(item.acceptedAnswer.text);
  if (qExists && aExists) {
    console.log(`  PASS: Q${idx + 1} matched in visible DOM`);
  } else {
    console.error(`  FAIL: Q${idx + 1} mismatch: Q exists=${qExists}, A exists=${aExists}`);
    errors++;
  }
});

// Check details / summary count
const detailsCount = (indexHtml.match(/<details class="faq-item"/g) || []).length;
console.log(`PASS: Found ${detailsCount} <details class="faq-item"> in DOM (Expected 14)`);
if (detailsCount !== 14) {
  console.error(`FAIL: detailsCount = ${detailsCount}, expected 14`);
  errors++;
}

console.log('\n=== 3. RULE 1 CHECK (NO PROHIBITED COMPETITOR NAMES) ===');
const prohibited = ['ArchiX', 'archix'];
prohibited.forEach(p => {
  const subCount = (subHtml.match(new RegExp(p, 'gi')) || []).length;
  const indexCount = (indexHtml.match(new RegExp(p, 'gi')) || []).length;
  console.log(`[Rule 1] "${p}": subsidy count = ${subCount}, index count = ${indexCount}`);
  if (subCount > 0 || indexCount > 0) {
    console.error(`FAIL: Prohibited name "${p}" found!`);
    errors++;
  }
});

console.log(`\n==========================================`);
console.log(`TOTAL VERIFICATION ERRORS: ${errors}`);
console.log(`==========================================`);
if (errors === 0) {
  console.log('ALL VERIFICATIONS PASSED 100%!');
}

