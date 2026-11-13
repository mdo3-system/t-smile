const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve('public/data/saitama_63_subsidies.json');
const htmlPath = path.resolve('public/subsidy/index.html');

const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

console.log('=== 1. BASIC INTEGRITY CHECK ===');
console.log(`JSON total municipalities: ${jsonData.length}`);

// Extract SUBSIDY_DATABASE from HTML
const match = htmlContent.match(/cities:\s*(\{[\s\S]*?\n\s*\})\s*\n\s*\};/);
if (!match) {
  throw new Error('SUBSIDY_DATABASE.cities not found in HTML');
}
const cities = eval('(' + match[1] + ')');
console.log(`HTML SUBSIDY_DATABASE.cities count: ${Object.keys(cities).length}`);

console.log('\n=== 2. SPECIFIC TARGET VERIFICATIONS (SHEET 2 SECTIONS 1-3) ===');
const targets = [
  { name: '鶴ヶ島市', key: '鶴ヶ島', max: 1000000, link: 'https://www.city.tsurugashima.lg.jp/kurashi-tetsuduki/sumai/jyutaku/page011431.html', closed: false },
  { name: '坂戸市', key: '坂戸', max: 800000, link: 'https://www.city.sakado.lg.jp/soshiki/37/37195.html', closed: false },
  { name: '川越市', key: '川越', max: 90000, link: 'https://www.city.kawagoe.saitama.jp/kurashi/kankyo/1002642/1002702/1021924.html', closed: true },
  { name: '東松山市', key: '東松山', max: 70000, link: 'https://www.city.higashimatsuyama.lg.jp/soshiki/13/1699.html', closed: false },
  { name: 'さいたま市', key: 'さいたま', max: 300000, link: 'https://www.city.saitama.lg.jp/001/009/015/010/002/p119491.html', closed: true },
  { name: 'ときがわ町', key: 'ときがわ', max: 1000000, link: 'https://www.town.tokigawa.lg.jp/info/2245', closed: false },
  { name: '鳩山町', key: '鳩山', max: 400000, link: 'https://www.town.hatoyama.saitama.jp/kurashi/sumai_hikkosi/page003315.html', closed: false },
  { name: '毛呂山町', key: '毛呂山', max: 500000, link: 'https://www.town.moroyama.saitama.jp/soshikikarasagasu/kikakuzaiseika/kikakukakari/utilization_of_vacant_house/10008.html', closed: false },
  { name: '越生町', key: '越生', max: 500000, link: 'https://www.town.ogose.saitama.jp/kamei/kosodateshien/kodomo/gyomuannai/hojo/1650931329710.html', closed: false },
  { name: '滑川町', key: '滑川', max: 50000, link: 'https://www.town.namegawa.saitama.jp/soshikikarasagasu/kankyoka/gomi_kankyo_pet/3/1216.html', closed: false },
  { name: '川島町', key: '川島', link: 'https://www.town.kawajima.saitama.jp/secure/12877/kai-nyuukyoyoukou.pdf' },
  { name: '所沢市', key: '所沢', max: 390000, link: 'https://www.city.tokorozawa.saitama.jp/kurashi/seikatukankyo/kankyo/ekojyosei/sumatohausu.html', closed: false },
  { name: '志木市', key: '志木', max: 50000, link: 'https://www.city.shiki.lg.jp/soshiki/16/1206.html', closed: false },
  { name: '新座市', key: '新座', max: 900000, link: 'https://www.city.niiza.lg.jp/soshiki/15/taiyokohojokin.html', closed: true },
  { name: '富士見市', key: '富士見', max: 120000, link: 'https://www.city.fujimi.saitama.jp/shisei/09kankyou/2015-1202-1454-52/renewable_energy/ondankaboushfujimi.html', closed: false },
  { name: 'ふじみ野市', key: 'ふじみ野', max: 70000, link: 'https://www.city.fujimino.saitama.jp/soshikiichiran/kankyoka/kankyokakari/oshirase/11859.html', closed: false },
  { name: '三芳町', key: '三芳', max: 50000, link: 'https://www.town.saitama-miyoshi.lg.jp/life/gomi/taiyoukouhojokinn.html', closed: false },
  { name: '羽生市', key: '羽生', max: 100000, link: 'https://www.city.hanyu.lg.jp/docs/2014122600060/', closed: false },
  { name: '鴻巣市', key: '鴻巣', max: 100000, link: 'https://www.city.kounosu.saitama.jp/page/22570.html', closed: false },
  { name: '深谷市', key: '深谷', max: 150000, link: 'https://www.city.fukaya.saitama.jp/soshiki/kikakuzaisei/kikaku/tanto/teijyuu/14197.html', closed: false },
  { name: '上尾市', key: '上尾', max: 100000, link: 'https://www.city.ageo.lg.jp/page/386012.html', closed: true },
  { name: '蕨市', key: '蕨', max: 150000, link: 'https://www.city.warabi.saitama.jp/kurashi/kankyo/eco/1001349.html', closed: false },
  { name: '戸田市', key: '戸田', max: 50000, link: 'https://www.city.toda.saitama.jp/soshiki/212/kankyo-zero-carbon-hozyo.html', closed: false },
  { name: '川口市', key: '川口', max: 160000, link: 'https://www.city.kawaguchi.lg.jp/soshiki/01100/010/2/1/34382.html', closed: false },
  { name: '久喜市', key: '久喜', link: 'https://www.city.kuki.lg.jp/machizukuri/hozen/hojokin/1012797.html' },
  { name: '北本市', key: '北本', link: 'https://www.city.kitamoto.lg.jp/mokutekikarasagasu/teatekyuhunado/sumai/19168.html' },
  { name: '八潮市', key: '八潮', max: 50000, link: 'https://www.city.yashio.lg.jp/kurashi/sumai_community/sumai/R7_taiyoko.html', closed: false },
  { name: '蓮田市', key: '蓮田', max: 50000, link: 'https://www.city.hasuda.saitama.jp/kankyo/machi/kankyo/hojo/sizenenerugihojokin2021.html', closed: false },
  { name: '伊奈町', key: '伊奈', max: 10000, link: 'https://www.town.saitama-ina.lg.jp/0000009440.html', closed: false },
  { name: '皆野町', key: '皆野', max: 1200000, link: 'https://www.town.minano.saitama.jp/section/kankou/18428/', closed: true },
  { name: '長瀞町', key: '長瀞', max: 1000000, link: 'https://www.town.nagatoro.saitama.jp/life/h30_teiju/', closed: false },
  { name: '小鹿野町', key: '小鹿野', max: 1000000, link: 'https://www.town.ogano.lg.jp/kurashi-tetsuzuki/sumai-sien/sumaizyoseikinitiran/', closed: false },
  { name: '寄居町', key: '寄居', max: 800000, link: 'https://www.town.yorii.saitama.jp/soshiki/15/kyojyusokusin.html', closed: false }
];

