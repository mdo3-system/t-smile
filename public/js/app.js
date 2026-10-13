// =========================================================
// 株式会社住ま居る Web App Client Script
// Single Page Application Router & Interactive AI Queue Client
// =========================================================

let currentUser = null;
let currentActiveJobId = null;
let jobPollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initMagicLinkAuth();
  initAiStudioWizard();
  initArchiXPresetStudio();
  initFloorPlanStudio();
  initThermalConsultation();
  initDashboardChat();
  initRealBookingForm();
  initArticleTabs();
  initCaseStudiesGallery();
  initWagamaShowcase();
  initAdminFloorplanImporter();
  initCredLayerStudio();
  checkUrlToken();
});

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

function switchPage(pageId) {
  let effectivePageId = pageId;
  let scrollToAnchor = null;

  if (pageId === 'our-philosophy') {
    effectivePageId = 'top';
    scrollToAnchor = 'our-philosophy';
  } else if (pageId === 'floorplan-bubble') {
    effectivePageId = 'floorplan-studio';
    setTimeout(() => {
      const bubbleBtn = document.getElementById('btn-fp-mode-bubble');
      if (bubbleBtn) bubbleBtn.click();
    }, 150);
  }

  let targetSec = document.getElementById(effectivePageId);
  if (!targetSec) {
    console.warn(`[switchPage] Target section '#${effectivePageId}' not found. Falling back to 'top' to prevent blank page.`);
    effectivePageId = 'top';
    targetSec = document.getElementById('top');
  }

  const sections = document.querySelectorAll('.page-section');
  sections.forEach(sec => sec.classList.remove('active'));
  
  if (targetSec) {
    targetSec.classList.add('active');
    if (scrollToAnchor) {
      setTimeout(() => {
        const anchorEl = document.getElementById(scrollToAnchor);
        if (anchorEl) anchorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
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
      const phone = document.getElementById('auth-phone').value;

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
  if (!currentUser) {
    document.getElementById('auth-modal').classList.add('active');
    return;
  }

  document.getElementById('dash-user-name').textContent = `${currentUser.name} 様`;
  document.getElementById('dash-user-phone').textContent = currentUser.phone;
  document.getElementById('dash-user-email').textContent = currentUser.email;

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

  box.innerHTML = messages.map(m => `
    <div class="chat-bubble ${m.sender === 'user' ? 'user' : ''}">
      <div style="font-size: 0.75rem; font-weight: 800; color: ${m.sender === 'user' ? '#f59e0b' : '#38bdf8'}; margin-bottom: 4px;">
        ${m.sender === 'user' ? 'お施主様' : (m.sender === 'ai' ? '🤖 住ま居る 建築AIエージェント' : '👷‍♂️ チーフ建築士')}
      </div>
      <div style="white-space: pre-wrap;">${m.text}</div>
    </div>
  `).join('');

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

    try {
      const res = await fetch(`/api/dashboard/${currentUser.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success) {
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  });

  // File Upload Button
  const uploadBtn = document.getElementById('dash-upload-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      if (!currentUser) return;
      const fileName = prompt('アップロードする図面または写真のタイトルを入力してください:', '敷地配置図_手描きスケッチ.pdf');
      if (!fileName) return;

      try {
        await fetch(`/api/dashboard/${currentUser.id}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: fileName,
            filesize: 1850000,
            filetype: 'application/pdf',
            uploadedBy: 'お施主様',
            url: '/downloads/sample_calculation.pdf'
          })
        });
        alert('ファイルをアップロードしました！担当建築士およびAIエージェントへ共有されました。');
        loadDashboardData();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

// 6. Real Model House Booking Form
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
function initArticleTabs() {
  const tabs = document.querySelectorAll('.art-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetCh = tab.getAttribute('data-tab');
      const contents = document.querySelectorAll('.art-tab-content');
      contents.forEach(c => c.classList.remove('active'));

      const targetContent = document.getElementById(`art-${targetCh}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
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
// 9. AI Floor Plan Generation Studio (Multi-Agent Conversational Studio)
// =========================================================
let currentFloorPlan = null;
let currentPlanState = null;
let currentFloorKey = '1f';
let fpChatHistory = [];

function initFloorPlanStudio() {
  const chatHistoryEl = document.getElementById('fp-chat-history');
  const chatForm = document.getElementById('fp-chat-form');
  const chatInput = document.getElementById('fp-chat-input');
  const btnDownloadIfc = document.getElementById('btn-download-ifc');
  const btnSavePlanMypage = document.getElementById('btn-save-plan-mypage');
  const step1Container = document.getElementById('fp-step1-container');
  const step2Container = document.getElementById('fp-step2-container');
  const step3Container = document.getElementById('fp-step3-container');
  const pillStep1 = document.getElementById('pill-step-1');
  const pillStep2 = document.getElementById('pill-step-2');
  const pillStep3 = document.getElementById('pill-step-3');
  const btnStartAiChat = document.getElementById('btn-start-ai-chat');
  const btnBackToStep1 = document.getElementById('btn-back-to-step1');
  const btnBackToStep2 = document.getElementById('btn-back-to-step2');
  const selectedSummaryText = document.getElementById('fp-selected-summary-text');
  const matchedCardsGrid = document.getElementById('fp-matched-cards-grid');
  const currentPlanTitleBar = document.getElementById('fp-current-plan-title-bar');
  const btnSyncToPerspective = document.getElementById('btn-sync-to-perspective');

  let currentSelectedCatalogPlan = null;

  if (!chatForm || !chatHistoryEl) return;

  // --- STEP 1: Single Choice Buttons Setup ---
  ['opt-floors', 'opt-size', 'opt-family'].forEach(groupId => {
    const groupEl = document.getElementById(groupId);
    if (!groupEl) return;
    const btns = groupEl.querySelectorAll('.fp-choice-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  });

  // --- STEP 1: Multi-Select Feature Tags Setup ---
  const featuresGroup = document.getElementById('opt-features');
  if (featuresGroup) {
    const tagBtns = featuresGroup.querySelectorAll('.fp-tag-btn');
    tagBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
      });
    });
  }

  // --- STEP Transition: Step 1 -> Step 2 (Match & Compare 3 Plans) ---
  async function goToStep2() {
    const selectedFloorBtn = document.querySelector('#opt-floors .fp-choice-btn.selected');
    const selectedSizeBtn = document.querySelector('#opt-size .fp-choice-btn.selected');
    const selectedFamilyBtn = document.querySelector('#opt-family .fp-choice-btn.selected');
    const selectedFeatureBtns = document.querySelectorAll('#opt-features .fp-tag-btn.selected');

    const storiesVal = selectedFloorBtn ? parseInt(selectedFloorBtn.getAttribute('data-value'), 10) : 1;
    const storiesText = storiesVal === 1 ? '平屋' : '2階建て';
    const minTsubo = selectedSizeBtn ? selectedSizeBtn.getAttribute('data-min') : 26;
    const maxTsubo = selectedSizeBtn ? selectedSizeBtn.getAttribute('data-max') : 30;
    const sizeLabel = selectedSizeBtn ? selectedSizeBtn.getAttribute('data-label') : '26〜30坪';
    const familyVal = selectedFamilyBtn ? selectedFamilyBtn.getAttribute('data-value') : '子育て3〜4人';
    const featuresList = Array.from(selectedFeatureBtns).map(b => b.getAttribute('data-value'));

    if (selectedSummaryText) {
      selectedSummaryText.textContent = `選択条件: ${storiesText} ｜ ${sizeLabel} ｜ ${familyVal} ｜ こだわり${featuresList.length}点`;
    }

    if (step1Container) step1Container.style.display = 'none';
    if (step2Container) step2Container.style.display = 'block';
    if (step3Container) step3Container.style.display = 'none';
    if (pillStep1) pillStep1.classList.remove('active');
    if (pillStep2) pillStep2.classList.add('active');
    if (pillStep3) pillStep3.classList.remove('active');

    // Smooth scroll to studio
    const studioEl = document.getElementById('floorplan-studio');
    if (studioEl) studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Show loading in cards grid
    if (matchedCardsGrid) {
      matchedCardsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: #0284c7;">
          <div style="font-size: 2rem; margin-bottom: 0.8rem;">⏳</div>
          <div style="font-size: 1.1rem; font-weight: 700;">AIが30以上の間取りライブラリから最適プランを選別中...</div>
        </div>
      `;
    }

    try {
      const res = await fetch('/api/floorplan/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories: storiesVal,
          minTsubo: parseFloat(minTsubo),
          maxTsubo: parseFloat(maxTsubo),
          targetFamily: familyVal,
          features: featuresList,
          limit: 3
        })
      });
      const data = await res.json();
      if (data.success && data.matches && data.matches.length > 0) {
        renderMatchedCards(data.matches);
      } else {
        matchedCardsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #64748b;">
            合致するプランが見つかりませんでした。条件を変更してお試しください。
          </div>
        `;
      }
    } catch (err) {
      console.error('[Match Error]', err);
    }
  }

  // Render Matched Cards in Step 2
  function renderMatchedCards(plans) {
    if (!matchedCardsGrid) return;
    matchedCardsGrid.innerHTML = '';

    plans.forEach((plan, idx) => {
      const card = document.createElement('div');
      card.className = 'fp-matched-card';
      card.innerHTML = `
        <div class="fp-matched-card-header">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="fp-match-badge">🎯 適合度 ${plan.matchScore}% (第${idx + 1}候補)</span>
            <span style="font-size: 0.8rem; color: #64748b; font-weight: 700;">${plan.stories === 1 ? '平屋' : '2階建て'} ｜ ${plan.rooms}</span>
          </div>
          <h3 style="font-size: 1.15rem; color: #0f172a; margin: 0 0 6px 0; font-family: var(--font-heading); line-height: 1.4;">
            ${plan.title}
          </h3>
          <div style="font-size: 0.85rem; color: #0284c7; line-height: 1.5;">
            💡 ${plan.matchReason}
          </div>
        </div>

        <div class="fp-matched-card-body">
          <div class="fp-preview-thumb-box">
            ${plan.svg_1f}
          </div>
          <div style="font-size: 0.88rem; color: #475569; margin-bottom: 0.8rem; line-height: 1.6;">
            <strong>面積:</strong> ${plan.tsubo}坪 (${plan.area_sqm}㎡)<br>
            <strong>構成:</strong> ${plan.rooms_summary}
          </div>
          <button type="button" class="btn btn-primary btn-choose-plan" style="width: 100%; justify-content: center; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #fff;">
            このプランをベースにAI相談・改変する 💬 →
          </button>
        </div>
      `;

      card.querySelector('.btn-choose-plan').addEventListener('click', () => {
        chooseBasePlan(plan);
      });

      matchedCardsGrid.appendChild(card);
    });
  }

  // --- STEP Transition: Step 2 -> Step 3 (Choose Base Plan & Start Remix Chat) ---
  function chooseBasePlan(plan) {
    currentSelectedCatalogPlan = plan;
    currentFloorPlan = {
      planId: plan.id,
      topology: { houseType: plan.stories === 1 ? '平屋' : '2階建て', tsubo: plan.tsubo },
      svg1F: plan.svg_1f,
      svg2F: plan.svg_2f
    };

    if (currentPlanTitleBar) {
      currentPlanTitleBar.textContent = `ベース選択: ${plan.title} (${plan.tsubo}坪 / ${plan.rooms})`;
    }

    if (step1Container) step1Container.style.display = 'none';
    if (step2Container) step2Container.style.display = 'none';
    if (step3Container) step3Container.style.display = 'block';
    if (pillStep1) pillStep1.classList.remove('active');
    if (pillStep2) pillStep2.classList.remove('active');
    if (pillStep3) pillStep3.classList.add('active');

    // Display SVG
    const viewport = document.getElementById('fp-svg-viewport');
    if (viewport) {
      viewport.innerHTML = plan.svg_1f;
    }

    // Populate Initial AI Chat
    chatHistoryEl.innerHTML = '';
    appendAgentChatBubble(`
**「${plan.title}」をベースプランとして読み込みました！**

📋 **プラン基本スペック:**
- **規模:** ${plan.tsubo}坪 (${plan.area_sqm}㎡) ｜ ${plan.stories === 1 ? '平屋' : '2階建て'} ｜ ${plan.rooms}
- **部屋構成:** ${plan.rooms_summary}
- **特徴:** ${plan.description}

ここからあなたの好みに合わせて**「あーでもないこーでもない」と自由にご相談ください！**
「LDKをもっと広く」「パントリーを追加」「畳コーナーが欲しい」「洗面と脱衣室を分けたい」など、思いついた要望をお気軽にどうぞ！
    `.trim());

    // Populate Quick Suggestion Chips for Remix
    const chipsContainer = document.getElementById('fp-chat-chips');
    if (chipsContainer) {
      chipsContainer.innerHTML = '';
      const suggestionTexts = [
        'LDKを広げて開放的にしたい',
        'キッチン横にパントリーを追加したい',
        'リビングに小上がり畳コーナーが欲しい',
        '独立したテレワーク書斎を組み込みたい',
        '洗面脱衣を完全分離して室内干しスペースにしたい'
      ];
      suggestionTexts.forEach(sug => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'fp-chip-btn';
        chip.textContent = sug;
        chip.addEventListener('click', () => {
          chatInput.value = sug;
          executeRemixChat(sug);
        });
        chipsContainer.appendChild(chip);
      });
    }

    // Scroll to studio
    const studioEl = document.getElementById('floorplan-studio');
    if (studioEl) studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- Step 2 / 3 Navigation ---
  function goToStep1() {
    if (step3Container) step3Container.style.display = 'none';
    if (step2Container) step2Container.style.display = 'none';
    if (step1Container) step1Container.style.display = 'block';
    if (pillStep3) pillStep3.classList.remove('active');
    if (pillStep2) pillStep2.classList.remove('active');
    if (pillStep1) pillStep1.classList.add('active');
  }

  function goToStep2From3() {
    if (step3Container) step3Container.style.display = 'none';
    if (step2Container) step2Container.style.display = 'block';
    if (step1Container) step1Container.style.display = 'none';
    if (pillStep3) pillStep3.classList.remove('active');
    if (pillStep2) pillStep2.classList.add('active');
    if (pillStep1) pillStep1.classList.remove('active');
  }

  if (btnStartAiChat) btnStartAiChat.addEventListener('click', goToStep2);
  if (btnBackToStep1) btnBackToStep1.addEventListener('click', goToStep1);
  if (btnBackToStep2) btnBackToStep2.addEventListener('click', goToStep2From3);

  // Sync to Perspective Studio (間取りからパース工房へ連動)
  if (btnSyncToPerspective) {
    btnSyncToPerspective.addEventListener('click', () => {
      if (!currentSelectedCatalogPlan) {
        alert('間取りが選択されていません。');
        return;
      }
      // Set parameters in ArchiX studio
      const archixPromptInput = document.getElementById('archix-prompt-input');
      if (archixPromptInput) {
        archixPromptInput.value = `${currentSelectedCatalogPlan.title}（${currentSelectedCatalogPlan.stories === 1 ? '平屋' : '2階建て'}、${currentSelectedCatalogPlan.tsubo}坪、${currentSelectedCatalogPlan.rooms}、${currentSelectedCatalogPlan.rooms_summary}）に基づいたフォトリアル空間デザイン`;
      }
      switchPage('ai-studio');
      // Trigger instant perspective render
      const genBtn = document.getElementById('btn-generate-archix');
      if (genBtn) genBtn.click();
    });
  }

  // Chat Form Submit for Remix
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    executeRemixChat(text);
  });

  async function executeRemixChat(userText) {
    appendUserChatBubble(userText);
    const sendBtn = document.getElementById('fp-chat-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    // Loading indicator
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'fp-chat-bubble agent';
    loadingBubble.innerHTML = '🤖 <em>AI建築士がご要望を解釈し、間取りプランを再構成中...</em>';
    chatHistoryEl.appendChild(loadingBubble);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    try {
      const res = await fetch('/api/floorplan/remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentSelectedCatalogPlan ? currentSelectedCatalogPlan.id : 'plan_h01',
          userMessage: userText
        })
      });
      const data = await res.json();
      chatHistoryEl.removeChild(loadingBubble);

      if (data.success) {
        appendAgentChatBubble(`
${data.aiFeedback}

✨ **改変ポイント:** ${data.modificationSummary}
💡 右側の図面に反映しました。さらに気になる点があれば続けてお申し付けください！
        `.trim());

        if (currentPlanTitleBar) {
          currentPlanTitleBar.textContent = `改変中: ${data.title} (${data.tsubo}坪)`;
        }
      } else {
        appendAgentChatBubble('申し訳ありません、プラン改変の処理中にエラーが発生しました。');
      }
    } catch (err) {
      if (loadingBubble.parentNode) chatHistoryEl.removeChild(loadingBubble);
      appendAgentChatBubble('通信エラーが発生しました: ' + err.message);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  // IFC BIM Download
  if (btnDownloadIfc) {
    btnDownloadIfc.addEventListener('click', async () => {
      if (!currentFloorPlan) return;
      try {
        btnDownloadIfc.textContent = '⏳ BIM (IFC) ファイル生成中...';
        btnDownloadIfc.disabled = true;

        const res = await fetch('/api/floorplan/export-ifc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: currentFloorPlan.planId })
        });

        if (!res.ok) throw new Error('BIMデータのエクスポートに失敗しました。');
        const ifcText = await res.text();

        // Trigger browser download
        const blob = new Blob([ifcText], { type: 'application/x-step' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sumaile_Plan_${currentFloorPlan.planId}.ifc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`【3D BIM (IFC) 出力完了】\n国際標準規格 ISO-10303-21 (IFC2X3) 形式のBIMモデルを出力しました。\n地下1階〜屋上PHまで全フロアの壁・スラブ情報が収録されており、Revit、ArchiCAD、Vectorworks、BIMx等ですぐに立体立ち上げが可能です。`);
      } catch (err) {
        alert('BIM出力エラー: ' + err.message);
      } finally {
        btnDownloadIfc.textContent = '📥 3D BIM (全階IFCファイル) をダウンロード (Revit/ArchiCAD互換)';
        btnDownloadIfc.disabled = false;
      }
    });
  }

  // Save Plan to Client Dashboard / MyPage
  if (btnSavePlanMypage) {
    btnSavePlanMypage.addEventListener('click', async () => {
      if (!currentFloorPlan) return;

      if (!currentUser) {
        alert('間取りプランをマイページに保存するには、無料ログイン/アカウント作成を行ってください。');
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('active');
        return;
      }

      try {
        const res = await fetch(`/api/dashboard/${currentUser.id}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `AI間取り設計プラン_${currentFloorPlan.topology.houseType}_${currentFloorPlan.planId}.svg`,
            filesize: 24500,
            filetype: 'image/svg+xml',
            uploadedBy: 'AI間取りスタジオ',
            url: '#'
          })
        });
        const data = await res.json();
        if (data.success) {
          alert(`【マイページ保存完了】\n${currentUser.name}様のプロジェクトルームに間取りプランを保存しました！\n担当建築士との相談チャットでもこの図面をベースに詳細な打合せが可能です。`);
        }
      } catch (err) {
        alert('保存エラー: ' + err.message);
      }
    });
  }
}

