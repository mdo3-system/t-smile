// -*- coding: utf-8 -*-
// manga-viewer.js: 4コマ漫画のクリック拡大表示 ＆ 前後ナビゲーション (ライトボックスビューア)

(function() {
  'use strict';

  // 漫画データセットの定義
  const mangaSets = {
    'carte-50s': {
      title: '🍵 50代〜 セカンドライフ・大人の平屋編',
      nextActionUrl: '#madori-consultation-bot',
      nextActionText: '🤖 50代の平屋カルテを試してみる ➜',
      panels: [
        {
          step: 1,
          title: '第1話：落ち着いたリビングで',
          src: '/images/carte_story_50s/comic_50s_step1.jpg',
          caption: '妻「ほらお父さん、これからの二人の暮らし、ちょっとやってみない？」<br><span style="font-size:0.85rem; color:#94a3b8;">緑茶を飲みながらタブレット操作。難しい専門用語はなく、直感タップで選ぶだけ！</span>'
        },
        {
          step: 2,
          title: '第2話：夫がスマホでサクサク回答',
          src: '/images/carte_story_50s/comic_50s_step2.jpg',
          caption: '夫「老後は階段のない平屋がいいな…ヒートショックのない暖かい家」<br><span style="font-size:0.85rem; color:#94a3b8;">妻から届いたLINEリンクを開くだけ。バリアフリー、高断熱、庭いじり動線を自分のスマホで落ち着いて回答。</span>'
        },
        {
          step: 3,
          title: '第3話：相手に言えない本音もこっそり🔓',
          src: '/images/carte_story_50s/comic_50s_step3.jpg',
          caption: '「相手に遠慮して言えなかった本音」も、AIになら書ける！<br><span style="font-size:0.85rem; color:#94a3b8;">妻「実は手芸や絵の趣味の小部屋がほしい…」／夫「定年後は庭を眺められる小さな書斎がほしい…」長年言えなかった希望もAIがキャッチ！</span>'
        },
        {
          step: 4,
          title: '第4話：理想の上質カルテ完成！',
          src: '/images/carte_story_50s/comic_50s_step4.jpg',
          caption: '夫婦「お互いの希望が両方叶ってる！これなら遠慮なく相談できるね！」<br><span style="font-size:0.85rem; color:#94a3b8;">どちらかが我慢する妥協ではなく、趣味部屋と書斎とバリアフリーが両立した平屋カルテが即時手に入ります！</span>'
        }
      ]
    },
    'carte-young': {
      title: '🧒 30〜40代 子育て・共働き世帯編',
      nextActionUrl: '#madori-consultation-bot',
      nextActionText: '🤖 夫婦の家づくりカルテを試してみる ➜',
      panels: [
        {
          step: 1,
          title: '第1話：夜のリビングで',
          src: '/images/carte_story/comic_step1_wife.jpg',
          caption: '妻「えっ、何これ？面白い！質問に答えるだけ？」<br><span style="font-size:0.85rem; color:#94a3b8;">子どもが寝た後の静かな時間、スマホで直感タップ。「車は何台？」「朝の洗面渋滞は？」「乾太くんからファミクロ直結？」3分でサクサク！</span>'
        },
        {
          step: 2,
          title: '第2話：夫のスマホにLINE',
          src: '/images/carte_story/comic_step2_husband.jpg',
          caption: '夫「お、LINEきた！俺の意見も聞いてくれるの？」<br><span style="font-size:0.85rem; color:#94a3b8;">妻から送られたLINEリンクをタップ。「駐車場は来客用も欲しい」「将来のEV充電は？」。会員登録不要でサクッと回答！</span>'
        },
        {
          step: 3,
          title: '第3話：秘密の本音（角が立たない）🔓',
          src: '/images/carte_story/comic_step3_secret.jpg',
          caption: '「相手には直接言えない本音」もこっそり…<br><span style="font-size:0.85rem; color:#94a3b8;">「本当は趣味スペースが欲しい」「水回りの掃除を夫にも分担してほしい」。面と向かうと喧嘩になりそうな本音も、AIが設計士にだけ伝える安全設計！</span>'
        },
        {
          step: 4,
          title: '第4話：AI融合案カルテ提出！',
          src: '/images/carte_story/comic_step4_report.jpg',
          caption: '夫婦「すごい！これなら二人とも大満足だね！」<br><span style="font-size:0.85rem; color:#94a3b8;">AIが二人の回答を自動合体！「妥協」ではなく、動線とゾーニングによる「いいとこ取り解決策」を即時出力！</span>'
        }
      ]
    },
    'perse-studio': {
      title: '🎨 プロ級AIパースアトリエ体験記',
      nextActionUrl: '/flow/',
      nextActionText: '📐 家づくりの流れ・15万円申込特典を見る ➜',
      panels: [
        {
          step: 1,
          title: '第1話：申込者限定解放',
          src: '/images/perse_studio/comic_perse_step1.jpg',
          caption: '「えっ！？プロのCGクリエイターが作るような高品位パースが、自分たちで作り放題！？」<br><span style="font-size:0.85rem; color:#94a3b8;">15万円の設計申込後、専用アトリエにログイン！建築士やCG会社に外注すれば1枚数十万円のパースがスマホからいつでも自由に！</span>'
        },
        {
          step: 2,
          title: '第2話：直感レイアウト＆素材選択',
          src: '/images/perse_studio/comic_perse_step2.jpg',
          caption: '「キッチンと洗面をつなげて、床は温もりある無垢材にして…！」<br><span style="font-size:0.85rem; color:#94a3b8;">バブルプランでパズルのように部屋パーツを動かし、家事ラク動線を検討。「夕暮れの間接照明」「吹き抜け」「ジャパンディ」等を選ぶだけ！</span>'
        },
        {
          step: 3,
          title: '第3話：息をのむ瞬間',
          src: '/images/perse_studio/comic_perse_step3.jpg',
          caption: '「うわぁっ！雑誌の表紙みたいな3Dパースができた！光の当たり方も本物そっくり！」<br><span style="font-size:0.85rem; color:#94a3b8;">ボタンを押してわずか数秒！埼玉の柔らかな自然光、吉野杉の木目、化粧梁までリアルに描写。想像の空間が一瞬で目の前に！</span>'
        },
        {
          step: 4,
          title: '第4話：打ち合わせが待ち遠しい',
          src: '/images/perse_studio/comic_perse_step4.jpg',
          caption: '「何十通りも試せるから後悔ゼロ！設計士さんに見せるのが待ち遠しい！」<br><span style="font-size:0.85rem; color:#94a3b8;">夜、お酒やコーヒーを片手に「こっちの木目もいいね」「夜の照明も素敵」と何パターンも保存。打ち合わせが最高に楽しい時間へ昇華！</span>'
        }
      ]
    },
    'how-to-use': {
      title: '📖 30秒でわかる！AIプラン検索＆パース工房の使い方',
      nextActionUrl: '#floorplan-studio',
      nextActionText: '✨ さっそくプランを試してみる ➜',
      panels: [
        {
          step: 1,
          title: '第1話：図面がなくても大丈夫！',
          src: '/images/perse_studio/comic_perse_step1.jpg',
          caption: '妻「えっ、図面がなくても作れるの？」「そうなんです！好きな空間やスタイル（ジャパンディ・北欧モダンなど）をポチポチ選ぶだけ！」<br><span style="font-size:0.85rem; color:#94a3b8;">難しいCADや専門知識はゼロでOK。スマホやタブレットから直感タップで理想の住まいを形にできます。</span>'
        },
        {
          step: 2,
          title: '第2話：AIが瞬時にプラン＆パース自動生成！',
          src: '/images/perse_studio/comic_perse_step2.jpg',
          caption: '夫「うわぁ！もうできた！光の当たり方までリアルだね！」<br><span style="font-size:0.85rem; color:#94a3b8;">わずか数秒で、プロクオリティの3Dパースや間取りプランをAIが自動描画。受給できる補助金や概算予算まで即時把握！</span>'
        },
        {
          step: 3,
          title: '第3話：家カルテに保存＆いつでも電話相談！',
          src: '/images/perse_studio/comic_perse_step4.jpg',
          caption: '夫婦「気に入ったプランはワンタップで家カルテに保存！わからない時は電話で大工さんや建築士に直接聞けるから安心だね！」<br><span style="font-size:0.85rem; color:#94a3b8;">お電話でのご質問も大歓迎: <strong>049-271-2350</strong>（9:00〜18:00・水日祝も予約可）。何でもお気軽にご相談ください！</span>'
        }
      ]
    }
  };

  let currentSetKey = 'carte-50s';
  let currentIndex = 0;

  // モーダルDOMを動的に生成
  function createModalDom() {
    if (document.getElementById('manga-lightbox-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'manga-lightbox-modal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(10, 15, 29, 0.92);
      backdrop-filter: blur(8px);
      overflow-y: auto;
      padding: 1rem;
      user-select: none;
    `;

    modal.innerHTML = `
      <div id="manga-lightbox-wrap" style="
        position: relative;
        max-width: 860px;
        margin: 1.5rem auto;
        background: #0f172a;
        border: 2px solid #38bdf8;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        color: #ffffff;
      ">
        <!-- ヘッダーバー -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.8rem 1.4rem;
          background: rgba(15, 23, 42, 0.95);
          border-bottom: 1px solid #334155;
        ">
          <div>
            <span id="manga-modal-set-title" style="color: #38bdf8; font-weight: 800; font-size: 0.9rem;"></span>
            <h3 id="manga-modal-panel-title" style="margin: 2px 0 0; font-size: 1.15rem; color: #ffffff; font-weight: 800;"></h3>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span id="manga-modal-counter" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 3px 12px; border-radius: 14px; font-weight: 800; font-size: 0.85rem;"></span>
            <button type="button" id="manga-modal-close-btn" style="
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: #ffffff;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              font-size: 1.3rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
            ">✕</button>
          </div>
        </div>

        <!-- 漫画画像メイン表示枠 -->
        <div style="
          position: relative;
          background: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 360px;
          max-height: 68vh;
          overflow: hidden;
        ">
          <img id="manga-modal-img" src="" alt="漫画パネル" style="
            max-width: 100%;
            max-height: 68vh;
            width: auto;
            height: auto;
            display: block;
            object-fit: contain;
            cursor: pointer;
            transition: opacity 0.2s ease;
          ">
          
          <!-- 左右の浮き矢印ボタン（PC・大画面用） -->
          <button type="button" id="manga-float-prev" style="
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(255,255,255,0.3);
            color: #ffffff;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            font-size: 1.4rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          ">❮</button>

          <button type="button" id="manga-float-next" style="
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(255,255,255,0.3);
            color: #ffffff;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            font-size: 1.4rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          ">❯</button>
        </div>

        <!-- キャプション ＆ ナビゲーションバー -->
        <div style="padding: 1.2rem 1.4rem; background: #0f172a; border-top: 1px solid #334155;">
          <p id="manga-modal-caption" style="
            margin: 0 0 1.2rem;
            color: #e2e8f0;
            font-size: 0.98rem;
            line-height: 1.7;
          "></p>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <button type="button" id="manga-nav-prev" style="
              background: rgba(255, 255, 255, 0.12);
              color: #ffffff;
              border: 1px solid rgba(255, 255, 255, 0.25);
              padding: 9px 20px;
              border-radius: 24px;
              font-weight: 800;
              font-size: 0.92rem;
              cursor: pointer;
              transition: all 0.2s;
            ">⬅ 前のコマへ</button>

            <!-- プログレスドット -->
            <div id="manga-dots-container" style="display: flex; gap: 8px;"></div>

            <button type="button" id="manga-nav-next" style="
              background: linear-gradient(135deg, #0284c7, #38bdf8);
              color: #0f172a;
              border: none;
              padding: 9px 24px;
              border-radius: 24px;
              font-weight: 900;
              font-size: 0.92rem;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 4px 15px rgba(56, 189, 248, 0.35);
            ">次のコマへ進む ➔</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナーの登録
    document.getElementById('manga-modal-close-btn').addEventListener('click', closeMangaModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeMangaModal();
    });

    document.getElementById('manga-nav-prev').addEventListener('click', showPrevPanel);
    document.getElementById('manga-float-prev').addEventListener('click', showPrevPanel);

    document.getElementById('manga-nav-next').addEventListener('click', showNextPanel);
    document.getElementById('manga-float-next').addEventListener('click', showNextPanel);

    // 画像タップでも次へ進める
    document.getElementById('manga-modal-img').addEventListener('click', showNextPanel);

    // キーボード操作
    window.addEventListener('keydown', (e) => {
      if (modal.style.display !== 'block') return;
      if (e.key === 'ArrowRight') showNextPanel();
      if (e.key === 'ArrowLeft') showPrevPanel();
      if (e.key === 'Escape') closeMangaModal();
    });
  }

  function renderCurrentPanel() {
    const data = mangaSets[currentSetKey];
    if (!data || !data.panels) return;

    const panel = data.panels[currentIndex];
    if (!panel) return;

    const modal = document.getElementById('manga-lightbox-modal');
    const setTitleEl = document.getElementById('manga-modal-set-title');
    const panelTitleEl = document.getElementById('manga-modal-panel-title');
    const counterEl = document.getElementById('manga-modal-counter');
    const imgEl = document.getElementById('manga-modal-img');
    const captionEl = document.getElementById('manga-modal-caption');
    const btnPrev = document.getElementById('manga-nav-prev');
    const floatPrev = document.getElementById('manga-float-prev');
    const btnNext = document.getElementById('manga-nav-next');
    const floatNext = document.getElementById('manga-float-next');
    const dotsContainer = document.getElementById('manga-dots-container');

    setTitleEl.innerText = data.title;
    panelTitleEl.innerText = panel.title;
    counterEl.innerText = `${panel.step} / ${data.panels.length} コマ`;
    captionEl.innerHTML = panel.caption;

    imgEl.style.opacity = '0.3';
    imgEl.src = panel.src;
    imgEl.onload = () => { imgEl.style.opacity = '1'; };

    // 前ボタンの制御
    if (currentIndex === 0) {
      btnPrev.style.opacity = '0.4';
      btnPrev.style.pointerEvents = 'none';
      floatPrev.style.display = 'none';
    } else {
      btnPrev.style.opacity = '1';
      btnPrev.style.pointerEvents = 'auto';
      floatPrev.style.display = 'flex';
    }

    // 次ボタンの制御（最後のコマならアクションボタンに変化）
    if (currentIndex === data.panels.length - 1) {
      btnNext.innerHTML = data.nextActionText || '閉じる ✕';
      btnNext.style.background = 'linear-gradient(135deg, #d97706, #f59e0b)';
      floatNext.style.display = 'none';
    } else {
      btnNext.innerHTML = '次のコマへ進む ➔';
      btnNext.style.background = 'linear-gradient(135deg, #0284c7, #38bdf8)';
      floatNext.style.display = 'flex';
    }

    // ドットインジケーター
    dotsContainer.innerHTML = '';
    data.panels.forEach((p, idx) => {
      const dot = document.createElement('span');
      dot.style.cssText = `
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${idx === currentIndex ? '#38bdf8' : 'rgba(255,255,255,0.25)'};
        cursor: pointer;
        transition: all 0.2s;
      `;
      dot.addEventListener('click', () => {
        currentIndex = idx;
        renderCurrentPanel();
      });
      dotsContainer.appendChild(dot);
    });
  }

  function openMangaModal(setKey, index) {
    createModalDom();
    currentSetKey = setKey || 'carte-50s';
    currentIndex = index || 0;
    renderCurrentPanel();

    const modal = document.getElementById('manga-lightbox-modal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeMangaModal() {
    const modal = document.getElementById('manga-lightbox-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function showNextPanel() {
    const data = mangaSets[currentSetKey];
    if (currentIndex < data.panels.length - 1) {
      currentIndex++;
      renderCurrentPanel();
    } else {
      // 最後のコマで押された場合、次のアクション先へ遷移またはモーダルを閉じる
      if (data.nextActionUrl) {
        if (data.nextActionUrl.startsWith('#')) {
          closeMangaModal();
          const target = document.querySelector(data.nextActionUrl);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.location.href = data.nextActionUrl;
        }
      } else {
        closeMangaModal();
      }
    }
  }

  function showPrevPanel() {
    if (currentIndex > 0) {
      currentIndex--;
      renderCurrentPanel();
    }
  }

  // ページ内の漫画画像にクリックイベントを自動バインド
  function bindMangaImageClicks() {
    createModalDom();

    // 1. 50代カルテ漫画
    document.querySelectorAll('img[src*="comic_50s_step"]').forEach((img, idx) => {
      img.style.cursor = 'zoom-in';
      img.title = '🔍 クリックで拡大して読む（次へ進めます）';
      img.addEventListener('click', () => openMangaModal('carte-50s', idx));
      if (img.parentElement) {
        img.parentElement.style.cursor = 'zoom-in';
        img.parentElement.addEventListener('click', (e) => {
          if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
            openMangaModal('carte-50s', idx);
          }
        });
      }
    });

    // 2. 子育てカルテ漫画
    document.querySelectorAll('img[src*="comic_step"]').forEach((img, idx) => {
      // 50s除外
      if (img.src.includes('comic_50s_step')) return;
      img.style.cursor = 'zoom-in';
      img.title = '🔍 クリックで拡大して読む（次へ進めます）';
      img.addEventListener('click', () => openMangaModal('carte-young', idx));
      if (img.parentElement) {
        img.parentElement.style.cursor = 'zoom-in';
        img.parentElement.addEventListener('click', (e) => {
          if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
            openMangaModal('carte-young', idx);
          }
        });
      }
    });

    // 3. AIパースアトリエ漫画
    document.querySelectorAll('img[src*="comic_perse_step"]').forEach((img, idx) => {
      img.style.cursor = 'zoom-in';
      img.title = '🔍 クリックで拡大して読む（次へ進めます）';
      img.addEventListener('click', () => openMangaModal('perse-studio', idx));
      if (img.parentElement) {
        img.parentElement.style.cursor = 'zoom-in';
        img.parentElement.addEventListener('click', (e) => {
          if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
            openMangaModal('perse-studio', idx);
          }
        });
      }
    });

    // 4. 「使い方を聞く（漫画で解説）」ボタン
    document.querySelectorAll('.btn-open-how-to-use').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openMangaModal('how-to-use', 0);
      });
    });
  }

  // グローバル公開
  window.openMangaModal = openMangaModal;
  window.closeMangaModal = closeMangaModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindMangaImageClicks);
  } else {
    bindMangaImageClicks();
  }
})();
