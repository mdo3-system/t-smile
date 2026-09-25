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
  }

  const sections = document.querySelectorAll('.page-section');
  sections.forEach(sec => sec.classList.remove('active'));
  
  const targetSec = document.getElementById(effectivePageId);
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
    title: "①【川越市・T様邸】吹抜け大空間と愛猫と暮らす吉野杉の家",
    sub: "延床34坪 / 許容応力度計算耐震等級3 / C値0.22 / HEAT20 G2 / 全24枚",
    client: "「愛猫と一緒にストレスなく暮らしながら、冬でも素足で暖かく過ごせるリビングが一番の夢でした。既成のキャットウォークではなく、吉野杉の柱梁と一体になった職人手づくりの木製ステップと、日当たりの良い大きな吹抜けを作っていただきました。」",
    carpenter: "「22帖の柱なし大空間を強靭に支えるため、大黒柱と梁の仕口を現場で手刻み調整。猫ちゃんの手足に優しいよう、杉の角を一本一本手カンナで丸く面取りして仕上げました。階段も足裏に吸い付く無垢吉野杉です。」",
    architect: "「吹抜けによる冷気の吹き下ろしを防ぐため、気密実測C値0.22と付加断熱を設計。全棟許容応力度計算により、柱のない大空間でも耐震等級3・直下率68%を完璧に裏付けました。」",
    photos: [
      { url: "/images/cases/case1_living.jpg", caption: "【LDK全景】吉野杉30mm赤身材と職人手塗り珪藻土が包み込む、柱のない22帖大空間リビング" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【造作キッチン】無垢吉野杉カウンターと職人特注収納。中庭の緑を望む開放的な対面レイアウト" },
      { url: "/images/hero_architecture.jpg", caption: "【外観ファサード】深い軒と黒ガルバリウム×吉野杉格子が美しく調和する和モダンデザイン" },
      { url: "/images/kaitai/ch1_living_craft.jpg", caption: "【初期意匠スケッチ】施主様と共有した吉野杉大黒柱とリビングの設計構想" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【カバードポーチ】雨の日も傘をささずに乗り降りできる車寄せと深い軒" },
      { url: "/images/kaitai/ch2_blue_entrance_screen.jpg", caption: "【玄関網戸引戸】埼玉の心地よい風を室内に招く網戸付き特注木製引戸" },
      { url: "/images/kaitai/ch3_yakusugi_ldk_view.jpg", caption: "【リビング別角度】大黒柱の存在感と無垢フロアの温かみあふれる団らん空間" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【手づくり無垢建具】大工さんが木目を美しく通して仕上げた世界に1つの引戸" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【在来造作風呂】青く透き通る十和田石と木曽ヒノキ芳香の職人手づくり浴室" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【前庭テラス】お風呂上がりやリビングからフラットに繋がるプライベートウッドデッキ" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【2階ライブラリー】家族の蔵書が並ぶ造作本棚とスタディカウンターコーナー" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【主寝室】自律調湿する手塗り漆喰壁と柔らかな間接照明がもたらす深い眠り" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【畳コーナー】愛猫とくつろぐ天然い草×藍染めデニム畳のモダン空間" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【ホームシアター】壁内に美しく格納される120インチ電動大画面スクリーン" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【音響設備】吉野杉天井にビルトインされた5.1chサラウンドスピーカー" },
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【大容量太陽光】美観を損ねない屋根一体型10.33kWソーラーパネル搭載" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【V2H連携HEMS】電気自動車と連動して電気代ゼロと停電時安心を実現" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【大工手刻み現場】専属大工職人が一本一本の木癖を見極めてカンナがけ" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【桁上断熱気密】夏の屋根熱を完全に遮断する超高気密桁上断熱施工" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【耐震等級3構造】許容応力度計算により直下率68%を証明した強靭な骨組み" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【ダブル断熱断面】HEAT20 G2基準を凌駕する隙間なき断熱気密ディテール" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【夕景外観】格子から漏れる温かな明かりが街並みを照らす優美な佇まい" },
      { url: "/images/kaitai/ch5_ecocarat_bath.jpg", caption: "【機能性タイル】玄関ホールとサニタリーの湿度を整えるエコカラット壁面" },
      { url: "/images/cases/case1_living.jpg", caption: "【お引渡し記念】家族と愛猫の笑顔があふれる完成直後のリビング全貌" }
    ]
  },
  2: {
    title: "②【鶴ヶ島市・M様邸】十和田石在来風呂と平屋風二世帯住宅",
    sub: "延床42坪 / HEAT20 G3 / 薪ストーブ / 親子二世帯 / 全22枚",
    client: "「親世帯と子世帯がほどよい距離感で暮らせる平屋風の家が希望でした。ユニットバスではない本物の温泉宿のようなお風呂と、冬に家中を暖める薪ストーブが家族全員のお気に入りです。」",
    carpenter: "「薪ストーブの重量に耐える床補強と、十和田石風呂の防水下地造りに腕を振るいました。親御さんが歩きやすいバリアフリースロープも手鉋で美しく仕上げています。」",
    architect: "「最高峰断熱HEAT20 G3基準（UA値0.24）を達成。真冬でも薪ストーブ1台の微小な熱で42坪家中が22℃均一を保てる熱物理シミュレーションを行いました。」",
    photos: [
      { url: "/images/artisan_custom_bath.jpg", caption: "【十和田石在来風呂】青い十和田石と木曽ヒノキが香る、毎夜が温泉気分の完全手づくり浴室" },
      { url: "/images/cases/case1_living.jpg", caption: "【平屋風LDK】薪ストーブの炎が揺れる、吉野杉無垢床の大空間ファミリーリビング" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【外観平屋フォルム】大地にどっしりと根を下ろす、深い軒が美しい平屋風二世帯住宅" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【玄関スロープ車寄せ】親世帯の車いすでも濡れずに入れるカバードポーチ" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【二世帯キッチン】二世代で一緒に料理を楽しめる幅広の無垢アイランドカウンター" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【親世帯和室】熊本八代産天然い草と藍染めデニム畳を敷き詰めた落ち着きの間" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【子世帯ホール】2階に設けた子世帯専用のセカンドリビング＆ライブラリー" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【漆喰主寝室】静寂と澄んだ空気が包む、遮音と断熱を極めた親世帯寝室" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【中庭テラス】親世帯と子世帯が縁側感覚で集まるウッドデッキガーデン" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【手づくり引き戸】防音性と軽やかな開閉感を両立させた大工造作ドア" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【家族シアター】孫たちとアニメや映画を楽しむ大画面スクリーン" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【天吊りプロジェクター】配線を壁内に完全隠蔽したすっきりシアター" },
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【太陽光大容量】二世帯の光熱費をゼロにする10kWソーラー発電" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【省エネモニター】世帯ごとのエネルギー消費を可視化するHEMSシステム" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【木組み施工】重量ある薪ストーブ煙突と大屋根を支える伝統手刻み工法" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【屋根遮熱断熱】夏の平屋特有の屋根熱を跳ね返す超高性能断熱仕様" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【構造躯体】二世帯の安心を何世代も支える許容応力度計算耐震等級3" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【G3断熱工法】外張り断熱と充填断熱のダブル工法で家中ヒートショック皆無" },
      { url: "/images/hero_architecture.jpg", caption: "【夜景外観】木の格子から暖かな光がこぼれ、家族を温かく迎え入れる玄関先" },
      { url: "/images/kaitai/ch2_blue_entrance_screen.jpg", caption: "【二世帯玄関】両世帯が気兼ねなく出入りできる網戸付き大型引き戸" },
      { url: "/images/kaitai/ch5_ecocarat_bath.jpg", caption: "【調湿壁】二世帯の脱衣室とトイレに施工された消臭調湿エコカラット" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【朝の風景】朝日が差し込む中庭を眺めながら親子で過ごす穏やかな時間" }
    ]
  },
  3: {
    title: "③【坂戸市・K様邸】インナーガレージと中庭を囲むリゾート邸宅",
    sub: "延床38坪 / 超高気密C値0.18 / ガレージ直結動線 / 全20枚",
    client: "「愛車を眺めながら過ごせるインナーガレージと、外からの視線を遮った中庭プライベートテラスが夢でした。雨の日もガレージから濡れずにパントリーへ運べる動線が最高です。」",
    carpenter: "「ガレージの大型開口を支える特大集成梁と大黒柱の納まりに技術を注ぎました。中庭テラスのウッドデッキも耐久性の高いハードウッドを手仕事で組み上げています。」",
    architect: "「大開口ガレージでありながら耐震等級3を死守するため、門型フレームの構造計算を実施。実測C値0.18という超高気密を叩き出し、ガレージの排気流入も完全遮断しました。」",
    photos: [
      { url: "/images/hero_architecture.jpg", caption: "【ガレージ外観】インナーガレージと深い軒が美しい、モダンリゾートデザインの外観" },
      { url: "/images/cases/case1_living.jpg", caption: "【中庭を望むLDK】大開口サッシ越しにプライベート中庭の緑が広がる開放空間" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【ガレージ直結キッチン】ガレージからパントリーへ重い荷物を直通できる神動線" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【中庭ビュー浴室】十和田石の浴槽に浸かりながら中庭の星空を眺めるバスタイム" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【中庭テラス】周囲の視線を気にせずBBQや外気浴を楽しめるプライベートコート" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【ガレージが見下ろせる書斎】愛車を見守りながらテレワークに集中できる2階コーナー" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【ラグジュアリー主寝室】珪藻土と間接照明がホテルのような静謐を生む主寝室" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【エントランス】ガレージと玄関を繋ぐ雨に濡れないカバードポーチ" },
      { url: "/images/kaitai/ch3_yakusugi_ldk_view.jpg", caption: "【無垢床の質感】素足に吸い付く吉野杉フローリングと上質な家具の調和" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【ガレージ間仕切り扉】気密パッキンを仕込み音と匂いを遮断する特注大工ドア" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【リビングシアター】休日は映画館へと変貌する120インチスクリーン" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【天井プロジェクター】すっきりとしたインテリアを邪魔しない隠蔽音響" },
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【EV充電対応ソーラー】屋根ソーラーから電気自動車へ直充電できる環境設計" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【エネルギー管理】ガレージEVと住宅の電力需給を一括制御するモニター" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【大スパン梁架構】大工と建築士が現場で確認しながら組んだガレージ構造梁" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【門型フレーム計算】車2台分の大開口でも耐震等級3を維持する構造計算躯体" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【C値0.18気密施工】サッシ周りの気密テープをミリ単位で圧着した職人技" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【和モダン小上がり】LDKの一角に設けた藍染めデニム畳のくつろぎスペース" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【夕景ライトアップ】外壁の木ルーバーと植栽が美しく浮かび上がる夜の情景" },
      { url: "/images/cases/case1_living.jpg", caption: "【完成後リビング】友人たちを招いてリゾートのように寛ぐ週末の賑わい" }
    ]
  },
  4: {
    title: "④【日高市・S様邸】杉と土壁の茶室・隠れ家ロフトのある和モダン",
    sub: "延床31坪 / 伝統木組み / 珪藻土手塗り / 全21枚",
    client: "「お茶を点てられる本格的な茶室と、大工さんの手仕事が感じられる落ち着いた家が希望でした。玄関に入った瞬間のい草と杉の香りに、訪れる人が皆感動してくれます。」",
    carpenter: "「茶室のにじり口や床の間、名栗（なぐり）加工の柱など、伝統的な大工技術を随所に散りばめました。ロフトの固定階段も吉野杉無垢材から手造りしています。」",
    architect: "「伝統和風の美しさをそのままに、断熱性能はHEAT20 G2（UA値0.42）、耐震等級3を両立。古民家のような趣を持ちながら、現代の高気密・高断熱を実現しました。」",
    photos: [
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【茶室空間】炉を切った本格的な京間畳と、職人手塗りの珪藻土土壁が織りなす静寂" },
      { url: "/images/cases/case1_living.jpg", caption: "【和モダンLDK】丸太梁を現しにした吹き抜けと、杉の温もりあふれるリビング" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【ヒノキ風呂】十和田石と木曽ヒノキで仕立てた、旅館のような風情の浴室" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【和の佇まい】焼き杉調ガルバリウムと格子戸が美しい、日高の自然に映える外観" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【無垢キッチン】木目の美しい吉野杉造作収納と、使い勝手を極めた和の台所" },
      { url: "/images/kaitai/ch2_blue_entrance_screen.jpg", caption: "【格子引き戸】涼風を通す伝統デザインの網戸付き玄関引き戸" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【深い軒下】雨宿りしながら庭の飛び石を眺められる和のエントランス" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【隠れ家ロフト書斎】屋根裏に設けた趣味と読書に没頭できる固定階段付きロフト" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【寝室】優しい間接照明が和紙調の壁を照らす、心静まる主寝室" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【濡れ縁テラス】庭の苔とモミジを眺めながらお茶をいただく手造り濡れ縁" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【名栗仕上げ建具】手カンナの削り跡が美しい、職人手造りの名栗引き戸" },
      { url: "/images/kaitai/ch1_living_craft.jpg", caption: "【意匠スケッチ】茶室とリビングのつながりを綿密に検討した手描き図面" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【隠しスクリーン】和室の鴨居裏に目立たないよう仕込んだシアタースクリーン" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【プロジェクター設備】和の意匠を邪魔しないよう木製ボックスに格納" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【大工手刻み風景】茶室の床柱や化粧梁を一本一本丁寧に手加工する大工さん" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【伝統×構造計算】変形梁架構でも耐震等級3を証明した立体骨組みモデル" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【小屋裏断熱】ロフトが夏でも暑くならない高性能断熱・通気工法" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【自然素材断熱】木質繊維断熱材を充填した壁内結露ゼロの壁構造" },
      { url: "/images/hero_architecture.jpg", caption: "【夕景の美】和紙障子を通して柔らかく漏れる行灯のような外観の灯り" },
      { url: "/images/kaitai/ch5_ecocarat_bath.jpg", caption: "【床の間タイル】和室の飾り床に設えた間接照明と調湿エコカラット" },
      { url: "/images/cases/case1_living.jpg", caption: "【四季の暮らし】春には桜、秋には紅葉を借景として楽しむ窓辺の風景" }
    ]
  },
  5: {
    title: "⑤【東松山市・H様邸】太陽光10kW＋V2Hオフグリッド自然素材住宅",
    sub: "延床36坪 / フリーエネルギー / 吉野杉30mm / 全23枚",
    client: "「電気代高騰の時代だからこそ、太陽光とEV車でエネルギーを自給自足できる家にしたいと考えました。災害で停電しても普段通り生活できる圧倒的な安心感があります。」",
    carpenter: "「10kWの太陽光パネルを載せる大屋根を支えるため、小屋組の強度を手刻み補強。吉野杉の無垢床も30mmの厚物材を一枚ずつ隙間なく敷き詰めました。」",
    architect: "「屋根一体型ソーラーとV2Hシステムを最適設計。真夏の冷房も冬の暖房も太陽光で完全にまかない、年間光熱費が実質プラスになるエネルギー収支を実証しました。」",
    photos: [
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【10.33kWソーラー外観】屋根と一体化したスマートな大容量太陽光パネル搭載の外観" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【V2H・HEMSシステム】電気自動車への給電と家庭消費電力を一括コントロールする画面" },
      { url: "/images/cases/case1_living.jpg", caption: "【ゼロエネ大空間LDK】太陽光発電の電気でエアコン1台稼働、年中22℃の快適リビング" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【高効率エコキッチン】IHクッキングヒーターと無垢カウンターを融合した省エネ台所" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【十和田石エコバス】エコキュートの湧き上げ電力を昼間の太陽光でまかなう造作風呂" },
      { url: "/images/hero_architecture.jpg", caption: "【パッシブ外観】冬の日射をたっぷり取り入れ、夏の強い陽射しを遮る深い庇デザイン" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【EV充電カバードポーチ】雨に濡れずにEVケーブルを充電接続できる屋根付き車寄せ" },
      { url: "/images/natural_interior_aroma.jpg", caption: "【2階多目的ホール】屋根の熱が一切降りてこない快適な2階ワークスペース" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【省エネ寝室】漆喰の蓄熱効果で夜間も室温が下がりにくい快眠主寝室" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【畳コーナー】家族が寝転んでゲームや読書を楽しむ掘りごたつ付き畳スペース" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【南面ウッドデッキ】太陽の恵みをいっぱいに浴びる吉野杉フラットデッキ" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【気密仕切り引き戸】部屋ごとの空調効率をさらに高める大工手造りの気密ドア" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【シアタールーム】自家発電した電気で心置きなく楽しむ大画面映画鑑賞" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【プロジェクター音響】省電力LEDプロジェクターを天井にビルトイン" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【屋根荷重構造検査】太陽光パネルの重量を考慮した大工と建築士の躯体チェック" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【全棟許容応力度計算】太陽光積載時でも耐震等級3（最高等級）を証明した構造計算書" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【超高断熱桁上気密】小屋裏の熱を室内に一滴も入れない遮熱シートとフェノバボード" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【HEAT20 G2外皮】気密テープを二重施工した隙間なきパーフェクト外皮" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【黄昏時の佇まい】停電時でも蓄電池とEVから家中すべての部屋に明かりが灯る安心" },
      { url: "/images/kaitai/ch2_blue_entrance_screen.jpg", caption: "【通風玄関】エアコンに頼らない中間期は心地よい自然風を循環させる引戸" },
      { url: "/images/kaitai/ch5_ecocarat_bath.jpg", caption: "【サニタリー調湿】梅雨時の部屋干しでも洗濯物がカラリと乾くエコカラット洗面所" },
      { url: "/images/kaitai/ch1_living_craft.jpg", caption: "【設計当初のスケッチ】創エネと自然素材が調和する家を夢見た手描きパース" },
      { url: "/images/cases/case1_living.jpg", caption: "【電気代実証データ】年間光熱費が実質マイナス3万円を達成した入居1年後の記念写真" }
    ]
  },
  6: {
    title: "⑥【所沢市・Y様邸】造作ライブラリーと回遊動線の子育て住宅",
    sub: "延床33坪 / 家事ラク回遊 / 大工造作本棚 / 全20枚",
    client: "「共働きで忙しい毎日のため、キッチン・洗面・ファミクロがぐるぐる回れる回遊動線と、子どもたちが自然と本を好きになる壁一面のライブラリーを叶えていただきました。」",
    carpenter: "「階段ホールの壁一面に、棚板の高さを変えられる大工造作の本棚を施工。お子様がぶつかっても痛くないよう、角をすべて優しく丸める加工を行いました。」",
    architect: "「回遊動線により壁が少なくなるプランでも、耐力壁をバランス良く配置して直下率70%・耐震等級3を確保。24時間第1種熱交換換気により子どものアレルギーも予防します。」",
    photos: [
      { url: "/images/natural_interior_aroma.jpg", caption: "【壁一面の造作本棚】絵本や図鑑が並び、子どもたちが階段に座って本を読むファミリーホール" },
      { url: "/images/cases/case1_kitchen.jpg", caption: "【回遊キッチン】パントリーと脱衣室へぐるりと回れる、共働きに優しい家事ラク動線" },
      { url: "/images/cases/case1_living.jpg", caption: "【見守りLDK】キッチンで料理をしながら勉強スペースとリビング全体を見渡せる間取り" },
      { url: "/images/artisan_custom_bath.jpg", caption: "【十和田石ファミリー風呂】親子3人でゆったり浸かれる滑りにくく温かい手づくり浴室" },
      { url: "/images/hero_architecture.jpg", caption: "【明るい街並み外観】白漆喰と木製ルーバーが爽やかな印象を与える子育て世代の外観" },
      { url: "/images/kaitai/ch2_covered_porch.jpg", caption: "【ベビーカー対応玄関】雨の日も濡れずにベビーカーを畳める広々カバードポーチ" },
      { url: "/images/floor_heating_comfort.jpg", caption: "【快眠キッズ＆主寝室】天然漆喰が化学物質やホコリを吸着分解する澄んだ空気の寝室" },
      { url: "/images/kaitai/ch8_denim_tatami.jpg", caption: "【お昼寝畳スペース】おむつ替えや赤ちゃんのハイハイに安心な天然い草畳コーナー" },
      { url: "/images/kaitai/ch6_front_garden_terrace.jpg", caption: "【プール遊びテラス】夏にはビニールプールを広げて水遊びができる屋根付きウッドデッキ" },
      { url: "/images/kaitai/ch3_solid_wood_door.jpg", caption: "【指はさみ防止引き戸】お子様の安全に配慮してソフトクローズを組み込んだ造作建具" },
      { url: "/images/kaitai/ch4_theater_screen_napoleon.jpg", caption: "【ファミリーシアター】休日の夜、家族みんなでアニメや知育動画を楽しむ大画面" },
      { url: "/images/kaitai/ch4_theater_projector.jpg", caption: "【天井プロジェクター】子どもがコードに引っかかる心配のない天吊り安全設計" },
      { url: "/images/kaitai/ch9_solar_house_exterior.jpg", caption: "【太陽光発電】子育てにかかる将来の電気代をぐっと抑える屋根一体型ソーラー" },
      { url: "/images/kaitai/ch9_hems_monitor.jpg", caption: "【エネルギー教育】子どもと一緒に電気の使い方を学べるHEMSタッチモニター" },
      { url: "/images/craftsman_architect_tag.jpg", caption: "【職人さんの木工仕事】お子様の成長に合わせて棚を組み替えられる可動式ダボ加工" },
      { url: "/images/structural_calculation_frame.jpg", caption: "【直下率70%の強さ】回遊動線の開口部が多くても大地震に耐え抜く強靭な耐力壁配置" },
      { url: "/images/heat20_insulation_structure.jpg", caption: "【24h換気計画】花粉やPM2.5を99%除去して室内にきれいな空気だけを届ける換気システム" },
      { url: "/images/kaitai/ch10_roof_insulation.jpg", caption: "【小屋裏断熱】2階の子ども部屋が夏でも涼しく勉強に集中できる超高断熱天井" },
      { url: "/images/hero_kaguya_house.jpg", caption: "【夜のあたたかな風景】子どもたちの元気な笑い声が聞こえてくる温もりある外観" },
      { url: "/images/cases/case1_living.jpg", caption: "【入居後の風景】無垢の杉床に座って遊ぶ子どもたちの笑顔がまぶしいリビング" }
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