async function executeAgentChat(userText) {
  const chatInput = document.getElementById('fp-chat-input');
  const sendBtn = document.getElementById('fp-chat-send-btn');
  const chatHistoryEl = document.getElementById('fp-chat-history');

  appendUserChatBubble(userText);
  fpChatHistory.push({ sender: 'user', text: userText });

  if (sendBtn) sendBtn.disabled = true;
  if (chatInput) chatInput.disabled = true;

  // Temporary loading bubble
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'fp-chat-bubble agent';
  loadingBubble.innerHTML = '🤖 <em>ヒアリング・プランナー・構造検証エージェントが協調作図中...</em>';
  chatHistoryEl.appendChild(loadingBubble);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

  try {
    const res = await fetch('/api/floorplan/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: fpChatHistory,
        currentPlanState: currentPlanState
      })
    });

    const data = await res.json();
    if (loadingBubble.parentNode) chatHistoryEl.removeChild(loadingBubble);

    if (!data.success) throw new Error(data.error || 'エージェント応答エラー');

    // Update conversation and plan state
    appendAgentChatBubble(data.reply);
    fpChatHistory.push({ sender: 'agent', text: data.reply });

    if (data.planState) currentPlanState = data.planState;
    if (data.plan) {
      currentFloorPlan = data.plan;
      renderMultiFloorStudio(data.plan, data.validationLog);
    }

    // Render Quick Chips
    renderQuickChips(data.quickChips || []);

  } catch (err) {
    if (loadingBubble.parentNode) chatHistoryEl.removeChild(loadingBubble);
    appendAgentChatBubble('⚠️ 申し訳ございません。通信エラーが発生しました: ' + err.message);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (chatInput) {
      chatInput.disabled = false;
      chatInput.focus();
    }
  }
}

