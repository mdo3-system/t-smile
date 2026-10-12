// ========================================================
// 株式会社住ま居る AI建築士 統合ナレッジ検索＆対話生成エンジン
// 温熱換気200問 ＋ 間取り設計200問（計400問テキストコーパス）対応
// ========================================================

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

class AiConsultantEngine {
  constructor() {
    this.corpus = [];
    this.loadCorpus();
  }

  loadCorpus() {
    try {
      const corpusPath = path.join(__dirname, 'knowledge_corpus.json');
      if (fs.existsSync(corpusPath)) {
        this.corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf-8'));
        console.log(`[AiConsultantEngine] Loaded ${this.corpus.length} knowledge items into text database.`);
      } else {
        console.warn(`[AiConsultantEngine] Corpus file not found at ${corpusPath}`);
      }
    } catch (err) {
      console.error('[AiConsultantEngine] Failed to load corpus:', err);
    }
  }

  // テキストトークン化と重み付け
  tokenize(text) {
    if (!text) return [];
    const clean = text.toLowerCase()
      .replace(/[、。！？\n\r\t,!?()（）「」『』【】・]/g, ' ')
      .trim();
    
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    
    // 日本語の2〜4文字N-gramも抽出（複合語検知）
    const ngrams = [];
    const noSpace = clean.replace(/\s+/g, '');
    for (let len = 2; len <= 4; len++) {
      for (let i = 0; i <= noSpace.length - len; i++) {
        ngrams.push(noSpace.substring(i, i + len));
      }
    }
    return Array.from(new Set([...words, ...ngrams]));
  }

  // 400問テキストコーパスに対するセマンティック・類似度スコアリング
  searchKnowledge(query, limit = 4) {
    if (!this.corpus || this.corpus.length === 0) return [];
    
    const qLower = query.toLowerCase().trim();
    const qTokens = this.tokenize(query);

    // クエリ内の特別重要キーワード
    const priorityKeywords = [
      { words: ['c値の測定', 'c値 測定', '気密測定', '測定はやってもらえますか', '測定費用', '費用はいくら', 'いくらぐらい'], boostId: 'th_air_02' },
      { words: ['エアコン1台', 'エアコン 1台', 'サーモオフ', '2階リビング', '吹き抜け エアコン', '扇風機', 'エアコン故障'], boostId: 'th_hvac_01' },
      { words: ['床下エアコン', '基礎断熱 床断熱', '床下暖房'], boostId: 'th_fnd_05' },
      { words: ['第1種換気', '全熱交換', '換気方式'], boostId: 'th_vnt_01' },
      { words: ['トリプルガラス', '樹脂トリプル', '窓 結露'], boostId: 'th_win_01' },
      { words: ['内部結露', '壁体内結露'], boostId: 'th_cnd_01' },
      { words: ['鬼門', '裏鬼門', '家相', '風水'], boostId: 'qa_31' },
      { words: ['ハイドア', '2400', '建具'], boostId: 'qa_21' },
      { words: ['パントリー', 'キッチン動線', 'アイランド'], boostId: 'qa_01' },
      { words: ['ファミリークローゼット', 'ファミクロ', '洗濯動線'], boostId: 'qa_02' },
      { words: ['小上がり畳', '畳コーナー', '和室'], boostId: 'qa_15' }
    ];

    let boostedId = null;
    for (const pk of priorityKeywords) {
      if (pk.words.some(w => qLower.includes(w))) {
        boostedId = pk.boostId;
        break;
      }
    }

    const scored = this.corpus.map(item => {
      let score = 0;

      // 特別ブースト
      if (boostedId && item.id === boostedId) {
        score += 100;
      }

      const qText = item.question.toLowerCase();
      const ansText = item.shortAnswer.toLowerCase();
      const detText = item.details.toLowerCase();
      const priText = item.principle.toLowerCase();
      const kws = (item.keywords || []).map(k => k.toLowerCase());

      // 完全フレーズマッチ
      if (qText.includes(qLower)) score += 50;
      if (ansText.includes(qLower)) score += 30;

      // トークンマッチング
      for (const token of qTokens) {
        if (token.length < 2) continue;
        
        if (qText.includes(token)) score += 8 * token.length;
        if (kws.some(k => k.includes(token))) score += 7 * token.length;
        if (ansText.includes(token)) score += 4 * token.length;
        if (detText.includes(token)) score += 2 * token.length;
        if (priText.includes(token)) score += 2 * token.length;
      }

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.item);
  }

  // Gemini API または 自律生成による回答構築
  async answerConsultation(query, history = []) {
    const qLower = query.trim();
    if (!qLower) {
      return {
        reply: "ご質問を入力してください。間取りの工夫、生活動線、UA値やC値、エアコン計画など何でもお答えいたします！",
        recommendedQas: []
      };
    }

    // 1. 400問から関連知見を検索・抽出
    const matchedItems = this.searchKnowledge(qLower, 4);
    const topItem = matchedItems[0] || null;

    // 2. Gemini API Key がある場合は本格RAG対話を試行
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const geminiReply = await this.callGeminiApi(qLower, matchedItems, history, geminiApiKey);
        if (geminiReply) {
          return {
            reply: geminiReply,
            recommendedQas: matchedItems.slice(0, 3).map(m => ({
              id: m.id,
              question: m.question,
              categoryName: m.categoryName
            }))
          };
        }
      } catch (e) {
        console.warn('[AiConsultantEngine] Gemini API call failed, falling back to local synthesis:', e.message);
      }
    }

