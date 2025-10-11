'use client';

import { useEffect, useState } from 'react';

export default function SightseeingPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // スタンプラリーアプリを動的に読み込み
    const loadApp = async () => {
      try {
        // Next.jsの動的インポートを使用
        const { generateStampRallyHTML, handleQueryParameters } = await import('./route_navigator.js');
        
        // コンテナにHTMLを挿入
        const container = document.getElementById('sightseeing-app');
        if (container) {
          container.innerHTML = generateStampRallyHTML();
          
          // スクリプトを再評価
          const scripts = Array.from(container.querySelectorAll('script'));
          scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
          });
          
          // 初期化処理を実行
          setTimeout(() => {
            // ブラウザ環境でのみクエリパラメータを処理
            if (typeof window !== 'undefined') {
              const params = handleQueryParameters();
              
              if (params.autoStart) {
                // 直接スタンプラリーを開始
                if (typeof startStampRally === 'function') {
                  startStampRally();
                }
              } else if (params.showQR) {
                // QRモーダルを表示
                if (typeof showQrIntro === 'function') {
                  showQrIntro();
                }
                
                if (params.autoScan && typeof startQRScanning === 'function') {
                  // 自動的にQRスキャンを開始
                  setTimeout(() => {
                    startQRScanning();
                  }, 2000);
                }
              }
            } else {
              // デフォルトでQRモーダルを表示
              if (typeof showQrIntro === 'function') {
                showQrIntro();
              }
            }
          }, 100);
          
          setIsLoaded(true);
          setError(null);
        }
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.error('Error loading app:', err);
        }
        setError('アプリケーションの初期化に失敗しました');
      }
    };

    // 少し遅延させてから読み込み
    if (typeof setTimeout !== 'undefined') {
      setTimeout(loadApp, 100);
    } else {
      loadApp();
    }
  }, []);

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f1e8',
        fontFamily: 'system-ui, -apple-system, "Yu Gothic UI", "Hiragino Kaku Gothic ProN", "メイリオ", Meiryo, sans-serif'
      }}>
        <div style={{ textAlign: 'center', color: '#d00' }}>
          <h1 style={{ color: '#8b4513', marginBottom: '20px' }}>🏯 京都スタンプラリー</h1>
          <p style={{ color: '#d00', marginBottom: '20px' }}>❌ {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '12px 24px',
              borderRadius: '25px',
              background: '#8b4513',
              color: '#f5f1e8',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f1e8',
        fontFamily: 'system-ui, -apple-system, "Yu Gothic UI", "Hiragino Kaku Gothic ProN", "メイリオ", Meiryo, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#8b4513', marginBottom: '20px' }}>🏯 京都スタンプラリー</h1>
          <p style={{ color: '#8b7355', marginBottom: '20px' }}>アプリケーションを読み込み中...</p>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #d4c4a8', 
            borderTop: '4px solid #8b4513', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '20px auto'
          }}></div>
          <p style={{ color: '#8b7355', fontSize: '14px' }}>
            初回読み込みには時間がかかる場合があります
          </p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // アプリケーションが読み込まれた後は、route_navigator.jsがDOMを制御
  return (
    <div id="sightseeing-app">
      {/* route_navigator.jsがここにHTMLを動的に挿入します */}
    </div>
  );
}
