import { getBackgroundMonitor } from '../../lib/backgroundMonitor';

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
      // server-side only: get monitor and factoryNotification lazily
      const monitor = getBackgroundMonitor();

      // decide a random power-off duration between 60 and 180 seconds
      const durationSec = 60 + Math.floor(Math.random() * 120);
      const durationMs = durationSec * 1000;

      // Power off the robot for durationMs
      if (typeof monitor.powerOffRobot === 'function') {
        monitor.powerOffRobot(robotId, durationMs);
      }

      // Remove existing notifications for that robot (if factory notification module available)
      try {
        const fm = require('../../lib/factoryManagerNotification').getFactoryManagerNotification();
        if (fm && typeof fm.removeNotificationsForRobot === 'function') {
          fm.removeNotificationsForRobot(robotId);
        }
      } catch (e) {
        // ignore
      }

      // Respond with info
      res.status(200).json({
        success: true,
        message: `ロボット ${robotId} を ${durationSec} 秒間 電源オフにしました（自動復帰します）`,
        robotId,
        durationSec
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
