import fs from 'fs';
import path from 'path';

// 工場責任者通知システム
class FactoryManagerNotification {
  constructor() {
    this.notificationsDir = path.join(process.cwd(), 'notifications');
    this.emergencyNotifications = [];
    
    // 通知ディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.notificationsDir)) {
      fs.mkdirSync(this.notificationsDir, { recursive: true });
    }
  }

  // 緊急通知を送信
  sendEmergencyNotification(robotId, dangerDetails) {
    const timestamp = new Date();
    const notification = {
      id: `EMERGENCY_${robotId}_${timestamp.getTime()}`,
      timestamp: timestamp.toISOString(),
      robotId,
      type: 'EMERGENCY_STOP_REQUIRED',
      title: '🚨 緊急停止要請',
      message: `ロボット ${robotId} で連続危険状況が検知されました。工場責任者による即座の停止操作が必要です。`,
      details: dangerDetails,
      severity: 'CRITICAL',
      actionRequired: 'IMMEDIATE_STOP',
      containerTime: timestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      dockerTime: timestamp.toISOString()
    };

    // メモリに保存
    this.emergencyNotifications.push(notification);
    
    // ファイルに保存
    this.saveNotificationToFile(notification);
    
    // システムログに記録
    this.logEmergencyEvent(notification);
    
    console.log(`🚨 緊急通知送信: ${robotId} - 工場責任者による停止が必要`);
    
    return notification;
  }

  // 通知をファイルに保存
  saveNotificationToFile(notification) {
    try {
      const filename = `emergency_notification_${notification.id}.txt`;
      const filePath = path.join(this.notificationsDir, filename);
      
      const content = this.generateNotificationContent(notification);
      fs.writeFileSync(filePath, content, 'utf8');
      
      console.log(`📄 緊急通知ファイル保存: ${filename}`);
    } catch (error) {
      console.error('通知ファイル保存エラー:', error);
    }
  }

  // 通知内容を生成
  generateNotificationContent(notification) {
    let content = '';
    content += '='.repeat(80) + '\n';
    content += '🚨 工場責任者向け緊急通知\n';
    content += '='.repeat(80) + '\n\n';
    
    content += `通知ID: ${notification.id}\n`;
    content += `ロボットID: ${notification.robotId}\n`;
    content += `通知タイプ: ${notification.type}\n`;
    content += `重要度: ${notification.severity}\n`;
    content += `必要アクション: ${notification.actionRequired}\n`;
    content += `通知時刻: ${notification.containerTime}\n`;
    content += `ISO時刻: ${notification.dockerTime}\n\n`;
    
    content += '-'.repeat(60) + '\n';
    content += '📋 通知内容\n';
    content += '-'.repeat(60) + '\n\n';
    
    content += `タイトル: ${notification.title}\n\n`;
    content += `メッセージ: ${notification.message}\n\n`;
    
    content += '-'.repeat(60) + '\n';
    content += '🔍 危険状況詳細\n';
    content += '-'.repeat(60) + '\n\n';
    
    if (notification.details && notification.details.length > 0) {
      notification.details.forEach((detail, index) => {
        content += `${index + 1}. ${detail.partName}\n`;
        content += `   温度: ${detail.temperature.toFixed(1)}°C\n`;
        content += `   振動: ${detail.vibration.toFixed(3)}\n`;
        content += `   湿度: ${detail.humidity.toFixed(1)}%\n`;
        content += `   運転時間: ${detail.operatingHours}時間\n`;
        content += `   危険レベル: ${detail.dangerLevel}\n`;
        content += `   検知時刻: ${detail.containerTime}\n\n`;
      });
    }
    
    content += '-'.repeat(60) + '\n';
    content += '⚠️ 工場責任者への指示\n';
    content += '-'.repeat(60) + '\n\n';
    
    content += '1. 即座にロボットの運転を停止してください\n';
    content += '2. 安全確認を実施してください\n';
    content += '3. メンテナンスチームに連絡してください\n';
    content += '4. 詳細な点検を実施してください\n';
    content += '5. 再開前に安全確認を完了してください\n\n';
    
    content += '='.repeat(80) + '\n';
    content += 'End of Emergency Notification\n';
    content += '='.repeat(80) + '\n';
    
    return content;
  }

  // システムログに記録
  logEmergencyEvent(notification) {
    try {
      const logPath = path.join(this.notificationsDir, 'emergency_log.txt');
      const logEntry = `[${notification.dockerTime}] EMERGENCY: ${notification.robotId} - ${notification.type} - Action: ${notification.actionRequired}\n`;
      
      fs.appendFileSync(logPath, logEntry, 'utf8');
    } catch (error) {
      console.error('緊急ログ記録エラー:', error);
    }
  }

  // 通知履歴を取得
  getNotificationHistory() {
    return this.emergencyNotifications.slice(-20); // 最新20件
  }

  // 通知統計を取得
  getNotificationStats() {
    const total = this.emergencyNotifications.length;
    const today = new Date().toDateString();
    const todayCount = this.emergencyNotifications.filter(n => 
      new Date(n.timestamp).toDateString() === today
    ).length;
    
    return {
      totalNotifications: total,
      todayNotifications: todayCount,
      lastNotification: this.emergencyNotifications[this.emergencyNotifications.length - 1] || null
    };
  }
}

// グローバルインスタンス
let factoryManagerNotification = null;

export function getFactoryManagerNotification() {
  if (!factoryManagerNotification) {
    factoryManagerNotification = new FactoryManagerNotification();
  }
  return factoryManagerNotification;
}

export default FactoryManagerNotification;
