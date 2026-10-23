/**
 * 株式会社住ま居る - 私のわがまま・俺のわがまま かなう家 ＆ CredLayer 信頼実証スコア
 * (Single Responsibility Principle Refactoring)
 */
// 12. CredLayer Interactive Score Calculator Studio
function initCredLayerStudio() {
  const form = document.getElementById('cred-calculator-form');
  const resultBox = document.getElementById('cred-result-box');
  const scoreNum = document.getElementById('cred-score-num');
  const badgeRank = document.getElementById('cred-badge-rank');
  const scoreDetails = document.getElementById('cred-score-details');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const tsubo = parseInt(document.getElementById('cred-tsubo').value) || 35;
    const seismic = document.getElementById('cred-seismic').value;
    const thermal = document.getElementById('cred-thermal').value;
    const cval = document.getElementById('cred-cval').value;
    const design = document.getElementById('cred-design').value;

    let baseScore = 60;
    let items = [];

    // Seismic calculation
    if (seismic === 'level3_calc') {
      baseScore += 15;
      items.push('✅ 許容応力度計算 耐震等級3 (100%構造計算データ保管・最高耐震安全性)');
    } else if (seismic === 'level3_equiv') {
      baseScore += 8;
      items.push('⚠️ 簡易等級3相当 (壁量計算のみ・許容応力度計算への引き上げを推奨)');
    } else {
      baseScore += 0;
      items.push('❌ 基準法レベル (耐震性能補強が必要です)');
    }

    // Thermal outer skin
    if (thermal === 'g3_fuka') {
      baseScore += 15;
      items.push('✅ HEAT20 G3 付加断熱 (無加湿・無風で24時間極上温熱環境)');
    } else if (thermal === 'g2_standard') {
      baseScore += 10;
      items.push('✅ HEAT20 G2 高気密断熱 (標準以上の快適温熱性能)');
    } else {
      baseScore += 3;
      items.push('⚠️ ZEH基準レベル (将来の光熱費高騰リスクに注意)');
    }

    // C-value airtightness
    if (cval === 'c03') {
      baseScore += 10;
      items.push('✅ 全棟現場気密測定 C値1.0以下保証/実測0.3台 (漏気・壁体内結露リスクゼロ証明)');
    } else if (cval === 'c10') {
      baseScore += 5;
      items.push('⚠️ C値1.0目標 (気密測定の全棟実施を推奨)');
    } else {
      baseScore += 0;
      items.push('❌ 気密測定なし (隙間風・内部結露のリスクあり)');
    }

    // Design process
    if (design === 'ai_studio') {
      baseScore += 10;
      items.push('✅ AIパース工房 + 現場ダイレクト移管 (営業コスト0円化・施工再現度100%)');
    } else {
      baseScore += 2;
      items.push('⚠️ 営業仲介プロセス (営業歩合コスト発生の可能性あり)');
    }

    let finalScore = Math.min(100, baseScore);
    scoreNum.textContent = finalScore.toFixed(1);

    if (finalScore >= 95) {
      badgeRank.textContent = 'RANK: S+ (超高信頼性・物理破綻なし)';
      badgeRank.style.background = '#059669';
    } else if (finalScore >= 85) {
      badgeRank.textContent = 'RANK: A (高信頼性・要一部微調整)';
      badgeRank.style.background = '#0284c7';
    } else {
      badgeRank.textContent = 'RANK: B (物理データ要再検証)';
      badgeRank.style.background = '#d97706';
    }

    scoreDetails.innerHTML = `
      <p style="margin-bottom: 0.6rem; font-weight: bold;">【想定${tsubo}坪 プランの物理検証チェックリスト】</p>
      <ul style="padding-left: 1.2rem; line-height: 1.8;">
        ${items.map(item => `<li>${item}</li>`).join('')}
      </ul>
      <p style="margin-top: 0.8rem; font-size: 0.9rem; color: #475569;">
        ※本診断結果は「CredLayer 信頼実証ガイドライン」に基づき算出されています。専属AIエージェントおよび専任スタッフへそのまま共有いただけます。
      </p>
    `;

    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// =========================================================
// 13. 私のわがまま 俺のわがまま かなう家 (Interactive Showcase Engine)
// =========================================================
let allWagamaData = [];
let currentWagamaCategory = 'all';
let wagamaVisibleCount = 9;

async function initWagamaShowcase() {
  const container = document.getElementById('wagama-cards-grid');
  const tabs = document.querySelectorAll('.wagama-tab-btn');
  const loadMoreBtn = document.getElementById('wagama-load-more-btn');
  const countAllEl = document.getElementById('wagama-count-all');
  if (!container) return;

  try {
    const res = await fetch('/data/wagama_testimonials.json');
    if (!res.ok) return;
    allWagamaData = await res.json();

    if (countAllEl) countAllEl.textContent = allWagamaData.length;

    // Tab switcher listeners
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.background = '#fff';
          const cat = t.getAttribute('data-wagama-cat');
          if (cat === 'ore_wagama') t.style.color = '#0284c7';
          else if (cat === 'watashi_wagama') t.style.color = '#d97706';
          else if (cat === 'client_voice') t.style.color = '#059669';
          else t.style.color = 'var(--primary-green)';
        });

        tab.classList.add('active');
        const cat = tab.getAttribute('data-wagama-cat');
        if (cat === 'ore_wagama') { tab.style.background = '#0284c7'; tab.style.color = '#fff'; }
        else if (cat === 'watashi_wagama') { tab.style.background = '#d97706'; tab.style.color = '#fff'; }
        else if (cat === 'client_voice') { tab.style.background = '#059669'; tab.style.color = '#fff'; }
        else { tab.style.background = 'var(--primary-green)'; tab.style.color = '#fff'; }

        currentWagamaCategory = cat;
        wagamaVisibleCount = 9;
        renderWagamaCards();
      });
    });

    // Load More listener
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        wagamaVisibleCount += 9;
        renderWagamaCards();
      });
    }

    renderWagamaCards();
  } catch (err) {
    console.error('[Wagama Showcase Load Error]', err);
  }
}

