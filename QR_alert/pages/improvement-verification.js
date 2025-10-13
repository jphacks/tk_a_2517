import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ImprovementVerification() {
  const router = useRouter();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVerificationData();
  }, []);

  const fetchVerificationData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/improvement-verification');
      const data = await response.json();
      
      if (data.success) {
        setVerificationData(data.report);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('改良確認データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case '✅ 実装済み':
      case '✅ 大幅改良済み':
        return '✅';
      case '⚠️ 部分実装':
        return '⚠️';
      case '❌ 未実装':
        return '❌';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '✅ 実装済み':
      case '✅ 大幅改良済み':
        return '#10b981';
      case '⚠️ 部分実装':
        return '#f59e0b';
      case '❌ 未実装':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#0f172a',
        color: '#e5e7eb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🔄</div>
          <div>改良確認データを読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#0f172a',
        color: '#e5e7eb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px', color: '#ef4444' }}>❌</div>
          <div style={{ color: '#ef4444' }}>{error}</div>
          <button 
            onClick={fetchVerificationData}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!verificationData) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#0f172a',
        color: '#e5e7eb'
      }}>
        <div>データが見つかりません</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '24px', 
      backgroundColor: '#0f172a', 
      color: '#e5e7eb' 
    }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#f59e0b' }}>
              🔍 QRally Factory システム改良確認
            </h1>
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
            ← 戻る
          </button>
        </div>
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '16px', 
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
            <strong>確認時刻:</strong> {verificationData.timestamp} | 
            <strong> ISO時刻:</strong> {verificationData.isoTime}
          </p>
        </div>
      </div>

      {/* 総合評価 */}
      <div style={{ 
        backgroundColor: '#1e293b', 
        padding: '24px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        border: '2px solid #334155'
      }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#f59e0b' }}>📊 総合評価</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: 'bold',
            color: verificationData.overallAssessment.score === '95/100' ? '#10b981' : '#f59e0b'
          }}>
            {verificationData.overallAssessment.score}
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e5e7eb' }}>
              {verificationData.overallAssessment.status}
            </div>
            <div style={{ color: '#94a3b8' }}>総合評価</div>
          </div>
        </div>
        <p style={{ margin: '0 0 16px 0', lineHeight: '1.6' }}>
          {verificationData.overallAssessment.summary}
        </p>
      </div>

      {/* 改良項目一覧 */}
      <div style={{ display: 'grid', gap: '24px' }}>
        
        {/* AI診断エージェント */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>🤖</span>
            <h3 style={{ margin: 0, color: '#e5e7eb' }}>AI診断エージェント</h3>
            <div style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: getStatusColor(verificationData.aiAgentImprovements.status),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {verificationData.aiAgentImprovements.status}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>実装機能:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
              {verificationData.aiAgentImprovements.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{feature}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>AI能力:</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {verificationData.aiAgentImprovements.capabilities.map((capability, index) => (
                <span key={index} style={{
                  padding: '4px 8px',
                  backgroundColor: '#0f172a',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#60a5fa'
                }}>
                  {capability}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* バックグラウンド監視システム */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>🏭</span>
            <h3 style={{ margin: 0, color: '#e5e7eb' }}>バックグラウンド監視システム</h3>
            <div style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: getStatusColor(verificationData.backgroundMonitoringImprovements.status),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {verificationData.backgroundMonitoringImprovements.status}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>実装機能:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
              {verificationData.backgroundMonitoringImprovements.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{feature}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <strong style={{ color: '#f59e0b' }}>監視間隔:</strong>
              <div style={{ color: '#e5e7eb' }}>{verificationData.backgroundMonitoringImprovements.monitoringInterval}</div>
            </div>
            <div>
              <strong style={{ color: '#f59e0b' }}>レポート生成:</strong>
              <div style={{ color: '#e5e7eb' }}>{verificationData.backgroundMonitoringImprovements.reportGeneration}</div>
            </div>
          </div>
        </div>

        {/* リアルタイムダッシュボード */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>📊</span>
            <h3 style={{ margin: 0, color: '#e5e7eb' }}>リアルタイムダッシュボード</h3>
            <div style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: getStatusColor(verificationData.dashboardImprovements.status),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {verificationData.dashboardImprovements.status}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>実装機能:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
              {verificationData.dashboardImprovements.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{feature}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <strong style={{ color: '#f59e0b' }}>更新頻度:</strong>
              <div style={{ color: '#e5e7eb' }}>{verificationData.dashboardImprovements.updateFrequency}</div>
            </div>
            <div>
              <strong style={{ color: '#f59e0b' }}>可視化:</strong>
              <div style={{ color: '#e5e7eb' }}>{verificationData.dashboardImprovements.visualization}</div>
            </div>
          </div>
        </div>

        {/* 自動レポート生成 */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>📄</span>
            <h3 style={{ margin: 0, color: '#e5e7eb' }}>自動レポート生成</h3>
            <div style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: getStatusColor(verificationData.reportGenerationImprovements.status),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {verificationData.reportGenerationImprovements.status}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>実装機能:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
              {verificationData.reportGenerationImprovements.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{feature}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <strong style={{ color: '#f59e0b' }}>レポートタイプ:</strong>
              <div style={{ color: '#e5e7eb' }}>
                {verificationData.reportGenerationImprovements.reportTypes.join(', ')}
              </div>
            </div>
            <div>
              <strong style={{ color: '#f59e0b' }}>自動保存:</strong>
              <div style={{ color: '#e5e7eb' }}>
                {verificationData.reportGenerationImprovements.autoSave ? '有効' : '無効'}
              </div>
            </div>
          </div>
        </div>

        {/* QRコード連携 */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>📱</span>
            <h3 style={{ margin: 0, color: '#e5e7eb' }}>QRコード連携</h3>
            <div style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: getStatusColor(verificationData.qrIntegrationImprovements.status),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {verificationData.qrIntegrationImprovements.status}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>実装機能:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
              {verificationData.qrIntegrationImprovements.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{feature}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <strong style={{ color: '#f59e0b' }}>QRライブラリ:</strong>
              <div style={{ color: '#e5e7eb' }}>{verificationData.qrIntegrationImprovements.qrLibrary}</div>
            </div>
            <div>
              <strong style={{ color: '#f59e0b' }}>連携:</strong>
              <div style={{ color: '#e5e7eb' }}>{verificationData.qrIntegrationImprovements.integration}</div>
            </div>
          </div>
        </div>

        {/* システム全体の改良 */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px',
          border: '2px solid #10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>🚀</span>
            <h3 style={{ margin: 0, color: '#e5e7eb' }}>システム全体の改良</h3>
            <div style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: getStatusColor(verificationData.overallImprovements.status),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {verificationData.overallImprovements.status}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>主要改良点:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
              {verificationData.overallImprovements.improvements.map((improvement, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{improvement}</li>
              ))}
            </ul>
          </div>

          <div style={{ 
            backgroundColor: '#0f172a', 
            padding: '16px', 
            borderRadius: '4px',
            border: '1px solid #334155'
          }}>
            <strong style={{ color: '#f59e0b' }}>進化:</strong>
            <div style={{ color: '#e5e7eb', marginTop: '4px' }}>
              {verificationData.overallImprovements.evolution}
            </div>
          </div>
        </div>

        {/* 推奨事項 */}
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '24px', 
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <h3 style={{ margin: 0, color: '#e5e7eb' }}>今後の推奨事項</h3>
          </div>
          
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
            {verificationData.overallAssessment.recommendations.map((recommendation, index) => (
              <li key={index} style={{ marginBottom: '8px', color: '#94a3b8' }}>
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* フッター */}
      <div style={{ 
        marginTop: '32px', 
        padding: '16px', 
        backgroundColor: '#1e293b', 
        borderRadius: '8px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '14px'
      }}>
        <p style={{ margin: 0 }}>
          QRally Factory システム改良確認レポート | 
          生成時刻: {verificationData.timestamp}
        </p>
      </div>
    </div>
  );
}
