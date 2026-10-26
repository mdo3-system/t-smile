/**
 * 株式会社住ま居る - 担当係別 管理者認証＆施主家カルテ一元チャット連携モジュール
 * (admin-auth.js)
 * 
 * 係一覧:
 * 1. 家づくりサポート係 (@help / smile2656)
 * 2. 設計係 (@s271 / smile2656)
 * 3. 工事係 (ss049 / smile2656)
 * 4. 経理総務係 (@keiri / smile2656)
 */

(function() {
  'use strict';

  // 1. デフォルト管理者アカウントマスター
  const DEFAULT_ADMIN_STAFF = [
    { id: '@help', name: '家づくりサポート係', role_name: '家づくりサポート係', icon: '🤝', color: '#0284c7', bg: '#e0f2fe', border: '#38bdf8', password: 'smile2656' },
    { id: '@s271', name: '設計係', role_name: '設計係', icon: '📐', color: '#b45309', bg: '#fef3c7', border: '#f59e0b', password: 'smile2656' },
    { id: 'ss049', name: '工事係', role_name: '工事係', icon: '🔨', color: '#15803d', bg: '#dcfce7', border: '#22c55e', password: 'smile2656' },
    { id: '@keiri', name: '経理総務係', role_name: '経理総務係', icon: '💼', color: '#6b21a8', bg: '#f3e8ff', border: '#a855f7', password: 'smile2656' }
  ];

  function getAdminAccounts() {
    try {
      const stored = localStorage.getItem('smile_admin_accounts');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return DEFAULT_ADMIN_STAFF;
  }

  function saveAdminAccounts(accounts) {
    try {
      localStorage.setItem('smile_admin_accounts', JSON.stringify(accounts));
    } catch (_) {}
  }

  function getCurrentAdmin() {
    try {
      const stored = localStorage.getItem('smile_current_admin');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return null;
  }

  function setCurrentAdmin(admin) {
    if (admin) {
      localStorage.setItem('smile_current_admin', JSON.stringify(admin));
    } else {
      localStorage.removeItem('smile_current_admin');
    }
    updateAdminUI();
  }

  // 2. UI更新
  function updateAdminUI() {
    const loginBox = document.getElementById('admin-login-box');
    const authView = document.getElementById('admin-authenticated-view');
    const roleBadge = document.getElementById('admin-staff-role-badge');
    const idBadge = document.getElementById('admin-staff-id');
    const iconBadge = document.getElementById('admin-staff-icon');

    const currentAdmin = getCurrentAdmin();

    if (currentAdmin) {
      if (loginBox) loginBox.style.display = 'none';
      if (authView) authView.style.display = 'block';

      if (roleBadge) roleBadge.textContent = currentAdmin.role_name;
      if (idBadge) idBadge.textContent = `(${currentAdmin.id})`;
      if (iconBadge) iconBadge.textContent = currentAdmin.icon || '🧑‍💼';

      // 施主一覧読み込み
      loadAdminUsersList();
    } else {
      if (loginBox) loginBox.style.display = 'block';
      if (authView) authView.style.display = 'none';
    }

    // ダッシュボード側の管理者バナー更新
    updateDashboardAdminBanner();
  }

  function updateDashboardAdminBanner() {
    const banner = document.getElementById('dash-admin-active-banner');
    const roleEl = document.getElementById('dash-admin-banner-role');
    const currentAdmin = getCurrentAdmin();

    if (banner) {
      if (currentAdmin && window.location.hash.includes('dashboard')) {
        banner.style.display = 'flex';
        if (roleEl) {
          roleEl.textContent = `${currentAdmin.icon || ''} ${currentAdmin.role_name} (${currentAdmin.id})`;
        }
      } else {
        banner.style.display = 'none';
      }
    }
  }

  // 3. 施主カルテ一覧の読み込み＆描画
  async function loadAdminUsersList() {
    const usersBox = document.getElementById('admin-users-list');
    if (!usersBox) return;

    let users = [];

    // 1. サーバーAPIから取得試行
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          users = data.users;
        }
      }
    } catch (_) {}

    // 2. なければローカルストレージおよびシードから集約
    if (users.length === 0) {
      try {
        const localUser = localStorage.getItem('smile_current_user');
        if (localUser) {
          const parsed = JSON.parse(localUser);
          users.push({
            id: parsed.id || 'usr_local',
            name: parsed.name || 'お施主様（本人確認済み）',
            email: parsed.email || 'user@example.com',
            phone: parsed.phone || '090-0000-0000',
            created_at: new Date().toISOString(),
            status: 'プラン選定・3Dパース検討中'
          });
        }
      } catch (_) {}

      // デモ用サンプル施主カルテ
      users.push({
        id: 'usr_sample_saitama',
        name: '埼玉 太郎・花子 様 ご夫妻',
        email: 'saitama_family@example.com',
        phone: '049-285-0000',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        status: 'HEAT20 G2温熱・構造計算書確認中'
      });
      users.push({
        id: 'usr_sample_kawagoe',
        name: '川越 一郎 様 邸',
        email: 'kawagoe_ichirou@example.com',
        phone: '049-222-1111',
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        status: '許容応力度計算 耐震等級3確定・お見積り作成中'
      });
    }

    // カード描画
    usersBox.innerHTML = users.map(u => `
      <div class="card" style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: var(--radius-lg); padding: 1.5rem; transition: transform 0.2s ease, border-color 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.6rem;">
          <div>
            <h4 style="color: #0f172a; font-size: 1.15rem; font-weight: 800; margin: 0 0 4px 0; display: flex; align-items: center; gap: 6px;">
              <span>👤</span> ${escapeHtml(u.name)}
            </h4>
            <div style="font-size: 0.82rem; color: #64748b;">
              📧 ${escapeHtml(u.email || '未登録')} | 📞 ${escapeHtml(u.phone || '未登録')}
            </div>
          </div>
          <span style="background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 800; padding: 3px 8px; border-radius: 12px; white-space: nowrap;">
            ✅ 承認済みカルテ
          </span>
        </div>

        <div style="background: #f8fafc; border-radius: 8px; padding: 0.8rem; font-size: 0.85rem; color: #334155; margin-bottom: 1rem;">
          <div style="margin-bottom: 4px;"><strong>現在の進捗:</strong> <span style="color: #0284c7; font-weight: 700;">${escapeHtml(u.status || '間取り選定・チャット相談中')}</span></div>
          <div style="font-size: 0.78rem; color: #94a3b8;">カルテID: <code style="color: #0f172a;">${escapeHtml(u.id)}</code> | 登録日: ${new Date(u.created_at || Date.now()).toLocaleDateString('ja-JP')}</div>
        </div>

        <button type="button" class="btn btn-primary" onclick="window.openUserCarteAsAdmin('${escapeHtml(u.id)}', '${escapeHtml(u.name)}', '${escapeHtml(u.email || '')}', '${escapeHtml(u.phone || '')}')" style="width: 100%; font-size: 0.95rem; font-weight: 800; padding: 0.7rem; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; display: flex; justify-content: center; align-items: center; gap: 8px;">
          <span>🏠</span> この施主の家カルテを開いて対応する（チャット・図面） ➜
        </button>
      </div>
    `).join('');
  }

  // 4. 管理者として指定施主の家カルテを開く
  window.openUserCarteAsAdmin = function(userId, userName, email, phone) {
    const currentAdmin = getCurrentAdmin();
    if (!currentAdmin) {
      alert('先に担当係としてログインしてください。');
      return;
    }

    // 対象施主をセット
    const targetUser = {
      id: userId,
      name: userName,
      email: email,
      phone: phone,
      isAdminOperating: true
    };

    localStorage.setItem('smile_current_user', JSON.stringify(targetUser));
    if (typeof window.currentUser !== 'undefined') {
      window.currentUser = targetUser;
    }

    // セクション切り替え
    if (typeof window.switchToSection === 'function') {
      window.switchToSection('dashboard');
    } else {
      window.location.hash = '#dashboard';
    }

    // カルテデータ再読込
    if (typeof window.loadDashboardData === 'function') {
      window.loadDashboardData();
    }

    updateDashboardAdminBanner();
  };

  // 5. チャットメッセージの装飾（各係バッジの色分け表示）
  window.formatStaffSenderBadge = function(msg) {
    if (msg.sender === 'user') {
      return '<span style="color: #f59e0b; font-weight: 800; font-size: 0.78rem;">👤 お施主様</span>';
    }
    if (msg.sender === 'ai') {
      return '<span style="color: #38bdf8; font-weight: 800; font-size: 0.78rem;">🤖 住ま居る 建築AIエージェント</span>';
    }

    // スタッフの場合
    const role = msg.sender_role || msg.senderRole || '専任スタッフ';
    const accounts = getAdminAccounts();
    const matched = accounts.find(a => a.role_name === role || a.name === role);

    if (matched) {
      return `<span style="background: ${matched.bg}; color: ${matched.color}; border: 1px solid ${matched.border}; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
        <span>${matched.icon}</span> ${matched.role_name}
      </span>`;
    }

    return `<span style="background: #e0f2fe; color: #0284c7; border: 1px solid #38bdf8; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;">
      🧑‍💼 ${escapeHtml(role)}
    </span>`;
  };

  // 6. ログイン処理
  async function handleLogin(idInput, pwInput) {
    const errorBox = document.getElementById('admin-login-error');
    if (errorBox) errorBox.style.display = 'none';

    const id = idInput.trim();
    const password = pwInput.trim();

    // 1. サーバーAPIへ問い合わせ試行
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.staff) {
          const accounts = getAdminAccounts();
          const localMatch = accounts.find(a => a.id === id) || {};
          const fullStaff = { ...localMatch, ...data.staff };
          setCurrentAdmin(fullStaff);
          return true;
        }
      }
    } catch (_) {}

    // 2. ローカルフォールバック認証（オフライン/静的ホスティング完全対応）
    const accounts = getAdminAccounts();
    const matched = accounts.find(a => a.id.toLowerCase() === id.toLowerCase() && a.password === password);

    if (matched) {
      setCurrentAdmin(matched);
      return true;
    }

    if (errorBox) {
      errorBox.textContent = '❌ IDまたはパスワードが正しくありません。';
      errorBox.style.display = 'block';
    }
    return false;
  }

  // 7. パスワード変更処理
  async function handlePasswordChange(currPw, newPw) {
    const msgBox = document.getElementById('admin-change-pw-msg');
    const currentAdmin = getCurrentAdmin();
    if (!currentAdmin) return;

    // 1. サーバーAPI試行
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentAdmin.id, currentPassword: currPw, newPassword: newPw })
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.success) {
          showChangePwMsg(data.message || 'パスワード変更エラー', false);
          return;
        }
      }
    } catch (_) {}

    // 2. ローカルストレージ更新
    const accounts = getAdminAccounts();
    const idx = accounts.findIndex(a => a.id === currentAdmin.id);
    if (idx !== -1) {
      if (accounts[idx].password !== currPw) {
        showChangePwMsg('現在のパスワードが正しくありません。', false);
        return;
      }
      accounts[idx].password = newPw;
      saveAdminAccounts(accounts);
      currentAdmin.password = newPw;
      setCurrentAdmin(currentAdmin);

      showChangePwMsg('✅ パスワードを正常に変更しました！', true);
      setTimeout(() => {
        const modal = document.getElementById('admin-change-pw-modal');
        if (modal) modal.style.display = 'none';
      }, 1200);
    }
  }

  function showChangePwMsg(text, isSuccess) {
    const msgBox = document.getElementById('admin-change-pw-msg');
    if (!msgBox) return;
    msgBox.style.display = 'block';
    msgBox.textContent = text;
    msgBox.style.background = isSuccess ? '#dcfce7' : '#fee2e2';
    msgBox.style.color = isSuccess ? '#15803d' : '#b91c1c';
    msgBox.style.border = isSuccess ? '1px solid #22c55e' : '1px solid #ef4444';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 8. イベントリスナー登録 (イベント委譲方式: 遅延テンプレート展開後も100%確実に動作)
  function init() {
    // フォーム送信のイベント委譲
    document.addEventListener('submit', (e) => {
      // 1. 社員ログインフォーム
      if (e.target && e.target.id === 'admin-login-form') {
        e.preventDefault();
        const idInput = document.getElementById('admin-login-id')?.value || '';
        const pwInput = document.getElementById('admin-login-password')?.value || '';
        handleLogin(idInput, pwInput);
        return;
      }

      // 2. パスワード変更フォーム
      if (e.target && e.target.id === 'admin-change-pw-form') {
        e.preventDefault();
        const currPw = document.getElementById('admin-curr-pw')?.value || '';
        const newPw = document.getElementById('admin-new-pw')?.value || '';
        handlePasswordChange(currPw, newPw);
        return;
      }
    });

    // ボタンクリック等のイベント委譲
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target) return;

      // ログアウトボタン
      if (target.id === 'btn-admin-logout' || target.closest('#btn-admin-logout')) {
        if (confirm('管理ポータルからログアウトしますか？')) {
          setCurrentAdmin(null);
        }
        return;
      }

      // パスワード変更モーダルを開く
      if (target.id === 'btn-admin-change-pw-open' || target.closest('#btn-admin-change-pw-open')) {
        const pwModal = document.getElementById('admin-change-pw-modal');
        if (pwModal) {
          pwModal.style.display = 'flex';
          const msgBox = document.getElementById('admin-change-pw-msg');
          if (msgBox) msgBox.style.display = 'none';
          const currInput = document.getElementById('admin-curr-pw');
          if (currInput) { currInput.value = ''; currInput.focus(); }
          const newInput = document.getElementById('admin-new-pw');
          if (newInput) newInput.value = '';
        }
        return;
      }

      // パスワード変更モーダルを閉じる
      if (target.id === 'btn-admin-change-pw-cancel' || target.closest('#btn-admin-change-pw-cancel')) {
        const pwModal = document.getElementById('admin-change-pw-modal');
        if (pwModal) pwModal.style.display = 'none';
        return;
      }

      // タブ切り替え: 施主カルテ
      if (target.id === 'admin-tab-users' || target.closest('#admin-tab-users')) {
        const tabUsers = document.getElementById('admin-tab-users');
        const tabPlans = document.getElementById('admin-tab-plans');
        const viewUsers = document.getElementById('admin-view-users');
        const viewPlans = document.getElementById('admin-view-plans');
        if (tabUsers && tabPlans && viewUsers && viewPlans) {
          tabUsers.className = 'btn btn-primary';
          tabPlans.className = 'btn btn-secondary';
          viewUsers.style.display = 'block';
          viewPlans.style.display = 'none';
          loadAdminUsersList();
        }
        return;
      }

      // タブ切り替え: 間取りライブラリ
      if (target.id === 'admin-tab-plans' || target.closest('#admin-tab-plans')) {
        const tabUsers = document.getElementById('admin-tab-users');
        const tabPlans = document.getElementById('admin-tab-plans');
        const viewUsers = document.getElementById('admin-view-users');
        const viewPlans = document.getElementById('admin-view-plans');
        if (tabUsers && tabPlans && viewUsers && viewPlans) {
          tabPlans.className = 'btn btn-primary';
          tabUsers.className = 'btn btn-secondary';
          viewPlans.style.display = 'block';
          viewUsers.style.display = 'none';
          if (typeof window.loadAdminPlansData === 'function') {
            window.loadAdminPlansData();
          }
        }
        return;
      }
    });

    // 初期UI反映
    updateAdminUI();

    // ハッシュ変更時（dashboardへの遷移など）のバナー監視
    window.addEventListener('hashchange', () => {
      updateAdminUI();
      updateDashboardAdminBanner();
    });
  }

  // グローバル公開
  window.getCurrentAdminStaff = getCurrentAdmin;
  window.loadAdminData = loadAdminUsersList;
  window.initAdminAuth = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
