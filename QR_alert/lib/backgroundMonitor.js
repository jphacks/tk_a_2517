// サーバーサイドでのみfsとpathを読み込み
let fs, path;
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  fs = require('fs');
  path = require('path');
}

import RobotDiagnosticAI from './aiAgent';

// バックグラウンド監視システム
class BackgroundMonitor {
  constructor() {
    this.isRunning = false;
    this.monitoringInterval = null;
    this.aiAgent = new RobotDiagnosticAI();
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.lastReportTimes = {}; // 重複レポート防止用
    // 部位ごとの履歴バッファ（各ロボットID -> partId -> [{temperature,vibration,humidity,operatingHours,timestamp}, ...]）
    this.historyBuffer = {};
    
    // reportsディレクトリが存在しない場合は作成
    if (fs && !fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // 監視開始
  startMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🏭 工場監視システム: バックグラウンド監視を開始しました');
    // 起動時に reports フォルダを完全削除して古いファイル/プロセス遺留をクリア
    try {
      if (fs && fs.existsSync(this.reportsDir)) {
        const entries = fs.readdirSync(this.reportsDir);
        entries.forEach(entry => {
          const full = path.join(this.reportsDir, entry);
          try {
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
              // ディレクトリは再帰削除
              fs.rmdirSync(full, { recursive: true });
            } else {
              fs.unlinkSync(full);
            }
          } catch (e) {
            console.error('reports フォルダ内ファイル削除中にエラー:', e);
          }
        });
        console.log('🧹 reports ディレクトリをクリーンアップしました');
      }
    } catch (err) {
      console.error('reports ディレクトリのクリーンアップに失敗:', err);
    }
    
    // 5秒ごとに監視（工場環境での実用的な間隔）
    this.monitoringInterval = setInterval(() => {
      this.checkAllRobots();
    }, 5000);
  }

