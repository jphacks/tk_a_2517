// QRally - JavaScript版 (Legacy)
// 注意: このファイルはレガシー（非 React）実装です。
// 現在は JSX/React ベースの SightseeingClient.jsx が採用され、page.js から読み込まれます。
// 互換性のために残していますが、新機能や修正は SightseeingClient.jsx 側に実装します。
// 可能なら本ファイルの利用をやめ、`app/sightseeing/page.js` が描画する React 実装をご利用ください。
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
  <title>QRally</title>
  <link rel="stylesheet" href="/css/sightseeing/sightseeing.css">
</head>
<body>
  <div class="container">
    <h1>QRally</h1>
    <p>京都の名所を巡ってスタンプを集めよう！各観光地をクリックして詳細を確認できます。</p>

    <div class="controls" style="text-align:center;margin:20px 0">
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
        <h2 style="margin-top:0;color:#8b4513">QRally
</h2>
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
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  let visitedStamps = new Set(); // 訪問済みスタンプを管理
  let allLocations = []; // 全観光地データ
  let qrScanner = null;
  let isScanning = false;

  const el = id => {
    if (typeof document !== 'undefined') {
      return document.getElementById(id);
    }
    return null;
  };

  // データを外部JSONファイルから読み込み
  let data = null;
  
  // JSONデータを読み込む関数
  async function loadData() {
    try {
      const response = await fetch('/json/sightseeing/sightseeing.json');
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

  // スタンプラリーを開始
  function startStampRally() {
    allLocations = data.locations || [];
    renderStampUI();
    updateStats();
  }
  
  // グローバルスコープに公開
  if (typeof window !== 'undefined') {
    window.startStampRally = startStampRally;
  }

  // エラー表示
  function showError(message) {
    if (typeof document === 'undefined') return;
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
    if (typeof document === 'undefined') return null;
    
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
    if (typeof document === 'undefined') return null;
    
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
    if (typeof document === 'undefined') return;
    
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
        try {
          if (notification && notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        } catch (e) {
          // ignore removal errors
        }
        try {
          if (style && style.parentNode) {
            style.parentNode.removeChild(style);
          }
        } catch (e) {
          // ignore removal errors
        }
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
  if (typeof window !== 'undefined') {
    window.onDataLoaded = onDataLoaded;
  }

  // QRコード生成とモーダル表示
  function showQrIntro(){
    if (typeof document === 'undefined') return;
    
    const modal = el('qrIntroModal');
    const canvas = document.getElementById('qrCanvas');
    
    // 現在のURLをQRコードとして生成
  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/stamp?difficulty=medium&auto=1` : 'http://localhost:3000/stamp?difficulty=medium&auto=1';
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
  if (typeof window !== 'undefined') {
    window.showQrIntro = showQrIntro;
  }

  // QRコードスキャン機能
  function startQRScanning() {
    if (isScanning || typeof document === 'undefined') return;
    
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
  if (typeof window !== 'undefined') {
    window.startQRScanning = startQRScanning;
  }

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
  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/stamp?difficulty=medium&auto=1` : 'http://localhost:3000/stamp?difficulty=medium&auto=1';
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
    if (typeof document === 'undefined') return;
    
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
    if (typeof document === 'undefined') return;
    
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
    if (typeof document === 'undefined') return;
    
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
    if (typeof document === 'undefined') return;
    
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
}

// デフォルトエクスポート
export default { generateStampRallyHTML, initializeStampRally };