import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resetAll } = req.body;
    
    let resetCount = 0;
    const resetResults = [];

    // レポートファイルを削除
    const reportsDir = path.join(process.cwd(), 'reports');
    if (fs.existsSync(reportsDir)) {
      const reportFiles = fs.readdirSync(reportsDir);
      reportFiles.forEach(file => {
        try {
          const filePath = path.join(reportsDir, file);
          fs.unlinkSync(filePath);
          resetCount++;
          resetResults.push(`レポート: ${file}`);
        } catch (error) {
          console.error(`レポートファイル削除エラー: ${file}`, error);
        }
      });
    }

    // 通知ファイルを削除
    const notificationsDir = path.join(process.cwd(), 'notifications');
    if (fs.existsSync(notificationsDir)) {
      const notificationFiles = fs.readdirSync(notificationsDir);
      notificationFiles.forEach(file => {
        try {
          const filePath = path.join(notificationsDir, file);
          fs.unlinkSync(filePath);
          resetCount++;
          resetResults.push(`通知: ${file}`);
        } catch (error) {
          console.error(`通知ファイル削除エラー: ${file}`, error);
        }
      });
    }

    // グローバル変数をリセット（メモリ内のデータ）
    if (typeof global !== 'undefined') {
      if (global.alertHistory) {
        Object.keys(global.alertHistory).forEach(key => {
          global.alertHistory[key] = [];
        });
        resetResults.push('アラート履歴をリセット');
      }
      
      if (global.dangerHistory) {
        Object.keys(global.dangerHistory).forEach(key => {
          global.dangerHistory[key] = [];
        });
        resetResults.push('危険履歴をリセット');
      }
      
      if (global.temperatureHistory) {
        Object.keys(global.temperatureHistory).forEach(key => {
          global.temperatureHistory[key] = [];
        });
        resetResults.push('温度履歴をリセット');
      }
    }

    console.log(`ログリセット完了: ${resetCount}個のファイル/データをリセット`);

    res.status(200).json({
      success: true,
      message: `${resetCount}個のログファイル/データをリセットしました`,
      resetCount: resetCount,
      resetResults: resetResults
    });

  } catch (error) {
    console.error('ログリセットエラー:', error);
    res.status(500).json({
      success: false,
      error: 'ログのリセットに失敗しました',
      detail: error.message
    });
  }
}
