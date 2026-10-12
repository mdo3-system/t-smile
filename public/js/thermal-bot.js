// ========================================================
// 住ま居るAI温熱建築士 24h温熱換気・高気密高断熱専用ボット
// ＆ 200問知見スタジオ JavaScript Controller
// 株式会社住ま居る / スマイチ
// ========================================================

class ThermalBotStudio {
  constructor() {
    this.qaData = null;
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.currentInspectedQa = null;
    this.chatHistory = [];
  }

  async init() {
    await this.loadQaData();
    this.bindEvents();
    this.renderQaCards();
    this.updateCategoryCounts();
  }

  async loadQaData() {
    try {
      const res = await fetch('/data/thermal_qa_200.json');
      if (res.ok) {
        this.qaData = await res.json();
        console.log(`[ThermalBot] Loaded ${this.qaData.questions.length} thermal QA items.`);
      }
    } catch (e) {
      console.warn('[ThermalBot] Failed to load thermal_qa_200.json:', e);
    }
  }

  bindEvents() {
    // 1. カテゴリタブ切り替え
    document.querySelectorAll('.thermal-tab-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.thermal-tab-pill').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentCategory = e.currentTarget.getAttribute('data-cat') || 'all';
        this.renderQaCards();
      });
    });

    // 2. 検索インプット（リアルタイムフィルタリング ＆ Enterキーでチャット直行）
    const searchInput = document.getElementById('thermal-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        if (this.searchQuery) {
          this.currentCategory = 'all';
          document.querySelectorAll('.thermal-tab-pill').forEach(p => {
            if (p.getAttribute('data-cat') === 'all') p.classList.add('active');
            else p.classList.remove('active');
          });
        }
        this.renderQaCards();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = searchInput.value.trim();
          if (query) {
            this.openChatModalWithQuery(query);
          }
        }
      });
    }

    // 3. モーダル閉じるボタン
    const detailModalClose = document.getElementById('thermal-detail-modal-close');
    const detailModal = document.getElementById('thermal-detail-modal');
    if (detailModalClose && detailModal) {
      detailModalClose.addEventListener('click', () => detailModal.classList.remove('active'));
      detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) detailModal.classList.remove('active');
      });
    }

    const chatModalClose = document.getElementById('thermal-chat-modal-close');
    const chatModal = document.getElementById('thermal-chat-modal');
    if (chatModalClose && chatModal) {
      chatModalClose.addEventListener('click', () => chatModal.classList.remove('active'));
      chatModal.addEventListener('click', (e) => {
        if (e.target === chatModal) chatModal.classList.remove('active');
      });
    }

    // 4. チャット送信
    const sendBtn = document.getElementById('thermal-chat-send-btn');
    const chatInput = document.getElementById('thermal-chat-input');
    if (sendBtn && chatInput) {
      sendBtn.addEventListener('click', () => this.sendChatMessage());
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }

    // 5. ヘッダーの「AI温熱建築士に質問・相談」ボタン
    const topConsultBtn = document.getElementById('thermal-top-consult-btn');
    if (topConsultBtn) {
      topConsultBtn.addEventListener('click', () => {
        const query = searchInput ? searchInput.value.trim() : '';
        if (query) {
          this.openChatModalWithQuery(query);
        } else {
          this.openChatModal("はじめまして！住ま居るの温熱仕様（UA値0.3台・C値0.28〜0.6/1.0以下保証・全熱交換換気）や、気になる吹き抜け・温熱・気密の疑問について何でも聞いてください。");
        }
      });
    }

    // 6. 詳細モーダル内の「このテーマをAIに相談する」ボタン
    const consultNowBtn = document.getElementById('thermal-consult-now-btn');
    if (consultNowBtn) {
      consultNowBtn.addEventListener('click', () => {
        if (this.currentInspectedQa) {
          detailModal.classList.remove('active');
          this.openChatModalWithQa(this.currentInspectedQa);
        }
      });
    }
  }

  updateCategoryCounts() {
    if (!this.qaData || !this.qaData.questions) return;
    const questions = this.qaData.questions;

    document.querySelectorAll('.thermal-tab-pill').forEach(pill => {
      const cat = pill.getAttribute('data-cat');
      let count = 0;
      if (cat === 'all') {
        count = questions.length;
        pill.textContent = `🌟 すべて (${count}問)`;
      } else {
        count = questions.filter(q => q.category === cat).length;
        const baseName = pill.getAttribute('data-name') || pill.textContent.split('(')[0].trim();
        pill.textContent = `${baseName} (${count})`;
      }
    });
  }

  getFilteredQuestions() {
    if (!this.qaData || !this.qaData.questions) return [];
    let list = this.qaData.questions;

    if (this.currentCategory !== 'all') {
      list = list.filter(q => q.category === this.currentCategory);
    }

    if (this.searchQuery) {
      const qLower = this.searchQuery;
      list = list.filter(q => {
        return (
          q.question.toLowerCase().includes(qLower) ||
          q.shortAnswer.toLowerCase().includes(qLower) ||
          q.details.toLowerCase().includes(qLower) ||
          q.principle.toLowerCase().includes(qLower) ||
          (q.keywords || []).some(k => k.toLowerCase().includes(qLower)) ||
          (q.sourceDoc || '').toLowerCase().includes(qLower)
        );
      });
    }

    return list;
  }

  renderQaCards() {
    const grid = document.getElementById('thermal-qa-grid');
    const countEl = document.getElementById('thermal-filtered-count');
    if (!grid) return;

    const items = this.getFilteredQuestions();
    if (countEl) {
      countEl.textContent = `${items.length}問の設計知見を表示中`;
    }

    if (items.length === 0) {
      const escapedQ = this.escapeHtml(this.searchQuery);
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; background: #ffffff; border-radius: 1rem; border: 2px dashed #cbd5e1; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
          <p style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem;">該当する温熱知見カードが見つかりませんでした</p>
          <p style="font-size: 0.95rem; color: #64748b; margin-bottom: 1.25rem;">
            「${escapedQ}」についての具体的な設計・施工の工夫を、AI温熱建築士が詳しくお答えします。
          </p>
          <button type="button" class="thermal-consult-btn-top" style="padding: 0.9rem 1.8rem; font-size: 1rem; box-shadow: 0 4px 12px rgba(5,150,105,0.3); cursor: pointer;" onclick="thermalBotStudio.openChatModalWithQuery(thermalBotStudio.searchQuery)">
            💬 「${escapedQ}」についてAI温熱建築士に質問する ➜
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(q => {
      const qNum = q.questionNumber || q.id.replace(/[^0-9]/g, '');
      return `
        <div class="thermal-qa-card" data-id="${q.id}">
          <div>
            <div class="thermal-card-header">
              <span class="thermal-cat-tag">${this.escapeHtml(q.categoryName)}</span>
              <span class="thermal-q-number">Q${qNum}</span>
            </div>
            <h3 class="thermal-q-title">${this.escapeHtml(q.question)}</h3>
            <p class="thermal-short-ans">${this.escapeHtml(q.shortAnswer)}</p>
            <div class="thermal-dim-badge">📐 ${this.escapeHtml(q.dimension)}</div>
          </div>
          <div class="thermal-card-footer">
            <span style="color: #059669; font-weight: 700; font-size: 0.78rem;">🏡 埼玉現場の実務知見</span>
            <span class="thermal-card-action">詳しく見る ➜</span>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.thermal-qa-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const qId = e.currentTarget.getAttribute('data-id');
        this.openDetailModal(qId);
      });
    });
  }

  openDetailModal(qId) {
    if (!this.qaData || !this.qaData.questions) return;
    const q = this.qaData.questions.find(item => item.id === qId);
    if (!q) return;

    this.currentInspectedQa = q;
    const modal = document.getElementById('thermal-detail-modal');
    if (!modal) return;

    document.getElementById('thermal-modal-title').textContent = q.question;
    document.getElementById('thermal-modal-cat').textContent = `${q.categoryName} （Q${q.questionNumber || ''}）`;
    document.getElementById('thermal-modal-ans').textContent = q.shortAnswer;
    document.getElementById('thermal-modal-dim').textContent = q.dimension;
    document.getElementById('thermal-modal-det').textContent = q.details;
    document.getElementById('thermal-modal-pri').textContent = q.principle;

    modal.classList.add('active');
  }

  openChatModal(initialGreeting = null) {
    const modal = document.getElementById('thermal-chat-modal');
    const msgBox = document.getElementById('thermal-chat-messages');
    if (!modal || !msgBox) return;

    if (this.chatHistory.length === 0) {
      const greeting = initialGreeting || "こんにちは！住ま居るの【24h温熱換気・高気密高断熱 AI建築士】です。埼玉の気候風土の中で、勉強会や実際の現場で試行錯誤（失敗と成功の実体験）を重ねて現在たどり着いた知見からお答えします。絶対の正解ではありませんが、私どもが考える現時点での最善手としてご参考になさってください。何でもお気軽にご質問ください！";
      this.chatHistory.push({ sender: 'bot', text: greeting });
      this.renderChatMessages('init');
    }

    modal.classList.add('active');
    setTimeout(() => {
      document.getElementById('thermal-chat-input')?.focus();
    }, 100);
  }

  async openChatModalWithQa(q) {
    this.openChatModal();
    // 自動的に該当Q&Aについての相談を送信
    this.chatHistory.push({ sender: 'user', text: `「${q.question}」について詳しく教えてください！` });
    this.renderChatMessages('user');

    const loadingId = 'thermal-loading-' + Date.now();
    this.chatHistory.push({ sender: 'bot', text: 'AI温熱建築士が設計知見200問を照合し、アドバイスを作成中...', isLoading: true, id: loadingId });
    this.renderChatMessages('loading');

    // APIを呼び出し
    try {
      const res = await fetch('/api/thermal-bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qaId: q.id, message: q.question })
      });
      this.chatHistory = this.chatHistory.filter(m => m.id !== loadingId);
      if (res.ok) {
        const data = await res.json();
        this.chatHistory.push({ sender: 'bot', text: data.reply, recommended: data.recommendedQas });
      } else {
        this.chatHistory.push({ sender: 'bot', text: q.details });
      }
    } catch (e) {
      this.chatHistory = this.chatHistory.filter(m => m.id !== loadingId);
      this.chatHistory.push({ sender: 'bot', text: q.details });
    }
    this.renderChatMessages('bot');
  }

  async openChatModalWithQuery(query) {
    if (!query || !query.trim()) {
      this.openChatModal();
      return;
    }
    const cleanQuery = query.trim();
    this.openChatModal();

    const input = document.getElementById('thermal-chat-input');
    if (input) input.value = '';

    this.chatHistory.push({ sender: 'user', text: cleanQuery });
    this.renderChatMessages('user');

    const loadingId = 'thermal-loading-' + Date.now();
    this.chatHistory.push({ sender: 'bot', text: 'AI温熱建築士が設計知見200問を照合し、回答を作成中...', isLoading: true, id: loadingId });
    this.renderChatMessages('loading');

    try {
      const res = await fetch('/api/thermal-bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cleanQuery })
      });
      this.chatHistory = this.chatHistory.filter(m => m.id !== loadingId);

      if (res.ok) {
        const data = await res.json();
        this.chatHistory.push({ sender: 'bot', text: data.reply, recommended: data.recommendedQas });
      } else {
        const fallbackReply = this.generateFallbackReply(cleanQuery);
        this.chatHistory.push({ sender: 'bot', text: fallbackReply.text, recommended: fallbackReply.recommended });
      }
    } catch (e) {
      console.warn('[ThermalBot] Fetch failed, using client fallback:', e);
      this.chatHistory = this.chatHistory.filter(m => m.id !== loadingId);
      const fallbackReply = this.generateFallbackReply(cleanQuery);
      this.chatHistory.push({ sender: 'bot', text: fallbackReply.text, recommended: fallbackReply.recommended });
    }

    this.renderChatMessages('bot');
  }

  async sendChatMessage() {
    const input = document.getElementById('thermal-chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this.chatHistory.push({ sender: 'user', text });
    this.renderChatMessages('user');

    // 送信中インジケータ
    const loadingId = 'thermal-loading-' + Date.now();
    this.chatHistory.push({ sender: 'bot', text: 'AI温熱建築士が設計知見200問を照合し、回答を作成中...', isLoading: true, id: loadingId });
    this.renderChatMessages('loading');

    try {
      const res = await fetch('/api/thermal-bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      // ローディング削除
      this.chatHistory = this.chatHistory.filter(m => m.id !== loadingId);

      if (res.ok) {
        const data = await res.json();
        this.chatHistory.push({ sender: 'bot', text: data.reply, recommended: data.recommendedQas });
      } else {
        // サーバー応答エラー時のクライアント側知見フォールバック
        const fallbackReply = this.generateFallbackReply(text);
        this.chatHistory.push({ sender: 'bot', text: fallbackReply.text, recommended: fallbackReply.recommended });
      }
    } catch (e) {
      console.warn('[ThermalBot] Fetch failed, using client fallback:', e);
      this.chatHistory = this.chatHistory.filter(m => m.id !== loadingId);
      const fallbackReply = this.generateFallbackReply(text);
      this.chatHistory.push({ sender: 'bot', text: fallbackReply.text, recommended: fallbackReply.recommended });
    }

    this.renderChatMessages('bot');
  }

  generateFallbackReply(query) {
    if (!this.qaData || !this.qaData.questions) {
      return {
        text: `【住ま居るAI温熱建築士より】\n「${query}」についてのお問い合わせありがとうございます。\n株式会社住ま居るでは埼玉の気候風土での現場検証に基づき、木造×超断熱×全棟気密測定（実測C値0.28〜0.6目安・1.0以下保証）を実施しております。\n※本回答は私どもが埼玉の現場で試行錯誤してたどり着いた現時点での考え方です。`,
        recommended: []
      };
    }
    const qLower = query.toLowerCase();
    // 優先度マッチング
    let hit = null;
    if (qLower.includes('吹き抜け') || qLower.includes('ふきぬけ')) {
      hit = this.qaData.questions.find(q => q.id === 'th_hvac_03') || this.qaData.questions.find(q => q.id === 'th_ins_08');
    }
    if (!hit && (qLower.includes('費用') || qLower.includes('いくら') || qLower.includes('測定') || qLower.includes('やってもらえ'))) {
      hit = this.qaData.questions.find(q => q.id === 'th_air_02');
    }
    if (!hit) {
      hit = this.qaData.questions.find(q => {
        const matchTitle = q.question.toLowerCase().includes(qLower);
        const matchKw = (q.keywords || []).some(k => qLower.includes(k.toLowerCase()));
        return matchTitle || matchKw;
      });
    }
    if (!hit) hit = this.qaData.questions[0];

    const reply = `【住ま居るAI温熱建築士より】
「${query}」について、私どもが埼玉の現場で試行錯誤してたどり着いた知見よりお答えいたします！

💡 **結論・重要ポイント**
${hit.shortAnswer}

📐 **標準基準・数値指標**
${hit.dimension}

🔍 **現場実務の技術根拠（物理原理・メリット・注意点）**
${hit.details}

★ **住ま居るの設計原則**
${hit.principle || '高断熱と全棟気密測定（実測0.28〜0.6目安/1.0以下保証）をベースに、住まい手の暮らしやすさと光熱費のバランスを両立させる設計を追求します。'}

※本回答は住ま居るが埼玉の気候風土の中で、勉強会や実際の現場での試行錯誤（成功と失敗の実体験）を通して現在たどり着いた考え方です。絶対の正解ではなく、間違いがあるかもしれないことを前提に、私どもが考える現時点での最善手としてご提案しています。`;

    const recommended = this.qaData.questions
      .filter(q => q.category === hit.category && q.id !== hit.id)
      .slice(0, 3)
      .map(q => ({ id: q.id, question: q.question, categoryName: q.categoryName }));

    return { text: reply, recommended };
  }

  formatBotMessage(rawText) {
    if (!rawText) return '';
    const lines = rawText.split('\n');
    let html = '';
    let inSection = false;

    for (let line of lines) {
      let trimmed = line.trim();
      let escaped = this.escapeHtml(trimmed).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (trimmed.startsWith('【住ま居るAI') || trimmed.startsWith('【住ま居るの基本')) {
        if (inSection) { html += '</p></div>'; inSection = false; }
        html += `<div class="thermal-reply-header">🌡️ ${escaped}</div>`;
      } else if (trimmed.includes('💡') && (trimmed.includes('結論') || trimmed.includes('ポイント'))) {
        if (inSection) { html += '</p></div>'; }
        html += `<div class="thermal-reply-section highlight"><h4>${escaped}</h4><p>`;
        inSection = true;
      } else if (trimmed.includes('📐') && (trimmed.includes('標準基準') || trimmed.includes('数値'))) {
        if (inSection) { html += '</p></div>'; }
        html += `<div class="thermal-reply-section" style="border-left-color:#0284c7; background:#f0f9ff;"><h4>${escaped}</h4><p>`;
        inSection = true;
      } else if (trimmed.includes('🔍') && (trimmed.includes('技術根拠') || trimmed.includes('現場実務'))) {
        if (inSection) { html += '</p></div>'; }
        html += `<div class="thermal-reply-section" style="border-left-color:#6366f1; background:#eef2ff;"><h4>${escaped}</h4><p>`;
        inSection = true;
      } else if (trimmed.includes('🏠') && (trimmed.includes('あわせて配慮') || trimmed.includes('設計視点'))) {
        if (inSection) { html += '</p></div>'; }
        html += `<div class="thermal-reply-section" style="border-left-color:#10b981; background:#f0fdf4;"><h4>${escaped}</h4><p>`;
        inSection = true;
      } else if (trimmed.includes('★') && trimmed.includes('原則')) {
        if (inSection) { html += '</p></div>'; }
        html += `<div class="thermal-reply-section principle"><h4>${escaped}</h4><p>`;
        inSection = true;
      } else if (trimmed.startsWith('※本回答は') || trimmed.startsWith('※')) {
        if (inSection) { html += '</p></div>'; inSection = false; }
        html += `<div class="thermal-reply-footer">${escaped}</div>`;
      } else {
        if (trimmed === '') {
          if (inSection) html += '<br>';
        } else {
          if (inSection) {
            html += `${escaped}<br>`;
          } else {
            html += `<p style="margin: 0.35rem 0;">${escaped}</p>`;
          }
        }
      }
    }
    if (inSection) html += '</p></div>';
    return html;
  }

  renderChatMessages(scrollTarget = null) {
    const container = document.getElementById('thermal-chat-messages');
    if (!container) return;

    container.innerHTML = this.chatHistory.map((m, idx) => {
      if (m.sender === 'user') {
        return `
          <div class="thermal-msg user" data-idx="${idx}">
            <div class="thermal-msg-avatar">👤</div>
            <div class="thermal-msg-bubble">${this.escapeHtml(m.text)}</div>
          </div>
        `;
      } else if (m.isLoading) {
        return `
          <div class="thermal-msg bot" data-idx="${idx}" id="${m.id}">
            <div class="thermal-msg-avatar">🌡️</div>
            <div class="thermal-msg-bubble" style="background:#f1f5f9; color:#475569;">
              <div style="font-weight:700; margin-bottom: 0.2rem;">${this.escapeHtml(m.text)}</div>
              <div class="thermal-loading-dots"><span></span><span></span><span></span></div>
            </div>
          </div>
        `;
      } else {
        let recHtml = '';
        if (m.recommended && m.recommended.length > 0) {
          recHtml = `
            <div style="margin-top: 0.9rem; padding: 0.8rem; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 0.6rem; font-size: 0.84rem;">
              <span style="color: #059669; font-weight: 800;">💡 関連するおすすめ知見（タップで質問）:</span>
              <ul style="margin: 0.4rem 0 0 1.2rem; padding: 0;">
                ${m.recommended.map(r => `
                  <li style="margin-bottom: 0.35rem;">
                    <a href="javascript:void(0)" onclick="thermalBotStudio.openChatModalWithQa({id: '${r.id}', question: '${this.escapeHtml(r.question)}'})" style="color: #0284c7; text-decoration: underline; font-weight: 600;">
                      ${this.escapeHtml(r.question)}
                    </a>
                  </li>
                `).join('')}
              </ul>
            </div>
          `;
        }
        return `
          <div class="thermal-msg bot" data-idx="${idx}">
            <div class="thermal-msg-avatar">🌡️</div>
            <div class="thermal-msg-bubble">
              ${this.formatBotMessage(m.text)}
              ${recHtml}
            </div>
          </div>
        `;
      }
    }).join('');

    // スクロール制御の最適化
    setTimeout(() => {
      if (scrollTarget === 'bot') {
        const botMessages = container.querySelectorAll('.thermal-msg.bot');
        if (botMessages.length > 0) {
          const lastBot = botMessages[botMessages.length - 1];
          // 新着ボット回答の冒頭がコンテナ上部に見えるようにスクロール！
          const targetTop = Math.max(0, lastBot.offsetTop - 15);
          container.scrollTo({
            top: targetTop,
            behavior: 'smooth'
          });
          return;
        }
      }
      container.scrollTop = container.scrollHeight;
    }, 40);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// グローバル初期化
const thermalBotStudio = new ThermalBotStudio();
document.addEventListener('DOMContentLoaded', () => {
  thermalBotStudio.init();
});
