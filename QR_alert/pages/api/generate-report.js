import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { robotId, parts, timestamp, criticalStatus, errorDetails } = req.body;

  if (!robotId || !parts) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // reportsディレクトリが存在しない場合は作成
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Critical状況の場合は特別なファイル名を使用
    const isCritical = criticalStatus === 'critical' || criticalStatus === 'emergency';
    const reportType = isCritical ? 'CRITICAL' : 'emergency';
    
    // レポートファイル名を生成
    const reportTimestamp = timestamp || new Date().toISOString();
    const filename = `${reportType}_report_${robotId}_${reportTimestamp.replace(/[:.]/g, '-')}.txt`;
    const filePath = path.join(reportsDir, filename);

    // レポート内容を生成
    let reportContent = '';
    reportContent += '='.repeat(80) + '\n';
    
    if (isCritical) {
      reportContent += '🚨 CRITICAL レポート - 緊急停止要請\n';
      reportContent += '⚠️  IMMEDIATE ACTION REQUIRED ⚠️\n';
    } else {
      reportContent += '🚨 緊急レポート - ロボット異常検知\n';
    }
    
    reportContent += '='.repeat(80) + '\n\n';
    
    reportContent += `ロボットID: ${robotId}\n`;
    reportContent += `レポート生成時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n`;
    reportContent += `ISO時刻: ${new Date().toISOString()}\n`;
    reportContent += `状況レベル: ${criticalStatus || 'warning'}\n\n`;
    
    // Critical状況の場合はエラー詳細を追加
    if (isCritical && errorDetails) {
      reportContent += '-'.repeat(60) + '\n';
      reportContent += '🚨 CRITICAL エラー詳細\n';
      reportContent += '-'.repeat(60) + '\n\n';
      
      if (errorDetails.consecutiveDangerCount) {
        reportContent += `連続危険検知回数: ${errorDetails.consecutiveDangerCount}回\n`;
      }
      if (errorDetails.dangerousParts) {
        reportContent += `危険部位数: ${errorDetails.dangerousParts.length}個\n`;
        errorDetails.dangerousParts.forEach((part, index) => {
          reportContent += `  ${index + 1}. ${part.name}: ${part.reason}\n`;
        });
      }
      if (errorDetails.temperatureSpikes) {
        reportContent += `温度スパイク履歴: ${errorDetails.temperatureSpikes.length}件\n`;
        errorDetails.temperatureSpikes.slice(-5).forEach((spike, index) => {
          reportContent += `  ${index + 1}. ${spike.partName}: ${spike.temperature}°C (${spike.containerTime})\n`;
        });
      }
      if (errorDetails.alertHistory) {
        reportContent += `アラート履歴: ${errorDetails.alertHistory.length}件\n`;
        errorDetails.alertHistory.slice(-3).forEach((alert, index) => {
          reportContent += `  ${index + 1}. ${alert.message} (${alert.timestamp})\n`;
        });
      }
      reportContent += '\n';
    }
    
    reportContent += '-'.repeat(60) + '\n';
    reportContent += '📋 異常検知部位一覧\n';
    reportContent += '-'.repeat(60) + '\n\n';
    
    parts.forEach((part, index) => {
      const statusIcon = part.status === 'critical' ? '🚨' : 
                        part.status === 'warning' ? '⚠️' : '✅';
      
      reportContent += `${index + 1}. ${statusIcon} ${part.name}\n`;
      reportContent += `   状態: ${part.status}\n`;
      reportContent += `   温度: ${part.temperature.toFixed(1)}°C\n`;
      reportContent += `   振動: ${part.vibration.toFixed(3)}\n`;
      if (part.humidity) {
        reportContent += `   湿度: ${part.humidity.toFixed(1)}%\n`;
      }
      if (part.operatingHours) {
        reportContent += `   運転時間: ${part.operatingHours}時間\n`;
      }
      if (part.issues && part.issues.length > 0) {
        reportContent += `   問題: ${part.issues.join(', ')}\n`;
      }
      if (part.aiAnalysis) {
        reportContent += `   AI分析: ${part.aiAnalysis.summary}\n`;
      }
      reportContent += '\n';
    });
    
    reportContent += '-'.repeat(60) + '\n';
    reportContent += '⚠️ 推奨対応\n';
    reportContent += '-'.repeat(60) + '\n\n';
    
    if (isCritical) {
      reportContent += '🚨 CRITICAL 対応手順:\n';
      reportContent += '1. 即座にロボットの緊急停止を実行してください\n';
      reportContent += '2. 工場責任者に緊急連絡してください\n';
      reportContent += '3. 安全エリアから全員を避難させてください\n';
      reportContent += '4. メンテナンスチームに緊急対応を要請してください\n';
      reportContent += '5. 詳細な点検と修理を実施してください\n';
      reportContent += '6. 再開前に完全な安全確認を完了してください\n\n';
    } else {
      reportContent += '1. 即座にロボットの運転を停止してください\n';
      reportContent += '2. 安全確認を実施してください\n';
      reportContent += '3. メンテナンスチームに連絡してください\n';
      reportContent += '4. 詳細な点検を実施してください\n';
      reportContent += '5. 再開前に安全確認を完了してください\n\n';
    }
    
    reportContent += '='.repeat(80) + '\n';
    reportContent += isCritical ? 'End of CRITICAL Report' : 'End of Emergency Report';
    reportContent += '\n';
    reportContent += '='.repeat(80) + '\n';

    // ファイルに書き込み
    fs.writeFileSync(filePath, reportContent, 'utf8');

    res.status(200).json({
      success: true,
      message: isCritical ? 'CRITICAL レポートが正常に生成されました' : 'レポートが正常に生成されました',
      filename: filename,
      filePath: filePath,
      isCritical: isCritical
    });

  } catch (error) {
    console.error('レポート生成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'レポートの生成に失敗しました'
    });
  }
}
