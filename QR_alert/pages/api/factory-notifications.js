import { getFactoryManagerNotification } from '../../lib/factoryManagerNotification';

export default function handler(req, res) {
  console.log(`工場責任者API: ${req.method} ${req.url}`);
  
  const factoryNotification = getFactoryManagerNotification();
  
  if (req.method === 'GET') {
    // 通知履歴と統計を取得
    try {
      const notifications = factoryNotification.getNotificationHistory();
      const stats = factoryNotification.getNotificationStats();
      
      res.status(200).json({
        success: true,
        notifications,
        stats,
        message: '工場責任者通知データを取得しました'
      });
    } catch (error) {
      console.error('通知データ取得エラー:', error);
      res.status(500).json({
        success: false,
        error: '通知データの取得に失敗しました'
      });
    }
  } else if (req.method === 'POST') {
    const { action, robotId } = req.body;
    console.log(`工場責任者アクション: ${action} - ロボット: ${robotId}`);
    
    switch (action) {
      case 'emergency_stop':
        if (!robotId) {
          res.status(400).json({
            success: false,
            error: 'ロボットIDが必要です'
          });
          return;
        }
        
        // 緊急停止の実行（実際の実装ではロボット制御システムに接続）
        console.log(`🚨 緊急停止実行: ${robotId}`);
        
        // 停止確認通知を生成
        const stopNotification = {
          id: `STOP_${robotId}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          robotId,
          type: 'EMERGENCY_STOP_EXECUTED',
          title: '✅ 緊急停止完了',
          message: `ロボット ${robotId} の緊急停止を実行しました`,
          severity: 'INFO',
          actionRequired: 'MAINTENANCE_CHECK',
          containerTime: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          dockerTime: new Date().toISOString()
        };
        
        res.status(200).json({
          success: true,
          message: `ロボット ${robotId} の緊急停止を実行しました`,
          notification: stopNotification
        });
        break;
        
      case 'acknowledge':
        if (!robotId) {
          res.status(400).json({
            success: false,
            error: 'ロボットIDが必要です'
          });
          return;
        }
        
        console.log(`✅ 通知確認: ${robotId}`);
        
        res.status(200).json({
          success: true,
          message: `ロボット ${robotId} の通知を確認しました`
        });
        break;
        
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid action. Use: emergency_stop or acknowledge'
        });
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}
