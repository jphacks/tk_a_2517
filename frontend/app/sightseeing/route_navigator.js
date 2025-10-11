// 京都スタンプラリー - JavaScript版
function generateStampRallyHTML() {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>京都スタンプラリー</title>
  <style>
    body{font-family: system-ui, -apple-system, "Yu Gothic UI", "Hiragino Kaku Gothic ProN", "メイリオ", Meiryo, sans-serif; padding:20px; background: #f5f1e8; min-height:100vh;}
    .container{max-width:800px;margin:0 auto;background:#faf8f3;padding:30px;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,0.1);border:2px solid #e8dcc6}
    
    /* スタンプUI用スタイル */
    .stamp-container{display:flex;flex-direction:column;align-items:center;margin:30px 0;background:#f5f1e8;padding:25px;border-radius:15px;border:3px solid #d4c4a8}
    .stamp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:20px 0}
    .stamp-slot{width:100px;height:100px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all 0.3s ease;border:4px solid #d4c4a8;position:relative}
    .stamp-slot.visited{background:#d4c4a8;border-color:#8b4513;color:#8b4513;box-shadow:0 8px 16px rgba(139,69,19,0.3);animation:pulse 2s infinite}
    .stamp-slot.placeholder{background:#e8dcc6;border-color:#c4b5a0;color:#8b7355}
    .stamp-slot:hover{transform:scale(1.15);box-shadow:0 12px 24px rgba(0,0,0,0.2)}
    .stamp-icon{font-size:32px;font-weight:bold;margin-bottom:4px}
    .stamp-text{font-size:11px;text-align:center;line-height:1.2;font-weight:bold}
    .stamp-title{font-size:28px;font-weight:bold;color:#8b4513;margin-bottom:12px;text-shadow:2px 2px 4px rgba(0,0,0,0.1)}
    .stamp-subtitle{font-size:16px;color:#8b7355;margin-bottom:24px}
    .progress-bar{width:100%;height:8px;background:#e8dcc6;border-radius:4px;margin:20px 0;overflow:hidden;border:2px solid #d4c4a8}
    .progress-fill{height:100%;background:linear-gradient(90deg, #8b4513, #a0522d);transition:width 0.5s ease;border-radius:4px}
    .stats{display:flex;justify-content:space-around;margin:20px 0;padding:15px;background:#f5f1e8;border-radius:12px;border:2px solid #d4c4a8}
    .stat-item{text-align:center}
    .stat-number{font-size:24px;font-weight:bold;color:#8b4513}
    .stat-label{font-size:12px;color:#8b7355;margin-top:4px}
    
    @keyframes pulse {
      0% { box-shadow: 0 8px 16px rgba(139,69,19,0.3); }
      50% { box-shadow: 0 8px 16px rgba(139,69,19,0.6); }
      100% { box-shadow: 0 8px 16px rgba(139,69,19,0.3); }
    }
    
    .loading{text-align:center;padding:20px;color:#8b7355}
    .error{background:#ffe6e6;color:#d00;padding:12px;border-radius:6px;margin:12px 0}
  </style>
</head>
<body>
  <div class="container">
    <h1>🏯 京都スタンプラリー</h1>
    <p>京都の名所を巡ってスタンプを集めよう！各観光地をクリックして詳細を確認できます。</p>

    <div class="controls" style="text-align:center;margin:20px 0">
      <!-- 初回起動時にQRを表示してからスタンプラリーを開始する -->
    </div>

    <!-- スタンプUI -->
    <div id="stampUI" class="stamp-container" style="display:none">
      <div class="stamp-title">STAMP GET!</div>
      <div class="stamp-subtitle">観光地を巡ってスタンプを集めよう！</div>
      
      <!-- 進捗バー -->
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill" style="width:0%"></div>
      </div>
      
      <!-- 統計情報 -->
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
        <!-- スタンプスロットがここに動的に生成されます -->
      </div>
    </div>

    <!-- スタンプ詳細モーダル -->
    <div id="stampModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;z-index:10000">
      <div style="position:relative;max-width:600px;max-height:80vh;background:#faf8f3;padding:30px;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,0.3);border:3px solid #8b4513">
        <button id="stampModalClose" style="position:absolute;right:15px;top:15px;border:none;background:#8b4513;color:#f5f1e8;width:40px;height:40px;border-radius:20px;cursor:pointer;font-size:20px;box-shadow:0 4px 8px rgba(139,69,19,0.3)">✕</button>
        <div id="stampModalContent" style="text-align:center;max-height:70vh;overflow:auto">
          <!-- スタンプ詳細がここに挿入されます -->
        </div>
      </div>
    </div>

    <!-- 初回表示用 QR モーダル -->
    <div id="qrIntroModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;z-index:10002">
      <div style="position:relative;max-width:520px;background:#faf8f3;padding:30px;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,0.3);text-align:center;border:3px solid #8b4513">
        <button id="qrIntroClose" style="position:absolute;right:15px;top:15px;border:none;background:#8b4513;color:#f5f1e8;width:40px;height:40px;border-radius:20px;cursor:pointer;font-size:20px;box-shadow:0 4px 8px rgba(139,69,19,0.3)">✕</button>
        <h2 style="margin-top:0;color:#8b4513">🏯 京都スタンプラリー</h2>
        <h3 style="color:#8b7355;margin:10px 0">QRコードを読み取って開始</h3>
        <p style="color:#8b7355;margin-bottom:20px">スマホのカメラでQRコードを読み取ると、同じページが開きます。<br>読み取り後にスタンプラリーが開始されます。</p>
        <canvas id="qrCanvas" width="220" height="220" style="border:3px solid #d4c4a8;margin:12px auto;display:block;border-radius:12px;background:#fff"></canvas>
        <div style="margin-top:20px">
          <button id="qrConfirmBtn" style="padding:12px 24px;border-radius:25px;background:#8b4513;color:#f5f1e8;border:none;cursor:pointer;font-size:16px;font-weight:bold;box-shadow:0 4px 8px rgba(139,69,19,0.3);margin-right:10px">QR読み取り完了・開始</button>
          <button id="qrSkipBtn" style="padding:12px 24px;border-radius:25px;background:#d4c4a8;color:#8b4513;border:none;cursor:pointer;font-size:16px;font-weight:bold;box-shadow:0 4px 8px rgba(212,196,168,0.3)">スキップして開始</button>
        </div>
        <div style="margin-top:15px;font-size:12px;color:#8b7355">
          💡 Win11のカメラアプリでも読み取れます
        </div>
      </div>
    </div>

    <p style="margin-top:30px;color:#8b7355;font-size:0.9rem;text-align:center">💡 ヒント: スタンプをクリックして観光地の詳細を確認できます！</p>
  </div>

  <!-- marked for markdown rendering -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

  <script>
    let visitedStamps = new Set(); // 訪問済みスタンプを管理
    let allLocations = []; // 全観光地データ

    const el = id => document.getElementById(id);

    // データをJavaScript内に直接埋め込み
    const data = {
      "appName": "京都おススメルートナビ",
      "version": "1.0",
      "locations": [
        {
          "id": "kinkakuji",
          "name": "金閣寺（鹿苑寺）",
          "coordinates": {
            "lat": 35.0394,
            "lng": 135.7299
          },
          "attributes": {
            "crowd_level": "high",
            "theme": "gorgeous",
            "benefit": "圧倒的な美と富の象徴"
          },
          "image": "../static/pic/kinkakuzi.jpg",
          "markdown_details": "## ✨ 金閣寺（鹿苑寺）\\n\\n**特徴：**\\n金箔で覆われた舎利殿はあまりにも有名。池に映る「逆さ金閣」は絶景です。室町幕府の三代将軍、足利義満が築いた北山文化の象GANTT。その輝きは、見る者の心を掴んで離しません。\\n\\n* **見どころ：** 舎利殿、鏡湖池、陸舟の松\\n* **得られる体験：** 華やかで豪華絢爛な美しさに圧倒される。強いエネルギーを感じる。\\n"
        },
        {
          "id": "ginkakuji",
          "name": "銀閣寺（慈照寺）",
          "coordinates": {
            "lat": 35.0269,
            "lng": 135.7981
          },
          "attributes": {
            "crowd_level": "medium",
            "theme": "wabi_sabi",
            "benefit": "静かな思索と心の平穏"
          },
          "image": "../static/pic/ginkakuzi.jpg",
          "markdown_details": "## 🍃 銀閣寺（慈照寺）\\n\\n**特徴：**\\n金閣寺のような派手さはありませんが、わびさびの精神を体現した簡素で洗練された美しさが魅力です。銀沙灘や向月台といった美しい庭園を眺めながら、静かに自分と向き合う時間を持てます。\\n\\n* **見どころ：** 観音殿（銀閣）、東求堂、美しい庭園\\n* **得られる体験：** 落ち着いた雰囲気の中で心を静め、日本の美意識の奥深さに触れる。\\n"
        },
        {
          "id": "kiyomizudera",
          "name": "清水寺",
          "coordinates": {
            "lat": 34.9949,
            "lng": 135.7850
          },
          "attributes": {
            "crowd_level": "high",
            "theme": "dynamic",
            "benefit": "新たな一歩を踏み出す勇気"
          },
          "image": "../static/pic/kiyomizudera.jpg",
          "markdown_details": "## ⛰️ 清水寺\\n\\n**特徴：**\\n「清水の舞台から飛び降りる」の語源となった舞台は圧巻の景色。音羽の滝や縁結びの地主神社など、見どころが多く活気に満ちています。京都市内を一望できる舞台からの眺めは、新しい挑戦への勇気を与えてくれるでしょう。\\n\\n* **見どころ：** 清水の舞台、音羽の滝、地主神社\\n* **得られる体験：** 雄大な景色を見て心をリフレッシュし、未来への活力を得る。\\n"
        }
      ],
      "userPreferences": {
        "questions": [
          {
            "id": "crowd_preference",
            "text": "人混みは気になりますか？",
            "options": [
              { "value": "not_concerned", "label": "気にならない" },
              { "value": "concerned", "label": "気になる" }
            ]
          },
          {
            "id": "goal",
            "text": "今のあなたは、どのような状態ですか？",
            "options": [
              { "value": "want_energy", "label": "とにかく元気や刺激が欲しい" },
              { "value": "want_calm", "label": "心を落ち着けて静かに考えたい" }
            ]
          }
        ]
      },
      "routes": [
        {
          "id": "route_01",
          "title": "【王道ゴールデンルート】京都のパワーを全身で感じる旅",
          "description": "京都を代表する3つの名所を巡り、そのエネルギーを最大限に浴びる王道コースです。",
          "conditions": {
            "crowd_preference": "not_concerned",
            "goal": "want_energy"
          },
          "nodes": ["kinkakuji", "kiyomizudera", "ginkakuji"],
          "markdown_summary": "### 提案ルート：王道ゴールデンルート\\n\\nエネルギッシュなあなたに最適な、京都のパワーを全身で感じる旅をご提案します。人混みを気にせず、人気スポットを巡りましょう！\\n\\n**巡る順番（ノード）：**\\n\\n1.  \`[金閣寺]\` -> 2. \`[清水寺]\` -> 3. \`[銀閣寺]\`\\n\\n最初に金閣寺の輝きで心を掴み、次に清水寺の活気と雄大な景色でエネルギーを充電。最後に銀閣寺の静けさで心を整える、メリハリのあるルートです."
        },
        {
          "id": "route_02",
          "title": "【静寂とわびさびルート】心を見つめ直す静かな時間",
          "description": "人混みを避け、静かな雰囲気の中で自分と向き合う時間を大切にするコースです。",
          "conditions": {
            "crowd_preference": "concerned",
            "goal": "want_calm"
          },
          "nodes": ["ginkakuji", "kinkakuji"],
          "markdown_summary": "### 提案ルート：静寂とわびさびルート\\n\\n心を落ち着けたいあなたへ。人混みを避けつつ、京都の奥深い美に触れるルートをご提案します。\\n\\n**巡る順番（ノード）：**\\n\\n1.  \`[銀閣寺]\` -> 2. \`[金閣寺]\`\\n\\nまずは銀閣寺で、わびさびの世界に浸り心を静めます。静かな時間を過ごしたあと、最後に金閣寺の圧倒的な美しさに触れることで、新たな発見があるかもしれません。（※清水寺は特に混雑が激しいため、このルートでは除外しています）"
        },
        {
          "id": "route_03",
          "title": "【静と動のメリハリルート】内なる情熱と向き合う旅",
          "description": "人混みは気になるけれど、力強いエネルギーも感じたい。そんなあなたに贈る、静けさと活気のバランスを重視したコースです。",
          "conditions": {
            "crowd_preference": "concerned",
            "goal": "want_energy"
          },
          "nodes": ["ginkakuji", "kiyomizudera"],
          "markdown_summary": "### 提案ルート：静と動のメリハリルート\\n\\nエネルギッシュな体験を求めつつも、人混みは避けたいあなたへ。静と動のバランスが取れたルートを提案します。\\n\\n**巡る順番（ノード）：**\\n\\n1.  \`[銀閣寺]\` -> 2. \`[清水寺]\`\\n\\nまず銀閣寺の静かな空間で心を集中させます。その後、少し活気のある清水寺へ向かい、舞台からの景色を眺めて未来へのエネルギーを感じましょう。（※金閣寺は特に団体観光客が多いため、このルートでは除外しています）"
        }
      ]
    };

    // スタンプラリーを開始
    function startStampRally() {
      allLocations = data.locations || [];
      renderStampUI();
      updateStats();
    }

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
      slot.className = \`stamp-slot \${isVisited ? 'visited' : ''}\`;
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
      notification.style.cssText = \`
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
      \`;
      
      notification.innerHTML = \`
        <div style="font-size: 32px;margin-bottom: 8px">\${getLocationIcon(location)}</div>
        <div>スタンプ獲得！</div>
        <div style="font-size: 14px;margin-top: 4px">\${location.name}</div>
      \`;
      
      // アニメーション用のCSSを追加
      const style = document.createElement('style');
      style.textContent = \`
        @keyframes stampGet {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
      \`;
      document.head.appendChild(style);
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
        document.head.removeChild(style);
      }, 2000);
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
        content.innerHTML = \`
          <div style="margin-bottom:16px">
            <div style="font-size:48px;margin-bottom:8px">\${getLocationIcon(location)}</div>
            <h3 style="margin:0;color:#333">\${location.name}</h3>
          </div>
          <div style="text-align:left;margin-bottom:16px">
            <p><strong>特徴:</strong> \${location.attributes.benefit}</p>
            <p><strong>混雑度:</strong> \${getCrowdLevelText(location.attributes.crowd_level)}</p>
            <p><strong>テーマ:</strong> \${getThemeText(location.attributes.theme)}</p>
          </div>
          \${location.image ? \`
            <div style="margin-bottom:16px">
              <img src="\${location.image}" alt="\${location.name}" style="max-width:100%;height:200px;object-fit:cover;border-radius:8px">
            </div>
          \` : ''}
          <div style="text-align:left;font-size:14px;line-height:1.6">
            \${marked.parse(location.markdown_details || \`# \${location.name}\\n\\n\${location.attributes.benefit}\`)}
          </div>
        \`;
      } else {
        content.innerHTML = \`
          <div style="font-size:48px;margin-bottom:16px">❓</div>
          <h3 style="margin:0;color:#666">未訪問の観光地</h3>
          <p style="color:#999;margin-top:8px">このルートを進んでスタンプを集めよう！</p>
        \`;
      }
      
      modal.style.display = 'flex';
    }

    // プレースホルダーメッセージを表示
    function showPlaceholderMessage() {
      const modal = el('stampModal');
      const content = el('stampModalContent');
      
      content.innerHTML = \`
        <div style="font-size:48px;margin-bottom:16px">❓</div>
        <h3 style="margin:0;color:#666">未実装の観光地</h3>
        <p style="color:#999;margin-top:8px">今後追加予定の観光地です！</p>
      \`;
      
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

    function onDataLoaded(){
      el('stampUI').style.display='none';
      
      // モーダルコントロールを設定
      const stampModal = el('stampModal');
      const stampCloseBtn = el('stampModalClose');
      stampCloseBtn.onclick = ()=> { stampModal.style.display='none'; el('stampModalContent').innerHTML=''; };
      
      // スタンプラリーを開始
      startStampRally();
    }

    // データは既に読み込まれているので、即座に初期化
    onDataLoaded();
  </script>
  <!-- QRious for QR generation -->
  <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"></script>
  <!-- html5-qrcode for QR scanning -->
  <script src="https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js"></script>
  <script>
    let qrScanner = null;
    let isScanning = false;

    // QRコード生成とモーダル表示
    function showQrIntro(){
      const modal = el('qrIntroModal');
      const canvas = document.getElementById('qrCanvas');
      
      // 現在のURLをQRコードとして生成
      const currentUrl = window.location.href;
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
      scannerDiv.style.width = '220px';
      scannerDiv.style.height = '220px';
      scannerDiv.style.margin = '12px auto';
      scannerDiv.style.border = '3px solid #d4c4a8';
      scannerDiv.style.borderRadius = '12px';
      scannerDiv.style.background = '#fff';
      
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
            console.log('QR Code detected:', decodedText);
            handleQRCodeDetected(decodedText);
          },
          (error) => {
            // エラーは無視（連続的に発生するため）
          }
        ).then(() => {
          isScanning = true;
          console.log('QR Scanner started');
        }).catch((err) => {
          console.error('QR Scanner start failed:', err);
          showQRScanError();
        });
        
      } catch (error) {
        console.error('QR Scanner initialization failed:', error);
        showQRScanError();
      }
    }

    // QRコード検出時の処理
    function handleQRCodeDetected(decodedText) {
      if (qrScanner && isScanning) {
        qrScanner.stop().then(() => {
          isScanning = false;
          console.log('QR Scanner stopped');
        }).catch((err) => {
          console.error('Error stopping scanner:', err);
        });
      }
      
      // 検出されたURLが現在のページと同じかチェック
      if (decodedText === window.location.href || decodedText.includes('route_navigator')) {
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
        scannerDiv.innerHTML = \`
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#8b4513;font-weight:bold;">
            <div style="font-size:48px;margin-bottom:10px">✅</div>
            <div>QRコード読み取り成功！</div>
            <div style="font-size:12px;margin-top:5px">スタンプラリーを開始します...</div>
          </div>
        \`;
      }
    }

    // QRスキャン無効の表示
    function showQRInvalid() {
      const scannerDiv = document.getElementById('qrScanner');
      if (scannerDiv) {
        scannerDiv.innerHTML = \`
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#d00;font-weight:bold;">
            <div style="font-size:48px;margin-bottom:10px">❌</div>
            <div>無効なQRコードです</div>
            <div style="font-size:12px;margin-top:5px">正しいQRコードを読み取ってください</div>
          </div>
        \`;
        
        setTimeout(() => {
          startQRScanning();
        }, 2000);
      }
    }

    // QRスキャンエラーの表示
    function showQRScanError() {
      const scannerDiv = document.getElementById('qrScanner');
      if (scannerDiv) {
        scannerDiv.innerHTML = \`
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#8b7355;font-weight:bold;">
            <div style="font-size:48px;margin-bottom:10px">📷</div>
            <div>カメラにアクセスできません</div>
            <div style="font-size:12px;margin-top:5px">Win11のカメラアプリをお試しください</div>
          </div>
        \`;
      }
    }

    // QRスキャンボタンを追加
    function addQRScanButton() {
      const modal = el('qrIntroModal');
      const buttonContainer = modal.querySelector('div[style*="margin-top:20px"]');
      
      const scanButton = document.createElement('button');
      scanButton.id = 'qrScanBtn';
      scanButton.textContent = '📷 カメラでQRを読み取る';
      scanButton.style.cssText = \`
        padding: 12px 24px;
        border-radius: 25px;
        background: #d4c4a8;
        color: #8b4513;
        border: none;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 4px 8px rgba(212,196,168,0.3);
        margin: 10px 5px;
        display: block;
        width: 100%;
      \`;
      
      scanButton.onclick = startQRScanning;
      buttonContainer.appendChild(scanButton);
    }

    // ページ読み込み時の初期化
    document.addEventListener('DOMContentLoaded', function() {
      showQrIntro();
      addQRScanButton();
    });
  </script>
</body>
</html>`;
}

// モジュールエクスポート（Node.js環境の場合）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateStampRallyHTML };
}

// クエリパラメータ処理
function handleQueryParameters() {
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

// ブラウザ環境での使用例
if (typeof window !== 'undefined') {
  // ブラウザで直接実行された場合、HTMLを生成して表示
  document.addEventListener('DOMContentLoaded', function() {
    const htmlContent = generateStampRallyHTML();
    document.open();
    document.write(htmlContent);
    document.close();
    
    // クエリパラメータに基づいて動作を制御
    const params = handleQueryParameters();
    
    if (params.autoStart) {
      // 直接スタンプラリーを開始
      setTimeout(() => {
        if (typeof startStampRally === 'function') {
          startStampRally();
        }
      }, 1000);
    } else if (params.showQR) {
      // QRモーダルを表示
      setTimeout(() => {
        if (typeof showQrIntro === 'function') {
          showQrIntro();
        }
        
        if (params.autoScan && typeof startQRScanning === 'function') {
          // 自動的にQRスキャンを開始
          setTimeout(() => {
            startQRScanning();
          }, 2000);
        }
      }, 1000);
    }
  });
}