  // 監視停止
  stopMonitoring() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('🏭 工場監視システム: バックグラウンド監視を停止しました');
  }

  // 全ロボットの状態をチェック
  async checkAllRobots() {
    const robotIds = ['ROBOT_001', 'ROBOT_002', 'ROBOT_003'];
    
    for (const robotId of robotIds) {
      try {
        await this.checkRobotStatus(robotId);
      } catch (error) {
        console.error(`ロボット ${robotId} の監視エラー:`, error);
      }
    }
  }

  // 個別ロボットの状態チェック
  async checkRobotStatus(robotId) {
    try {
      // ロボットデータを取得（実際の実装ではAPIを呼び出し）
      const robotData = await this.getRobotData(robotId);
      
      if (!robotData || !robotData.parts) return;

      // Critical状況の検知
      const criticalParts = robotData.parts.filter(part => 
        part.status === 'critical' || part.status === 'emergency'
      );
      
      const warningParts = robotData.parts.filter(part => 
        part.temperature > 50 || part.status === 'warning'
      );

      console.log(`🔍 ${robotId} チェック: ${criticalParts.length}個のCritical部位、${warningParts.length}個の異常部位を検知`);

      // Critical状況の場合は即座にレポート生成
      if (criticalParts.length > 0) {
        console.log(`🚨 ${robotId} でCRITICAL状況検知! 緊急レポート生成開始...`);
        await this.generateCriticalReport(robotId, robotData, criticalParts);
      }
      // 警告レベルの場合は通常のレポート生成
      else if (warningParts.length > 0) {
        console.log(`🚨 ${robotId} で異常検知! レポート生成開始...`);
        await this.generateEmergencyReport(robotId, robotData, warningParts);
      }

    } catch (error) {
      console.error(`ロボット ${robotId} のデータ取得エラー:`, error);
    }
  }

  // ロボットデータを取得（シミュレーション）
  async getRobotData(robotId) {
    // 実際の実装では、ここでAPIを呼び出してロボットデータを取得
    // 今回はシミュレーションデータを生成
    
    const robotParts = [
      { id: 'head', name: '頭部' },
      { id: 'left_arm', name: '左腕' },
      { id: 'right_arm', name: '右腕' },
      { id: 'torso', name: '胴体' },
      { id: 'left_leg', name: '左脚' },
      { id: 'right_leg', name: '右脚' },
      { id: 'base', name: 'ベース' }
    ];

    const parts = robotParts.map((part, index) => {
      const seed = Math.random() * 1000;
      const tempBase = 35 + (seed % 20);
      const spike = (seed % 10) === 0; // さらに頻繁にスパイク（テスト用）
      const temperature = tempBase + (spike ? 20 : 0);
      const vibration = 0.1 + ((seed % 30) / 200);
      const humidity = 40 + (seed % 30);
      const operatingHours = 1 + (seed % 48); // 1-48時間の範囲
      
      let status = 'normal';
      if (temperature > 60 || vibration > 0.4 || humidity > 80 || operatingHours > 40) {
        status = 'critical';
      } else if (temperature > 50 || vibration > 0.3 || humidity > 70 || operatingHours > 30) {
        status = 'warning';
      }

      return {
        id: part.id,
        name: part.name,
        temperature,
        vibration,
        humidity,
        operatingHours,
        status,
        lastUpdate: new Date().toISOString()
      };
    });

    // 履歴バッファに追加
    if (!this.historyBuffer[robotId]) this.historyBuffer[robotId] = {};
    parts.forEach(p => {
      if (!this.historyBuffer[robotId][p.id]) this.historyBuffer[robotId][p.id] = [];
      this.historyBuffer[robotId][p.id].push({
        temperature: p.temperature,
        vibration: p.vibration,
        humidity: p.humidity,
        operatingHours: p.operatingHours,
        timestamp: p.lastUpdate
      });
      // 直近の履歴のみ保持（最大10件）
      if (this.historyBuffer[robotId][p.id].length > 10) {
        this.historyBuffer[robotId][p.id] = this.historyBuffer[robotId][p.id].slice(-10);
      }
    });
    return {
      robotId,
      robotName: `Robot ${robotId}`,
      parts,
      lastCheck: new Date().toISOString()
    };
  }

  // 緊急レポート生成
  async generateEmergencyReport(robotId, robotData, criticalParts) {
  // レポート生成時刻を日本時間基準で扱う
  const now = new Date();
  const jpOptions = { timeZone: 'Asia/Tokyo' };
  const timestamp = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const reportKey = `${robotId}_${timestamp.toISOString().split('T')[0]}`;
    
    // 同じ日のレポートが既に生成されている場合はスキップ
    if (this.lastReportTimes[reportKey]) {
      const lastTime = new Date(this.lastReportTimes[reportKey]);
      const timeDiff = timestamp.getTime() - lastTime.getTime();
      if (timeDiff < 300000) { // 5分以内はスキップ
        return;
      }
    }

    const isCritical = criticalParts.some(part => 
      part.status === 'critical' || part.status === 'emergency'
    );
    
    if (isCritical) {
      console.log(`🚨 CRITICAL レポート生成: ${robotId} - ${criticalParts.length}個の部位でCRITICAL状況検知`);
    } else {
      console.log(`🚨 緊急レポート生成: ${robotId} - ${criticalParts.length}個の部位で異常検知`);
    }

    // AI分析を実行
    const aiAnalysis = await this.performAIAnalysis(robotData, criticalParts);
    
    // レポートファイル名を生成
    const reportType = isCritical ? 'CRITICAL' : 'emergency';
  // ファイル名はタイムスタンプを日本時間に整形して使用
  const isoForFilename = timestamp.toISOString().replace(/[:.]/g, '-');
  const filename = `${reportType}_report_${robotId}_${isoForFilename}.txt`;
    const filePath = path.join(this.reportsDir, filename);
    
    // レポート内容を生成
    const reportContent = this.generateReportContent(robotData, criticalParts, aiAnalysis, timestamp, isCritical);
    
    // ファイルに書き込み
    try {
      if (fs) {
        fs.writeFileSync(filePath, reportContent, 'utf8');
        console.log(`✅ ファイル書き込み成功: ${filePath}`);
      } else {
        console.error('❌ fsモジュールが利用できません');
        return;
      }
    } catch (writeError) {
      console.error(`❌ ファイル書き込みエラー:`, writeError);
      return;
    }
    
    // 重複防止用のタイムスタンプを更新
    this.lastReportTimes[reportKey] = timestamp.toISOString();
    
    console.log(`📄 緊急レポート生成完了: ${filename}`);
    
    // ログファイルにも記録
    await this.logToSystemLog(robotId, criticalParts, filename, isCritical);
  }

  // AI分析実行
  async performAIAnalysis(robotData, criticalParts) {
    const analysisResults = [];
    
    for (const part of criticalParts) {
      const partData = {
        partId: part.id,
        partName: part.name,
        temperature: part.temperature,
        vibration: part.vibration,
        status: part.status
      };
      // 履歴データを取得してAIへ渡す（なければ空配列）
      const historicalData = (this.historyBuffer?.[robotData.robotId]?.[part.id]) || [];
      const analysis = this.aiAgent.generateComprehensiveAnalysis(partData, historicalData);
      analysisResults.push(analysis);
    }
    
    return analysisResults;
  }

  // レポート内容生成
  generateReportContent(robotData, criticalParts, aiAnalysis, timestamp, isCritical = false) {
  // レポート内で表示する時刻は常に日本時間
  const containerTime = timestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const isoTime = timestamp.toISOString();
    
    let content = '';
    content += '='.repeat(80) + '\n';
    
    if (isCritical) {
      content += '🚨 CRITICAL レポート - 緊急停止要請\n';
      content += '⚠️  IMMEDIATE ACTION REQUIRED ⚠️\n';
    } else {
      content += '🚨 工場自動監視システム - 緊急レポート\n';
    }
    
    content += '='.repeat(80) + '\n\n';
    
    content += `ロボットID: ${robotData.robotId}\n`;
    content += `ロボット名: ${robotData.robotName}\n`;
    content += `レポート生成時刻: ${containerTime}\n`;
    content += `ISO時刻: ${isoTime}\n`;
    content += `状況レベル: ${isCritical ? 'CRITICAL' : 'warning'}\n`;
    content += `異常検知部位数: ${criticalParts.length}\n\n`;
    
    // Critical状況の場合はエラー詳細を追加
    if (isCritical) {
      content += '-'.repeat(60) + '\n';
      content += '🚨 CRITICAL エラー詳細\n';
      content += '-'.repeat(60) + '\n\n';
      
      const errorDetails = {
        consecutiveDangerCount: criticalParts.length,
        dangerousParts: criticalParts.map(part => ({
          name: part.name,
          reason: `温度: ${part.temperature.toFixed(1)}°C, 振動: ${part.vibration.toFixed(3)}, 状態: ${part.status}`
        })),
        temperatureSpikes: global.temperatureHistory?.[robotData.robotId] || [],
        alertHistory: global.alertHistory?.[robotData.robotId] || []
      };
      
      content += `連続危険検知回数: ${errorDetails.consecutiveDangerCount}回\n`;
      content += `危険部位数: ${errorDetails.dangerousParts.length}個\n`;
      errorDetails.dangerousParts.forEach((part, index) => {
        content += `  ${index + 1}. ${part.name}: ${part.reason}\n`;
      });
      
      if (errorDetails.temperatureSpikes.length > 0) {
        content += `\n温度スパイク履歴: ${errorDetails.temperatureSpikes.length}件\n`;
        errorDetails.temperatureSpikes.slice(-5).forEach((spike, index) => {
          content += `  ${index + 1}. ${spike.partName}: ${spike.temperature}°C (${spike.containerTime})\n`;
        });
      }
      
      if (errorDetails.alertHistory.length > 0) {
        content += `\nアラート履歴: ${errorDetails.alertHistory.length}件\n`;
        errorDetails.alertHistory.slice(-3).forEach((alert, index) => {
          content += `  ${index + 1}. ${alert.message} (${alert.timestamp})\n`;
        });
      }
      
      content += '\n';
    }
    
    content += '-'.repeat(60) + '\n';
    content += '🔥 異常検知部位詳細\n';
    content += '-'.repeat(60) + '\n\n';
    
    criticalParts.forEach((part, index) => {
      const analysis = aiAnalysis[index];
      content += `${index + 1}. ${part.name}\n`;
      content += `   温度: ${part.temperature.toFixed(1)}°C\n`;
      content += `   振動: ${part.vibration.toFixed(3)}\n`;
      content += `   状態: ${part.status.toUpperCase()}\n`;
      content += `   AI分析: ${analysis.aiSummary}\n`;
      content += `   信頼度: ${(analysis.confidence * 100).toFixed(1)}%\n`;
      content += `   推奨事項:\n`;
      analysis.aiRecommendations.forEach(rec => {
        content += `     - ${rec}\n`;
      });
      content += '\n';
    });
    
    content += '-'.repeat(60) + '\n';
    content += '🤖 AIエージェント総合分析\n';
    content += '-'.repeat(60) + '\n\n';
    
    content += `エージェント名: ${this.aiAgent.name}\n`;
    content += `バージョン: ${this.aiAgent.version}\n`;
    content += `分析時刻: ${isoTime}\n`;
    content += `分析部位数: ${criticalParts.length}\n\n`;
    
    // 総合推奨事項
    const overallRecommendations = this.aiAgent.generateMaintenanceRecommendations({ parts: criticalParts });
    content += '総合推奨事項:\n';
    overallRecommendations.forEach(rec => {
      content += `- ${rec}\n`;
    });
    content += '\n';
    
    content += '-'.repeat(60) + '\n';
    content += isCritical ? '🚨 CRITICAL 対応手順' : '⚠️ 推奨対応';
    content += '\n';
    content += '-'.repeat(60) + '\n\n';
    
    if (isCritical) {
      content += '1. 即座にロボットの緊急停止を実行してください\n';
      content += '2. 工場責任者に緊急連絡してください\n';
      content += '3. 安全エリアから全員を避難させてください\n';
      content += '4. メンテナンスチームに緊急対応を要請してください\n';
      content += '5. 詳細な点検と修理を実施してください\n';
      content += '6. 再開前に完全な安全確認を完了してください\n\n';
    } else {
      content += '1. 即座にロボットの運転を停止してください\n';
      content += '2. 安全確認を実施してください\n';
      content += '3. メンテナンスチームに連絡してください\n';
      content += '4. 詳細な点検を実施してください\n';
      content += '5. 再開前に安全確認を完了してください\n\n';
    }
    
    content += '-'.repeat(60) + '\n';
    content += '📊 工場監視システム情報\n';
    content += '-'.repeat(60) + '\n\n';
    
    content += `監視システム: バックグラウンド自動監視\n`;
    content += `監視間隔: 5秒\n`;
    content += `レポート生成: 自動（温度上昇検知時）\n`;
    content += `QRコード読み取り: 不要（自動監視）\n`;
    content += `工場環境: 本番稼働中\n\n`;
    
    content += '='.repeat(80) + '\n';
    content += isCritical ? 'End of CRITICAL Report' : 'End of Emergency Report';
    content += '\n';
    content += '='.repeat(80) + '\n';
    
    return content;
  }

  // システムログに記録
  async logToSystemLog(robotId, criticalParts, filename, isCritical = false) {
    if (!fs) return;
    
    const logPath = path.join(this.reportsDir, 'system_monitor.log');
    const timestamp = new Date().toISOString();
    const logType = isCritical ? 'CRITICAL' : 'EMERGENCY';
    const logEntry = `[${timestamp}] ${logType}: ${robotId} - ${criticalParts.length} critical parts - Report: ${filename}\n`;
    
    try {
      fs.appendFileSync(logPath, logEntry, 'utf8');
    } catch (error) {
      console.error('システムログ書き込みエラー:', error);
    }
  }

  // 監視状態を取得
  getStatus() {
    return {
      isRunning: this.isRunning,
      monitoringInterval: this.monitoringInterval ? '5 seconds' : 'stopped',
      reportsGenerated: Object.keys(this.lastReportTimes).length,
      lastReportTimes: this.lastReportTimes
    };
  }
}

// グローバルインスタンス
let backgroundMonitor = null;

export function getBackgroundMonitor() {
  if (!backgroundMonitor) {
    backgroundMonitor = new BackgroundMonitor();
  }
  return backgroundMonitor;
}

export default BackgroundMonitor;
