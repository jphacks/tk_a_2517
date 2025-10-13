import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function FactoryMonitor() {
  const router = useRouter();
  const [monitorStatus, setMonitorStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [lastReportTime, setLastReportTime] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateInterval, setUpdateInterval] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // 監視システムの状態を取得
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/factory-monitor');
      const data = await response.json();
      if (data.success) {
        setMonitorStatus(data.status);
        setLastUpdate(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
      }
    } catch (error) {
      console.error('Status fetch error:', error);
    }
  };

  // レポート一覧を取得（セッション開始後のみ）
  const fetchReports = async () => {
    try {
      const response = await fetch('/api/factory-reports');
      const data = await response.json();
      if (data.success) {
        const allReports = data.reports || [];
        
        // セッション開始後のレポートのみをフィルタリング
        if (sessionStartTime) {
          const sessionReports = allReports.filter(report => {
            const reportTime = new Date(report.createdAt);
            return reportTime >= sessionStartTime;
          });
          setReports(sessionReports);
          if (sessionReports.length > 0) {
            setLastReportTime(new Date(sessionReports[0].createdAt));
          } else {
            setLastReportTime(null);
          }
        } else {
          setReports(allReports);
          if (allReports.length > 0) {
            setLastReportTime(new Date(allReports[0].createdAt));
          } else {
            setLastReportTime(null);
          }
        }
      }
    } catch (error) {
      console.error('Reports fetch error:', error);
    }
  };

  // ログリセット機能
  const resetLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reset-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resetAll: true }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`ログをリセットしました: ${data.resetCount}個のファイル/データをクリア`);
        setReports([]); // レポート一覧をクリア
        fetchReports(); // 最新状態を取得
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (error) {
      console.error('ログリセットエラー:', error);
      alert(`通信エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 監視システムを制御
  const controlMonitor = async (action) => {
    setIsLoading(true);
    console.log(`監視システム制御: ${action} を実行中...`);
    
    try {
      const response = await fetch('/api/factory-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      const data = await response.json();
      console.log('API レスポンス:', data);
      
      if (data.success) {
        setMonitorStatus(data.status);
        setLastUpdate(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
        console.log('監視システム状態更新:', data.status);
        
        if (action === 'start') {
          // セッション開始時刻を設定
          setSessionStartTime(new Date());
          
          // 既存のインターバルをクリア
          if (updateInterval) {
            clearInterval(updateInterval);
          }
          
          // 監視開始後、定期的に状態を更新（5秒ごと）
          const newInterval = setInterval(() => {
            fetchStatus();
            fetchReports();
          }, 5000);
          setUpdateInterval(newInterval);
          
        } else if (action === 'stop') {
          // 監視停止時はインターバルをクリア
          if (updateInterval) {
            clearInterval(updateInterval);
            setUpdateInterval(null);
          }
        }
      } else {
        console.error('API エラー:', data.error);
        alert(`エラー: ${data.error}`);
      }
    } catch (error) {
      console.error('Monitor control error:', error);
      alert(`通信エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchReports();
    
    // 初期状態更新
    const initialInterval = setInterval(() => {
      fetchStatus();
      fetchReports();
    }, 10000); // 10秒ごと
    
    return () => {
      if (initialInterval) {
        clearInterval(initialInterval);
      }
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '24px', 
      backgroundColor: '#0f172a', 
      color: '#e5e7eb',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 style={{ margin: 0, color: '#ff8800' }}>🏭 QRally Factory 監視システム</h1>
            <button 
              onClick={() => router.push('/')}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#6b7280', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              ← メインページ
            </button>
          </div>
          <p style={{ color: '#6b7280', margin: 0 }}>
            QRコード読み取り不要の自動監視システム - 温度上昇時にAI分析を実行してレポートを自動生成
          </p>
        </div>

        {/* 監視システム制御 */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          border: '1px solid #334155'
        }}>
          <h2 style={{ margin: '0 0 16px 0', color: '#e5e7eb' }}>🎛️ 監視システム制御</h2>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <button 
              onClick={() => controlMonitor('start')}
              disabled={isLoading || monitorStatus?.isRunning}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: monitorStatus?.isRunning ? '#6b7280' : '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: monitorStatus?.isRunning ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {isLoading ? '処理中...' : '▶️ 監視開始'}
            </button>
            
            <button 
              onClick={() => controlMonitor('stop')}
              disabled={isLoading || !monitorStatus?.isRunning}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: !monitorStatus?.isRunning ? '#6b7280' : '#ef4444', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: !monitorStatus?.isRunning ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {isLoading ? '処理中...' : '⏹️ 監視停止'}
            </button>
            
            <button 
              onClick={fetchStatus}
              disabled={isLoading}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#6b7280', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              🔄 状態更新
            </button>
          </div>

          {/* 監視状態表示 */}
          {monitorStatus && (
            <div style={{ 
              backgroundColor: '#0f172a', 
              padding: '16px', 
              borderRadius: '6px',
              border: '1px solid #334155'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#ff8800' }}>📊 監視状態</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <strong>状態:</strong> 
                  <span style={{ 
                    color: monitorStatus.isRunning ? '#10b981' : '#ef4444',
                    marginLeft: '8px'
                  }}>
                    {monitorStatus.isRunning ? '🟢 稼働中' : '🔴 停止中'}
                  </span>
                </div>
                <div>
                  <strong>監視間隔:</strong> {monitorStatus.monitoringInterval}
                </div>
                <div>
                  <strong>生成レポート数:</strong> {monitorStatus.reportsGenerated}
                </div>
                <div>
                  <strong>最終レポート/最終更新:</strong> {lastReportTime 
                    ? new Date(lastReportTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                    : (lastUpdate || '—')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 自動生成レポート一覧 */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#e5e7eb' }}>📄 自動生成レポート</h2>
            <button 
              onClick={resetLogs}
              disabled={isLoading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: isLoading ? '#6b7280' : '#f59e0b', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'リセット中...' : '🔄 ログリセット'}
            </button>
          </div>

          {reports.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#6b7280',
              backgroundColor: '#0f172a',
              borderRadius: '6px',
              border: '1px solid #334155'
            }}>
              <p style={{ margin: 0, fontSize: '16px' }}>
                まだレポートが生成されていません
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                監視システムを開始して、温度上昇を検知すると自動でレポートが生成されます
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {reports.map((report, index) => (
                <div key={index} style={{
                  padding: '16px',
                  backgroundColor: '#0f172a',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  borderLeft: '4px solid #ff8800'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, color: '#ff8800' }}>🚨 {report.filename}</h4>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#6b7280',
                      backgroundColor: '#1e293b',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {report.size} bytes
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#e5e7eb', marginBottom: '8px' }}>
                    <strong>生成時刻:</strong> {new Date(report.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    <strong>パス:</strong> {report.path}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* システム説明 */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px', 
          marginTop: '24px',
          border: '1px solid #334155'
        }}>
          <h2 style={{ margin: '0 0 16px 0', color: '#e5e7eb' }}>ℹ️ システム説明</h2>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p><strong>🏭 工場環境での自動監視:</strong></p>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>QRコード読み取り不要で自動監視</li>
              <li>5秒間隔で全ロボットの状態をチェック</li>
              <li>温度上昇（50°C以上）を検知すると即座にAI分析実行</li>
              <li>AI分析結果を自動でレポートファイルに保存</li>
            </ul>
            
            <p><strong>🤖 AI自動分析:</strong></p>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>温度・振動パターンの自動分析</li>
              <li>原因特定と推奨事項の自動生成</li>
              <li>信頼度評価付きの診断結果</li>
              <li>工場環境に適したメンテナンス提案</li>
            </ul>
            
            <p><strong>📄 自動レポート生成:</strong></p>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>緊急レポート: emergency_report_*.txt</li>
              <li>システムログ: system_monitor.log</li>
              <li>重複防止: 同一ロボット・同一日は5分間隔で制限</li>
              <li>Docker時刻同期: 正確な工場時刻で記録</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
