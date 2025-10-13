import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function FactoryManagerDashboard() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateInterval, setUpdateInterval] = useState(null);
  const [monitorStatus, setMonitorStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);

  // 通知履歴を取得
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/factory-notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setStats(data.stats || null);
        setLastUpdate(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
      }
    } catch (error) {
      console.error('通知取得エラー:', error);
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
        alert('ログをリセットしました');
        fetchNotifications(); // 通知を更新
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

  // 緊急停止を実行
  const executeEmergencyStop = async (robotId) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/emergency-stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ robotId }),
      });

      const data = await response.json();
      if (data.success) {
        // optimistic update: remove notification locally and hide button
        setNotifications(prev => prev.filter(n => n.robotId !== robotId));
        alert(`ロボット ${robotId} を一時的に電源オフしました（${data.durationSec}秒）。通知を削除しました。`);
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (error) {
      console.error('緊急停止エラー:', error);
      alert(`通信エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // initial status fetch
    fetchMonitorStatus();

    // SSE subscription for real-time updates
    let evtSource;
    try {
      evtSource = new EventSource('/api/factory-notifications/stream');
      evtSource.addEventListener('update', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.notifications) setNotifications(payload.notifications || []);
          if (payload.stats) setStats(payload.stats || null);
        } catch (e) { console.error('SSE parse error', e); }
      });
    } catch (e) {
      // fallback to polling every 5s
      const interval = setInterval(() => {
        fetchNotifications();
        fetchMonitorStatus();
      }, 5000);
      setUpdateInterval(interval);
    }

    return () => {
      if (evtSource) try { evtSource.close(); } catch (e) {}
      if (updateInterval) try { clearInterval(updateInterval); } catch (e) {}
    };
  }, []);

  // 工場監視システムの状態取得
  const fetchMonitorStatus = async () => {
    try {
      const res = await fetch('/api/factory-monitor');
      const data = await res.json();
      if (data.success) {
        setMonitorStatus(data.status);
        setStatusError(null);
      } else {
        setStatusError(data.error || '状態取得に失敗しました');
      }
    } catch (e) {
      setStatusError(e.message);
    }
  };

  // 監視開始/停止
  const controlMonitor = async (action) => {
    try {
      const res = await fetch('/api/factory-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        setMonitorStatus(data.status);
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (e) {
      alert(`通信エラー: ${e.message}`);
    }
  };

  // derive stats from notifications when server-side stats not provided
  const derivedStats = (() => {
    if (stats) return stats;
    const totalNotifications = notifications.length;
    const today = new Date().toLocaleDateString('ja-JP');
    const todayNotifications = notifications.filter(n => {
      try {
        const d = new Date(n.timestamp);
        return d.toLocaleDateString('ja-JP') === today;
      } catch (e) { return false; }
    }).length;
    const lastNotification = notifications.length > 0 ? notifications[0] : null;
    return { totalNotifications, todayNotifications, lastNotification };
  })();

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '24px', 
      backgroundColor: '#0f172a', 
      color: '#e5e7eb',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 style={{ margin: 0, color: '#ff4444' }}>🚨 QRally Factory 責任者ダッシュボード</h1>
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
            緊急停止要請とロボット監視システム - 危険状況の連続検知による自動通知
          </p>
        </div>

        {/* 統計情報 */}
        {stats && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px', 
            marginBottom: '32px' 
          }}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#1e293b', 
              borderRadius: '8px',
              border: '2px solid #dc2626'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>🚨 緊急通知総数</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#ff4444' }}>
                {derivedStats.totalNotifications}
              </p>
            </div>
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#1e293b', 
              borderRadius: '8px',
              border: '2px solid #f59e0b'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>📅 本日の通知</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {derivedStats.todayNotifications}
              </p>
            </div>
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#1e293b', 
              borderRadius: '8px',
              border: '2px solid #10b981'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#10b981' }}>⏰ 最終通知</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#10b981' }}>
                {derivedStats.lastNotification ? 
                  new Date(derivedStats.lastNotification.timestamp).toLocaleString('ja-JP') : 
                  'なし'
                }
              </p>
            </div>
            
            {lastUpdate && (
              <div style={{ 
                padding: '16px', 
                backgroundColor: '#1e293b', 
                borderRadius: '8px',
                border: '2px solid #6b7280'
              }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#6b7280' }}>🔄 最終更新</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  {lastUpdate}
                </p>
              </div>
            )}
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#1e293b', 
              borderRadius: '8px',
              border: '2px solid #f59e0b',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>🔄 ログリセット</h3>
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
                  opacity: isLoading ? 0.6 : 1,
                  fontSize: '14px'
                }}
              >
                {isLoading ? 'リセット中...' : '🔄 リセット'}
              </button>
            </div>
          </div>
        )}

        {/* 工場監視システム状態 */}
        <div style={{ 
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#111827',
          borderRadius: '8px',
          border: '2px solid #374151'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, color: '#93c5fd' }}>🛠 監視システム状態</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => controlMonitor('start')} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>開始</button>
              <button onClick={() => controlMonitor('stop')} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>停止</button>
              <button onClick={fetchMonitorStatus} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>再読込</button>
            </div>
          </div>
          {statusError && (
            <div style={{ color: '#f87171', marginBottom: '8px' }}>状態取得エラー: {statusError}</div>
          )}
          {monitorStatus ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#1f2937', borderRadius: '6px', border: '1px solid #374151' }}>
                <div style={{ color: '#9ca3af' }}>稼働状態</div>
                <div style={{ fontWeight: 'bold', color: monitorStatus.isRunning ? '#10b981' : '#f87171' }}>
                  {monitorStatus.isRunning ? '稼働中' : '停止中'}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>間隔: {monitorStatus.monitoringInterval}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#1f2937', borderRadius: '6px', border: '1px solid #374151' }}>
                <div style={{ color: '#9ca3af' }}>生成レポート数</div>
                <div style={{ fontWeight: 'bold', color: '#f59e0b' }}>{monitorStatus.reportsGenerated}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#1f2937', borderRadius: '6px', border: '1px solid #374151' }}>
                <div style={{ color: '#9ca3af', marginBottom: '6px' }}>電源オフ中のロボット</div>
                {monitorStatus.poweredOffRobots && Object.keys(monitorStatus.poweredOffRobots).length > 0 ? (
                  <div style={{ display: 'grid', gap: '4px' }}>
                    {Object.entries(monitorStatus.poweredOffRobots).map(([rid, info]) => (
                      <div key={rid} style={{ color: '#93c5fd' }}>{rid}: {info.remainingSec}s 残り</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#6b7280' }}>なし</div>
                )}
              </div>
              <div style={{ padding: '12px', backgroundColor: '#1f2937', borderRadius: '6px', border: '1px solid #374151' }}>
                <div style={{ color: '#9ca3af', marginBottom: '6px' }}>ロボット別レポート要約</div>
                {monitorStatus.robotsSummary && Object.keys(monitorStatus.robotsSummary).length > 0 ? (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {Object.entries(monitorStatus.robotsSummary).map(([rid, s]) => (
                      <div key={rid} style={{ color: '#e5e7eb' }}>
                        <strong style={{ color: '#93c5fd' }}>{rid}</strong>: total {s.total}, CRITICAL {s.critical}, emergency {s.emergency}
                        <div style={{ color: '#9ca3af', fontSize: '12px' }}>最終: {s.lastReportAt ? new Date(s.lastReportAt).toLocaleString('ja-JP') : '—'} ({s.lastReportType || '—'})</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#6b7280' }}>データなし</div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ color: '#6b7280' }}>状態を取得中...</div>
          )}
        </div>

        {/* 緊急通知一覧 */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#ff4444', marginBottom: '16px' }}>🚨 緊急通知一覧</h2>
          
          {notifications.length === 0 ? (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center', 
              backgroundColor: '#1e293b', 
              borderRadius: '8px',
              color: '#6b7280'
            }}>
              <p style={{ margin: 0, fontSize: '18px' }}>現在、緊急通知はありません</p>
              <p style={{ margin: '8px 0 0 0' }}>ロボットの状態は正常です</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {notifications.map((notification) => (
                <div key={notification.id} style={{ 
                  padding: '20px', 
                  backgroundColor: '#1e293b', 
                  borderRadius: '8px',
                  border: '2px solid #dc2626',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', color: '#ff4444' }}>
                        {notification.title}
                      </h3>
                      <p style={{ margin: '0 0 8px 0', color: '#e5e7eb' }}>
                        {notification.message}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => executeEmergencyStop(notification.robotId)}
                        disabled={isLoading}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.6 : 1
                        }}
                      >
                        {isLoading ? '停止中...' : '🚨 緊急停止'}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <strong style={{ color: '#94a3b8' }}>ロボットID:</strong>
                      <span style={{ color: '#e5e7eb', marginLeft: '8px' }}>{notification.robotId}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#94a3b8' }}>重要度:</strong>
                      <span style={{ color: '#ff4444', marginLeft: '8px' }}>{notification.severity}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#94a3b8' }}>必要アクション:</strong>
                      <span style={{ color: '#f59e0b', marginLeft: '8px' }}>{notification.actionRequired}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#94a3b8' }}>通知時刻:</strong>
                      <span style={{ color: '#e5e7eb', marginLeft: '8px' }}>
                        {new Date(notification.timestamp).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  
                  {/* 危険状況詳細 */}
                  {notification.details && notification.details.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <h4 style={{ color: '#f59e0b', margin: '0 0 8px 0' }}>🔍 危険状況詳細</h4>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                        gap: '8px'
                      }}>
                        {notification.details.map((detail, index) => (
                          <div key={index} style={{ 
                            padding: '12px', 
                            backgroundColor: '#0f172a', 
                            borderRadius: '4px',
                            border: '1px solid #374151'
                          }}>
                            <div style={{ fontWeight: 'bold', color: '#e5e7eb', marginBottom: '4px' }}>
                              {detail.partName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                              <div>温度: {detail.temperature.toFixed(1)}°C</div>
                              <div>振動: {detail.vibration.toFixed(3)}</div>
                              <div>湿度: {detail.humidity.toFixed(1)}%</div>
                              <div>運転時間: {detail.operatingHours}時間</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 工場責任者への指示 */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#1e293b', 
          borderRadius: '8px',
          border: '2px solid #f59e0b'
        }}>
          <h3 style={{ color: '#f59e0b', margin: '0 0 16px 0' }}>⚠️ 工場責任者への指示</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <h4 style={{ color: '#e5e7eb', margin: '0 0 8px 0' }}>🚨 緊急時対応</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8' }}>
                <li>即座にロボットの運転を停止</li>
                <li>安全確認を実施</li>
                <li>メンテナンスチームに連絡</li>
                <li>詳細な点検を実施</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#e5e7eb', margin: '0 0 8px 0' }}>📋 日常監視</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8' }}>
                <li>定期的な状態確認</li>
                <li>アラート履歴の確認</li>
                <li>メンテナンス計画の更新</li>
                <li>安全基準の遵守</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
