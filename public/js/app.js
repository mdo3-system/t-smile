// =========================================================
// 株式会社住ま居る Web App Client Script
// Single Page Application Router & Interactive AI Queue Client
// =========================================================

let currentUser = null;
let currentActiveJobId = null;
let jobPollInterval = null;

const mountedSections = new Set();

function initDeferredSection(sectionId) {
  if (mountedSections.has(sectionId)) return;
  mountedSections.add(sectionId);

  try {
    if (sectionId === 'floorplan-studio') {
      if (typeof initFloorPlanStudio === 'function') initFloorPlanStudio();
    } else if (sectionId === 'ai-studio') {
      if (typeof initAiStudioWizard === 'function') initAiStudioWizard();
      if (typeof initArchiXPresetStudio === 'function') initArchiXPresetStudio();
    } else if (sectionId === 'dashboard') {
      if (typeof initDashboardChat === 'function') initDashboardChat();
      if (typeof updateDashboardMortgageStatus === 'function') updateDashboardMortgageStatus();
    } else if (sectionId === 'admin') {
      if (typeof initAdminFloorplanImporter === 'function') initAdminFloorplanImporter();
    } else if (sectionId === 'article-feature') {
      if (typeof selectArticleChapter === 'function') {
        const hash = (window.location.hash || '').replace('#', '');
        const targetCh = hash.startsWith('art-') ? hash.replace('art-', '') : (/^ch([1-9]|10)$/.test(hash) ? hash : 'ch1');
        selectArticleChapter(targetCh);
      }
    }
  } catch (err) {
    console.warn(`[DeferredInit] Error initializing ${sectionId}:`, err);
  }
}

const fetchingTemplates = new Map();

function ensureSectionMounted(sec, callback) {
  if (!sec) return;
  const tmplId = sec.getAttribute('data-deferred-template');
  if (!tmplId) {
    if (!mountedSections.has(sec.id)) initDeferredSection(sec.id);
    if (callback) callback();
    return;
  }
  if (sec.children && sec.children.length > 0) {
    if (!mountedSections.has(sec.id)) initDeferredSection(sec.id);
    if (callback) callback();
    return;
  }

  const tmpl = document.getElementById(tmplId);
  if (tmpl && tmpl.content && tmpl.content.children.length > 0) {
    sec.appendChild(tmpl.content.cloneNode(true));
    initDeferredSection(sec.id);
    if (callback) callback();
    return;
  }

  // オンデマンド Dynamic Partial Loading (生HTMLファイルサイズ削減＆帯域最適化)
  if (!fetchingTemplates.has(tmplId)) {
    const fetchPromise = fetch(`/partials/templates/${tmplId}.html`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(html => {
        if (tmpl) {
          tmpl.innerHTML = html;
          sec.appendChild(tmpl.content.cloneNode(true));
        } else {
          const temp = document.createElement('div');
          temp.innerHTML = html;
          while (temp.firstChild) sec.appendChild(temp.firstChild);
        }
        initDeferredSection(sec.id);
        if (callback) callback();
      })
      .catch(err => {
        console.warn(`[DynamicPartial] Failed to load ${tmplId}:`, err);
      });
    fetchingTemplates.set(tmplId, fetchPromise);
  } else {
    fetchingTemplates.get(tmplId).then(() => {
      if (callback) callback();
    });
  }
}

function initDeferredSectionObserver() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        ensureSectionMounted(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '300px 0px' });

  document.querySelectorAll('.page-section[data-deferred-template]').forEach(sec => {
    observer.observe(sec);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initMagicLinkAuth();
  initHeroShowcaseSlider();
  initThermalConsultation();
  initFamilyAndScreenSync();
  initRealBookingForm();
  initArticleTabs();
  if (typeof initCaseStudiesGallery === 'function') initCaseStudiesGallery();
  if (typeof initWagamaShowcase === 'function') initWagamaShowcase();
  if (typeof initCredLayerStudio === 'function') initCredLayerStudio();
  initDeferredSectionObserver();
  checkUrlToken();
});

// Top Hero Showcase Slider (First-View Visual Perfection)
function initHeroShowcaseSlider() {
  const stage = document.getElementById('top-hero-slider-stage');
  if (!stage) return;
  const slides = stage.querySelectorAll('.hero-slide-item');
  const dots = stage.querySelectorAll('.hero-dot-indicator');
  const btnPrev = document.getElementById('hero-slider-btn-prev');
  const btnNext = document.getElementById('hero-slider-btn-next');
  if (!slides.length) return;

  let currentSlide = 0;
  let sliderTimer = null;

  function showSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    currentSlide = index;

    slides.forEach((s, i) => {
      if (i === currentSlide) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    dots.forEach((d, i) => {
      if (i === currentSlide) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  function prevSlide() {
    showSlide(currentSlide - 1);
  }

  function startAutoplay() {
    stopAutoplay();
    sliderTimer = setInterval(nextSlide, 5000);
  }

  function stopAutoplay() {
    if (sliderTimer) {
      clearInterval(sliderTimer);
      sliderTimer = null;
    }
  }

  if (btnNext) btnNext.addEventListener('click', () => { nextSlide(); startAutoplay(); });
  if (btnPrev) btnPrev.addEventListener('click', () => { prevSlide(); startAutoplay(); });

  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-slide'), 10);
      if (!isNaN(idx)) {
        showSlide(idx);
        startAutoplay();
      }
    });
  });

  stage.addEventListener('mouseenter', stopAutoplay);
  stage.addEventListener('mouseleave', startAutoplay);
  stage.addEventListener('touchstart', stopAutoplay, { passive: true });
  stage.addEventListener('touchend', startAutoplay, { passive: true });

  startAutoplay();
}