let mismatches = 0;
targets.forEach(t => {
  const jItem = jsonData.find(d => d.key === t.key || d.name === t.name);
  const hItem = cities[t.key]?.subsidies?.[0];

  if (!jItem || !hItem) {
    console.error(`MISSING: ${t.name}`);
    mismatches++;
    return;
  }

  // Check link
  if (t.link && (jItem.link !== t.link || hItem.link !== t.link)) {
    console.error(`LINK MISMATCH ${t.name}: expected ${t.link}, JSON=${jItem.link}, HTML=${hItem.link}`);
    mismatches++;
  }

  // Check max
  if (t.max !== undefined && (jItem.maxAmount !== t.max || hItem.maxAmount !== t.max)) {
    console.error(`MAX MISMATCH ${t.name}: expected ${t.max}, JSON=${jItem.maxAmount}, HTML=${hItem.maxAmount}`);
    mismatches++;
  }

  // Check closed
  if (t.closed !== undefined && (jItem.isClosed !== t.closed || hItem.isClosed !== t.closed)) {
    console.error(`CLOSED MISMATCH ${t.name}: expected ${t.closed}, JSON=${jItem.isClosed}, HTML=${hItem.isClosed}`);
    mismatches++;
  }
});

console.log(`Target checks finished: ${targets.length} checked, ${mismatches} errors`);

console.log('\n=== 3. NEGATIVE VERIFICATION (CONFIRM ZERO OLD FAULTY STRINGS) ===');
const negativeChecks = [
  'gikou', // old kawajima link to politician
  'konosu.saitama.jp', // old typo domain
  '住宅用省エネルギー機器等設置費補助金', // old kawagoe SEO text
  '住ま居る地元で連携最速', // old moroyama promo
  '住ま居る本社地元。', // old moroyama promo
  '2026年10月1日時点', // old disclaimer date
  'Gemini共有リンク', // old source comment
  'さいたま市 (最大174万)', // old static chip
  '最大23万円×2台', // old water heater text
  'みらいエコ 110万円）＋ 東京都' // old broken formula text
];

negativeChecks.forEach(nc => {
  const jsonCount = (fs.readFileSync(jsonPath, 'utf8').match(new RegExp(nc, 'g')) || []).length;
  const htmlCount = (htmlContent.match(new RegExp(nc, 'g')) || []).length;
  console.log(`[Negative Check] "${nc}": JSON count = ${jsonCount}, HTML count = ${htmlCount}`);
  if (jsonCount > 0 || htmlCount > 0) {
    console.error(`FAILED: "${nc}" still exists!`);
    mismatches++;
  }
});

console.log('\n=== 4. SIMULATION OF updateSubsidyView CALCULATIONS ===');
function simulateSubsidyView(query) {
  let totalMax = 1100000;
  const isTokyo = query.includes('東京');
  if (isTokyo) {
    totalMax = 2400000 + 1200000;
  } else {
    totalMax += 340000;
    const qClean = query.replace(/^(埼玉県|東京都)/, '').trim();
    let matchedCity = null;
    for (const cKey in cities) {
      const cData = cities[cKey];
      if (qClean.includes(cKey) || qClean.includes(cData.name)) {
        matchedCity = cData;
        break;
      }
    }
    if (matchedCity) {
      matchedCity.subsidies.forEach(s => {
        const isClosed = s.isClosed || (s.statusText && (s.statusText.includes('終了') || s.statusText.includes('満了') || s.statusText.includes('対象外') || s.statusText.includes('休止') || s.statusText.includes('廃止')));
        if (!isClosed && s.maxAmount) {
          totalMax += s.maxAmount;
        }
      });
    }
  }
  return totalMax;
}

const simCases = [
  { q: '東京都練馬区', expected: 3600000 },
  { q: '埼玉県皆野町', expected: 1440000 },
  { q: '埼玉県新座市', expected: 1440000 },
  { q: '埼玉県さいたま市', expected: 1440000 },
  { q: '埼玉県上尾市', expected: 1440000 },
  { q: '埼玉県鶴ヶ島市', expected: 2440000 },
  { q: '埼玉県坂戸市', expected: 2240000 }
];

simCases.forEach(sc => {
  const actual = simulateSubsidyView(sc.q);
  console.log(`Simulation for "${sc.q}": Expected = ${sc.expected.toLocaleString()}円, Actual = ${actual.toLocaleString()}円 -> ${actual === sc.expected ? 'PASS' : 'FAIL'}`);
  if (actual !== sc.expected) mismatches++;
});

console.log(`\nVerification finished with ${mismatches} total issues.`);
