// API endpoint for robot parts data with AI agent analysis
import RobotDiagnosticAI from '../../../lib/aiAgent';
import { getFactoryManagerNotification } from '../../../lib/factoryManagerNotification';

export default function handler(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Robot ID is required' });
  }

  // ロボット部位の定義
  const robotParts = [
    { id: 'head', name: '頭部' },
    { id: 'left_arm', name: '左腕' },
    { id: 'right_arm', name: '右腕' },
    { id: 'torso', name: '胴体' },
    { id: 'left_leg', name: '左脚' },
    { id: 'right_leg', name: '右脚' },
    { id: 'base', name: 'ベース' }
  ];

  // Dockerコンテナの現在時刻を取得
  const containerTime = new Date();
  const containerTimestamp = containerTime.toISOString();
  
  // AIエージェントと工場責任者通知システムを初期化
  const aiAgent = new RobotDiagnosticAI();
  const factoryNotification = getFactoryManagerNotification();
  
  // ロボットIDに基づくシード値生成
  const seed = Array.from(id).reduce((s, c) => s + c.charCodeAt(0), 0);
  const timeSeed = Math.floor(Date.now() / 3000); // 3秒ごとに更新（より頻繁に）
  const combinedSeed = (seed + timeSeed) % 1000;

  // 温度スパイク履歴を保存するためのグローバル変数（実際の実装ではDBを使用）
  if (!global.temperatureHistory) {
    global.temperatureHistory = {};
  }
  if (!global.temperatureHistory[id]) {
    global.temperatureHistory[id] = [];
  }

  // アラート履歴を保存するためのグローバル変数
  if (!global.alertHistory) {
    global.alertHistory = {};
  }
  if (!global.alertHistory[id]) {
    global.alertHistory[id] = [];
  }

  // 危険状況の連続検知履歴を保存するためのグローバル変数
  if (!global.dangerHistory) {
    global.dangerHistory = {};
  }
  if (!global.dangerHistory[id]) {
    global.dangerHistory[id] = [];
  }

  // 各部位の状態を生成
  const parts = robotParts.map((part, index) => {
    const partSeed = (combinedSeed + index * 137) % 1000;
    
    // 温度と振動の基本値
    const tempBase = 35 + (partSeed % 20); // 35-55°C
    const vibrationBase = 0.1 + ((partSeed % 30) / 200); // 0.1-0.25
    
    // 湿度データ生成（ショートリスク要因）
    const humidityBase = 40 + (partSeed % 30); // 40-70%
    const humiditySpike = (partSeed % 15) === 0; // 湿度スパイク
    const humidity = humidityBase + (humiditySpike ? 25 : 0);
    
    // 運転時間データ生成（疲労要因）- 1-48時間の範囲に修正
    const operatingHours = 1 + (partSeed % 48); // 1-48時間の範囲
    
    // 時々スパイクを発生（より頻繁に）
    const spike = (partSeed % 23) === 0; // より頻繁にスパイク
    const temperature = tempBase + (spike ? 15 : 0);
    const vibration = vibrationBase + (spike ? 0.2 : 0);
    
    // 温度スパイクをログに記録
    if (spike && temperature > 50) {
      const spikeLog = {
        timestamp: containerTimestamp,
        partId: part.id,
        partName: part.name,
        temperature: temperature,
        spikeAmount: 15,
        containerTime: containerTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        dockerTime: containerTime.toISOString()
      };
      
      global.temperatureHistory[id].push(spikeLog);
      
      // 最新100件まで保持
      if (global.temperatureHistory[id].length > 100) {
        global.temperatureHistory[id] = global.temperatureHistory[id].slice(-100);
      }
    }
    
    // 危険状況の判定（3つの危険要因）
    const isDangerous = temperature > 60 || vibration > 0.4 || humidity > 80;
    const dangerLevel = isDangerous ? 'critical' : (temperature > 50 || vibration > 0.3 || humidity > 70) ? 'warning' : 'normal';
    
    // 危険状況の履歴に記録
    if (isDangerous) {
      const dangerLog = {
        timestamp: containerTimestamp,
        partId: part.id,
        partName: part.name,
        temperature,
        vibration,
        humidity,
        operatingHours,
        dangerLevel,
        containerTime: containerTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        dockerTime: containerTime.toISOString()
      };
      
      global.dangerHistory[id].push(dangerLog);
      
      // 最新50件まで保持
      if (global.dangerHistory[id].length > 50) {
        global.dangerHistory[id] = global.dangerHistory[id].slice(-50);
      }
    }
    
    // 連続危険状況のチェック（過去3回のチェックで危険状況が続いている場合）
    const recentDangerCount = global.dangerHistory[id]
      .filter(log => {
        const logTime = new Date(log.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - logTime.getTime();
        return timeDiff < 15000; // 過去15秒以内
      })
      .length;
    
    const consecutiveDangerAlert = recentDangerCount >= 3;
    
    // 状態判定（多要素考慮 + 連続危険状況）
    let status = 'normal';
    let issues = [];
    let alertGenerated = false;
    
    if (consecutiveDangerAlert) {
      status = 'emergency';
      issues.push('🚨 EMERGENCY: 連続危険状況検知 - 工場責任者による停止が必要');
      alertGenerated = true;
    } else if (temperature > 60 || vibration > 0.4 || humidity > 80 || operatingHours > 40) {
      status = 'critical';
      if (temperature > 60) issues.push('High temperature detected');
      if (vibration > 0.4) issues.push('Excessive vibration');
      if (humidity > 80) issues.push('High humidity - Short circuit risk');
      if (operatingHours > 40) issues.push('Material fatigue - High operating hours');
      alertGenerated = true;
    } else if (temperature > 50 || vibration > 0.3 || humidity > 70 || operatingHours > 30) {
      status = 'warning';
      if (temperature > 50) issues.push('Temperature rising');
      if (vibration > 0.3) issues.push('Increased vibration');
      if (humidity > 70) issues.push('Humidity rising - Condensation risk');
      if (operatingHours > 30) issues.push('Mechanical wear - Long operating hours');
      alertGenerated = true;
    }
    
    // 部位固有の問題を追加
    if (part.id === 'left_arm' && (partSeed % 23) === 0) {
      status = 'warning';
      issues.push('Joint lubrication needed');
      alertGenerated = true;
    }
    
    if (part.id === 'torso' && (partSeed % 31) === 0) {
      status = 'critical';
      issues.push('Cooling system malfunction');
      alertGenerated = true;
    }
    
    if (part.id === 'base' && (partSeed % 19) === 0) {
      status = 'warning';
      issues.push('Base alignment check required');
      alertGenerated = true;
    }

    // アラートを生成
    if (alertGenerated) {
      const alert = {
        id: `${part.id}_${Date.now()}`,
        timestamp: containerTimestamp,
        partId: part.id,
        partName: part.name,
        status: status,
        temperature: temperature,
        vibration: vibration,
        issues: issues,
        containerTime: containerTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        dockerTime: containerTime.toISOString(),
        message: `[UDP ALERT] ${part.name}: ${status.toUpperCase()} - ${issues.join(', ')}`
      };
      
      global.alertHistory[id].push(alert);
      
      // 最新50件まで保持
      if (global.alertHistory[id].length > 50) {
        global.alertHistory[id] = global.alertHistory[id].slice(-50);
      }
    }

    // AIエージェントによる分析
    const partData = {
      partId: part.id,
      partName: part.name,
      temperature,
      vibration,
      humidity,
      operatingHours,
      status
    };
    
    const aiAnalysis = aiAgent.generateComprehensiveAnalysis(partData);

    // 緊急状況の場合は工場責任者に通知
    if (status === 'emergency') {
      const dangerDetails = [{
        partId: part.id,
        partName: part.name,
        temperature,
        vibration,
        humidity,
        operatingHours,
        dangerLevel: 'critical',
        containerTime: containerTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        dockerTime: containerTime.toISOString()
      }];
      
      factoryNotification.sendEmergencyNotification(id, dangerDetails);
    }

    return {
      id: part.id,
      name: part.name,
      status,
      temperature,
      vibration,
      humidity,
      operatingHours,
      lastUpdate: containerTimestamp,
      issues,
      containerTime: containerTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      dockerTime: containerTime.toISOString(),
      // AI分析結果
      aiAnalysis: {
        overallSeverity: aiAnalysis.overallSeverity,
        temperatureAnalysis: aiAnalysis.temperatureAnalysis,
        vibrationAnalysis: aiAnalysis.vibrationAnalysis,
        humidityAnalysis: aiAnalysis.humidityAnalysis,
        fatigueAnalysis: aiAnalysis.fatigueAnalysis,
        aiRecommendations: aiAnalysis.aiRecommendations,
        aiSummary: aiAnalysis.aiSummary,
        confidence: aiAnalysis.confidence
      }
    };
  });

  // 全体ステータス計算
  const criticalCount = parts.filter(p => p.status === 'critical').length;
  const warningCount = parts.filter(p => p.status === 'warning').length;
  
  let overallStatus = 'normal';
  if (criticalCount > 0) {
    overallStatus = 'critical';
  } else if (warningCount > 0) {
    overallStatus = 'warning';
  }

  // レスポンス
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    robotId: id,
    robotName: `Robot ${id}`,
    overallStatus,
    parts,
    lastCheck: containerTimestamp,
    containerTime: containerTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    dockerTime: containerTime.toISOString(),
    statistics: {
      totalParts: parts.length,
      normal: parts.filter(p => p.status === 'normal').length,
      warning: warningCount,
      critical: criticalCount
    },
    // アラート機構の可視化
    alertMechanism: {
      active: true,
      frequency: '3 seconds',
      lastCheck: containerTimestamp,
      totalAlerts: global.alertHistory[id]?.length || 0,
      recentAlerts: global.alertHistory[id]?.slice(-5) || []
    },
    // 温度履歴
    temperatureHistory: global.temperatureHistory[id]?.slice(-10) || [],
    // AIエージェント総合分析
    aiAgentAnalysis: {
      agentName: aiAgent.name,
      agentVersion: aiAgent.version,
      capabilities: aiAgent.capabilities,
      overallRecommendations: aiAgent.generateMaintenanceRecommendations({ parts }),
      analysisTimestamp: containerTimestamp,
      totalPartsAnalyzed: parts.length,
      criticalPartsCount: criticalCount,
      warningPartsCount: warningCount
    }
  });
}