    // 3. ローカル自律ハイブリッド知見統合生成（APIキーがない場合も最高品質）
    const localReply = this.synthesizeLocalResponse(qLower, matchedItems);
    return {
      reply: localReply,
      recommendedQas: matchedItems.slice(0, 3).map(m => ({
        id: m.id,
        question: m.question,
        categoryName: m.categoryName
      }))
    };
  }

  // ローカル知見統合生成
  synthesizeLocalResponse(query, matchedItems) {
    if (!matchedItems || matchedItems.length === 0) {
      return `【住ま居るAI温熱・設計建築士より】
「${query}」についてのご相談ありがとうございます。

株式会社住ま居るでは、埼玉の気候風土の中で、専門家や研究者の勉強会に足繁く通い、実際の現場で試行錯誤し（成功と失敗の実体験）、私どもが現在たどり着いた知見に基づいてプランと温熱の両面からご提案しています。

【住ま居るの基本スタンス】
1. **躯体性能**: 木造×高断熱（UA値0.3〜0.4台）×実測C値0.28〜0.6目安・1.0以下保証（吹付け断熱で中間時気密測定を行い隙間を徹底ブロック）。
2. **冷暖房計画**: 夏のエアコンはサーモオフ防止と扇風機併用、万一の故障リスクに備えた1階・2階各1台（計2台）体制。冬は上下温度差が少なく1階エアコンで家中ポカポカ。
3. **間取り設計**: 家族が「あーでもない、こーでもない」と話しながら決める生活動線と黄金寸法を大切にしています。

より具体的な条件（吹き抜けの広さ、2階リビング、日射取得、ご予算、敷地形状など）をお知らせいただければ、さらに踏み込んでお答えいたします！`;
    }

    const top = matchedItems[0];
    const secondary = matchedItems.length > 1 ? matchedItems[1] : null;

    let reply = `【住ま居るAI温熱・設計建築士より】
「${query}」について、私どもが埼玉の現場で試行錯誤してたどり着いた知見と設計原則よりお答えいたします！

💡 **結論・重要ポイント**
${top.shortAnswer}

`;

    if (top.dimension && top.dimension.length > 3) {
      reply += `📐 **標準基準・数値指標**
${top.dimension}

`;
    }

    reply += `🔍 **現場実務の技術根拠（物理原理・施工・プランのリアル）**
${top.details}

`;

    if (secondary && secondary.id !== top.id) {
      reply += `🏠 **あわせて配慮すべき設計視点（${secondary.categoryName}より）**
「${secondary.question}」
${secondary.shortAnswer}

`;
    }

    const principleText = (top.principle && top.principle.trim().length > 0)
      ? top.principle
      : '性能（UA値0.3台・C値実測0.28〜0.6目安/1.0以下保証）をベースに、住まい手の暮らしやすさと光熱費のバランスを両立させる設計を追求します。';

    reply += `★ **住ま居るの設計原則**
${principleText}

※本回答は住ま居るが埼玉の気候風土の中で、勉強会や実際の現場での試行錯誤（成功と失敗の実体験）を通して現在たどり着いた考え方です。建築に100％の絶対解はなく、間違いがあるかもしれないことを前提に、私どもが考える現時点での最善手としてご提案しています。

敷地の向きやご家族の暮らし方、エアコン台数、バブルプランの間取りについても続けて何でもご相談ください！`;

    return reply;
  }

  // Google Gemini API 連携（利用可能な場合）
  callGeminiApi(query, contextItems, history, apiKey) {
    return new Promise((resolve, reject) => {
      const contextText = contextItems.map((c, i) => `
[参考知見${i+1}: ${c.categoryName}]
設問: ${c.question}
要点: ${c.shortAnswer}
寸法・基準: ${c.dimension}
詳細・根拠: ${c.details}
原則: ${c.principle}
`).join('\n');

      const systemPrompt = `あなたは埼玉県鶴ヶ島市の地域工務店「株式会社住ま居る」の専任AI温熱・設計建築士です。
ユーザーから自由な住宅相談（温熱、気密、換気、エアコン、間取り、動線、プラン、家相など）が投げかけられます。

【回答方針・哲学】
1. 絶対的な正解（100%正しい）とは断定せず、「私どもが埼玉の気候風土の中で、勉強会や実際の現場で試行錯誤（成功と失敗の実体験）を重ねて現在たどり着いた知見」「私どもが考える現時点での最善手」という謙虚で信頼感のあるスタンスで語ってください。
2. 夏のエアコン：理論上は2階6畳用1台で冷える計算でも、エアコン周囲が冷えるとサーモオフして1階が冷えないこと、扇風機併用が気持ちいいこと、夏のわずかな温度差（25℃と28℃）では空気は動かないこと（冬は動く）、故障時の命のリスクに備えて1階と2階の各1台（計2台体制）にすることを必ず踏まえてください。
3. C値・気密測定：埼玉県なのでC値1.0未満のお約束、吹付け断熱で実質0.5未満が大半、中間時測定で弱点を見つけて大工さんと0.2〜0.6まで追い込むこと、全棟実測を行うことを明確に伝えてください。
4. 提供された【参考知見】を最大限に活かし、質問に直接的・親身・具体的に答えてください。
5. Markdown形式で読みやすく構成してください。`;

      const prompt = `以下の社内実務ナレッジを参考に、ユーザーの質問に回答してください。

【社内実務ナレッジ】
${contextText}

【ユーザーの質問】
${query}`;

      const payload = JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 10000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) resolve(text);
            else reject(new Error('Invalid Gemini API response structure'));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Gemini API timeout'));
      });
      req.write(payload);
      req.end();
    });
  }
}

module.exports = new AiConsultantEngine();