// 1. Navigation & Routing
function initNavigation() {
  const links = document.querySelectorAll('[data-target]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      switchPage(targetId);
      closeMobileDrawer();
    });
  });

  // Handle footer and in-page knowledge links with data-madori-cat / data-thermal-cat
  document.addEventListener('click', (e) => {
    const madoriLink = e.target.closest('[data-madori-cat]');
    if (madoriLink) {
      const isTop = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
      if (isTop) {
        e.preventDefault();
        const cat = madoriLink.getAttribute('data-madori-cat');
        switchPage('madori-consultation-bot');
        const tabBtn = document.getElementById('tab-btn-knowledge');
        if (tabBtn) tabBtn.click();
        if (cat) {
          const pill = document.querySelector(`.madori-tab-pill[data-cat="${cat}"]`);
          if (pill) pill.click();
        }
        const el = document.getElementById('madori-consultation-bot');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `/#madori-consultation-bot?cat=${cat}`);
      }
    }

    const thermalLink = e.target.closest('[data-thermal-cat]');
    if (thermalLink) {
      const isTop = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
      if (isTop) {
        e.preventDefault();
        const cat = thermalLink.getAttribute('data-thermal-cat');
        switchPage('thermal-consultation');
        if (cat) {
          const pill = document.querySelector(`.thermal-tab-pill[data-cat="${cat}"]`);
          if (pill) pill.click();
        }
        const el = document.getElementById('thermal-consultation');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `/#thermal-consultation?cat=${cat}`);
      }
    }
  });

  // Handle browser back/forward buttons (History API) and direct hash change
  window.addEventListener('popstate', (e) => {
    const pageId = (window.location.hash || '').replace(/^#+/, '') || 'top';
    switchPage(pageId, false);
  });
  window.addEventListener('hashchange', (e) => {
    const pageId = (window.location.hash || '').replace(/^#+/, '') || 'top';
    switchPage(pageId, false);
  });

  // Initial load deep link support (e.g. #ai-studio)
  if (window.location.hash) {
    const initHash = (window.location.hash || '').replace(/^#+/, '');
    if (initHash && initHash !== 'top') {
      setTimeout(() => {
        switchPage(initHash, false);
      }, 100);
    }
  }

  // Mobile Drawer Toggle
  const toggleBtn = document.getElementById('nav-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');

  if (toggleBtn && drawer && overlay) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('active');
      if (isOpen) {
        closeMobileDrawer();
      } else {
        openMobileDrawer();
      }
    });

    overlay.addEventListener('click', closeMobileDrawer);
  }
}

