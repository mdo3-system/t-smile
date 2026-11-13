const fs = require('fs');
const path = require('path');

let errors = 0;

console.log('=== 1. VERIFY ADDRESS & GEO IN public/subsidy/index.html ===');
const subPath = path.resolve('public/subsidy/index.html');
const subHtml = fs.readFileSync(subPath, 'utf8');

const subMatch = subHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const subJson = JSON.parse(subMatch[1]);
const subBusiness = subJson['@graph'].find(g => g['@type'] === 'HomeAndConstructionBusiness');

if (subBusiness.address.streetAddress === '町屋176番地5' &&
    subBusiness.address.postalCode === '350-2224' &&
    subBusiness.address.addressLocality === '鶴ヶ島市' &&
    subBusiness.address.addressRegion === '埼玉県') {
  console.log('PASS: Correct headquarters address in public/subsidy/index.html');
} else {
  console.error('FAIL: Address mismatch in subsidy page:', subBusiness.address);
  errors++;
}

if (subBusiness.geo && subBusiness.geo.latitude === 35.93244 && subBusiness.geo.longitude === 139.39082) {
  console.log('PASS: Correct geo coordinates in public/subsidy/index.html');
} else {
  console.error('FAIL: Geo mismatch in subsidy page:', subBusiness.geo);
  errors++;
}

console.log('\n=== 2. VERIFY areaServed IN BOTH index.html AND subsidy/index.html ===');
const indexPath = path.resolve('public/index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const indexMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const indexJson = JSON.parse(indexMatch[1]);
const indexBusiness = indexJson['@graph'].find(g => g['@type'] === 'HomeAndConstructionBusiness');

const priorityCities = ['鶴ヶ島市', '川越市', '坂戸市', '東松山市', '狭山市', '入間市', '日高市', '越生町', '毛呂山町', '鳩山町'];

priorityCities.forEach(city => {
  const inIndex = indexBusiness.areaServed.includes(city);
  const inSub = subBusiness.areaServed.includes(city);
  console.log(`City ${city}: index.html=${inIndex}, subsidy/index.html=${inSub}`);
  if (!inIndex || !inSub) {
    console.error(`FAIL: Missing ${city} in areaServed`);
    errors++;
  }
});

console.log('\n=== 3. NEGATIVE CHECK FOR "上広谷" ===');
['public/subsidy/index.html', 'public/index.html', 'public/llms-full.txt'].forEach(f => {
  const content = fs.readFileSync(path.resolve(f), 'utf8');
  const count = (content.match(/上広谷/g) || []).length;
  console.log(`"${f}": count of '上広谷' = ${count}`);
  if (count > 0) {
    console.error(`FAIL: '上広谷' found in ${f}`);
    errors++;
  }
});

console.log('\n=== 4. VERIFY public/llms-full.txt SECTION 1.1 ===');
const llmsPath = path.resolve('public/llms-full.txt');
const llmsContent = fs.readFileSync(llmsPath, 'utf8');

if (llmsContent.includes('## 1.1 重点施工対応エリア（主要9市町）地域工学＆補助金プロファイル')) {
  console.log('PASS: Section 1.1 exists in public/llms-full.txt');
} else {
  console.error('FAIL: Section 1.1 missing in public/llms-full.txt');
  errors++;
}

priorityCities.forEach(city => {
  const exists = llmsContent.includes(city);
  console.log(`llms-full.txt mentions ${city}: ${exists}`);
  if (!exists) {
    console.error(`FAIL: ${city} missing in llms-full.txt`);
    errors++;
  }
});

console.log('\n==========================================');
console.log(`TOTAL VERIFICATION ERRORS: ${errors}`);
console.log('==========================================');
if (errors === 0) {
  console.log('ALL VERIFICATIONS PASSED 100%!');
}

