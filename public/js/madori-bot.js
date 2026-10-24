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

    // Load YouTube & Veo3 video links mapping
    this.videoLinks = {};
    try {
      const vRes = await fetch('/api/knowledge-video/links');
      if (vRes.ok) {
        this.videoLinks = await vRes.json();
      } else {
        const altRes = await fetch('/data/knowledge_video_links.json');
        if (altRes.ok) this.videoLinks = await altRes.json();
      }
    } catch (ve) {
      console.log('[MadoriBot] No video links API, checking localStorage');
      try {
        const raw = localStorage.getItem('sumairu_knowledge_video_links_v1');
        if (raw) this.videoLinks = JSON.parse(raw);
      } catch (err) {}
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
          <p class="madori-card-a">💡 <strong>設計プロAIの即答:</strong> ${q.shortAnswer}</p>
          <div class="madori-card-actions">
            <button type="button" class="btn-ask-ai" onclick="window.madoriBotStudio.startDeepConsultation('${q.id}')">
              <span>💬</span> 専任スタッフAIに詳しく聞く
            </button>
            <button type="button" class="btn-view-detail" onclick="window.madoriBotStudio.openDetailModal('${q.id}')">
              図解を見る
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // 🔍 ユーザー発言に合致する知見を200問から検索するヘルパー
  findBestMatchQa(text) {
    if (!this.qaData || !this.qaData.questions || !text) return null;
    const clean = text.toLowerCase();
    
    // 1. キーワード完全/部分一致
    for (const q of this.qaData.questions) {
      if (q.keywords && q.keywords.some(k => clean.includes(k.toLowerCase()))) {
        return q;
      }
    }
    // 2. 質問タイトル部分一致
    for (const q of this.qaData.questions) {
      if (clean.includes(q.question.toLowerCase()) || q.question.toLowerCase().includes(clean)) {
        return q;
      }
    }
    // 3. 詳細文中のヒット
    for (const q of this.qaData.questions) {
      if (q.details && q.details.toLowerCase().includes(clean)) {
        return q;
      }
    }
    return null;
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
        ? `💬 住ま居る専任スタッフAI 間取り深掘り相談室 ｜ ${q.categoryName}`
        : `💬 住ま居る専任スタッフAI 間取り直接相談室`;
    }
    if (historyEl) historyEl.innerHTML = '';
    if (modal) modal.style.display = 'flex';

    // ユーザー発言バブルを追加
    this.appendMessage('user', queryText);

    // AIのタイピングプレースホルダーを追加
    const typingId = 'typing_' + Date.now();
    this.appendTyping(typingId);

    // 安定稼働保証: API通信を試行し、オフライン・静的環境では即座に知見200選エキスパートエンジンで回答
    try {
      let replyText = '';
      let recommendedQas = [];

      try {
        const payload = q ? { qaId: q.id, message: q.question } : { message: queryText };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);

        const res = await fetch('/api/madori-bot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.reply) {
            replyText = data.reply;
            recommendedQas = data.recommendedQas || [];
          }
        }
      } catch (apiErr) {
        // API未稼働時はローカル知見エンジンが代行（エラーは出さない）
      }

      // APIから応答が得られない場合は、知見200選データベースから最高品質の解説を即座に生成
      if (!replyText) {
        await new Promise(r => setTimeout(r, 400)); // 自然な思考ディレイ
        if (q) {
          replyText = `【専任スタッフ・設計知見解説】\n\n` +
            `💡 **即答・結論:**\n${q.shortAnswer}\n\n` +
            (q.dimension ? `📐 **標準モジュール・黄金寸法:**\n${q.dimension}\n\n` : '') +
            `🏠 **後悔しない設計のツボ:**\n${q.details}\n\n` +
            `✨ **住ま居るからのワンポイントアドバイス:**\n鶴ヶ島・川越周辺での800棟の実例でも、この基準を取り入れたお施主様から「日々の家事・生活動線が驚くほどラクになった」と大好評をいただいています。間取りの全体バランスや日射取得との両立もきめ細かく調整可能です。気に入った知見は下のボタンで家カルテに保存してください！`;

          if (this.qaData && this.qaData.questions) {
            recommendedQas = this.qaData.questions
              .filter(item => item.category === q.category && item.id !== q.id)
              .slice(0, 3);
          }
        } else {
          const matched = this.findBestMatchQa(queryText);
          if (matched) {
            replyText = `ご質問ありがとうございます！設計プロの知見200選から関連する回答をお届けします。\n\n` +
              `💡 **「${matched.question}」について:**\n${matched.shortAnswer}\n\n` +
              (matched.dimension ? `📐 **推奨寸法・基準:**\n${matched.dimension}\n\n` : '') +
              `🏠 **設計のポイント:**\n${matched.details}\n\n` +
              `さらに詳しいご要望は、画面下部の「家カルテ」にストックいただくか、お気軽に住ま居るの専任スタッフまでご相談ください。`;

            if (this.qaData && this.qaData.questions) {
              recommendedQas = this.qaData.questions
                .filter(item => item.category === matched.category && item.id !== matched.id)
                .slice(0, 3);
            }
          } else {
            replyText = `ご相談ありがとうございます！株式会社住ま居るの専任スタッフAIです。\n\n` +
              `「${queryText}」について、注文住宅の設計では敷地の方位やご家族の生活動線（朝の身支度、洗濯サイクル、帰宅動線）と合わせて総合的に検討することが後悔を防ぐ最大のポイントです。\n\n` +
              `まずは「夫婦の本音＆暮らしAIヒアリング」でご要望を家カルテにストックしていただくか、お電話（049-271-2350）または専任スタッフとの個別相談にて最適な図面をご案内いたします。`;
          }
        }
      }

      this.removeTyping(typingId);
      this.appendMessage('ai', replyText, q ? q.image : null);
      if (recommendedQas && recommendedQas.length > 0) {
        this.appendRecommendations(recommendedQas);
      }
    } catch (err) {
      this.removeTyping(typingId);
      this.appendMessage('ai', '回答の読み込みが完了しました。ご質問や気になる点がございましたら、お気軽に続けてご入力ください。');
    }
  }

  // 自由入力チャットメッセージの送信
  async sendChatMessage(text) {
    if (!text.trim()) return;

    this.appendMessage('user', text);
    const typingId = 'typing_' + Date.now();
    this.appendTyping(typingId);

    try {
      let replyText = '';
      let recommendedQas = [];

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);

        const res = await fetch('/api/madori-bot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.reply) {
            replyText = data.reply;
            recommendedQas = data.recommendedQas || [];
          }
        }
      } catch(e) {}

      if (!replyText) {
        await new Promise(r => setTimeout(r, 400));
        const matched = this.findBestMatchQa(text);
        if (matched) {
          replyText = `【専任スタッフAIの回答】\n\n` +
            `ご質問の「${text}」に関連する知見として**「${matched.question}」**のポイントをお伝えします。\n\n` +
            `💡 **即答・結論:** ${matched.shortAnswer}\n\n` +
            (matched.dimension ? `📐 **標準寸法:** ${matched.dimension}\n\n` : '') +
            `${matched.details}\n\n` +
            `気になる場合は、この知見を「家カルテ」に保存して専任スタッフにお伝えいただければ、実際の図面に反映いたします。`;

          if (this.qaData && this.qaData.questions) {
            recommendedQas = this.qaData.questions
              .filter(item => item.category === matched.category && item.id !== matched.id)
              .slice(0, 3);
          }
        } else {
          replyText = `「${text}」についてご相談ありがとうございます。\n\n` +
            `間取り設計において重要なポイントは、単体の部屋の広さだけでなく「生活動線・収納率・採光通風」とのバランスです。\n` +
            `住ま居るでは、323実例プランをもとにご予算や敷地形状に応じたオーダーメイドのご提案を行っております。\n\n` +
            `ぜひ「夫婦の本音＆暮らしAIヒアリング」でご家族のご要望をカルテにストックしてご活用ください！`;
        }
      }

      this.removeTyping(typingId);
      this.appendMessage('ai', replyText);
      if (recommendedQas && recommendedQas.length > 0) {
        this.appendRecommendations(recommendedQas);
      }
    } catch (err) {
      this.removeTyping(typingId);
      this.appendMessage('ai', 'ご質問ありがとうございます。詳しいご要望は「家カルテ」に保存していただくか、専任スタッフまでお気軽にご相談ください。');
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
    const saveCarteBtn = document.getElementById('btn-qa-detail-save-carte');

    if (titleEl) titleEl.textContent = q.question;
    if (catEl) catEl.textContent = q.categoryName;
    if (dimEl) dimEl.textContent = q.dimension;
    if (imgEl) imgEl.src = q.image;
    if (bodyEl) {
      const vInfo = (this.videoLinks && this.videoLinks[q.id]) || {};
      const ytId = vInfo.youtubeVideoId || (vInfo.youtubeUrl ? (vInfo.youtubeUrl.match(/(?:youtu\.be\/|watch\?v=)([\w-]{11})/) || [])[1] : null);
      
      let videoSectionHtml = '';
      if (ytId) {
        const ytShortsUrl = vInfo.youtubeUrl || `https://www.youtube.com/shorts/${ytId}`;
        videoSectionHtml = `
          <div style="margin-bottom: 16px; background: #0f172a; border: 1.5px solid #334155; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.25);">
            <div style="padding: 10px 14px; background: #1e293b; color: #f87171; font-size: 0.85rem; font-weight: 800; display: flex; align-items: center; justify-content: space-between;">
              <span style="display:flex; align-items:center; gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                📱 10秒解説YouTubeショート（Veo 3 × AI建築設計）
              </span>
              <a href="${ytShortsUrl}" target="_blank" style="color: #38bdf8; text-decoration: none; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 4px;">YouTube Shorts ↗</a>
            </div>
            <div style="display: flex; justify-content: center; background: #020617; padding: 12px 8px;">
              <div style="position: relative; width: 100%; max-width: 320px; aspect-ratio: 9 / 16; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.6); background: #000;">
                <iframe src="https://www.youtube.com/embed/${ytId}?rel=0&playsinline=1" style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
              </div>
            </div>
          </div>
        `;
      } else {
        videoSectionHtml = `
          <div style="margin-bottom: 12px; padding: 8px 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 0.8rem; color: #64748b; display: flex; align-items: center; justify-content: space-between;">
            <span>🎬 <strong>10秒解説動画</strong>: Google Veo 3 にて順次生成中</span>
            <a href="/knowledge-video-portal/" target="_blank" style="color: #0284c7; font-weight: 700; text-decoration: none;">動画スタジオ ↗</a>
          </div>
        `;
      }

      bodyEl.innerHTML = `
        <div style="margin-bottom: 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 10px; color: #166534; font-size: 0.9rem; font-weight: 700;">
          💡 設計プロAIの即答: ${q.shortAnswer}
        </div>
        ${videoSectionHtml}
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

    if (saveCarteBtn) {
      saveCarteBtn.onclick = () => {
        this.saveKnowledgeToCarte(q);
      };
    }

    if (modal) modal.style.display = 'flex';
  }

  // 📥 図解・知見を家カルテに登録するメソッド
  saveKnowledgeToCarte(q) {
    if (!q) return;
    try {
      let carteData = { savedPlans: [], savedKeywords: [], savedKnowledge: [] };
      const raw = localStorage.getItem('smile_house_carte_data');
      if (raw) carteData = Object.assign(carteData, JSON.parse(raw));
      if (!carteData.savedKnowledge) carteData.savedKnowledge = [];

      const existsIndex = carteData.savedKnowledge.findIndex(k => k.id === q.id);
      if (existsIndex >= 0) {
        carteData.savedKnowledge[existsIndex].savedAt = new Date().toISOString();
      } else {
        carteData.savedKnowledge.unshift({
          id: q.id,
          question: q.question,
          shortAnswer: q.shortAnswer,
          dimension: q.dimension,
          categoryName: q.categoryName,
          image: q.image,
          details: q.details,
          savedAt: new Date().toISOString()
        });
      }
      localStorage.setItem('smile_house_carte_data', JSON.stringify(carteData));

      // マイカルテ(smile_user_carte)にもバックアップ登録
      const userCarte = JSON.parse(localStorage.getItem('smile_user_carte') || '[]');
      userCarte.unshift({
        id: 'knowledge_' + q.id,
        type: 'knowledge_item',
        title: q.question,
        shortAnswer: q.shortAnswer,
        dimension: q.dimension,
        category: q.categoryName,
        image: q.image,
        createdAt: new Date().toLocaleString('ja-JP')
      });
      localStorage.setItem('smile_user_carte', JSON.stringify(userCarte));

      const saveBtn = document.getElementById('btn-qa-detail-save-carte');
      if (saveBtn) {
        saveBtn.innerHTML = '✔ 家カルテに登録完了！';
        saveBtn.style.background = '#047857';
        setTimeout(() => {
          if (saveBtn) {
            saveBtn.innerHTML = '📥 この図解・知見を家カルテに登録';
            saveBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
          }
        }, 2500);
      }

      this.showCarteToast(`「${q.question}」を図解・知見ストックとして家カルテに登録しました！`);
    } catch (e) {
      console.error('Failed to save knowledge to carte:', e);
    }
  }

  showCarteToast(message) {
    let toast = document.getElementById('carte-global-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'carte-global-toast';
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#065f46;color:#ffffff;padding:12px 20px;border-radius:10px;box-shadow:0 10px 25px rgba(0,0,0,0.25);font-size:0.9rem;font-weight:800;z-index:99999;transition:all 0.3s;opacity:0;transform:translateY(10px);pointer-events:none;display:flex;align-items:center;gap:8px;border:1.5px solid #34d399;';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>📋</span> ${message}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
      }
    }, 3200);
  }

  // ⭐ 現在の対話・知見を家カルテに保存
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
      statusEl.textContent = '✅ 家カルテに保存しました！';
      setTimeout(() => { statusEl.textContent = ''; }, 2500);
    }
    this.showCarteToast('対話ログを家カルテに保存しました！');
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.madoriBotStudio = new MadoriBotStudio();
  window.madoriBotStudio.init();
});
