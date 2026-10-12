// ========================================================
// 住ま居るAI建築士 間取り相談専用ボット ＆ 知見100選ギャラリー
// JavaScript Controller
// 株式会社住ま居る / スマイチ
// ========================================================

class MadoriBotStudio {
  constructor() {
    this.qaData = null;
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.currentInspectedQa = null;
    this.chatMessages = [];
  }

  async init() {
    await this.loadQaData();
    this.bindEvents();
    this.renderQaCards();
    this.updateCategoryCounts();
  }

  async loadQaData() {
    try {
      const res = await fetch('/data/qa_knowledge_100.json');
      if (res.ok) {
        this.qaData = await res.json();
        console.log(`[MadoriBot] Loaded ${this.qaData.questions.length} QA items.`);
      }
    } catch (e) {
      console.warn('[MadoriBot] Failed to load qa_knowledge_100.json:', e);
    }
  }

  bindEvents() {
    // 1. カテゴリタブ切り替え
    document.querySelectorAll('.madori-tab-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.madori-tab-pill').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentCategory = e.currentTarget.getAttribute('data-cat') || 'all';
        this.renderQaCards();
      });
    });

    // 2. 検索インプット（入力時は自動的に全ジャンル横断検索）
    const searchInput = document.getElementById('madori-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        if (this.searchQuery) {
          // 検索文字があるときは「すべて」タブをアクティブにして全ジャンル横断検索
          this.currentCategory = 'all';
          document.querySelectorAll('.madori-tab-pill').forEach(p => {
            if (p.getAttribute('data-cat') === 'all') p.classList.add('active');
            else p.classList.remove('active');
          });
        }
        this.renderQaCards();
      });
    }

    // 3. チャットモーダルの閉じるボタン
    const btnCloseChat = document.getElementById('btn-close-madori-chat');
    if (btnCloseChat) {
      btnCloseChat.addEventListener('click', () => {
        const modal = document.getElementById('madori-chat-modal');
        if (modal) modal.style.display = 'none';
      });
    }

    // 4. チャット送信フォーム
    const chatForm = document.getElementById('madori-chat-form');
    const chatInput = document.getElementById('madori-chat-input');
    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if (msg) {
          this.sendChatMessage(msg);
          chatInput.value = '';
        }
      });
    }

    // 5. 詳細モーダルの閉じるボタン
    const btnCloseDetail = document.getElementById('btn-close-qa-detail-modal');
    if (btnCloseDetail) {
      btnCloseDetail.addEventListener('click', () => {
        const m = document.getElementById('modal-qa-detail');
        if (m) m.style.display = 'none';
      });
    }

    // 6. マイカルテ保存ボタン（チャット内）
    const btnSaveChatCarte = document.getElementById('btn-madori-save-carte');
    if (btnSaveChatCarte) {
      btnSaveChatCarte.addEventListener('click', () => {
        this.saveCurrentChatToCarte();
      });
    }

    // 7. バブルプランへジャンプボタン
    const btnJumpBubble = document.getElementById('btn-madori-jump-bubble');
    if (btnJumpBubble) {
      btnJumpBubble.addEventListener('click', () => {
        const modal = document.getElementById('madori-chat-modal');
        if (modal) modal.style.display = 'none';
        // バブルプランへ遷移
        const navBubble = document.getElementById('btn-fp-mode-bubble');
        if (navBubble) navBubble.click();
        const section = document.getElementById('floorplan-studio');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  updateCategoryCounts() {
    if (!this.qaData || !this.qaData.questions) return;
    const qs = this.qaData.questions;
    document.querySelectorAll('.madori-tab-pill').forEach(pill => {
      const cat = pill.getAttribute('data-cat');
      if (cat === 'all') {
        pill.innerHTML = `🌟 すべて (${qs.length}問)`;
      } else {
        const count = qs.filter(q => q.category === cat).length;
        const baseName = pill.getAttribute('data-name') || cat;
        pill.innerHTML = `${baseName} (${count})`;
      }
    });
  }

  renderQaCards() {
    const grid = document.getElementById('madori-qa-grid');
    const emptyNotice = document.getElementById('madori-qa-empty');
    if (!grid || !this.qaData || !this.qaData.questions) return;

    let items = this.qaData.questions;

    // カテゴリフィルター
    if (this.currentCategory !== 'all') {
      items = items.filter(q => q.category === this.currentCategory);
    }

    // キーワード検索フィルター（自然文・語尾・助詞・双方向マッチング）
    if (this.searchQuery) {
      const rawQuery = this.searchQuery.toLowerCase().trim();
      const spaceTokens = rawQuery.split(/[\s　]+/).filter(t => t.length > 0);
      
      // 日本語の願望・助詞・語尾を除去した語幹キーワード
      const cleaned = rawQuery
        .replace(/(にしたい|したい|にできますか|できますか|はどう|どう|ってどう|について|のおすすめ|おすすめ|の選び方|選び方|とは|って何|のメリット|メリット|デメリット)$/g, '')
        .trim();

      // 主要な頻出住宅キーワード辞書
      const commonTerms = [
        '将来平屋', '平屋暮らし', '平屋', '1階完結', '食洗機', 'ミーレ', 'ボッシュ', '乾太くん', 'ガス乾燥',
        'ファミクロ', 'ファミリークローゼット', '土間', 'シューズクローク', 'パントリー', '吹き抜け', '吹抜',
        '勾配天井', '換気', '断熱', '気密', '耐震', '回遊動線', 'ランドリー', '室内干し', '小上がり',
        '畳コーナー', 'アイランド', '下がり天井', 'ルンバ', '洗面', 'トイレ', '脱衣室', 'タッチレス',
        'スマートキー', '太陽光', '蓄電池', 'エコキュート', '家相', '鬼門', 'ウッドデッキ', '中庭'
      ];

      items = items.filter(q => {
        const keywords = q.keywords || [];
        const kwStr = keywords.join(' ').toLowerCase();
        const full = (q.question + ' ' + q.shortAnswer + ' ' + q.dimension + ' ' + q.details + ' ' + kwStr).toLowerCase();

        // 1. そのまま完全一致
        if (full.includes(rawQuery)) return true;

        // 2. 語尾クリーニング後のキーワード一致（2文字以上）
        if (cleaned.length >= 2 && full.includes(cleaned)) return true;

        // 3. 入力文にカードのキーワードが含まれている（例: 「将来平屋暮らしにしたい」の中に card.keywordsの「将来平屋暮らし」や「平屋」がある）
        const matchedKw = keywords.some(kw => {
          const k = kw.toLowerCase().trim();
          return k.length >= 2 && rawQuery.includes(k);
        });
        if (matchedKw) return true;

        // 4. 空白区切りトークンのすべてが含まれる
        if (spaceTokens.length > 1 && spaceTokens.every(tok => full.includes(tok))) {
          return true;
        }

        // 5. クエリに含まれる主要住宅キーワードがカードにも含まれる
        const matchedCommon = commonTerms.some(term => {
          const t = term.toLowerCase();
          return rawQuery.includes(t) && full.includes(t);
        });
        if (matchedCommon) return true;

        return false;
      });
    }

    // カウント表示
    const countBadge = document.getElementById('madori-results-count');
    if (countBadge) {
      countBadge.textContent = `${items.length}問の設計知見を表示中`;
    }

    if (items.length === 0) {
      grid.innerHTML = '';
      if (emptyNotice) emptyNotice.style.display = 'block';
      return;
    }

    if (emptyNotice) emptyNotice.style.display = 'none';

    grid.innerHTML = items.map(q => `
      <div class="madori-qa-card" data-id="${q.id}">
        <div class="madori-card-thumb-wrap" onclick="window.madoriBotStudio.openDetailModal('${q.id}')">
          <img src="${q.image}" alt="${q.question}" class="madori-card-thumb" onerror="this.src='/images/knowledge/kitchen_strat_p2.jpg'" />
          <span class="madori-category-badge">${q.categoryName}</span>
          <span class="madori-dim-badge">📐 ${q.dimension}</span>
        </div>
        <div class="madori-card-body">
          <h4 class="madori-card-q">${q.question}</h4>
          <p class="madori-card-a">💡 <strong>AI建築士の即答:</strong> ${q.shortAnswer}</p>
          <div class="madori-card-actions">
            <button type="button" class="btn-ask-ai" onclick="window.madoriBotStudio.startDeepConsultation('${q.id}')">
              <span>💬</span> AI建築士に詳しく聞く
            </button>
            <button type="button" class="btn-view-detail" onclick="window.madoriBotStudio.openDetailModal('${q.id}')">
              図解を見る
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // 💬 ワンタップ深掘り対話チャットの起動（カード指定または自由相談・該当なしフォールバック対応）
  async startDeepConsultation(qaId) {
    if (!this.qaData) return;

    // カードの特定（qaId が 'free_chat' などの場合は自由相談モード）
    let q = null;
    if (qaId && qaId !== 'free_chat' && this.qaData.questions) {
      q = this.qaData.questions.find(item => item.id === qaId);
    }

    const modal = document.getElementById('madori-chat-modal');
    const titleEl = document.getElementById('madori-chat-title');
    const historyEl = document.getElementById('madori-chat-history');

    // 検索入力テキストの取得（ユーザーが入力した文言を引き継ぐ）
    const searchInput = document.getElementById('madori-search-input');
    const userSearchText = (this.searchQuery || (searchInput ? searchInput.value.trim() : '')).trim();
    const queryText = q ? q.question : (userSearchText || '住まいの間取りや動線設計について相談したいことがあります');

    this.currentInspectedQa = q;

    if (titleEl) {
      titleEl.innerHTML = q
        ? `💬 住ま居るAI建築士 間取り深掘り相談室 ｜ ${q.categoryName}`
        : `💬 住ま居るAI建築士 間取り直接相談室`;
    }
    if (historyEl) historyEl.innerHTML = '';
    if (modal) modal.style.display = 'flex';

    // ユーザー発言バブルを追加
    this.appendMessage('user', queryText);

    // AIのタイピングプレースホルダーを追加
    const typingId = 'typing_' + Date.now();
    this.appendTyping(typingId);

    try {
      const payload = q
        ? { qaId: q.id, message: q.question }
        : { message: queryText };

      const res = await fetch('/api/madori-bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      this.removeTyping(typingId);

      if (data.success && data.reply) {
        this.appendMessage('ai', data.reply, q ? q.image : null);
        if (data.recommendedQas && data.recommendedQas.length > 0) {
          this.appendRecommendations(data.recommendedQas);
        }
      } else {
        this.appendMessage('ai', '申し訳ありません。回答の生成中にエラーが発生しました。もう一度お試しください。');
      }
    } catch (err) {
      this.removeTyping(typingId);
      this.appendMessage('ai', '通信エラーが発生しました。時間をおいて再送してください。');
    }
  }

  // 自由入力チャットメッセージの送信
  async sendChatMessage(text) {
    if (!text.trim()) return;

    this.appendMessage('user', text);
    const typingId = 'typing_' + Date.now();
    this.appendTyping(typingId);

    try {
      const res = await fetch('/api/madori-bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();

      this.removeTyping(typingId);

      if (data.success && data.reply) {
        this.appendMessage('ai', data.reply);
        if (data.recommendedQas && data.recommendedQas.length > 0) {
          this.appendRecommendations(data.recommendedQas);
        }
      } else {
        this.appendMessage('ai', '申し訳ありません。回答の取得に失敗しました。');
      }
    } catch (err) {
      this.removeTyping(typingId);
      this.appendMessage('ai', 'サーバーとの通信に失敗しました。');
    }
  }

  appendMessage(sender, text, imageUrl = null) {
    const historyEl = document.getElementById('madori-chat-history');
    if (!historyEl) return;

    const div = document.createElement('div');
    div.className = `madori-msg madori-msg-${sender}`;

    let formattedText = text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    let imgHtml = '';
    if (imageUrl) {
      imgHtml = `<div style="margin-top: 8px; border-radius: 8px; overflow: hidden; max-width: 320px;">
        <img src="${imageUrl}" style="width: 100%; display: block;" alt="設計参考図" />
      </div>`;
    }

    div.innerHTML = `<div>${formattedText}</div>${imgHtml}`;
    historyEl.appendChild(div);
    historyEl.scrollTop = historyEl.scrollHeight;

    this.chatMessages.push({ sender, text, timestamp: new Date().toISOString() });
  }

  appendTyping(id) {
    const historyEl = document.getElementById('madori-chat-history');
    if (!historyEl) return;
    const div = document.createElement('div');
    div.id = id;
    div.className = 'madori-msg madori-msg-ai';
    div.innerHTML = `<span style="color: #8b5cf6;">🤖 住ま居るAI建築士が知見から回答を作成中...</span>`;
    historyEl.appendChild(div);
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  appendRecommendations(recs) {
    const historyEl = document.getElementById('madori-chat-history');
    if (!historyEl) return;
    const box = document.createElement('div');
    box.style.background = '#f5f3ff';
    box.style.border = '1px solid #ddd6fe';
    box.style.borderRadius = '12px';
    box.style.padding = '10px 14px';
    box.style.marginTop = '6px';
    box.style.fontSize = '0.82rem';

    box.innerHTML = `
      <div style="font-weight: 800; color: #6d28d9; margin-bottom: 6px;">💡 こちらの関連する疑問もよく相談されています：</div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        ${recs.map(r => `
          <button type="button" style="text-align: left; background: #ffffff; border: 1px solid #c4b5fd; color: #4c1d95; font-size: 0.8rem; padding: 5px 10px; border-radius: 6px; cursor: pointer;" onclick="window.madoriBotStudio.startDeepConsultation('${r.id}')">
            ➔ ${r.question}
          </button>
        `).join('')}
      </div>
    `;
    historyEl.appendChild(box);
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  // 🔍 詳細図解・解説モーダル表示
  openDetailModal(qaId) {
    if (!this.qaData || !this.qaData.questions) return;
    const q = this.qaData.questions.find(item => item.id === qaId);
    if (!q) return;

    this.currentInspectedQa = q;
    const modal = document.getElementById('modal-qa-detail');
    const titleEl = document.getElementById('qa-detail-title');
    const catEl = document.getElementById('qa-detail-category');
    const dimEl = document.getElementById('qa-detail-dimension');
    const imgEl = document.getElementById('qa-detail-img');
    const bodyEl = document.getElementById('qa-detail-body');
    const askBtn = document.getElementById('btn-qa-detail-ask-ai');

    if (titleEl) titleEl.textContent = q.question;
    if (catEl) catEl.textContent = q.categoryName;
    if (dimEl) dimEl.textContent = q.dimension;
    if (imgEl) imgEl.src = q.image;
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="margin-bottom: 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 10px; color: #166534; font-size: 0.9rem; font-weight: 700;">
          💡 AI建築士の即答: ${q.shortAnswer}
        </div>
        <div style="font-size: 0.88rem; color: #334155; line-height: 1.8;">
          ${q.details}
        </div>
      `;
    }

    if (askBtn) {
      askBtn.onclick = () => {
        if (modal) modal.style.display = 'none';
        this.startDeepConsultation(q.id);
      };
    }

    if (modal) modal.style.display = 'flex';
  }

  // ⭐ 現在の対話・知見をマイカルテに保存
  saveCurrentChatToCarte() {
    if (!this.currentInspectedQa && this.chatMessages.length === 0) return;

    const carteList = JSON.parse(localStorage.getItem('smile_user_carte') || '[]');
    const qa = this.currentInspectedQa;

    const item = {
      id: 'madori_qa_' + Date.now(),
      type: 'madori_consultation',
      title: qa ? qa.question : '間取り相談対話ログ',
      category: qa ? qa.categoryName : '一般間取り相談',
      dimension: qa ? qa.dimension : '',
      shortAnswer: qa ? qa.shortAnswer : '',
      image: qa ? qa.image : '',
      chatSummary: this.chatMessages.slice(-2).map(m => m.text).join('\n---\n'),
      createdAt: new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    carteList.unshift(item);
    localStorage.setItem('smile_user_carte', JSON.stringify(carteList));

    const statusEl = document.getElementById('madori-save-status');
    if (statusEl) {
      statusEl.textContent = '✅ マイカルテに保存しました！';
      setTimeout(() => { statusEl.textContent = ''; }, 2500);
    }
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.madoriBotStudio = new MadoriBotStudio();
  window.madoriBotStudio.init();
});
