import { getBackgroundMonitor } from '../../lib/backgroundMonitor';

export default function handler(req, res) {
  console.log(`工場監視API: ${req.method} ${req.url}`);
  
  const monitor = getBackgroundMonitor();
  
  if (req.method === 'POST') {
    const { action } = req.body;
    console.log(`監視システム制御アクション: ${action}`);
    
    switch (action) {
      case 'start':
        console.log('監視システム開始を実行...');
        monitor.startMonitoring();
        const startStatus = monitor.getStatus();
        console.log('開始後の状態:', startStatus);
        res.status(200).json({
          success: true,
          message: '工場監視システムを開始しました',
          status: startStatus
        });
        break;
        
      case 'stop':
        console.log('監視システム停止を実行...');
        monitor.stopMonitoring();
        const stopStatus = monitor.getStatus();
        console.log('停止後の状態:', stopStatus);
        res.status(200).json({
          success: true,
          message: '工場監視システムを停止しました',
          status: stopStatus
        });
        break;
        
      case 'status':
        const currentStatus = monitor.getStatus();
        console.log('現在の状態:', currentStatus);
        res.status(200).json({
          success: true,
          status: currentStatus
        });
        break;
        
      default:
        console.error(`無効なアクション: ${action}`);
        res.status(400).json({
          success: false,
          error: 'Invalid action. Use: start, stop, or status'
        });
    }
  } else if (req.method === 'GET') {
    // GETリクエストで現在の状態を返す
    const currentStatus = monitor.getStatus();
    console.log('GET リクエスト - 現在の状態:', currentStatus);
    res.status(200).json({
      success: true,
      status: currentStatus,
      message: '工場監視システム状態'
    });
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}