function appendUserChatBubble(text) {
  const chatHistoryEl = document.getElementById('fp-chat-history');
  if (!chatHistoryEl) return;
  const bubble = document.createElement('div');
  bubble.className = 'fp-chat-bubble user';
  bubble.textContent = text;
  chatHistoryEl.appendChild(bubble);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function appendAgentChatBubble(markdownText) {
  const chatHistoryEl = document.getElementById('fp-chat-history');
  if (!chatHistoryEl) return;
  const bubble = document.createElement('div');
  bubble.className = 'fp-chat-bubble agent';

  // Format basic markdown elements
  let html = markdownText
    .replace(/^### (.*$)/gim, '<h4 style="color: #0369a1; margin: 8px 0 4px; font-size: 1.05rem;">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a;">$1</strong>')
    .replace(/\n\n/g, '<div style="margin: 6px 0;"></div>')
    .replace(/\n- (.*)/g, '<div style="margin-left: 12px;">• $1</div>')
    .replace(/\n/g, '<br>');

  bubble.innerHTML = html;
  chatHistoryEl.appendChild(bubble);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function renderQuickChips(chips) {
  const container = document.getElementById('fp-chat-chips');
  if (!container) return;
  container.innerHTML = chips.map(chip => `
    <button type="button" class="fp-chip-btn" onclick="triggerChipClick('${chip.replace(/'/g, "\\'")}')">
      ${chip}
    </button>
  `).join('');
}

window.triggerChipClick = function(text) {
  const chatInput = document.getElementById('fp-chat-input');
  if (chatInput) chatInput.value = text;
  executeAgentChat(text);
};

function renderMultiFloorStudio(plan, validationLog = []) {
  const resPlanType = document.getElementById('res-plan-type');
  const resPlanTitle = document.getElementById('res-plan-title');
  const resPlanSpecs = document.getElementById('res-plan-specs');
  const tabsContainer = document.getElementById('fp-floor-tabs');
  const validationBox = document.getElementById('fp-validation-box');

  const topo = plan.topology;
  const geom = plan.geometry;

  if (resPlanType) resPlanType.textContent = topo.houseType || '自由設計プラン';
  if (resPlanTitle) resPlanTitle.textContent = topo.title || '理想の間取りプラン';

  if (resPlanSpecs) {
    resPlanSpecs.textContent = `延床面積: 約${topo.totalTsubo}坪 (${Math.round(topo.totalTsubo * 3.30578)}㎡)`;
  }

  // 耐震・温熱バッジは要望により非表示
  if (validationBox) {
    validationBox.innerHTML = '';
  }

  // Render Dynamic Floor Tabs
  if (tabsContainer && topo.activeLevelKeys) {
    tabsContainer.innerHTML = topo.activeLevelKeys.map(key => {
      const label = geom.levels[key] ? geom.levels[key].levelLabel : key.toUpperCase();
      return `
        <button type="button" class="btn ${key === currentFloorKey ? 'btn-primary' : 'btn-secondary'}" style="padding: 0.45rem 1rem; font-size: 0.88rem; ${key !== currentFloorKey ? 'background: #64748b; color: #fff;' : ''}" onclick="switchActiveFloorLevel('${key}')">
          ${label}
        </button>
      `;
    }).join('');
  }

  // Ensure currentFloorKey exists in active keys; if not, fallback to '1f'
  if (!topo.activeLevelKeys.includes(currentFloorKey)) {
    currentFloorKey = topo.activeLevelKeys.includes('1f') ? '1f' : topo.activeLevelKeys[0];
  }

  switchActiveFloorLevel(currentFloorKey);
}

window.switchActiveFloorLevel = function(key) {
  if (!currentFloorPlan) return;
  currentFloorKey = key;

  const viewport = document.getElementById('fp-svg-viewport');
  const floorLabel = document.getElementById('res-rooms-floor-label');
  const tabsContainer = document.getElementById('fp-floor-tabs');

  // Update Tabs Active Style
  if (tabsContainer) {
    const btns = tabsContainer.querySelectorAll('button');
    const topo = currentFloorPlan.topology;
    topo.activeLevelKeys.forEach((k, idx) => {
      if (btns[idx]) {
        if (k === key) {
          btns[idx].className = 'btn btn-primary';
          btns[idx].style.background = '';
        } else {
          btns[idx].className = 'btn btn-secondary';
          btns[idx].style.background = '#64748b';
        }
      }
    });
  }

  // Inject SVG
  const svg = currentFloorPlan.svgs ? currentFloorPlan.svgs[key] : null;
  if (viewport && svg) {
    viewport.innerHTML = svg;
  }

  // Render Room Cards for that level
  const levelData = currentFloorPlan.geometry.levels[key];
  if (levelData) {
    if (floorLabel) floorLabel.textContent = levelData.levelLabel;
    renderRoomCards(levelData.rooms, levelData.levelLabel);
  }
};

function renderRoomCards(rooms, levelLabel) {
  const list = document.getElementById('res-rooms-list');
  if (!list) return;

  list.innerHTML = rooms.map(room => {
    const tatami = Math.round(room.areaM2 / 1.65 * 10) / 10;

    return `
      <div class="room-spec-card">
        <div>
          <div class="room-spec-header">
            <span class="room-spec-title">${room.name}</span>
            <span class="room-spec-badge" style="background: ${room.style.fill}; color: ${room.style.textColor}; border: 1px solid ${room.style.stroke};">
              ${levelLabel.split(' ')[0]}
            </span>
          </div>
          <div class="room-spec-metrics">
            <strong>寸法:</strong> ${room.bounds.w}mm × ${room.bounds.h}mm<br>
            <strong>広さ:</strong> 約${tatami}帖 (${room.areaM2}㎡ / ${(Math.round(room.areaM2/3.3*10)/10)}坪)
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 9. ArchiX / Renrery Style Instant Architectural Perspective Studio
function initArchiXPresetStudio() {
  const form = document.getElementById('archix-preset-form');
  if (!form) return;

  // Single choice chip button handlers
  ['archix-space-grid', 'archix-style-grid', 'archix-lighting-grid'].forEach(gridId => {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const btns = grid.querySelectorAll('.fp-choice-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  });

  const resultContainer = document.getElementById('archix-result-container');
  const previewImg = document.getElementById('archix-preview-img');
  const resultTitle = document.getElementById('archix-result-title');
  const downloadBtn = document.getElementById('archix-download-btn');
  const btnArchixToFloorplan = document.getElementById('btn-archix-to-floorplan');
  const generateBtn = document.getElementById('btn-generate-archix');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedSpace = document.querySelector('#archix-space-grid .fp-choice-btn.selected')?.getAttribute('data-space') || 'facade';
    const selectedStyle = document.querySelector('#archix-style-grid .fp-choice-btn.selected')?.getAttribute('data-style') || 'japandi';
    const selectedLighting = document.querySelector('#archix-lighting-grid .fp-choice-btn.selected')?.getAttribute('data-lighting') || 'daylight';
    const promptText = document.getElementById('archix-prompt-input')?.value || '';

    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = '⏳ フォトリアルパースを描画中...';
    }

    try {
      const res = await fetch('/api/perspective/preset-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceType: selectedSpace,
          style: selectedStyle,
          lighting: selectedLighting,
          prompt: promptText
        })
      });
      const data = await res.json();
      if (data.success) {
        if (resultContainer) resultContainer.style.display = 'block';
        if (previewImg) previewImg.src = data.imageUrl + '?t=' + Date.now();
        if (resultTitle) resultTitle.textContent = data.title;
        if (downloadBtn) {
          downloadBtn.href = data.imageUrl;
          downloadBtn.download = `Sumaile_Perspective_${data.renderId}.svg`;
        }
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        alert('パース生成エラー: ' + (data.error || '不明なエラー'));
      }
    } catch (err) {
      alert('通信エラー: ' + err.message);
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.textContent = '⚡ フォトリアルパースを瞬時に生成する（完全無料） ✨';
      }
    }
  });

  // Reverse Linking: From Perspective to Floorplan Studio
  if (btnArchixToFloorplan) {
    btnArchixToFloorplan.addEventListener('click', () => {
      switchPage('floorplan-studio');
    });
  }
}

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



// =========================================================
// 11. Case Studies 20+ Photos Interactive Gallery System
// =========================================================
const caseStudiesData = {
  1: {
    title: "①【鶴ヶ島市・S様邸】きょうだい皆が選んだ信頼の家・天井高2.8mの大空間LDKと無垢杉の温もり",
    sub: "天井高2.8m / 自然素材・珪藻土 / C値1.0以下保証（実測0.28〜0.6目安） / 全13枚",
    client: "「きょうだいや親戚が次々に住ま居るさんで家を建てていて、『毎年毎年進化しているね』と評判を聞いていました。私たちの番になり、開放的な天井高280cmの大空間リビングをお願いしました。『天井を高くすると冬寒くなるのでは？』と心配でしたが、住んでみてびっくり。真冬でもエアコン1台で部屋中が均一に暖かく、夏も風がすっと抜けて涼しい。無垢杉の床は素足で歩くのが最高に気持ちよく、子どもたちも毎日素足で走り回っています。」",
    carpenter: "「構造躯体は耐震性に優れた金物工法で強靭に緊結。その上で、天井高2.8mの空間美を引き立てる無垢杉の床や内部造作を、手刻みができる熟練大工が木癖を見極めながら丁寧に施工しました。珪藻土の壁も左官職人の手仕事で柔らかい陰影が出るよう仕上げています。」",
    architect: "「天井高280cmの開放感と耐震性能を両立させるため、許容応力度計算による立体フレーム解析を行い、耐震等級3（最高等級）を確保。高天井でも上下温度差が生まれないよう、埼玉の気候に合わせた高断熱・高気密施工（C値1.0以下保証・実測0.28〜0.6目安）を行い、暖気の滞留を防ぐサーキュレーション気流を設計しました。」",
    photos: [
      { url: "/images/cases_real/case1/photo_01.jpg", caption: "【LDK全景】対面キッチンからリビング・ダイニングまで一望できる22帖大空間" },
      { url: "/images/cases_real/case1/photo_02.jpg", caption: "【リビング】無垢杉フローリングと革張りソファが調和するくつろぎの空間" },
      { url: "/images/cases_real/case1/photo_03.jpg", caption: "【ダイニング】木の温もりに包まれた無垢ダイニングテーブルと優しい自然光" },
      { url: "/images/cases_real/case1/photo_04.jpg", caption: "【対面キッチン】家族と会話を楽しみながら料理ができるオープンキッチンカウンター" },
      { url: "/images/cases_real/case1/photo_05.jpg", caption: "【モダン和室】雪見障子と畳、床の間を備えた風情あふれる和のスペース" },
      { url: "/images/cases_real/case1/photo_06.jpg", caption: "【主寝室】折り上げ天井の間接照明が優しく照らす落ち着きのある寝室" },
      { url: "/images/cases_real/case1/photo_07.jpg", caption: "【書斎・AVカウンター】テレワークや趣味、映像鑑賞に没頭できる造作カウンター" },
      { url: "/images/cases_real/case1/photo_08.jpg", caption: "【クローゼット】無垢建具で仕立てられた大容量のウォークイン収納" },
      { url: "/images/cases_real/case1/photo_09.jpg", caption: "【2階洋室】無垢杉床と珪藻土の自律調湿に包まれた快適な居室" },
      { url: "/images/cases_real/case1/photo_10.jpg", caption: "【セカンドリビング】家族それぞれの時間を豊かに過ごせる2階のくつろぎスペース" },
      { url: "/images/cases_real/case1/photo_11.jpg", caption: "【子ども部屋】2面採光で明るい風通しの良い洋室" },
      { url: "/images/cases_real/case1/photo_12.jpg", caption: "【階段ホール】職人手作りの木製格子手すりと2階洗面カウンター" },
      { url: "/images/cases_real/case1/photo_13.jpg", caption: "【外観ファサード】街並みに美しく調和する落ち着いたタイル調外観と駐車スペース" }
    ]
  },
  2: {
    title: "②【ときがわ町・K様邸】吉野杉大黒柱と山並みを望む吹き抜け・太陽光＆ZEHで叶えた自然共生住宅",
    sub: "吉野杉大黒柱 / 太陽光ZEH / パッシブ設計 / C値1.0以下保証（実測0.28〜0.6目安） / 全13枚",
    client: "「当初は『初期コストをできるだけ抑えたい』と考えていましたが、住ま居るさんから30年・50年のライフサイクルコストや光熱費のリアルなシミュレーションを見せてもらい、目からウロコでした。『後からやり直せない断熱・耐震・構造こそ最初に投資すべき』と納得。吉野杉の大黒柱が堂々と立つ吹き抜けリビングは、四季折々の山並みが見渡せる特等席です。太陽光発電の売電収入も大きく、冬も家中ポカポカで、まるで嘘のような快適な毎日です。」",
    carpenter: "「骨組みは強固な金物工法を採用し、自然豊かなときがわ町の風景に映える吉野杉の大黒柱や内部造作は、手刻みができる大工が手作業でカンナがけを行い木肌の艶を引き出しました。手すりや棚も木癖を見極めて現場加工しています。」",
    architect: "「南面の山並みを取り込む大開口と吹き抜けを設けつつ、埼玉の冬の寒風に負けない外皮断熱と許容応力度計算耐震等級3を両立。屋根勾配に合わせた太陽光パネル設計により、年間エネルギー収支ゼロを超えるZEH仕様を実現しました。」",
    photos: [
      { url: "/images/cases_real/case2/photo_01.jpg", caption: "【外観ファサード】ときがわの澄んだ青空と山並みに美しく映える外観デザイン" },
      { url: "/images/cases_real/case2/photo_02.jpg", caption: "【外観全景】深い庇とアプローチが自然環境と調和するパッシブ外観" },
      { url: "/images/cases_real/case2/photo_03.jpg", caption: "【玄関ポーチ】温もりあるアーチ壁と木製断熱ドアが迎えるエントランス" },
      { url: "/images/cases_real/case2/photo_04.jpg", caption: "【吉野杉大黒柱リビング】堂々たる大黒柱と山並みを望む吹き抜け大空間LDK" },
      { url: "/images/cases_real/case2/photo_05.jpg", caption: "【吹き抜け見上げ】開放的な吹き抜けと木組みの構造美が広がるリビング" },
      { url: "/images/cases_real/case2/photo_06.jpg", caption: "【無垢床LDK】太陽の光がたっぷりと差し込むひだまりのリビングスペース" },
      { url: "/images/cases_real/case2/photo_07.jpg", caption: "【和のダイニング】自然素材に囲まれた家族団らんのダイニングエリア" },
      { url: "/images/cases_real/case2/photo_08.jpg", caption: "【造作キッチン】無垢材の風合いを活かした使い勝手抜群のオリジナル台所" },
      { url: "/images/cases_real/case2/photo_09.jpg", caption: "【高断熱バスルーム】一日の疲れをゆったりと癒せる広々としたシステムバス" },
      { url: "/images/cases_real/case2/photo_10.jpg", caption: "【洗面スペース】木の温もりを感じる清潔感あふれるサニタリー" },
      { url: "/images/cases_real/case2/photo_11.jpg", caption: "【トイレ】木製棚を備えた明るく清潔なトイレスペース" },
      { url: "/images/cases_real/case2/photo_12.jpg", caption: "【2階洋室】子どもたちがのびのびと遊べる明るいプレイスペース" },
      { url: "/images/cases_real/case2/photo_13.jpg", caption: "【ウッドデッキ・庭】豊かな自然の風を感じながら外気浴を楽しめるアウトドアデッキ" }
    ]
  },
  3: {
    title: "③【鶴ヶ島市・A様邸】「3年暮らしても不満ゼロ！」アイランドキッチンと回遊動線・素足が喜ぶ高気密高断熱",
    sub: "アイランドキッチン / ぐるぐる回遊動線 / C値1.0以下保証（実測0.28〜0.6目安） / 全11枚",
    client: "「以前住んでいた建売住宅は、結露はひどいし夏は蒸し風呂、冬は足元が底冷えして本当に辛かったんです。住ま居るさんで建てて3年が経ちますが、正直言って今でも『何一つ不満点がない』んです！私のわがままだったアイランドキッチンと家じゅうをぐるぐる回れる回遊動線、広いお風呂。共働きの家事が本当にラクになり、素足で家中を歩ける暖かさに毎日感動しています。『ちゃんと造る』とこんなにも暮らしが変わるんですね。」",
    carpenter: "「構造躯体は金物工法でしっかり耐震性を担保。キッチンからパントリー、水回りへとスムーズに繋がる回遊動線に合わせて、引き戸の枠や収納棚を手刻みができる大工がミリ単位の造作で仕上げ、建具の滑らかな開閉感を現場調整しました。」",
    architect: "「回遊動線で壁が少なくなる間取りでも、金物工法躯体と許容応力度計算により耐震等級3を確保。建物全棟で中間気密測定を実施し、足元と天井の温度差がほぼない快適な熱環境を設計しました。」",
    photos: [
      { url: "/images/cases_real/case3/photo_01.jpg", caption: "【外観モダンファサード】ヤシの木とモノトーンが際立つリゾートモダン外観" },
      { url: "/images/cases_real/case3/photo_02.jpg", caption: "【石畳アプローチ】自然石を積み上げたリゾート感あふれる玄関エントランス" },
      { url: "/images/cases_real/case3/photo_03.jpg", caption: "【モダン和室】銘木一枚板座卓と朱色のアクセントウォールが調和する和室" },
      { url: "/images/cases_real/case3/photo_04.jpg", caption: "【黒革ソファLDK】上質な黒革ソファとウォールナット調TVボードの大空間" },
      { url: "/images/cases_real/case3/photo_05.jpg", caption: "【ダイニング＆キッチン】間接照明と格子ルーバーが美しく演出するダイニング" },
      { url: "/images/cases_real/case3/photo_06.jpg", caption: "【主寝室】ホテルライクな落ち着きと大容量収納を備えたベッドルーム" },
      { url: "/images/cases_real/case3/photo_07.jpg", caption: "【中庭・プライベートテラス】外からの視線を遮りプライバシーを守る中庭スペース" },
      { url: "/images/cases_real/case3/photo_08.jpg", caption: "【スカイバルコニー】青空の下でBBQや寛ぎを満喫できる広々バルコニー" },
      { url: "/images/cases_real/case3/photo_09.jpg", caption: "【大型バスルーム】肩湯やジェットバスで極上の癒しを提供するワイド浴室" },
      { url: "/images/cases_real/case3/photo_10.jpg", caption: "【2階洋室】バルコニーへ直結する明るく開放的なプライベートルーム" },
      { url: "/images/cases_real/case3/photo_11.jpg", caption: "【エントランスホール】直線的な光が奥へと視線を導くスタイリッシュな廊下" }
    ]
  },
  4: {
    title: "④【日高市・I様邸】冬の光熱費が月5万円から1万円台に激減！住み心地重視で叶えた省エネ健康住宅",
    sub: "冬光熱費激減 / 全館暖房 / 自然素材珪藻土 / C値1.0以下保証（実測0.28〜0.6目安） / 全9枚",
    client: "「以前の家では床暖房とエアコンをフル稼働させていて、冬になると毎月の電気・ガス代が5万円を超えて家計の大きな負担でした。住ま居るさんにお願いして建て替えたところ、真冬でも光熱費が1万円を少し超える程度に激減して本当にびっくりしました！しかも、前の家よりどの部屋も格段に暖かい。廊下もお風呂も寒くなく、家族が風邪を引かなくなりました。省エネ住宅の本当の凄さを毎日実感しています。」",
    carpenter: "「骨組みは金物工法でガッチリ組み上げ、熱を逃がさない丁寧な気密・断熱施工を現場で徹底。コンセントボックスや配管周りまで気密テープで隙間なく密閉しました。自然素材の杉床や壁の珪藻土も、湿気を適度に吸放出するよう大工・左官の手仕事で施工しています。」",
    architect: "「日高市の冬の冷え込みに対応するため、断熱材の厚みとサッシの遮熱・断熱仕様をパッシブシミュレーション。暖房エネルギー消費量を従来の1/4以下に抑える熱性能を数値で証明しました。」",
    photos: [
      { url: "/images/cases_real/case4/photo_01.jpg", caption: "【勾配天井ロフトホール】木の温もりが広がる開放的な2階フリースペース" },
      { url: "/images/cases_real/case4/photo_02.jpg", caption: "【2階ホール】家族の気配が緩やかに繋がる吹き抜け横のホール" },
      { url: "/images/cases_real/case4/photo_03.jpg", caption: "【主寝室】落ち着いた木製造作クローゼットに包まれたベッドルーム" },
      { url: "/images/cases_real/case4/photo_04.jpg", caption: "【子ども部屋・洋室】明るい日差しが差し込む清潔感のある個室" },
      { url: "/images/cases_real/case4/photo_05.jpg", caption: "【トイレスペース】可愛らしい小窓と上品な壁紙で仕立てたレストルーム" },
      { url: "/images/cases_real/case4/photo_06.jpg", caption: "【玄関エントランス】木格子スクリーンがアクセントの趣ある玄関ホール" },
      { url: "/images/cases_real/case4/photo_07.jpg", caption: "【リビングダイニング】勾配天井の高窓から光が降り注ぐLDK" },
      { url: "/images/cases_real/case4/photo_08.jpg", caption: "【趣ある和空間】落ち着いた民芸調の建具と格子が調和する特別な空間" },
      { url: "/images/cases_real/case4/photo_09.jpg", caption: "【吹き抜け見上げ】力強い梁と勾配天井のダイナミックな空間美" }
    ]
  },
  5: {
    title: "⑤【川越市・Y様邸】30帖大LDK×白タイル床×ピットリビング・理想のデザインを形にしたラグジュアリーモダン",
    sub: "30帖大空間 / 白タイル床 / ピットリビング / C値1.0以下保証（実測0.28〜0.6目安） / 全11枚",
    client: "「30帖大の広々としたLDKに、真っ白なタイルの床、間接照明、開放的な吹き抜け、そして一段下がったピットリビング。『ホテルのラウンジのような非日常感のある家にしたい』という私のわがままを全て叶えてもらいました。大空間でもエアコンの効きが良く、友人を招くと『これ本当に個人の家なの？』と歓声が上がります。デザイン性と快適性が両立した最高のお気に入り空間です。」",
    carpenter: "「金物工法による大スパン躯体と、一段下がりのピットリビングを実現するため、床組みの段差納まりやタイル下地の水平精度に徹底してこだわりました。間接照明の光が綺麗に伸びるよう、手刻みができる大工が天井や壁面の造作もミリ単位で調整しています。」",
    architect: "「30帖の大スパン吹き抜け空間でありながら、全棟許容応力度計算により耐震等級3を死守。大開口サッシからの冬の日射取得と夏の遮熱を綿密に計算し、タイル床の熱容量を活かした快適な室内環境をつくりました。」",
    photos: [
      { url: "/images/cases_real/case5/photo_01.jpg", caption: "【エントランスニッチ】ストライプクロスと間接照明が迎えるギャラリー風玄関" },
      { url: "/images/cases_real/case5/photo_02.jpg", caption: "【外部エントランス】洗練されたスクエアフォルムのモダンな玄関ポーチ" },
      { url: "/images/cases_real/case5/photo_03.jpg", caption: "【スケルトン階段】白タイル床に美しく映えるストリップ鉄骨階段" },
      { url: "/images/cases_real/case5/photo_04.jpg", caption: "【吹抜け大空間LDK】30帖大の広がりと白タイルの輝きが非日常感を醸すリビング" },
      { url: "/images/cases_real/case5/photo_05.jpg", caption: "【ピットリビング】一段下がった包まれ感と吹き抜けの開放感が同居するサロン" },
      { url: "/images/cases_real/case5/photo_06.jpg", caption: "【ダイニングキッチン】折り上げ天井の間接照明が優雅なディナー空間を演出" },
      { url: "/images/cases_real/case5/photo_07.jpg", caption: "【対面キッチン】開放感抜群のアイランドスタイルで料理が楽しくなる空間" },
      { url: "/images/cases_real/case5/photo_08.jpg", caption: "【吹抜け見下ろし】2階ホールから見渡すダイナミックなLDK全景" },
      { url: "/images/cases_real/case5/photo_09.jpg", caption: "【サロンスペース】店舗兼住宅として仕立てたアンティーク調の施術サロン" },
      { url: "/images/cases_real/case5/photo_10.jpg", caption: "【サロンブース】大きな鏡と観葉植物が調和する洗練された空間" },
      { url: "/images/cases_real/case5/photo_11.jpg", caption: "【サロン待合ラウンジ】訪れるゲストがくつろげるカフェのような待合室" }
    ]
  },
  6: {
    title: "⑥【行田市・H様邸】ネイビーガルバ×木目×ビルトインガレージ・大工の手刻み格子が薫る上質邸宅",
    sub: "ビルトインガレージ / ネイビーガルバ / 手刻み格子造作 / C値1.0以下保証（実測0.28〜0.6目安） / 全10枚",
    client: "「愛車を雨風から守るビルトインガレージと、深みのあるネイビーの外壁、そして木目のアクセント。私たちのこだわりを工学的な計算と熟練大工の手刻みで見事に具現化していただきました。ガレージから雨に濡れずに室内へ入れる動線は感動的です。手刻み大工さんが一つひとつ丁寧に組んでくれた玄関やリビングの格子戸は、訪れる友人みんなが褒めてくれます。」",
    carpenter: "「ビルトインガレージ上の大空間を支える金物工法の頑強な躯体に加え、玄関格子や造作建具、階段下の本棚など、住ま居るならではの手刻み木工技術を存分に発揮しました。木目の揃い方や手触りの滑らかさに徹底的にこだわっています。」",
    architect: "「開口部が大きくなるガレージハウスだからこそ、許容応力度計算による構造計算をミリ単位で実施。耐震等級3を確実にクリアしつつ、付加断熱と遮熱設計によりガレージ上部の居室も一年中快適な温熱環境を実現しました。」",
    photos: [
      { url: "/images/cases_real/case6/photo_01.jpg", caption: "【無垢杉のフロア】手鉋仕上げの無垢杉が足裏に心地よいナチュラル空間" },
      { url: "/images/cases_real/case6/photo_02.jpg", caption: "【大容量ウォークイン】大工職人の手刻み造作による格子戸付き大型収納" },
      { url: "/images/cases_real/case6/photo_03.jpg", caption: "【和モダン寝室】藍色のアクセントクロスと障子の陰影が落ち着く主寝室" },
      { url: "/images/cases_real/case6/photo_04.jpg", caption: "【小上がり和室】リビングから緩やかに繋がるくつろぎの小上がり畳コーナー" },
      { url: "/images/cases_real/case6/photo_05.jpg", caption: "【吹抜け大空間見下ろし】高窓から明るい自然光が降り注ぐリビング全景" },
      { url: "/images/cases_real/case6/photo_06.jpg", caption: "【ビルトインガレージ外観】深みのあるネイビーガルバ×木目羽目板のガレージハウス" },
      { url: "/images/cases_real/case6/photo_07.jpg", caption: "【吹き抜けLDK】化粧梁のダイナミックな架構と手刻み造作家具が調和する空間" },
      { url: "/images/cases_real/case6/photo_08.jpg", caption: "【回遊アイランドキッチン】家族で囲んで料理を楽しめるオリジナル対面キッチン" },
      { url: "/images/cases_real/case6/photo_09.jpg", caption: "【玄関ホール】格子引き戸と無垢上がり框が温かく迎えるエントランス" },
      { url: "/images/cases_real/case6/photo_10.jpg", caption: "【大工特注仏間・収納】伝統の大工技術が細部に宿る美しい木製建具" }
    ]
  }
};

let currentCaseId = 1;
let currentPhotoIndex = 0;
let currentFilter = 'all';
let isAutoplayRunning = false;
let autoplayTimer = null;

function initCaseStudiesGallery() {
  const caseCards = document.querySelectorAll('.case-overview-card');
  const prevBtn = document.getElementById('case-prev-btn');
  const nextBtn = document.getElementById('case-next-btn');
  const mainViewer = document.getElementById('case-main-viewer');
  const lightboxModal = document.getElementById('case-lightbox-modal');
  const lightboxImg = document.getElementById('case-lightbox-content');
  const lightboxClose = document.getElementById('case-lightbox-close');

  const navPrevHouse = document.getElementById('case-nav-prev-house');
  const navNextHouse = document.getElementById('case-nav-next-house');
  const btnToggleGrid = document.getElementById('btn-toggle-grid');
  const btnAutoplay = document.getElementById('btn-autoplay');
  const filterButtons = document.querySelectorAll('.thumb-filter-btn');

  // Overview Cards switching
  if (caseCards.length) {
    caseCards.forEach(card => {
      card.addEventListener('click', () => {
        const cid = parseInt(card.getAttribute('data-case'), 10);
        selectCase(cid, true);
      });
    });
  }

  // Previous / Next House Switchers
  if (navPrevHouse) {
    navPrevHouse.addEventListener('click', () => {
      stepCase(-1);
    });
  }
  if (navNextHouse) {
    navNextHouse.addEventListener('click', () => {
      stepCase(1);
    });
  }

  // Next / Prev photo navigation
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepPhoto(-1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepPhoto(1);
    });
  }

  // Category Filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter') || 'all';
      applyThumbnailFilter();
    });
  });

  // Toggle Grid View mode
  if (btnToggleGrid) {
    btnToggleGrid.addEventListener('click', () => {
      const strip = document.getElementById('case-thumbnails-strip');
      const textEl = document.getElementById('text-toggle-grid');
      if (!strip) return;
      const isExpanded = strip.classList.toggle('grid-expanded');
      btnToggleGrid.classList.toggle('active', isExpanded);
      if (textEl) {
        textEl.textContent = isExpanded ? '帯スクロールに戻す' : '全写真一覧で表示';
      }
    });
  }

  // Autoplay slideshow
  if (btnAutoplay) {
    btnAutoplay.addEventListener('click', () => {
      toggleAutoplay();
    });
  }

  // Lightbox open/close
  if (mainViewer && lightboxModal && lightboxImg) {
    mainViewer.addEventListener('click', () => {
      const c = caseStudiesData[currentCaseId];
      if (!c) return;
      const p = c.photos[currentPhotoIndex];
      lightboxImg.src = p.url;
      lightboxModal.classList.add('active');
    });

    if (lightboxClose) {
      lightboxClose.addEventListener('click', () => {
        lightboxModal.classList.remove('active');
      });
    }

    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.classList.remove('active');
      }
    });
  }

  // Keyboard navigation for lightbox / gallery
  document.addEventListener('keydown', (e) => {
    const isCraftsmanshipActive = document.getElementById('craftsmanship')?.classList.contains('active');
    if (!isCraftsmanshipActive) return;

    if (e.key === 'ArrowLeft') {
      stepPhoto(-1);
      if (lightboxModal?.classList.contains('active')) {
        const c = caseStudiesData[currentCaseId];
        lightboxImg.src = c.photos[currentPhotoIndex].url;
      }
    } else if (e.key === 'ArrowRight') {
      stepPhoto(1);
      if (lightboxModal?.classList.contains('active')) {
        const c = caseStudiesData[currentCaseId];
        lightboxImg.src = c.photos[currentPhotoIndex].url;
      }
    } else if (e.key === 'Escape' && lightboxModal?.classList.contains('active')) {
      lightboxModal.classList.remove('active');
    }
  });

  // Initial load
  loadCase(1);
}

function selectCase(caseId, shouldScroll = false) {
  const caseCards = document.querySelectorAll('.case-overview-card');
  caseCards.forEach(card => {
    const cid = parseInt(card.getAttribute('data-case'), 10);
    card.classList.toggle('active', cid === caseId);
  });

  loadCase(caseId);

  if (shouldScroll) {
    const viewer = document.getElementById('case-gallery-container');
    if (viewer) {
      viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function stepCase(delta) {
  const totalCases = Object.keys(caseStudiesData).length;
  let nextId = currentCaseId + delta;
  if (nextId < 1) nextId = totalCases;
  if (nextId > totalCases) nextId = 1;
  selectCase(nextId, false);
}

function getPhotoCategory(caption) {
  const text = caption || '';
  if (/外観|夕景|夜景|ファサード|テラス|中庭|ポーチ|車寄せ/.test(text)) return 'exterior';
  if (/LDK|リビング|居室|キッチン|寝室|畳|シアター|ライブラリー|ホール/.test(text)) return 'interior';
  if (/風呂|十和田石|手刻み|大工|建具|木組み|造作|引戸|エコカラット/.test(text)) return 'craft';
  if (/断熱|気密|耐震|太陽光|HEMS|温熱|計算|換気|ソーラー|骨組み|構造/.test(text)) return 'structure';
  return 'interior';
}

function loadCase(caseId) {
  currentCaseId = caseId;
  currentPhotoIndex = 0;
  const c = caseStudiesData[caseId];
  if (!c) return;

  // Update Case Viewer Header
  const numEl = document.getElementById('case-header-num');
  const titleEl = document.getElementById('case-header-title');
  const subEl = document.getElementById('case-header-sub');
  const allCountEl = document.getElementById('count-filter-all');

  if (numEl) numEl.textContent = `CASE 0${caseId}`;
  if (titleEl) titleEl.textContent = c.title;
  if (subEl) subEl.textContent = c.sub;
  if (allCountEl) allCountEl.textContent = c.photos.length;

  // Update Triad Stories
  const clientEl = document.getElementById('case-story-client');
  const carpEl = document.getElementById('case-story-carpenter');
  const archEl = document.getElementById('case-story-architect');
  if (clientEl) clientEl.textContent = c.client;
  if (carpEl) carpEl.textContent = c.carpenter;
  if (archEl) archEl.textContent = c.architect;

  // Render thumbnails
  const strip = document.getElementById('case-thumbnails-strip');
  if (strip) {
    strip.innerHTML = '';
    c.photos.forEach((photo, idx) => {
      const category = getPhotoCategory(photo.caption);
      const thumb = document.createElement('div');
      thumb.className = `case-thumb-item ${idx === 0 ? 'active' : ''}`;
      thumb.setAttribute('data-idx', idx);
      thumb.setAttribute('data-category', category);
      thumb.title = photo.caption;
      thumb.innerHTML = `<img src="${photo.url}" alt="サムネイル ${idx + 1}" loading="lazy" />`;
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPhoto(idx);
      });
      strip.appendChild(thumb);
    });
  }

  applyThumbnailFilter();
  updateMainPhoto();
}

function applyThumbnailFilter() {
  const thumbs = document.querySelectorAll('.case-thumb-item');
  let firstVisibleIdx = -1;

  thumbs.forEach(t => {
    const cat = t.getAttribute('data-category');
    const idx = parseInt(t.getAttribute('data-idx'), 10);
    if (currentFilter === 'all' || cat === currentFilter) {
      t.style.display = 'block';
      if (firstVisibleIdx === -1) firstVisibleIdx = idx;
    } else {
      t.style.display = 'none';
    }
  });

  // If current photo is hidden under filter, switch to first visible
  if (currentFilter !== 'all' && firstVisibleIdx !== -1) {
    const currentThumb = document.querySelector(`.case-thumb-item[data-idx="${currentPhotoIndex}"]`);
    if (currentThumb && currentThumb.style.display === 'none') {
      selectPhoto(firstVisibleIdx);
    }
  }
}

function selectPhoto(idx) {
  const c = caseStudiesData[currentCaseId];
  if (!c || idx < 0 || idx >= c.photos.length) return;
  currentPhotoIndex = idx;
  updateMainPhoto();
}

function stepPhoto(delta) {
  const c = caseStudiesData[currentCaseId];
  if (!c) return;

  const thumbs = Array.from(document.querySelectorAll('.case-thumb-item'))
    .filter(t => t.style.display !== 'none');
  if (!thumbs.length) return;

  const currentVisiblePos = thumbs.findIndex(t => parseInt(t.getAttribute('data-idx'), 10) === currentPhotoIndex);
  let nextPos = currentVisiblePos !== -1 ? currentVisiblePos + delta : 0;
  if (nextPos < 0) nextPos = thumbs.length - 1;
  if (nextPos >= thumbs.length) nextPos = 0;

  const nextIdx = parseInt(thumbs[nextPos].getAttribute('data-idx'), 10);
  currentPhotoIndex = nextIdx;
  updateMainPhoto();
}

function toggleAutoplay() {
  const btn = document.getElementById('btn-autoplay');
  const textEl = document.getElementById('text-autoplay');
  if (isAutoplayRunning) {
    clearInterval(autoplayTimer);
    isAutoplayRunning = false;
    if (btn) btn.classList.remove('active');
    if (textEl) textEl.textContent = '自動再生';
  } else {
    isAutoplayRunning = true;
    if (btn) btn.classList.add('active');
    if (textEl) textEl.textContent = '停止';
    autoplayTimer = setInterval(() => {
      stepPhoto(1);
    }, 3200);
  }
}

function updateMainPhoto() {
  const c = caseStudiesData[currentCaseId];
  if (!c) return;
  const p = c.photos[currentPhotoIndex];
  if (!p) return;

  const imgEl = document.getElementById('case-main-img');
  const captionEl = document.getElementById('case-caption-text');
  const counterEl = document.getElementById('case-photo-counter');

  if (imgEl) {
    imgEl.style.opacity = '0.4';
    imgEl.src = p.url;
    setTimeout(() => {
      imgEl.style.opacity = '1';
    }, 80);
  }
  if (captionEl) captionEl.textContent = p.caption;
  if (counterEl) counterEl.textContent = `📸 写真 ${currentPhotoIndex + 1} / ${c.photos.length}枚`;

  // Update active thumbnail
  const thumbs = document.querySelectorAll('.case-thumb-item');
  thumbs.forEach(t => {
    const idx = parseInt(t.getAttribute('data-idx'), 10);
    if (idx === currentPhotoIndex) {
      t.classList.add('active');
      t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      t.classList.remove('active');
    }
  });
}

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
      items.push('✅ 全棟現場気密測定 C値0.3以下保証 (漏気・壁体内結露リスクゼロ証明)');
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
        ※本診断結果は「CredLayer 信頼実証ガイドライン」に基づき算出されています。専属AIエージェントおよび担当建築士へそのまま共有いただけます。
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