function openMobileDrawer() {
  const toggleBtn = document.getElementById('nav-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (toggleBtn) toggleBtn.classList.add('active');
  if (drawer) drawer.classList.add('active');
  if (overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileDrawer() {
  const toggleBtn = document.getElementById('nav-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (toggleBtn) toggleBtn.classList.remove('active');
  if (drawer) drawer.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

let isSwitchingPage = false;
function switchPage(pageId, pushState = true) {
  if (isSwitchingPage) return;
  isSwitchingPage = true;
  try {
    let rawId = (pageId || 'top').replace(/^#+/, '');
    let effectivePageId = rawId;
    let scrollToAnchor = null;

    if (rawId === 'our-philosophy') {
      effectivePageId = 'top';
      scrollToAnchor = 'our-philosophy';
    } else if (rawId === 'real-booking-section' || rawId === 'real-booking') {
      effectivePageId = 'scent-experience';
      scrollToAnchor = 'real-booking-section';
    } else if (rawId === 'wagama-showcase' || rawId === 'wagama') {
      window.location.href = '/wagama/';
      isSwitchingPage = false;
      return;
    } else if (rawId === 'floorplan-bubble') {
      effectivePageId = 'floorplan-studio';
      setTimeout(() => {
        const bubbleBtn = document.getElementById('btn-fp-mode-bubble');
        if (bubbleBtn) bubbleBtn.click();
      }, 150);
    } else if (rawId === 'article-feature' || rawId.startsWith('art-ch') || /^ch([1-9]|10)$/.test(rawId)) {
      effectivePageId = 'article-feature';
      let targetCh = 'ch1';
      if (rawId.startsWith('art-ch')) targetCh = rawId.replace('art-', '');
      else if (/^ch([1-9]|10)$/.test(rawId)) targetCh = rawId;
      scrollToAnchor = 'article-feature';
      setTimeout(() => {
        if (typeof selectArticleChapter === 'function') {
          selectArticleChapter(targetCh, false);
        }
      }, 120);
    } else if (rawId.startsWith('madori-consultation') || rawId.startsWith('madori-bot')) {
      effectivePageId = 'madori-consultation-bot';
      scrollToAnchor = 'madori-consultation-bot';
      setTimeout(() => {
        const tabBtn = document.getElementById('tab-btn-knowledge');
        if (tabBtn) tabBtn.click();
        
        let targetCat = null;
        const catMatch = (window.location.hash + window.location.search).match(/[?&]cat=([a-zA-Z0-9_]+)/);
        if (catMatch) targetCat = catMatch[1];
        if (targetCat) {
          const pill = document.querySelector(`.madori-tab-pill[data-cat="${targetCat}"]`);
          if (pill) pill.click();
        }
      }, 150);
    } else if (rawId.startsWith('thermal-consultation')) {
      effectivePageId = 'thermal-consultation';
      scrollToAnchor = 'thermal-consultation';
      setTimeout(() => {
        let targetCat = null;
        const catMatch = (window.location.hash + window.location.search).match(/[?&]cat=([a-zA-Z0-9_]+)/);
        if (catMatch) targetCat = catMatch[1];
        if (targetCat) {
          const pill = document.querySelector(`.thermal-tab-pill[data-cat="${targetCat}"]`);
          if (pill) pill.click();
        }
      }, 150);
    }

    // ページ内に該当するIDの要素（アンカー等）が直接存在するか確認
    const directElem = document.getElementById(rawId);
    const normalizedPath = window.location.pathname.replace(/\/index\.html$/, '/');
    const isTopPage = normalizedPath === '/' || normalizedPath === '';

    // トップページ以外の静的サブページの場合
    if (!isTopPage) {
      if (directElem) {
        // 同一ページ内のアンカーが存在する場合はその位置へスクロール
        directElem.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      // トップページの専用SPAセクションへの明確な移動指定である場合のみトップへ遷移
      const topSpaSections = ['top', 'ai-studio', 'floorplan-studio', 'craftsmanship', 'metaverse', 'scent-experience', 'article-feature', 'dashboard', 'credlayer', 'madori-consultation-bot', 'thermal-consultation', 'our-philosophy', 'real-booking-section'];
      if (topSpaSections.includes(effectivePageId)) {
        window.location.href = '/' + (effectivePageId === 'top' && !scrollToAnchor ? '' : '#' + rawId);
      }
      return;
    }

    let targetSec = document.getElementById(effectivePageId);
    if (!targetSec) {
      if (directElem) {
        directElem.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      effectivePageId = 'top';
      targetSec = document.getElementById('top');
    }

    if (!targetSec) return;

    // Ensure deferred template content is mounted into DOM
    ensureSectionMounted(targetSec, () => {
      if (effectivePageId === 'floorplan-studio' && typeof window.initFloorPlanStudio === 'function') {
        window.initFloorPlanStudio();
      } else if (effectivePageId === 'dashboard') {
        loadDashboardData();
      }
    });

    // Update browser URL hash & history state
    if (pushState && window.history && window.history.pushState) {
      const targetHash = effectivePageId === 'top' && !scrollToAnchor ? '' : '#' + rawId;
      const currentHash = window.location.hash;
      if (targetHash !== currentHash) {
        if (targetHash === '') {
          window.history.pushState({ pageId: 'top' }, '', window.location.pathname + window.location.search);
        } else {
          window.history.pushState({ pageId: rawId }, '', targetHash);
        }
      }
    }

  const sections = document.querySelectorAll('.page-section');
  sections.forEach(sec => sec.classList.remove('active'));
  
  if (targetSec) {
    targetSec.classList.add('active');
    if (scrollToAnchor) {
      const scrollFn = () => {
        const anchorEl = document.getElementById(scrollToAnchor);
        if (anchorEl) anchorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      setTimeout(scrollFn, 60);
      setTimeout(scrollFn, 200);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Sync Desktop Navbar Active State
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(nl => {
    nl.classList.remove('active');
    if (nl.getAttribute('data-target') === pageId) {
      nl.classList.add('active');
    }
  });

  // Sync Mobile Drawer Links Active State
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');
  mobileLinks.forEach(ml => {
    ml.classList.remove('active');
    if (ml.getAttribute('data-target') === pageId) {
      ml.classList.add('active');
    }
  });

  // Sync Mobile Bottom Bar Active State
  const bottomTabs = document.querySelectorAll('.bottom-tab-btn');
  bottomTabs.forEach(bt => {
    bt.classList.remove('active');
    if (bt.getAttribute('data-target') === pageId) {
      bt.classList.add('active');
    }
  });

  // Page specific initializers
  if (effectivePageId === 'dashboard') {
    loadDashboardData();
  } else if (effectivePageId === 'admin') {
    loadAdminData();
    loadAdminPlansData();
  }

    // Screen synchronization broadcast
    if (pushState && typeof broadcastScreenState === 'function') {
      broadcastScreenState('navigate', { pageId: effectivePageId });
    }
  } finally {
    isSwitchingPage = false;
  }
}

// 2. Check Magic Link URL Token
function checkUrlToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    fetch(`/api/auth/verify?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          currentUser = data.user;
          updateAuthUI();
          switchPage('dashboard');
        }
      })
      .catch(console.error);
  }
}

function updateAuthUI() {
  const authBtn = document.getElementById('nav-auth-btn');
  if (currentUser) {
    authBtn.textContent = `マイページ (${currentUser.name}様)`;
    authBtn.setAttribute('data-target', 'dashboard');
  } else {
    authBtn.textContent = 'ログイン / 無料マイページ作成';
  }
}

// 3. Magic Link Auth Modal
function initMagicLinkAuth() {
  const modal = document.getElementById('auth-modal');
  const openBtns = document.querySelectorAll('.open-auth-modal');
  const closeBtn = document.getElementById('close-auth-modal');
  const form = document.getElementById('magic-link-form');

  openBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentUser) {
        switchPage('dashboard');
      } else {
        modal.classList.add('active');
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('auth-name').value;
      const email = document.getElementById('auth-email').value;
      const phoneInput = document.getElementById('auth-phone');
      const phone = phoneInput ? phoneInput.value : '';

      try {
        const res = await fetch('/api/auth/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone })
        });
        const data = await res.json();
        if (data.success) {
          currentUser = data.user;
          updateAuthUI();
          modal.classList.remove('active');
          alert(`【マジックリンク発行成功】\n${data.message}\nお施主様専用プロジェクトルームへ移動します。`);
          switchPage('dashboard');
        } else {
          alert(data.error);
        }
      } catch (err) {
        alert('マジックリンク発行エラー: ' + err.message);
      }
    });
  }
}

// 4. AI Studio Interactive Wizard & Queue Client
function initAiStudioWizard() {
  const form = document.getElementById('ai-studio-wizard-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const houseType = document.getElementById('wiz-type').value;
    const style = document.getElementById('wiz-style').value;
    const exterior = document.getElementById('wiz-exterior').value;
    const eave = document.getElementById('wiz-eave').value;
    const lighting = document.getElementById('wiz-lighting').value;

    // AI Automatic Prompt Converter (Japanese Dialogue -> English Prompt)
    const prompt = `Architectural 3D render of a luxury ${houseType}, ${style} style, exterior wall with ${exterior}, ${eave}, ${lighting}, HEAT20 G3 high performance custom house in Saitama Japan, photorealistic, 8k resolution, archdaily featured`;
    const negativePrompt = `low quality, distorted structure, unrealistic roof, broken lines, bad geometry`;

    document.getElementById('wiz-generated-prompt').textContent = prompt;
    document.getElementById('queue-status-box').style.display = 'block';

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser ? currentUser.id : 'guest',
          prompt,
          negativePrompt,
          style
        })
      });
      const data = await res.json();
      if (data.success) {
        currentActiveJobId = data.job.id;
        startJobPolling(currentActiveJobId);
      }
    } catch (err) {
      alert('パース生成リクエストエラー: ' + err.message);
    }
  });
}

function startJobPolling(jobId) {
  if (jobPollInterval) clearInterval(jobPollInterval);

  const badge = document.getElementById('queue-badge');
  const previewBox = document.getElementById('render-result-preview');

  jobPollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (!data.success) return;

      const job = data.job;

      if (job.status === 'queued') {
        badge.className = 'queue-badge';
        badge.textContent = `⏳ サーバー順番待ち中 (順番: ${job.position}番目)`;
      } else if (job.status === 'processing') {
        badge.className = 'queue-badge';
        badge.textContent = `⚡ ローカルGPUマシンにてパースレンダリング中... (1棟ずつ高精細処理)`;
      } else if (job.status === 'completed') {
        clearInterval(jobPollInterval);
        badge.className = 'queue-badge completed';
        badge.textContent = `✅ 建築パースの生成が完了しました！`;

        previewBox.innerHTML = `
          <div class="render-preview-frame">
            <img src="${job.image_url}" alt="生成されたパース" />
          </div>
          <div style="margin-top: 1rem; text-align: center;">
            <button class="btn btn-primary open-auth-modal">このパースをマイページに保存・建築士に相談する →</button>
          </div>
        `;
      } else if (job.status === 'failed') {
        clearInterval(jobPollInterval);
        badge.className = 'queue-badge';
        badge.textContent = `❌ レンダリングエラー: ${job.error}`;
      }
    } catch (err) {
      console.error(err);
    }
  }, 2000);
}

// 5. Dedicated Dashboard & AI Agent Chat
async function loadDashboardData() {
  const userNameEl = document.getElementById('dash-user-name');
  const userPhoneEl = document.getElementById('dash-user-phone');
  const userEmailEl = document.getElementById('dash-user-email');

  if (!currentUser) {
    if (userNameEl) userNameEl.textContent = 'ゲストお施主様（ブラウザ保存中）';
    if (userPhoneEl) userPhoneEl.textContent = '未登録（不要・営業電話ゼロ）';
    if (userEmailEl) userEmailEl.textContent = '未連携（LINEまたはメールで共有可能）';

    // ゲスト用カルテ連携案内バーの表示
    const headerBox = document.querySelector('#dashboard .dashboard-header') || document.querySelector('#dashboard h2');
    let guestNotice = document.getElementById('dash-guest-notice');
    if (!guestNotice && headerBox && headerBox.parentNode) {
      guestNotice = document.createElement('div');
      guestNotice.id = 'dash-guest-notice';
      guestNotice.style.cssText = 'background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #86efac; border-radius: 12px; padding: 1rem 1.4rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 15px rgba(5,150,105,0.08);';
      guestNotice.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.6rem;">📱</span>
          <div>
            <div style="font-weight: 800; color: #15803d; font-size: 0.95rem;">
              現在はゲスト（ブラウザ一時保存）としてカルテを表示しています
            </div>
            <div style="font-size: 0.78rem; color: #047857; margin-top: 2px;">
              ストックした間取り図面や住宅ローン診断結果は端末に安全に保存されています。公式LINEと連携すると、他端末や夫婦間での共有・担当スタッフとの個別相談チャットがご利用いただけます。
            </div>
          </div>
        </div>
        <button type="button" onclick="document.getElementById('auth-modal').classList.add('active')" class="btn" style="background: #06c755; color: #fff; font-weight: 800; font-size: 0.85rem; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 10px rgba(6,199,85,0.3);">
          💬 公式LINE連携・ログイン →
        </button>
      `;
      headerBox.parentNode.insertBefore(guestNotice, headerBox.nextSibling);
    } else if (guestNotice) {
      guestNotice.style.display = 'flex';
    }

    updateDashboardSavedPlans();
    updateDashboardMortgageStatus();
    updateDashboardScheduleStatus();
    return;
  }

  const guestNotice = document.getElementById('dash-guest-notice');
  if (guestNotice) guestNotice.style.display = 'none';

  if (userNameEl) userNameEl.textContent = `${currentUser.name} 様`;
  if (userPhoneEl) userPhoneEl.textContent = currentUser.phone || '未登録';
  if (userEmailEl) userEmailEl.textContent = currentUser.email || '未登録';

  updateDashboardSavedPlans();
  updateDashboardMortgageStatus();
  updateDashboardScheduleStatus();

  try {
    const res = await fetch(`/api/dashboard/${currentUser.id}`);
    const data = await res.json();
    if (!data.success) return;

    // Render Saved Perspective Gallery
    const rendersBox = document.getElementById('dash-renders-gallery');
    if (data.jobs && data.jobs.length > 0) {
      rendersBox.innerHTML = data.jobs.filter(j => j.image_url).map(j => `
        <div style="background: rgba(0,0,0,0.4); border-radius: 8px; overflow: hidden; margin-bottom: 1rem;">
          <img src="${j.image_url}" style="width: 100%; height: 160px; object-fit: cover;" />
          <div style="padding: 0.5rem; font-size: 0.8rem; color: #94a3b8;">${new Date(j.created_at).toLocaleString('ja-JP')}</div>
        </div>
      `).join('');
    } else {
      rendersBox.innerHTML = '<p style="color: #94a3b8; font-size: 0.9rem;">まだ保存されたパースはありません。</p>';
    }

    // Render Shared Files List
    const filesBox = document.getElementById('dash-files-list');
    if (data.files && data.files.length > 0) {
      filesBox.innerHTML = data.files.map(f => `
        <div class="file-item">
          <div>
            <div style="font-weight: 700; font-size: 0.9rem;">📄 ${f.filename}</div>
            <div style="font-size: 0.75rem; color: #94a3b8;">提供: ${f.uploaded_by} | ${(f.filesize/1024/1024).toFixed(2)} MB</div>
          </div>
          <a href="${f.url}" download class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">ダウンロード</a>
        </div>
      `).join('');
    }

    // Render Chat Messages
    renderChatMessages(data.messages);
  } catch (err) {
    console.error(err);
  }
}

function renderChatMessages(messages) {
  const box = document.getElementById('chat-history-box');
  if (!box) return;

  box.innerHTML = messages.map(m => {
    let senderBadge = '';
    if (typeof window.formatStaffSenderBadge === 'function') {
      senderBadge = window.formatStaffSenderBadge(m);
    } else {
      senderBadge = m.sender === 'user' ? '<span style="color:#f59e0b;font-weight:800;">👤 お施主様</span>' : 
                   (m.sender === 'ai' ? '<span style="color:#38bdf8;font-weight:800;">🤖 建築AIエージェント</span>' : 
                   `<span style="background:#e0f2fe;color:#0284c7;padding:2px 8px;border-radius:6px;font-weight:800;">🧑‍💼 ${m.sender_role || m.senderRole || '専任スタッフ'}</span>`);
    }

    const isUser = m.sender === 'user';
    return `
      <div class="chat-bubble ${isUser ? 'user' : ''}" style="${!isUser && m.sender !== 'ai' ? 'border-left: 4px solid #0284c7;' : ''}">
        <div style="font-size: 0.75rem; margin-bottom: 4px;">
          ${senderBadge}
        </div>
        <div style="white-space: pre-wrap;">${m.text}</div>
      </div>
    `;
  }).join('');

  box.scrollTop = box.scrollHeight;
}

function initDashboardChat() {
  const form = document.getElementById('dashboard-chat-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    // 管理者スタッフ判定（係がログイン中ならその係として返信）
    const currentAdmin = typeof window.getCurrentAdminStaff === 'function' ? window.getCurrentAdminStaff() : null;
    const isStaffOperating = Boolean(currentAdmin);

    const payload = {
      text,
      sender: isStaffOperating ? 'staff' : 'user',
      senderRole: isStaffOperating ? currentAdmin.role_name : null,
      senderName: isStaffOperating ? currentAdmin.name : null
    };

    try {
      const res = await fetch(`/api/dashboard/${currentUser.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
      // オフライン/静的ホスティング用フォールバック
      try {
        const localKey = `smile_carte_messages_${currentUser.id}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        existing.push({
          id: 'msg_' + Date.now(),
          user_id: currentUser.id,
          sender: payload.sender,
          sender_role: payload.senderRole,
          sender_name: payload.senderName,
          text: payload.text,
          created_at: new Date().toISOString()
        });
        localStorage.setItem(localKey, JSON.stringify(existing));
        renderChatMessages(existing);
      } catch (_) {}
    }
  });

  // File Upload Button (Supports ArchiX, ARCHITREND ZERO, PDF, 3D glTF/GLB, CAD)
  const uploadBtn = document.getElementById('dash-upload-btn');
  const realFileInput = document.getElementById('dash-real-file-input');
  if (uploadBtn && realFileInput) {
    uploadBtn.addEventListener('click', () => {
      if (!currentUser) {
        alert('家カルテの閲覧権限（マジックリンク）でログインしてください。');
        return;
      }
      realFileInput.value = '';
      realFileInput.click();
    });

    realFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !currentUser) return;

      const ext = file.name.split('.').pop().toLowerCase();
      let filetypeCategory = '📄 設計図面・文書';
      let mime = file.type || 'application/octet-stream';
      let icon = '📄';

      if (['glb', 'gltf'].includes(ext)) {
        filetypeCategory = '🏛️ ArchiX 3D立体モデル (メタバース)';
        icon = '🏛️';
      } else if (ext === 'pdf') {
        filetypeCategory = '📐 確定図面・温熱構造計算書 (PDF)';
        icon = '📐';
      } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        filetypeCategory = '🎨 CGレンダリング・フォトリアルパース';
        icon = '🎨';
      } else if (['ifc', 'dxf', 'jww'].includes(ext)) {
        filetypeCategory = '📐 CAD・BIM構造設計データ';
        icon = '📐';
      } else if (ext === 'xml') {
        filetypeCategory = '⚡ 外皮性能・省エネ温熱計算データ';
        icon = '⚡';
      }

      const fileData = {
        id: 'file-' + Date.now(),
        filename: `${icon} ${file.name} [${filetypeCategory}]`,
        filesize: file.size || 2500000,
        filetype: mime,
        uploadedBy: `${currentUser.name || 'お施主様'} (アーキトレンド連携)`,
        uploadedAt: new Date().toISOString(),
        url: URL.createObjectURL(file)
      };

      try {
        const res = await fetch(`/api/dashboard/${currentUser.id}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fileData)
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
        }
      } catch (err) {
        console.warn('Server upload notice, updating local carte:', err);
      }

      // Ensure local state is updated immediately
      if (!currentUser.sharedFiles) currentUser.sharedFiles = [];
      currentUser.sharedFiles.unshift(fileData);
      alert(`【家カルテ登録完了】\n「${file.name}」を共有ファイル・構造計算書に登録しました！\n専任スタッフおよびAIエージェントへリアルタイム共有されました。`);
      loadDashboardData();
    });
  }
}

// 5-B. Family Account Management & Real-time Screen Sync (Live Follow)
let currentFamilyRole = 'husband';
let currentFamilyName = '太郎 (ご主人)';
let currentSyncMode = 'none'; // 'none', 'follow_husband', 'follow_wife', 'broadcast'
let familySyncChannel = null;

if (typeof BroadcastChannel !== 'undefined') {
  try {
    familySyncChannel = new BroadcastChannel('smile_family_screen_sync');
    familySyncChannel.onmessage = (event) => {
      handleIncomingScreenSync(event.data);
    };
  } catch (err) {
    console.warn('BroadcastChannel not supported, using storage fallback:', err);
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === 'smile_family_sync_event' && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);
      handleIncomingScreenSync(data);
    } catch (err) {}
  }
});

function broadcastScreenState(action, payload = {}) {
  const select = document.getElementById('dash-screen-sync-mode');
  const syncMode = select ? select.value : currentSyncMode;
  
  // Broadcast if in broadcast mode or if user is active husband/wife
  const data = {
    senderRole: currentFamilyRole,
    senderName: currentFamilyName,
    syncMode: syncMode,
    action: action,
    payload: payload,
    timestamp: Date.now()
  };

  if (familySyncChannel) {
    try { familySyncChannel.postMessage(data); } catch (e) {}
  }
  try {
    localStorage.setItem('smile_family_sync_event', JSON.stringify(data));
  } catch (err) {}
}

function handleIncomingScreenSync(data) {
  if (!data || data.senderRole === currentFamilyRole) return; // Ignore own events
  const select = document.getElementById('dash-screen-sync-mode');
  const syncMode = select ? select.value : currentSyncMode;

  const shouldFollow = 
    (syncMode === 'follow_husband' && (data.senderRole === 'husband' || data.senderRole.includes('husband'))) ||
    (syncMode === 'follow_wife' && (data.senderRole === 'wife' || data.senderRole.includes('wife')));

  if (!shouldFollow) return;

  if (data.action === 'navigate' && data.payload && data.payload.pageId) {
    console.log(`[ScreenSync] Following ${data.senderName} to ${data.payload.pageId}`);
    switchPage(data.payload.pageId, false);
    showSyncToast(`📡 ${data.senderName}の画面に追従中: 「${data.payload.pageId}」へ移動しました`);
  }
}

function showSyncToast(msg) {
  let toast = document.getElementById('dash-sync-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'dash-sync-toast';
    toast.style.cssText = 'position: fixed; bottom: 85px; right: 24px; background: #0f172a; color: #ffffff; padding: 11px 18px; border-radius: 10px; font-size: 0.84rem; font-weight: 700; z-index: 999999; box-shadow: 0 6px 22px rgba(0,0,0,0.35); border-left: 4px solid #38bdf8; transition: opacity 0.3s, transform 0.3s; opacity: 0; transform: translateY(12px); pointer-events: none;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
  }, 3500);
}

function initFamilyAndScreenSync() {
  const modeSelect = document.getElementById('dash-screen-sync-mode');
  const liveBadge = document.getElementById('dash-sync-live-badge');
  const memberWrap = document.getElementById('dash-family-members-wrap');
  const addBtn = document.getElementById('btn-add-family-member');

  if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
      currentSyncMode = e.target.value;
      if (liveBadge) {
        liveBadge.style.display = currentSyncMode !== 'none' ? 'inline-block' : 'none';
      }
      if (currentSyncMode === 'follow_husband') {
        showSyncToast('👨 ご主人（夫）の画面をライブ追従します');
      } else if (currentSyncMode === 'follow_wife') {
        showSyncToast('👩 奥様（妻）の画面をライブ追従します');
      } else if (currentSyncMode === 'broadcast') {
        showSyncToast('📢 あなたの操作画面を家族にリアルタイム配信しています');
        broadcastScreenState('navigate', { pageId: window.location.hash.replace('#', '') || 'dashboard' });
      } else {
        showSyncToast('自由操作モード（個別操作）に戻りました');
      }
    });
  }

  // Handle switching active member tag
  if (memberWrap) {
    memberWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-member-tag');
      if (!btn) return;
      const role = btn.getAttribute('data-member-role');
      const name = btn.getAttribute('data-member-name');
      if (role && name) {
        currentFamilyRole = role;
        currentFamilyName = name;
        memberWrap.querySelectorAll('.btn-member-tag').forEach(b => {
          b.classList.remove('active');
          b.style.background = '#f1f5f9';
          b.style.color = '#334155';
          b.style.border = '1px solid #cbd5e1';
          const badge = b.querySelector('.tag-operating');
          if (badge) badge.remove();
        });
        btn.classList.add('active');
        btn.style.background = '#0284c7';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.insertAdjacentHTML('beforeend', ' <span class="tag-operating" style="font-size: 0.7rem; background: rgba(255,255,255,0.3); padding: 1px 6px; border-radius: 10px; margin-left: 4px;">操作中</span>');
        showSyncToast(`👤 現在「${name}」として家カルテを操作中`);
      }
    });
  }

  // Handle Add Family Member
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const relation = prompt('追加するご家族の続柄とお名前を入力してください\n（例: お父様、お母様、長男 蓮、長女 結衣 など）');
      if (!relation || !relation.trim()) return;
      const trimmed = relation.trim();
      const newRole = 'family_' + Date.now();
      const newTag = document.createElement('button');
      newTag.type = 'button';
      newTag.className = 'btn-member-tag';
      newTag.setAttribute('data-member-role', newRole);
      newTag.setAttribute('data-member-name', trimmed);
      newTag.style.cssText = 'background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 5px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px;';
      newTag.innerHTML = `<span>👥</span> ${trimmed}`;
      
      memberWrap.insertBefore(newTag, addBtn);
      showSyncToast(`👨‍👩‍👧‍👦 ご家族に「${trimmed}」を追加登録しました！`);
    });
  }
}

// 5.5. Saved Plans & Custom Notes in Carte
function updateDashboardSavedPlans() {
  const container = document.getElementById('dash-saved-plans-list');
  if (!container) return;

  try {
    const raw = localStorage.getItem('smile_house_carte_data');
    let plans = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        plans = parsed;
      } else if (parsed && parsed.savedPlans) {
        plans = parsed.savedPlans;
      }
    }

    if (plans && plans.length > 0) {
      container.innerHTML = plans.map(p => `
        <div style="background: rgba(255, 255, 255, 0.08); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: 10px; padding: 12px; margin-bottom: 12px; transition: all 0.2s;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
            <strong style="color: #ffffff; font-size: 0.88rem; line-height: 1.35;">${p.title || p.id}</strong>
            <span style="font-size: 0.7rem; background: #0284c7; color: #fff; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">${p.tsubo ? `${p.tsubo}坪` : ''}</span>
          </div>
          ${p.thumb ? `<img src="${p.thumb}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; background: #000;" />` : ''}
          <div style="background: rgba(0, 0, 0, 0.3); border: 1px dashed rgba(56, 189, 248, 0.4); border-radius: 6px; padding: 8px; font-size: 0.78rem; color: #e2e8f0; line-height: 1.5; margin-bottom: 8px;">
            <span style="color: #38bdf8; font-weight: 800;">📝 あなたの希望メモ:</span><br>
            ${p.memo ? p.memo : '<span style="color: #94a3b8; font-style: italic;">（メモ未記入・「ここをこうしたい！」をストックできます）</span>'}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
            <a href="/plans/detail/${(p.id || '').toLowerCase()}.html" target="_blank" style="font-size: 0.74rem; color: #38bdf8; font-weight: 700; text-decoration: none;">図面詳細を見る ↗</a>
            <a href="/#real-booking-section" style="font-size: 0.72rem; background: #059669; color: #fff; padding: 4px 10px; border-radius: 4px; text-decoration: none; font-weight: 800;">このメモで相談 ➜</a>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.04); border: 1px dashed rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 14px; text-align: center; font-size: 0.8rem; color: #94a3b8;">
          まだ保存された間取りプランはありません。<br>
          <a href="/plans/" target="_blank" style="color: #38bdf8; font-weight: 800; text-decoration: underline; display: inline-block; margin-top: 6px;">
            323プラン集から選んで希望メモを添えて保存 ➜
          </a>
        </div>
      `;
    }
  } catch(e) {
    console.error('Failed to update dashboard saved plans:', e);
  }
}

// 6. Real Model House Booking Form
function updateDashboardMortgageStatus() {
  const card = document.getElementById('dash-mortgage-status-card');
  if (!card) return;
  try {
    const raw = localStorage.getItem('smile_house_carte_data');
    if (raw) {
      const carte = JSON.parse(raw);
      if (carte && carte.savedMortgage && carte.savedMortgage.bestBank) {
        const sm = carte.savedMortgage;
        const b = sm.bestBank;
        card.style.background = '#eff6ff';
        card.style.border = '1.5px solid #3b82f6';
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-size: 0.82rem; font-weight: 800; color: #1e40af;">🏦 家カルテ登録済み 最適ローン診断結果</div>
            <span style="font-size: 0.72rem; color: #0284c7; background: #dbeafe; padding: 2px 8px; border-radius: 10px; font-weight: 800;">第1位推奨（${sm.savedAt || '保存済み'}）</span>
          </div>
          <div style="font-size: 1.05rem; font-weight: 900; color: #0f172a;">${b.name}：${b.rateType || '変動'} <span style="color: #0284c7;">${b.rate}</span></div>
          <div style="font-size: 0.82rem; color: #0369a1; font-weight: 800; margin-top: 4px;">
            借入想定: ${sm.borrowAmount || 3500}万円（${sm.repayYears || 35}年返済） ｜ ${b.monthlyPayment ? `目安: <span style="font-size: 0.95rem; color: #0f172a;">約${b.monthlyPayment.toLocaleString()}円/月</span>` : ''}
          </div>
          <div style="font-size: 0.76rem; color: #475569; margin-top: 3px;">団信: ${b.danshin || ''} ｜ 諸経費目安: ${b.estimatedFees || b.fees || ''}</div>
          <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.74rem; color: #059669; font-weight: 700;">✅ TOP5比較データ保管完了</span>
            <a href="/mortgage/index.html" target="_blank" style="font-size: 0.76rem; color: #0284c7; font-weight: 800; text-decoration: none;">再シミュレーション・TOP5確認 ↗</a>
          </div>
        `;
      }
    }
  } catch(e) {}
}

function updateDashboardScheduleStatus() {
  const percentEl = document.getElementById('dash-schedule-percent-text');
  const barEl = document.getElementById('dash-schedule-progress-bar');
  const countEl = document.getElementById('dash-schedule-count');
  const savedAtEl = document.getElementById('dash-schedule-saved-at');
  const subtextEl = document.getElementById('dash-schedule-subtext');
  if (!percentEl || !barEl) return;

  try {
    const raw = localStorage.getItem('smile_house_carte_data');
    if (!raw) return;
    const carte = JSON.parse(raw);
    if (!carte || !carte.schedule) return;

    const s = carte.schedule;
    const pct = s.percent !== undefined ? s.percent : (s.completedCount ? Math.round((s.completedCount / (s.totalSteps || 18)) * 100) : 0);
    percentEl.textContent = `${pct}%`;
    barEl.style.width = `${pct}%`;

    const completed = s.completedCount !== undefined ? s.completedCount : (s.completedSteps ? s.completedSteps.length : 0);
    const total = s.totalSteps || 18;
    if (countEl) countEl.textContent = `${completed} / ${total}`;

    if (savedAtEl && s.savedAt) {
      try {
        const d = new Date(s.savedAt);
        savedAtEl.textContent = `保存: ${d.toLocaleDateString('ja-JP')} ${d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
        savedAtEl.style.color = '#15803d';
      } catch(e) {
        savedAtEl.textContent = '保存済み';
      }
    }

    if (subtextEl) {
      if (pct === 100) {
        subtextEl.innerHTML = '🎉 <strong style="color: #059669;">祝・お引渡し＆アフターサポート！</strong> 住ま居るの家づくり全工程が完了しました。';
      } else if (pct >= 50) {
        subtextEl.innerHTML = '🏗️ <strong style="color: #0284c7;">着工・上棟・木工事フェーズ</strong> が順調に進行中です。現場写真をカルテにストックできます。';
      } else if (pct >= 20) {
        subtextEl.innerHTML = '📐 <strong style="color: #059669;">プラン申込・JFD敷地測量・基本設計</strong> が進行中です。安心の透明性で打ち合わせを進めています。';
      } else {
        subtextEl.innerHTML = '💡 家づくりの準備フェーズです。チェックを進めて理想のマイホームへの第一歩を踏み出しましょう。';
      }
    }
  } catch (e) {
    console.error('Error updating schedule status on dashboard:', e);
  }
}

function initRealBookingForm() {
  const form = document.getElementById('real-booking-form');
  if (!form) return;

  // Set default date to tomorrow
  const dateInput = document.getElementById('book-date');
  if (dateInput) {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    dateInput.value = tmr.toISOString().split('T')[0];
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('book-name').value;
    const phone = document.getElementById('book-phone').value;
    const email = document.getElementById('book-email').value;
    const preferredDate = document.getElementById('book-date').value;
    const preferredTime = document.getElementById('book-time').value;
    const comments = document.getElementById('book-comments').value;

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, preferredDate, preferredTime, comments })
      });
      const data = await res.json();
      if (data.success) {
        if (data.user) {
          currentUser = data.user;
          updateAuthUI();
        }
        document.getElementById('booking-success-message').style.display = 'block';
        document.getElementById('booking-notice-text').textContent = `${name}様、ご予約ありがとうございます！見学日時: ${preferredDate} ${preferredTime}。ご登録のメール (${email}) 宛てにアクセスマップを送付いたしました。`;
        form.reset();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('予約処理エラー: ' + err.message);
    }
  });
}

// 7. A4 10-Page Feature Article Chapter Tabs Navigation
function selectArticleChapter(targetCh, smoothScroll = false) {
  if (!targetCh) return;
  const cleanCh = targetCh.replace('art-', '');

  const tabs = document.querySelectorAll('.art-tab-btn');
  tabs.forEach(t => {
    if (t.getAttribute('data-tab') === cleanCh) {
      t.classList.add('active');
      try {
        t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (e) {}
    } else {
      t.classList.remove('active');
    }
  });

  const contents = document.querySelectorAll('.art-tab-content');
  contents.forEach(c => {
    c.classList.remove('active');
    c.style.display = '';
  });

  const targetContent = document.getElementById(`art-${cleanCh}`);
  if (targetContent) {
    targetContent.classList.add('active');
    targetContent.style.display = '';
    if (smoothScroll) {
      const tabsNav = document.querySelector('.article-nav-tabs');
      if (tabsNav) {
        tabsNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}

function initArticleTabs() {
  // Document-level event delegation so tabs always work regardless of deferred mounting timing
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.art-tab-btn');
    if (tabBtn) {
      e.preventDefault();
      const targetCh = tabBtn.getAttribute('data-tab');
      if (targetCh) {
        selectArticleChapter(targetCh, false);
      }
      return;
    }

    const chLink = e.target.closest('[data-article-ch]');
    if (chLink) {
      e.preventDefault();
      const targetCh = chLink.getAttribute('data-article-ch');
      if (targetCh) {
        selectArticleChapter(targetCh, true);
      }
      return;
    }
  });
}

// 8. Admin Portal & One-Tap CRM Integration
async function loadAdminData() {
  const usersBox = document.getElementById('admin-users-list');
  if (!usersBox) return;

  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (!data.success) return;

    usersBox.innerHTML = data.users.map(u => `
      <div class="card" style="margin-bottom: 1rem; padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div>
            <h3 style="color: var(--accent-gold); font-size: 1.2rem;">👤 ${u.name} 様</h3>
            <div style="font-size: 0.85rem; color: #94a3b8;">📧 ${u.email} | 📞 ${u.phone}</div>
          </div>
          <div>
            ${u.crm_synced ? 
              `<span style="background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #10b981; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85rem;">✅ CRM同期済み (${new Date(u.crm_synced_at).toLocaleTimeString('ja-JP')})</span>` : 
              `<button class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.85rem;" onclick="triggerCrmSync('${u.id}')">🔄 自社CRMへデータ一括移行 (ワンタップ)</button>`
            }
          </div>
        </div>
        <div style="font-size: 0.85rem; background: rgba(0,0,0,0.3); padding: 0.8rem; border-radius: 8px;">
          登録日時: ${new Date(u.created_at).toLocaleString('ja-JP')} | マジックトークン: <code style="color: #38bdf8;">${u.magic_token}</code>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function triggerCrmSync(userId) {
  try {
    const res = await fetch(`/api/admin/crm-sync/${userId}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`【ワンタップCRM同期成功】\n${data.message}\nJSONペイロードが基幹CRMシステムへ正常転送されました。`);
      loadAdminData();
    }
  } catch (err) {
    alert('CRM同期エラー: ' + err.message);
  }
}

// =========================================================
// --- Extracted Module: floorplan-studio.js ---
// (initFloorPlanStudio, executeAgentChat, renderMultiFloorStudio, renderRoomCards, initArchiXPresetStudio are loaded from /js/floorplan-studio.js)
// =========================================================

// 10. 24/365 AI Building Physics & Thermal Environment Consultation Chat
function initThermalConsultation() {
  const form = document.getElementById('thermal-chat-form');
  const input = document.getElementById('thermal-chat-input');
  const historyEl = document.getElementById('thermal-chat-history');
  const chips = document.querySelectorAll('.thermal-quick-chip');

  if (!form || !historyEl) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q');
      if (q) {
        if (input) input.value = q;
        sendThermalMessage(q);
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input ? input.value.trim() : '';
    if (!text) return;
    if (input) input.value = '';
    sendThermalMessage(text);
  });

  async function sendThermalMessage(userText) {
    // Append User Bubble
    const userBubble = document.createElement('div');
    userBubble.style.cssText = 'display: flex; gap: 10px; align-items: flex-start; justify-content: flex-end;';
    userBubble.innerHTML = `
      <div style="background: #0284c7; color: #ffffff; border-radius: 12px 0 12px 12px; padding: 0.8rem 1.2rem; max-width: 80%; font-size: 0.95rem; line-height: 1.6; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">
        ${escapeHtml(userText)}
      </div>
      <div style="background: #0284c7; color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
        👤
      </div>
    `;
    historyEl.appendChild(userBubble);

    // Append Loading AI Bubble
    const loadingBubble = document.createElement('div');
    loadingBubble.style.cssText = 'display: flex; gap: 10px; align-items: flex-start;';
    loadingBubble.innerHTML = `
      <div style="background: #10b981; color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
        🤖
      </div>
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 0 12px 12px 12px; padding: 0.8rem 1.2rem; font-size: 0.9rem; color: #64748b;">
        <em>熱工学・換気工学データを照合中...</em>
      </div>
    `;
    historyEl.appendChild(loadingBubble);
    historyEl.scrollTop = historyEl.scrollHeight;

    try {
      const res = await fetch('/api/thermal-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      historyEl.removeChild(loadingBubble);

      const aiBubble = document.createElement('div');
      aiBubble.style.cssText = 'display: flex; gap: 10px; align-items: flex-start;';
      aiBubble.innerHTML = `
        <div style="background: #10b981; color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
          🤖
        </div>
        <div style="background: #ffffff; border: 1.5px solid #a7f3d0; border-radius: 0 12px 12px 12px; padding: 1rem 1.3rem; max-width: 85%; font-size: 0.95rem; line-height: 1.85; color: #1e293b; box-shadow: 0 2px 6px rgba(0,0,0,0.05); white-space: pre-line;">
          ${escapeHtml(data.reply)}
        </div>
      `;
      historyEl.appendChild(aiBubble);
      historyEl.scrollTop = historyEl.scrollHeight;
    } catch (err) {
      if (loadingBubble.parentNode) historyEl.removeChild(loadingBubble);
      alert('通信エラー: ' + err.message);
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// 11. Admin Floorplan Library & Importer
function initAdminFloorplanImporter() {
  const tabUsers = document.getElementById('admin-tab-users');
  const tabPlans = document.getElementById('admin-tab-plans');
  const viewUsers = document.getElementById('admin-view-users');
  const viewPlans = document.getElementById('admin-view-plans');
  const importForm = document.getElementById('admin-plan-import-form');

  if (tabUsers && tabPlans && viewUsers && viewPlans) {
    tabUsers.addEventListener('click', () => {
      tabUsers.className = 'btn btn-primary';
      tabPlans.className = 'btn btn-secondary';
      viewUsers.style.display = 'block';
      viewPlans.style.display = 'none';
      loadAdminData();
    });

    tabPlans.addEventListener('click', () => {
      tabPlans.className = 'btn btn-primary';
      tabUsers.className = 'btn btn-secondary';
      viewPlans.style.display = 'block';
      viewUsers.style.display = 'none';
      loadAdminPlansData();
    });
  }

  if (importForm) {
    importForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('imp-title').value;
      const stories = document.getElementById('imp-stories').value;
      const areaSqm = document.getElementById('imp-area-sqm').value;
      const tsubo = document.getElementById('imp-tsubo').value;
      const rooms = document.getElementById('imp-rooms').value;
      const targetFamily = document.getElementById('imp-family').value;
      const source = document.getElementById('imp-source').value;
      const featuresRaw = document.getElementById('imp-features').value;
      const description = document.getElementById('imp-desc').value;

      const features = featuresRaw ? featuresRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

      try {
        const res = await fetch('/api/admin/floorplans/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            stories: parseInt(stories, 10),
            areaSqm: parseFloat(areaSqm),
            tsubo: parseFloat(tsubo),
            rooms,
            targetFamily,
            entranceDirection: '南入り',
            features,
            description,
            roomsSummary: `${rooms} (${tsubo}坪)`,
            source,
            svg1F: `<svg viewBox="0 0 800 600" width="100%" height="100%"><rect width="800" height="600" fill="#f8fafc" stroke="#334155" stroke-width="4"/><text x="400" y="300" text-anchor="middle" font-size="24" fill="#0284c7">${title}</text></svg>`
          })
        });
        const data = await res.json();
        if (data.success) {
          alert(`【間取りライブラリ登録完了】\n「${title}」のスケール正規化（壁厚130mm基準）およびライブラリへの登録が完了しました！AI間取り選別スタジオで即座にユーザーへ提供されます。`);
          importForm.reset();
          loadAdminPlansData();
        } else {
          alert('登録エラー: ' + (data.error || '不明なエラー'));
        }
      } catch (err) {
        alert('通信エラー: ' + err.message);
      }
    });
  }
}

async function loadAdminPlansData() {
  const container = document.getElementById('admin-plans-table-container');
  const countEl = document.getElementById('admin-plans-count');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/floorplans');
    const data = await res.json();
    if (!data.success) return;

    if (countEl) countEl.textContent = data.count;

    let html = `
      <table class="admin-plans-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>プラン名称</th>
            <th>階数</th>
            <th>面積 / 坪数</th>
            <th>間取り</th>
            <th>対象家族</th>
            <th>特徴タグ</th>
            <th>取込ソース</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.plans.forEach(plan => {
      html += `
        <tr>
          <td><code style="font-size: 0.8rem; color: #0284c7;">${plan.id}</code></td>
          <td style="font-weight: 700; color: #0f172a;">${plan.title}</td>
          <td><span class="badge" style="background: ${plan.stories === 1 ? '#0284c7' : '#059669'}; color: #fff;">${plan.stories === 1 ? '平屋' : '2階建て'}</span></td>
          <td>${plan.tsubo}坪 (${plan.area_sqm}㎡)</td>
          <td>${plan.rooms}</td>
          <td>${plan.target_family}</td>
          <td><small style="color: #64748b;">${plan.features.slice(0, 2).join(', ')}</small></td>
          <td><span style="font-size: 0.8rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${plan.source}</span></td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    console.error('[Admin Plans Load Error]', err);
  }
}

// 家カルテ ダッシュボード進捗の初期ロード＆ストレージ同期連動
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    updateDashboardMortgageStatus();
    updateDashboardScheduleStatus();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'smile_house_carte_data') {
      updateDashboardMortgageStatus();
      updateDashboardScheduleStatus();
    }
  });
}
// =========================================================
// --- Extracted Module: case-gallery.js ---
// (caseStudiesData, initCaseStudiesGallery, selectCase, stepCase, loadCase, applyThumbnailFilter, selectPhoto, stepPhoto, toggleAutoplay, updateMainPhoto are loaded from /js/case-gallery.js)
// =========================================================

// =========================================================
// --- Extracted Module: wagama-showcase.js ---
// (initCredLayerStudio, initWagamaShowcase, renderWagamaCards are loaded from /js/wagama-showcase.js)
// =========================================================