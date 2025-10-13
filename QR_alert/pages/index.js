import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// ロボット部位の定義
const ROBOT_PARTS = [
  { id: 'head', name: '頭部', color: '#60a5fa' },
  { id: 'left_arm', name: '左腕', color: '#93c5fd' },
  { id: 'right_arm', name: '右腕', color: '#93c5fd' },
  { id: 'torso', name: '胴体', color: '#7dd3fc' },
  { id: 'left_leg', name: '左脚', color: '#a78bfa' },
  { id: 'right_leg', name: '右脚', color: '#a78bfa' },
  { id: 'base', name: 'ベース', color: '#334155' }
];

// ロボット定義
const ROBOTS = [
  { 
    id: 'ROBOT_001', 
    name: 'Industrial Robot Alpha',
    parts: ROBOT_PARTS
  },
  { 
    id: 'ROBOT_002', 
    name: 'Assembly Robot Beta',
    parts: ROBOT_PARTS
  },
  { 
    id: 'ROBOT_003', 
    name: 'Maintenance Robot Gamma',
    parts: ROBOT_PARTS
  }
];

export default function Home() {
  const [qrUrls, setQrUrls] = useState({});

  useEffect(() => {
    (async () => {
      // 3つのロボット用のQRコードを生成
      const qrData = {};
      for (const robot of ROBOTS) {
        const url = `${location.origin}/robot-dashboard?id=${robot.id}`;
        const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 200 });
        qrData[robot.id] = qrDataUrl;
      }
      setQrUrls(qrData);
    })();
  }, []);

  return (
    <div className="container">
      <h1>🏭 QRally Factory - Robot Management System</h1>
      
      <div className="card">
        <h2>Individual Robot QR Codes</h2>
        <p>各ロボット専用のQRコードで個別管理します</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {ROBOTS.map(robot => (
            <div key={robot.id} className="qr-card" style={{ 
              textAlign: 'center', 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              border: '2px solid #e9ecef'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>{robot.name}</h3>
              <p style={{ margin: '0 0 15px 0', color: '#6c757d', fontSize: '14px' }}>ID: {robot.id}</p>
              
              {qrUrls[robot.id] && (
                <div style={{ marginBottom: '15px' }}>
                  <img 
                    src={qrUrls[robot.id]} 
                    alt={`${robot.name} QR Code`} 
                    style={{ 
                      maxWidth: '200px', 
                      border: '1px solid #dee2e6',
                      borderRadius: '4px'
                    }} 
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
                    スキャンして{robot.name}のダッシュボードを開く
                  </p>
                </div>
              )}
              
              <Link href={`/robot-dashboard?id=${robot.id}`}>
                <div className="btn" style={{ 
                  display: 'inline-block', 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  backgroundColor: '#0ea5a2', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  fontSize: '14px'
                }}>
                  📱 ダッシュボードを開く
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>🎯 システム特徴</h3>
        <ul>
          <li><strong>個別QR管理:</strong> 各ロボット専用のQRコードで個別管理</li>
          <li><strong>部位別状態:</strong> 各部位（腕、胴体、足など）の個別状態表示</li>
          <li><strong>リアルタイム更新:</strong> 部位ごとのセンサーデータをリアルタイム表示</li>
          <li><strong>視覚的フィードバック:</strong> 色分けによる状態の直感的表示</li>
          <li><strong>3種類のロボット:</strong> 三角形、丸型、四角形の頭部で識別</li>
        </ul>
      </div>

      <div className="card">
        <h3>🏭 工場監視システム</h3>
        <p>QRコード読み取り不要の自動監視システム</p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/factory-monitor">
            <div style={{ 
              display: 'inline-block',
              padding: '12px 24px', 
              backgroundColor: '#0ea5a2', 
              color: '#041014', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              🏭 工場監視システム
            </div>
          </Link>
          <Link href="/factory-manager">
            <div style={{ 
              display: 'inline-block',
              padding: '12px 24px', 
              backgroundColor: '#dc2626', 
              color: 'white', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              🚨 工場責任者ダッシュボード
            </div>
          </Link>
          <Link href="/improvement-verification">
            <div style={{ 
              display: 'inline-block',
              padding: '12px 24px', 
              backgroundColor: '#f59e0b', 
              color: 'white', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              🔍 改良確認
            </div>
          </Link>
        </div>
        <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
          <p><strong>特徴:</strong></p>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>QRコード読み取り不要で自動監視</li>
            <li>温度上昇時にAI分析を自動実行</li>
            <li>緊急レポートを自動生成・保存</li>
            <li>連続危険状況検知による緊急通知</li>
            <li>工場責任者による緊急停止機能</li>
            <li>工場環境での実用的な運用</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <h3>🔧 ロボット部位</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {ROBOT_PARTS.map(part => (
            <div key={part.id} style={{ 
              padding: '10px', 
              backgroundColor: part.color + '20', 
              border: `2px solid ${part.color}`,
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                backgroundColor: part.color, 
                borderRadius: '50%', 
                margin: '0 auto 5px' 
              }}></div>
              <strong>{part.name}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}