function renderWagamaCards() {
  const container = document.getElementById('wagama-cards-grid');
  const loadMoreBtn = document.getElementById('wagama-load-more-btn');
  if (!container) return;

  const filtered = allWagamaData.filter(item => {
    if (currentWagamaCategory === 'all') return true;
    return item.category === currentWagamaCategory;
  });

  const toShow = filtered.slice(0, wagamaVisibleCount);

  container.innerHTML = toShow.map(item => {
    let badgeClass = 'voice';
    let badgeLabel = item.badge;
    let resolIcon = '🔨';
    let resolText = '大工手刻み × 構造建築士が完全具現化';

    if (item.category === 'ore_wagama') {
      badgeClass = 'ore';
      resolIcon = '📐';
      resolText = '許容応力度計算耐震等級3 × 気密C値0.2台';
    } else if (item.category === 'watashi_wagama') {
      badgeClass = 'watashi';
      resolIcon = '🌲';
      resolText = '吉野杉・珪藻土・十和田石の職人手づくり';
    }

    return `
      <div class="wagama-card">
        <div class="wagama-card-thumb-wrap">
          <img src="${item.image}" alt="${item.title}" class="wagama-card-thumb" loading="lazy" />
          <span class="wagama-badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="wagama-card-body">
          <h3 class="wagama-card-title">${item.title}</h3>
          <div class="wagama-speech-bubble">
            ${item.oral_story}
          </div>
          <div class="wagama-craft-resolution">
            <span>${resolIcon}</span>
            <span>${resolText}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (loadMoreBtn) {
    if (wagamaVisibleCount >= filtered.length) {
      loadMoreBtn.style.display = 'none';
    } else {
      loadMoreBtn.style.display = 'inline-block';
      loadMoreBtn.textContent = `さらに「わがまま・生の声」を見る (残り${filtered.length - wagamaVisibleCount}件) ↓`;
    }
  }
}

// Global Window Export for Backward Compatibility
if (typeof window !== 'undefined') {
  window.initCredLayerStudio = initCredLayerStudio;
  window.initWagamaShowcase = initWagamaShowcase;
  window.renderWagamaCards = renderWagamaCards;
}
