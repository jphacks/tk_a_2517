import { getFactoryManagerNotification } from '../../lib/factoryManagerNotification';

export default function handler(req, res) {
  console.log(`緊急停止API: ${req.method} ${req.url}`);
  
  if (req.method === 'POST') {
    const { robotId } = req.body;
    console.log(`緊急停止リクエスト: ${robotId}`);
    
    if (!robotId) {
      res.status(400).json({
        success: false,
        error: 'ロボットIDが必要です'
      });
      return;
    }
    
    try {
      const factoryNotification = getFactoryManagerNotification();
      
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
      
      // 停止ログを記録
      factoryNotification.logEmergencyEvent(stopNotification);
      
      res.status(200).json({
        success: true,
        message: `ロボット ${robotId} の緊急停止を実行しました`,
        notification: stopNotification,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('緊急停止エラー:', error);
      res.status(500).json({
        success: false,
        error: '緊急停止の実行に失敗しました'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}
