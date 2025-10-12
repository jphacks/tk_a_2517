import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function FactoryManagerDashboard() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateInterval, setUpdateInterval] = useState(null);

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
        alert(`ロボット ${robotId} の緊急停止を実行しました`);
        fetchNotifications(); // 通知を更新
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
    
    // より頻繁な更新（5秒ごと）
    const interval = setInterval(fetchNotifications, 5000);
    setUpdateInterval(interval);
    
    return () => {
      if (interval) {
        clearInterval(interval);
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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 style={{ margin: 0, color: '#ff4444' }}>🚨 QRally 工場責任者ダッシュボード</h1>
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
                {stats.totalNotifications}
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
                {stats.todayNotifications}
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
                {stats.lastNotification ? 
                  new Date(stats.lastNotification.timestamp).toLocaleString('ja-JP') : 
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
