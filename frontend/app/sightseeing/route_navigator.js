// 京都スタンプラリー - JavaScript版
export function generateStampRallyHTML() {
  // ブラウザ環境でのみ実行
  if (typeof window === 'undefined') {
    return '<div>Loading...</div>';
  }
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>京都スタンプラリー</title>
  <link rel="stylesheet" href="./css/sightseeing/sightseeing.css">
  <script>
    // 管理画面のパターンを踏襲: socket.io クライアントを同一オリジンから優先的に読み込み、失敗時はCDNへフォールバック
    (function(){
      var s = document.createElement('script');
      s.src = location.origin + '/socket.io/socket.io.js';
      s.onload = function(){ try { window.__initSocket && window.__initSocket(); } catch(_){} };
      s.onerror = function(){
        var s2 = document.createElement('script');
        s2.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        s2.onload = function(){ try { window.__initSocket && window.__initSocket(); } catch(_){} };
        document.head.appendChild(s2);
      };
      document.head.appendChild(s);
    })();
  </script>
</head>
<body>
  <div class="container">
    <h1>🏯 京都スタンプラリー</h1>
    <p>京都の名所を巡ってスタンプを集めよう！各観光地をクリックして詳細を確認できます。</p>

    <div class="controls" style="text-align:center;margin:20px 0">
      <!-- File System Access controls will be injected by JS -->
    </div>

    <div id="stampUI" class="stamp-container" style="display:none">
      <div class="stamp-title">STAMP GET!</div>
      <div class="stamp-subtitle">観光地を巡ってスタンプを集めよう！</div>
      
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill" style="width:0%"></div>
      </div>
      
      <div class="stats" id="stats">
        <div class="stat-item">
          <div class="stat-number" id="collectedCount">0</div>
          <div class="stat-label">獲得済み</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" id="totalCount">0</div>
          <div class="stat-label">総数</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" id="completionRate">0%</div>
          <div class="stat-label">達成率</div>
        </div>
      </div>
      
      <div class="stamp-grid" id="stampGrid">
        </div>
    </div>

    <div id="stampModal" class="modal">
      <div class="modal-content">
        <button id="stampModalClose" class="modal-close">✕</button>
        <div id="stampModalContent" style="text-align:center;max-height:70vh;overflow:auto">
          </div>
      </div>
    </div>

    <div id="qrIntroModal" class="modal qr-modal">
      <div class="modal-content qr-modal-content">
        <button id="qrIntroClose" class="modal-close">✕</button>
        <h2 style="margin-top:0;color:#8b4513">🏯 京都スタンプラリー</h2>
        <h3 style="color:#8b7355;margin:10px 0">QRコードを読み取って開始</h3>
        <p style="color:#8b7355;margin-bottom:20px">スマホのカメラでQRコードを読み取ると、同じページが開きます。<br>読み取り後にスタンプラリーが開始されます。</p>
        <canvas id="qrCanvas" width="220" height="220" class="qr-canvas"></canvas>
        <div style="margin-top:20px">
          <button id="qrConfirmBtn" class="qr-button qr-button-primary">QR読み取り完了・開始</button>
          <button id="qrSkipBtn" class="qr-button qr-button-secondary">スキップして開始</button>
        </div>
        <div style="margin-top:15px;font-size:12px;color:#8b7355">
          💡 Win11のカメラアプリでも読み取れます
        </div>
      </div>
    </div>

    <p style="margin-top:30px;color:#8b7355;font-size:0.9rem;text-align:center">💡 ヒント: スタンプをクリックして観光地の詳細を確認できます！</p>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"></script>
  <script src="https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js"></script>
</body>
</html>`;
}

// クエリパラメータ処理
export function handleQueryParameters() {
  // ブラウザ環境でのみ実行
  if (typeof window === 'undefined') {
    return { showQR: true, autoStart: false };
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  
  switch (action) {
    case 'qr':
      // QRコード生成モード
      return { showQR: true, autoStart: false };
    case 'start':
      // 直接スタンプラリー開始
      return { showQR: false, autoStart: true };
    case 'scan':
      // QRスキャンモード
      return { showQR: true, autoStart: false, autoScan: true };
    default:
      // デフォルト：QRモーダル表示
      return { showQR: true, autoStart: false };
  }
}

// スタンプラリーの初期化
export function initializeStampRally() {
  if (typeof window === 'undefined') return;
  
  let visitedStamps = new Set(); // 訪問済みスタンプを管理
  let allLocations = []; // 全観光地データ
  let qrScanner = null;
  let isScanning = false;
  let backendDetected = false;

  const el = id => document.getElementById(id);

  // データを外部JSONファイルから読み込み
  let data = null;
  
  // JSONデータを読み込む関数
  async function loadData() {
    try {
      // 公開ディレクトリから読み込む（Next.jsのpublic配下）。
      // 以前の相対パスだとルート解決に失敗するケースがあるため修正。
      const response = await fetch('/json/sightseeing.json');
      if (!response.ok) {
        throw new Error('データの読み込みに失敗しました');
      }
      data = await response.json();
      return data;
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.error('データ読み込みエラー:', error);
      }
      showError('データの読み込みに失敗しました。ページを再読み込みしてください。');
      return null;
    }
  }

    // --- File System Access / import-export helpers ---
    // ブラウザが File System Access API をサポートしているか
    function supportsFSA() {
      return typeof window !== 'undefined' && (
        'showOpenFilePicker' in window || 'showSaveFilePicker' in window || 'showDirectoryPicker' in window
      );
    }

    // 訪問済みスタンプをファイルに保存する
    async function saveStampsToFile() {
      try {
        const payload = {
          app: 'kyoto_stamp_rally',
          version: 1,
          timestamp: new Date().toISOString(),
          visited: Array.from(visitedStamps),
        };
        const contents = JSON.stringify(payload, null, 2);

        if (supportsFSA() && 'showSaveFilePicker' in window) {
          const handle = await window.showSaveFilePicker({
            suggestedName: 'kyoto-stamps.json',
            types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
            startIn: 'downloads'
          });
          const writable = await handle.createWritable();
          await writable.write(contents);
          await writable.close();
        } else {
          // フォールバック: ダウンロード
          const blob = new Blob([contents], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'kyoto-stamps.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        toastNotice('スタンプ進捗を保存しました');
      } catch (e) {
        console.error('saveStampsToFile error', e);
        showError('スタンプの保存に失敗しました: ' + (e && e.message ? e.message : '不明なエラー'));
      }
    }

    // ローカルJSONをインポートして観光地データに適用する
    async function importSightseeingJSON() {
      try {
        if (supportsFSA() && 'showOpenFilePicker' in window) {
          const [handle] = await window.showOpenFilePicker({
            types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
            multiple: false,
            excludeAcceptAllOption: true,
            startIn: 'documents'
          });
          const file = await handle.getFile();
          const text = await file.text();
          const json = JSON.parse(text);
          applyImportedData(json);
        } else {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json,.json';
          input.onchange = async () => {
            const f = input.files && input.files[0];
            if (!f) return;
            const text = await f.text();
            const json = JSON.parse(text);
            applyImportedData(json);
          };
          input.click();
        }
      } catch (e) {
        console.error('importSightseeingJSON error', e);
        showError('JSONの読み込みに失敗しました: ' + (e && e.message ? e.message : '不明なエラー'));
      }
    }

    function applyImportedData(json) {
      if (!json || !Array.isArray(json.locations)) {
        showError('不正なデータ形式です。"locations" 配列を含むJSONを指定してください。');
        return;
      }
      data = json;
      visitedStamps.clear();
      allLocations = data.locations || [];
      renderStampUI();
      updateStats();
      toastNotice('観光地データを読み込みました');
    }

    function toastNotice(msg) {
      const n = document.createElement('div');
      n.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 14px;border-radius:8px;opacity:0;transition:opacity .2s;z-index:10002';
      n.textContent = msg;
      document.body.appendChild(n);
      requestAnimationFrame(() => { n.style.opacity = '0.92'; });
      setTimeout(() => { n.style.opacity = '0'; setTimeout(() => document.body.removeChild(n), 300); }, 1600);
    }

    function addControlsUI() {
      const controls = document.querySelector('.controls');
      if (!controls) return;
      function mkButton(text) {
        const b = document.createElement('button');
        b.textContent = text;
        b.style.cssText = 'margin:0 6px;padding:8px 12px;border-radius:8px;border:1px solid #d4c4a8;background:#f5f1e8;color:#8b4513;cursor:pointer;';
        b.onmouseenter = () => b.style.background = '#efe6d1';
        b.onmouseleave = () => b.style.background = '#f5f1e8';
        return b;
      }
      const importBtn = mkButton('📂 ローカルJSONを読み込む');
      importBtn.onclick = importSightseeingJSON;
      const saveBtn = mkButton('💾 スタンプを保存');
      saveBtn.onclick = saveStampsToFile;
      controls.appendChild(importBtn);
      controls.appendChild(saveBtn);
      if (!supportsFSA()){
        const note = document.createElement('div');
        note.style.cssText = 'margin-top:8px;color:#8b7355;font-size:12px';
        note.textContent = 'お使いのブラウザでは簡易保存・読み込み（ダウンロード/ファイル選択）で動作します。Chrome/Edge ではより便利に動作します。';
        controls.appendChild(note);
      }
    }

  // スタンプラリーを開始
  function startStampRally() {
    allLocations = data.locations || [];
    renderStampUI();
    updateStats();
  }
  
  // グローバルスコープに公開
  window.startStampRally = startStampRally;

  // エラー表示
  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
  }

  // スタンプUIのレンダリング
  function renderStampUI() {
    const stampUI = el('stampUI');
    const stampGrid = el('stampGrid');
    
    stampUI.style.display = 'block';
    stampGrid.innerHTML = '';
    
    // 全観光地を表示（最大6つ）
    const locationsToShow = allLocations.slice(0, 6);
    
    locationsToShow.forEach((location, index) => {
      const isVisited = visitedStamps.has(location.id);
      const stampSlot = createStampSlot(location, isVisited, index);
      stampGrid.appendChild(stampSlot);
    });
    
    // 残りのスロットをハテナで埋める
    const remainingSlots = 6 - locationsToShow.length;
    for (let i = 0; i < remainingSlots; i++) {
      const placeholderSlot = createPlaceholderSlot(i + locationsToShow.length);
      stampGrid.appendChild(placeholderSlot);
    }
  }

  // スタンプスロットの作成: 未訪問は画像を最初から表示
  function createStampSlot(location, isVisited, index) {
    const slot = document.createElement('div');
    slot.className = `stamp-slot ${isVisited ? 'visited' : ''}`;
    slot.dataset.locationId = location.id;
    slot.dataset.index = index;

    const icon = document.createElement('div');
    icon.className = 'stamp-icon';

    // show image thumbnail even if not visited
    if (location.image) {
      const img = document.createElement('img');
      img.src = location.image;
      img.alt = location.name;
      img.style.width = '84px';
      img.style.height = '64px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';
      slot.appendChild(img);
      const text = document.createElement('div');
      text.className = 'stamp-text';
      text.textContent = location.name.length > 10 ? location.name.substring(0, 10) + '...' : location.name;
      slot.appendChild(text);
    } else {
      icon.textContent = isVisited ? getLocationIcon(location) : '?';
      slot.appendChild(icon);
    }

    slot.onclick = () => {
      if (isVisited) {
        openStampModal(location, true);
      } else {
        // スタンプを獲得
        visitedStamps.add(location.id);
        renderStampUI();
        updateStats();
        showStampGetAnimation(location);
      }
    };
    return slot;
  }

  // プレースホルダースタンプスロットの作成
  function createPlaceholderSlot(index) {
    const slot = document.createElement('div');
    slot.className = 'stamp-slot placeholder';
    slot.dataset.index = index;
    
    const icon = document.createElement('div');
    icon.className = 'stamp-icon';
    icon.textContent = '?';
    slot.appendChild(icon);
    
    slot.onclick = () => showPlaceholderMessage();
    return slot;
  }

  // 統計情報を更新
  function updateStats() {
    const collectedCount = visitedStamps.size;
    const totalCount = allLocations.length;
    const completionRate = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;
    
    el('collectedCount').textContent = collectedCount;
    el('totalCount').textContent = totalCount;
    el('completionRate').textContent = completionRate + '%';
    
    // 進捗バーを更新
    el('progressFill').style.width = completionRate + '%';
  }

  // スタンプ獲得アニメーション
  function showStampGetAnimation(location) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #8b4513, #a0522d);
      color: #f5f1e8;
      padding: 20px 30px;
      border-radius: 15px;
      font-size: 18px;
      font-weight: bold;
      z-index: 10001;
      box-shadow: 0 10px 30px rgba(139,69,19,0.5);
      animation: stampGet 2s ease-out forwards;
      border: 3px solid #d4c4a8;
    `;
    
    notification.innerHTML = `
      <div style="font-size: 32px;margin-bottom: 8px">${getLocationIcon(location)}</div>
      <div>スタンプ獲得！</div>
      <div style="font-size: 14px;margin-top: 4px">${location.name}</div>
    `;
    
    // アニメーション用のCSSを追加
    const style = document.createElement('style');
    style.textContent = `
      @keyframes stampGet {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    if (typeof setTimeout !== 'undefined') {
      setTimeout(() => {
        document.body.removeChild(notification);
        document.head.removeChild(style);
      }, 2000);
    }
  }

  // 観光地のアイコンを取得
  function getLocationIcon(location) {
    const iconMap = {
      'kinkakuji': '⛩️',
      'ginkakuji': '🏛️',
      'kiyomizudera': '🏔️'
    };
    return iconMap[location.id] || '📍';
  }

  // スタンプ詳細モーダルを開く
  function openStampModal(location, isVisited) {
    const modal = el('stampModal');
    const content = el('stampModalContent');
    
    if (isVisited) {
      content.innerHTML = `
        <div style="margin-bottom:16px">
          <div style="font-size:48px;margin-bottom:8px">${getLocationIcon(location)}</div>
          <h3 style="margin:0;color:#333">${location.name}</h3>
        </div>
        <div style="text-align:left;margin-bottom:16px">
          <p><strong>特徴:</strong> ${location.attributes.benefit}</p>
          <p><strong>混雑度:</strong> ${getCrowdLevelText(location.attributes.crowd_level)}</p>
          <p><strong>テーマ:</strong> ${getThemeText(location.attributes.theme)}</p>
        </div>
        ${location.image ? `
          <div style="margin-bottom:16px">
            <img src="${location.image}" alt="${location.name}" style="max-width:100%;height:200px;object-fit:cover;border-radius:8px">
          </div>
        ` : ''}
        <div style="text-align:left;font-size:14px;line-height:1.6">
          ${marked.parse(location.markdown_details || `# ${location.name}\\n\\n${location.attributes.benefit}`)}
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="font-size:48px;margin-bottom:16px">❓</div>
        <h3 style="margin:0;color:#666">未訪問の観光地</h3>
        <p style="color:#999;margin-top:8px">このルートを進んでスタンプを集めよう！</p>
      `;
    }
    
    modal.style.display = 'flex';
  }

  // プレースホルダーメッセージを表示
  function showPlaceholderMessage() {
    const modal = el('stampModal');
    const content = el('stampModalContent');
    
    content.innerHTML = `
      <div style="font-size:48px;margin-bottom:16px">❓</div>
      <h3 style="margin:0;color:#666">未実装の観光地</h3>
      <p style="color:#999;margin-top:8px">今後追加予定の観光地です！</p>
    `;
    
    modal.style.display = 'flex';
  }

  // 混雑度のテキスト変換
  function getCrowdLevelText(level) {
    const levelMap = {
      'low': '少ない',
      'medium': '普通',
      'high': '多い'
    };
    return levelMap[level] || level;
  }

  // テーマのテキスト変換
  function getThemeText(theme) {
    const themeMap = {
      'gorgeous': '豪華絢爛',
      'wabi_sabi': 'わびさび',
      'dynamic': 'ダイナミック'
    };
    return themeMap[theme] || theme;
  }

  // データ読み込み完了後の初期化
  async function onDataLoaded(){
    el('stampUI').style.display='none';
    
    // モーダルコントロールを設定
    const stampModal = el('stampModal');
    const stampCloseBtn = el('stampModalClose');
    stampCloseBtn.onclick = ()=> { stampModal.style.display='none'; el('stampModalContent').innerHTML=''; };
    
    // データを読み込んでからスタンプラリーを開始
    const loadedData = await loadData();
    if (loadedData) {
      startStampRally();
    }
  }
  
  // グローバルスコープに公開
  window.onDataLoaded = onDataLoaded;

  // QRコード生成とモーダル表示
  function showQrIntro(){
    const modal = el('qrIntroModal');
    const canvas = document.getElementById('qrCanvas');
    
    // 管理画面のパターンを踏襲し、検出済みバックエンドを優先
    let currentUrl = 'http://localhost:3000/sightseeing';
    if (typeof window !== 'undefined'){
      const path = window.location.pathname + window.location.search + window.location.hash;
      const base = window.__detectedBackend || (window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : ''));
      currentUrl = base + path;
    }
    const qr = new QRious({ 
      element: canvas, 
      value: currentUrl, 
      size: 220,
      background: '#ffffff',
      foreground: '#000000',
      level: 'M'
    });
    
    modal.style.display = 'flex';
    
    // ボタンイベントを設定
    el('qrIntroClose').onclick = ()=> { 
      modal.style.display='none'; 
      startStampRally(); 
    };
    
    el('qrConfirmBtn').onclick = ()=> { 
      modal.style.display='none'; 
      startStampRally(); 
    };
    
    el('qrSkipBtn').onclick = ()=> { 
      modal.style.display='none'; 
      startStampRally(); 
    };
  }
  
  // グローバルスコープに公開
  window.showQrIntro = showQrIntro;

  //===============================
  // バックエンド検出とsocket.io初期化（management.html準拠・簡易版）
  //===============================
  // 遅延エミット用キュー
  let socket = null;
  const emitQueue = [];
  function queuedEmit(event, payload){
    if (socket && socket.emit) return socket.emit(event, payload);
    emitQueue.push({ event, payload });
  }
  function flushQueue(){
    while(emitQueue.length && socket && socket.emit){
      const it = emitQueue.shift();
      socket.emit(it.event, it.payload);
    }
  }
  Object.defineProperty(window, '__socket', {
    configurable: true,
    set(v){ socket = v; try{ window.io = window.io || v; }catch(e){} setTimeout(flushQueue, 0); },
    get(){ return socket; }
  });

  // 候補バックエンドに対して疎通確認
  async function tryBackends(path, options){
    if (typeof window === 'undefined') throw new Error('no-window');
    const proto = location.protocol;
    const host = location.hostname;
    const ports = ['', '3002','3001','3000'];
    if (location.port && !ports.includes(location.port)) ports.push(location.port);

    if (window.__detectedBackend){
      try{
        const r = await fetch(window.__detectedBackend + path, options);
        if (r.status !== 404) return r;
      }catch(_){ /* 継続 */ }
    }
    for (const p of ports){
      const base = proto + '//' + host + (p ? ':'+p : '');
      try{
        const r = await fetch(base + path, options);
        if (r.status === 404) continue;
        window.__detectedBackend = base;
        backendDetected = true;
        return r;
      }catch(_){ continue; }
    }
    throw new Error('all backends failed');
  }

  // socket.ioクライアントの初期化（同一オリジン優先、CDNフォールバックはheadのスクリプトで実施）
  window.__initSocket = function initSocket(){
    if (typeof io === 'undefined') return;
    const host = location.hostname;
    const proto = location.protocol;
    const ordered = ['3002','3001','3000'];
    if (location.port && !ordered.includes(location.port)) ordered.push(location.port);
    (async function tryConnect(){
      for (const p of ordered){
        const url = proto + '//' + host + (p ? ':' + p : '');
        let s = null;
        try{
          s = io(url, { transports: ['polling','websocket'], timeout: 2000 });
          await new Promise((resolve, reject) => {
            const onConnect = () => { s.off('connect_error', onError); resolve('ok'); };
            const onError = (err) => { s.off('connect', onConnect); reject(err); };
            s.once('connect', onConnect);
            s.once('connect_error', onError);
          });
          window.__socket = s;
          window.__detectedBackend = url;
          backendDetected = true;
          break;
        }catch(e){ try{ s && s.close && s.close(); }catch(_){} }
      }
    })();
  };

  // 可能ならバックエンドを事前検出（/health もしくは MCP fetch）
  (async function detectBackend(){
    try{
      const r = await tryBackends('/health', { method: 'GET' });
      await r.json().catch(()=>({}));
    }catch(_){
      try{ await tryBackends('/mcp/fetch?url=' + encodeURIComponent('https://example.com') + '&apiKey=devkey123', { method: 'GET' }); }catch(__){}
    }
  })();

  // QRコードスキャン機能
  function startQRScanning() {
    if (isScanning) return;
    
    const modal = el('qrIntroModal');
    const canvas = document.getElementById('qrCanvas');
    
    // 既存のQRコードを非表示
    canvas.style.display = 'none';
    
    // スキャナー用のdivを作成
    const scannerDiv = document.createElement('div');
    scannerDiv.id = 'qrScanner';
    scannerDiv.className = 'qr-scanner';
    
    canvas.parentNode.insertBefore(scannerDiv, canvas.nextSibling);
    
    try {
      qrScanner = new Html5Qrcode('qrScanner');
      
      const config = {
        fps: 10,
        qrbox: { width: 200, height: 200 },
        aspectRatio: 1.0
      };
      
      qrScanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText, decodedResult) => {
          if (typeof console !== 'undefined') {
            console.log('QR Code detected:', decodedText);
          }
          handleQRCodeDetected(decodedText);
        },
        (error) => {
          // エラーは無視（連続的に発生するため）
        }
      ).then(() => {
        isScanning = true;
        if (typeof console !== 'undefined') {
          console.log('QR Scanner started');
        }
      }).catch((err) => {
        if (typeof console !== 'undefined') {
          console.error('QR Scanner start failed:', err);
        }
        showQRScanError();
      });
      
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.error('QR Scanner initialization failed:', error);
      }
      showQRScanError();
    }
  }
  
  // グローバルスコープに公開
  window.startQRScanning = startQRScanning;

  // QRコード検出時の処理
  function handleQRCodeDetected(decodedText) {
    if (qrScanner && isScanning) {
      qrScanner.stop().then(() => {
        isScanning = false;
        if (typeof console !== 'undefined') {
          console.log('QR Scanner stopped');
        }
      }).catch((err) => {
        if (typeof console !== 'undefined') {
          console.error('Error stopping scanner:', err);
        }
      });
    }
    
    // 検出されたURLが現在のページと同じかチェック
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000/sightseeing';
    if (decodedText === currentUrl || decodedText.includes('route_navigator')) {
      showQRSuccess();
      setTimeout(() => {
        el('qrIntroModal').style.display = 'none';
        startStampRally();
      }, 1500);
    } else {
      showQRInvalid();
    }
  }

  // QRスキャン成功の表示
  function showQRSuccess() {
    const scannerDiv = document.getElementById('qrScanner');
    if (scannerDiv) {
      scannerDiv.innerHTML = `
        <div class="qr-scanner-status qr-scanner-success">
          <div style="font-size:48px;margin-bottom:10px">✅</div>
          <div>QRコード読み取り成功！</div>
          <div style="font-size:12px;margin-top:5px">スタンプラリーを開始します...</div>
        </div>
      `;
    }
  }

  // QRスキャン無効の表示
  function showQRInvalid() {
    const scannerDiv = document.getElementById('qrScanner');
    if (scannerDiv) {
      scannerDiv.innerHTML = `
        <div class="qr-scanner-status qr-scanner-error">
          <div style="font-size:48px;margin-bottom:10px">❌</div>
          <div>無効なQRコードです</div>
          <div style="font-size:12px;margin-top:5px">正しいQRコードを読み取ってください</div>
        </div>
      `;
      
      if (typeof setTimeout !== 'undefined') {
        setTimeout(() => {
          startQRScanning();
        }, 2000);
      }
    }
  }

  // QRスキャンエラーの表示
  function showQRScanError() {
    const scannerDiv = document.getElementById('qrScanner');
    if (scannerDiv) {
      scannerDiv.innerHTML = `
        <div class="qr-scanner-status qr-scanner-info">
          <div style="font-size:48px;margin-bottom:10px">📷</div>
          <div>カメラにアクセスできません</div>
          <div style="font-size:12px;margin-top:5px">Win11のカメラアプリをお試しください</div>
        </div>
      `;
    }
  }

  // QRスキャンボタンを追加
  function addQRScanButton() {
    const modal = el('qrIntroModal');
    const buttonContainer = modal.querySelector('div[style*="margin-top:20px"]');
    
    const scanButton = document.createElement('button');
    scanButton.id = 'qrScanBtn';
    scanButton.textContent = '📷 カメラでQRを読み取る';
    scanButton.className = 'qr-button qr-button-scan';
    
    scanButton.onclick = startQRScanning;
    buttonContainer.appendChild(scanButton);
  }

  // 初期化を実行
  onDataLoaded();
  showQrIntro();
  addQRScanButton();
  // ファイル入出力ボタンを追加
  try { addControlsUI(); } catch(e) { /* 保険: 失敗してもアプリ本体は動く */ }
}

// デフォルトエクスポート
export default { generateStampRallyHTML, initializeStampRally };