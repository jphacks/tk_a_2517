// AIエージェント設定を読み込み（サーバーサイドのみ）
let aiConfig = null;

// サーバーサイドでのみ設定を読み込み
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const aiConfigPath = path.join(process.cwd(), 'data', 'ai_agent_config.json');
    aiConfig = JSON.parse(fs.readFileSync(aiConfigPath, 'utf8'));
  } catch (error) {
    console.error('AI設定読み込みエラー:', error);
    // フォールバック設定
    aiConfig = {
      aiAgent: {
        name: 'RobotDiagnosticAI',
        version: '1.0.0',
        capabilities: ['temperature_analysis', 'vibration_analysis']
      },
      temperatureAnalysis: {
        patterns: {
          gradual_increase: {
            description: '徐々に温度が上昇するパターン',
            causes: ['冷却システムの効率低下', '潤滑油の劣化', '部品の摩耗進行', '環境温度の上昇'],
            recommendations: ['冷却システムの点検', '潤滑油の交換', '部品の定期メンテナンス']
          },
          sudden_spike: {
            description: '急激な温度スパイク',
            causes: ['冷却ファンの故障', '潤滑油の不足', '異物の混入', '電気的ショート', '過負荷運転'],
            recommendations: ['即座の運転停止', '緊急点検の実施', '冷却システムの緊急修理']
          },
          intermittent_high: {
            description: '間欠的な高温',
            causes: ['サーモスタットの故障', '冷却回路の部分的閉塞', '負荷変動', 'センサーの誤動作'],
            recommendations: ['サーモスタットの交換', '冷却回路の清掃', 'センサーの校正']
          }
        }
      },
      humidityAnalysis: {
        patterns: {
          high_humidity: {
            description: '高湿度によるショートリスク',
            causes: ['湿度センサーの異常', '密閉性の低下', '結露の発生', '電気回路の湿気侵入'],
            recommendations: ['湿度制御システムの点検', '密閉性の確認', '除湿装置の作動確認']
          },
          condensation: {
            description: '結露による故障リスク',
            causes: ['温度差による結露', '湿度制御の不備', '換気システムの故障'],
            recommendations: ['温度差の調整', '換気システムの点検', '除湿装置の増強']
          }
        }
      },
      fatigueAnalysis: {
        patterns: {
          material_fatigue: {
            description: '材料疲労による故障',
            causes: ['長期運転による疲労', '繰り返し応力', '材料の劣化', '設計寿命の超過'],
            recommendations: ['部品の交換', '運転時間の調整', '予防保全の実施']
          },
          mechanical_wear: {
            description: '機械的摩耗',
            causes: ['ベアリングの摩耗', 'ギアの損傷', 'シールの劣化', 'アライメント不良'],
            recommendations: ['ベアリングの交換', 'ギアの点検', 'アライメント調整']
          }
        }
      },
      aiResponses: {
        temperature_spike_analysis: [
          '温度スパイクが検出されました。冷却システムの効率が低下している可能性があります。',
          '急激な温度上昇は、潤滑油の不足または冷却ファンの故障を示唆しています。',
          'この温度パターンは、部品の過負荷運転または異物混入を示しています。',
          '温度センサーの異常値は、電気的ショートまたはサーモスタット故障の可能性があります。'
        ],
        humidity_analysis: [
          '高湿度が検出されました。ショートリスクが高まっています。',
          '湿度上昇は、密閉性の低下または除湿システムの故障を示唆しています。',
          '結露の発生により、電気回路の故障リスクが増大しています。',
          '湿度制御システムの点検が必要です。'
        ],
        fatigue_analysis: [
          '材料疲労が進行しています。部品の交換時期が近づいています。',
          '長期運転による摩耗が検出されました。予防保全を実施してください。',
          '繰り返し応力により、部品の寿命が短縮されています。',
          '設計寿命を超過した部品の交換を推奨します。'
        ],
        vibration_analysis: [
          '振動レベルの上昇は、ベアリングの摩耗またはアライメント不良を示しています。',
          '高周波振動は、ギアの損傷またはバランスの崩れを示唆しています。',
          '低周波振動は、基盤の緩みまたは構造的な問題を示しています。'
        ],
        maintenance_recommendations: [
          '定期メンテナンスの実施を推奨します。特に冷却システムと潤滑システムの点検が必要です。',
          '予防保全として、ベアリングとギアの交換を計画してください。',
          '運転パラメータの調整により、負荷を軽減できます。',
          'センサーの校正とキャリブレーションを実施してください。'
        ],
        emergency_responses: [
          '緊急停止を推奨します。安全確認後に詳細点検を実施してください。'
        ]
      }
    };
  }
}

export class RobotDiagnosticAI {
  constructor() {
    // 設定が読み込まれていない場合はフォールバックを使用
    if (!aiConfig) {
      this.name = 'RobotDiagnosticAI';
      this.version = '1.0.0';
      this.capabilities = ['temperature_analysis', 'vibration_analysis'];
      // デフォルト閾値と平滑化幅
      this.smoothingWindow = 5;
      this.thresholds = {
        temperature: { critical: 60, warning: 50, low: 45 },
        vibration: { critical: 0.4, warning: 0.3 },
        humidity: { critical: 80, warning: 70 },
        operatingHours: { critical: 10000, warning: 5000 }
      };
      return;
    }
    
    this.name = aiConfig.aiAgent.name;
    this.version = aiConfig.aiAgent.version;
    this.capabilities = aiConfig.aiAgent.capabilities;
    // 平滑化ウィンドウ（履歴のサンプル数）と閾値を設定（設定ファイルにあれば上書き）
    this.smoothingWindow = aiConfig?.smoothingWindow || 5;
    this.thresholds = aiConfig?.thresholds || {
      temperature: { critical: 60, warning: 50, low: 45 },
      vibration: { critical: 0.4, warning: 0.3 },
      humidity: { critical: 80, warning: 70 },
      operatingHours: { critical: 10000, warning: 5000 }
    };
  }

  // 温度分析
  analyzeTemperature(partData, historicalData = []) {
    const { temperature, partId, partName } = partData;
    const partAnalysis = aiConfig?.partSpecificAnalysis?.[partId];
    
    let analysis = {
      pattern: 'normal',
      severity: 'low',
      causes: [],
      recommendations: [],
      aiResponse: '',
      confidence: 0.8
    };

    // 平滑化（履歴 + 現在値）を使ってノイズを低減
    const temps = (historicalData || []).map(h => Number(h.temperature)).filter(v => !isNaN(v));
    temps.push(Number(temperature));
    const window = Math.max(1, this.smoothingWindow);
    const recent = temps.slice(-window);
    const avgTemp = recent.reduce((a, b) => a + b, 0) / recent.length;
    analysis.avgTemperature = avgTemp;
    analysis.recentTemperatures = recent;

    // 温度パターン分析（平均値ベース）
    if (avgTemp > this.thresholds.temperature.critical) {
      analysis.pattern = 'sudden_spike';
      analysis.severity = 'critical';
      analysis.causes = partAnalysis?.temperature_causes || aiConfig?.temperatureAnalysis?.patterns?.sudden_spike?.causes || ['冷却システムの故障'];
      analysis.recommendations = aiConfig?.temperatureAnalysis?.patterns?.sudden_spike?.recommendations || ['緊急点検の実施'];
      analysis.aiResponse = this.generateAIResponse('temperature_spike_analysis', 'critical');
      analysis.confidence = 0.95;
    } else if (avgTemp > this.thresholds.temperature.warning) {
      analysis.pattern = 'gradual_increase';
      analysis.severity = 'warning';
      analysis.causes = partAnalysis?.temperature_causes || aiConfig?.temperatureAnalysis?.patterns?.gradual_increase?.causes || ['温度上昇'];
      analysis.recommendations = aiConfig?.temperatureAnalysis?.patterns?.gradual_increase?.recommendations || ['点検の実施'];
      analysis.aiResponse = this.generateAIResponse('temperature_spike_analysis', 'warning');
      analysis.confidence = 0.85;
    } else if (avgTemp > this.thresholds.temperature.low) {
      analysis.pattern = 'intermittent_high';
      analysis.severity = 'low';
      analysis.causes = partAnalysis?.temperature_causes || aiConfig?.temperatureAnalysis?.patterns?.intermittent_high?.causes || [];
      analysis.recommendations = aiConfig?.temperatureAnalysis?.patterns?.intermittent_high?.recommendations || [];
      analysis.aiResponse = this.generateAIResponse('temperature_spike_analysis', 'low');
      analysis.confidence = 0.75;
    }

    // 現在値が平均から大きく外れている場合は信頼度を若干下げる（突発値の影響を抑制）
    const diff = Math.abs(Number(temperature) - avgTemp);
    if (diff > 10) {
      analysis.confidence = Math.max(0.5, analysis.confidence - 0.15);
    } else if (diff > 5) {
      analysis.confidence = Math.max(0.6, analysis.confidence - 0.05);
    }

    return analysis;
  }

  // 振動分析
  analyzeVibration(partData, historicalData = []) {
    const { vibration, partId, partName } = partData;
    const partAnalysis = aiConfig.partSpecificAnalysis?.[partId];
    
    let analysis = {
      pattern: 'normal',
      severity: 'low',
      causes: [],
      recommendations: [],
      aiResponse: '',
      confidence: 0.8
    };

    // 平滑化
    const vibs = (historicalData || []).map(h => Number(h.vibration)).filter(v => !isNaN(v));
    vibs.push(Number(vibration));
    const vRecent = vibs.slice(-Math.max(1, this.smoothingWindow));
    const avgVib = vRecent.reduce((a, b) => a + b, 0) / vRecent.length;
    analysis.avgVibration = avgVib;
    analysis.recentVibrations = vRecent;

    if (avgVib > this.thresholds.vibration.critical) {
      analysis.pattern = 'high_frequency';
      analysis.severity = 'critical';
      analysis.causes = partAnalysis?.vibration_causes || aiConfig?.vibrationAnalysis?.patterns?.high_frequency?.causes || [];
      analysis.recommendations = aiConfig?.vibrationAnalysis?.patterns?.high_frequency?.recommendations || [];
      analysis.aiResponse = this.generateAIResponse('vibration_analysis', 'critical');
      analysis.confidence = 0.9;
    } else if (avgVib > this.thresholds.vibration.warning) {
      analysis.pattern = 'low_frequency';
      analysis.severity = 'warning';
      analysis.causes = partAnalysis?.vibration_causes || aiConfig?.vibrationAnalysis?.patterns?.low_frequency?.causes || [];
      analysis.recommendations = aiConfig?.vibrationAnalysis?.patterns?.low_frequency?.recommendations || [];
      analysis.aiResponse = this.generateAIResponse('vibration_analysis', 'warning');
      analysis.confidence = 0.8;
    }

    const vDiff = Math.abs(Number(vibration) - avgVib);
    if (vDiff > 0.2) {
      analysis.confidence = Math.max(0.5, analysis.confidence - 0.15);
    }

    return analysis;
  }

  // 湿度分析
  analyzeHumidity(partData, historicalData = []) {
    const { humidity = 0, partId, partName } = partData;
    
    let analysis = {
      pattern: 'normal',
      severity: 'low',
      causes: [],
      recommendations: [],
      aiResponse: '',
      confidence: 0.8
    };

    const hums = (historicalData || []).map(h => Number(h.humidity)).filter(v => !isNaN(v));
    hums.push(Number(humidity));
    const hRecent = hums.slice(-Math.max(1, this.smoothingWindow));
    const avgHum = hRecent.reduce((a, b) => a + b, 0) / hRecent.length;
    analysis.avgHumidity = avgHum;
    analysis.recentHumidities = hRecent;

    if (avgHum > this.thresholds.humidity.critical) {
      analysis.pattern = 'high_humidity';
      analysis.severity = 'critical';
      analysis.causes = aiConfig?.humidityAnalysis?.patterns?.high_humidity?.causes || ['湿度センサーの異常', '密閉性の低下'];
      analysis.recommendations = aiConfig?.humidityAnalysis?.patterns?.high_humidity?.recommendations || ['湿度制御システムの点検'];
      analysis.aiResponse = this.generateAIResponse('humidity_analysis', 'critical');
      analysis.confidence = 0.9;
    } else if (avgHum > this.thresholds.humidity.warning) {
      analysis.pattern = 'condensation';
      analysis.severity = 'warning';
      analysis.causes = aiConfig?.humidityAnalysis?.patterns?.condensation?.causes || ['温度差による結露'];
      analysis.recommendations = aiConfig?.humidityAnalysis?.patterns?.condensation?.recommendations || ['温度差の調整'];
      analysis.aiResponse = this.generateAIResponse('humidity_analysis', 'warning');
      analysis.confidence = 0.8;
    }

    const hDiff = Math.abs(Number(humidity) - avgHum);
    if (hDiff > 20) {
      analysis.confidence = Math.max(0.5, analysis.confidence - 0.15);
    }

    return analysis;
  }

  // 疲労分析
  analyzeFatigue(partData, historicalData = []) {
    const { operatingHours = 0, partId, partName } = partData;
    
    let analysis = {
      pattern: 'normal',
      severity: 'low',
      causes: [],
      recommendations: [],
      aiResponse: '',
      confidence: 0.8
    };

    const ops = (historicalData || []).map(h => Number(h.operatingHours)).filter(v => !isNaN(v));
    ops.push(Number(operatingHours));
    const oRecent = ops.slice(-Math.max(1, this.smoothingWindow));
    const avgOps = oRecent.reduce((a, b) => a + b, 0) / oRecent.length;
    analysis.avgOperatingHours = avgOps;
    analysis.recentOperatingHours = oRecent;

    if (avgOps > this.thresholds.operatingHours.critical) {
      analysis.pattern = 'material_fatigue';
      analysis.severity = 'critical';
      analysis.causes = aiConfig?.fatigueAnalysis?.patterns?.material_fatigue?.causes || ['長期運転による疲労', '材料の劣化'];
      analysis.recommendations = aiConfig?.fatigueAnalysis?.patterns?.material_fatigue?.recommendations || ['部品の交換'];
      analysis.aiResponse = this.generateAIResponse('fatigue_analysis', 'critical');
      analysis.confidence = 0.9;
    } else if (avgOps > this.thresholds.operatingHours.warning) {
      analysis.pattern = 'mechanical_wear';
      analysis.severity = 'warning';
      analysis.causes = aiConfig?.fatigueAnalysis?.patterns?.mechanical_wear?.causes || ['ベアリングの摩耗', 'ギアの損傷'];
      analysis.recommendations = aiConfig?.fatigueAnalysis?.patterns?.mechanical_wear?.recommendations || ['ベアリングの交換'];
      analysis.aiResponse = this.generateAIResponse('fatigue_analysis', 'warning');
      analysis.confidence = 0.8;
    }

    const oDiff = Math.abs(Number(operatingHours) - avgOps);
    if (oDiff > 1000) {
      analysis.confidence = Math.max(0.5, analysis.confidence - 0.15);
    }

    return analysis;
  }

  // 総合診断
  generateComprehensiveAnalysis(partData, historicalData = []) {
    const tempAnalysis = this.analyzeTemperature(partData, historicalData);
    const vibAnalysis = this.analyzeVibration(partData, historicalData);
    const humidityAnalysis = this.analyzeHumidity(partData, historicalData);
    const fatigueAnalysis = this.analyzeFatigue(partData, historicalData);
    
    const overallSeverity = this.determineOverallSeverity(
      tempAnalysis.severity, 
      vibAnalysis.severity, 
      humidityAnalysis.severity, 
      fatigueAnalysis.severity
    );
    
    return {
      partId: partData.partId,
      partName: partData.partName,
      timestamp: new Date().toISOString(),
      overallSeverity,
      temperatureAnalysis: tempAnalysis,
      vibrationAnalysis: vibAnalysis,
      humidityAnalysis: humidityAnalysis,
      fatigueAnalysis: fatigueAnalysis,
      aiRecommendations: this.generateRecommendations(tempAnalysis, vibAnalysis, humidityAnalysis, fatigueAnalysis),
      aiSummary: this.generateSummary(partData, tempAnalysis, vibAnalysis, humidityAnalysis, fatigueAnalysis),
      confidence: Math.min(tempAnalysis.confidence, vibAnalysis.confidence, humidityAnalysis.confidence, fatigueAnalysis.confidence)
    };
  }

  // AIレスポンス生成
  generateAIResponse(type, severity) {
    const responses = aiConfig?.aiResponses?.[type];
    if (!responses) return "分析結果を生成中です...";
    
    const randomIndex = Math.floor(Math.random() * responses.length);
    let response = responses[randomIndex];
    
    // 深刻度に応じて緊急対応を追加
    if (severity === 'critical') {
      const emergencyResponse = aiConfig?.aiResponses?.emergency_responses?.[0];
      if (emergencyResponse) {
        response += ` ${emergencyResponse}`;
      }
    }
    
    return response;
  }

  // 推奨事項生成
  generateRecommendations(tempAnalysis, vibAnalysis, humidityAnalysis, fatigueAnalysis) {
    const recommendations = [];
    
    if (tempAnalysis.severity !== 'low') {
      recommendations.push(...tempAnalysis.recommendations);
    }
    
    if (vibAnalysis.severity !== 'low') {
      recommendations.push(...vibAnalysis.recommendations);
    }
    
    if (humidityAnalysis.severity !== 'low') {
      recommendations.push(...humidityAnalysis.recommendations);
    }
    
    if (fatigueAnalysis.severity !== 'low') {
      recommendations.push(...fatigueAnalysis.recommendations);
    }
    
    // 重複を除去
    return [...new Set(recommendations)];
  }

  // サマリー生成
  generateSummary(partData, tempAnalysis, vibAnalysis, humidityAnalysis, fatigueAnalysis) {
    const { partName, temperature, vibration, humidity = 0, operatingHours = 0 } = partData;
    
    let summary = `${partName}の診断結果: `;
    
    const criticalCount = [tempAnalysis, vibAnalysis, humidityAnalysis, fatigueAnalysis]
      .filter(analysis => analysis.severity === 'critical').length;
    const warningCount = [tempAnalysis, vibAnalysis, humidityAnalysis, fatigueAnalysis]
      .filter(analysis => analysis.severity === 'warning').length;
    
    if (criticalCount > 0) {
      summary += `緊急対応が必要です。温度${temperature.toFixed(1)}°C、振動${vibration.toFixed(3)}、湿度${humidity.toFixed(1)}%、運転時間${operatingHours}時間の値が危険レベルに達しています。`;
    } else if (warningCount > 0) {
      summary += `注意が必要です。温度${temperature.toFixed(1)}°C、振動${vibration.toFixed(3)}、湿度${humidity.toFixed(1)}%、運転時間${operatingHours}時間の値が上昇傾向にあります。`;
    } else {
      summary += `正常範囲内です。温度${temperature.toFixed(1)}°C、振動${vibration.toFixed(3)}、湿度${humidity.toFixed(1)}%、運転時間${operatingHours}時間の値は安定しています。`;
    }
    
    return summary;
  }

  // 全体の深刻度判定
  determineOverallSeverity(tempSeverity, vibSeverity, humiditySeverity, fatigueSeverity) {
    const severityLevels = { low: 1, warning: 2, critical: 3 };
    const maxSeverity = Math.max(
      severityLevels[tempSeverity], 
      severityLevels[vibSeverity], 
      severityLevels[humiditySeverity], 
      severityLevels[fatigueSeverity]
    );
    
    return Object.keys(severityLevels).find(key => severityLevels[key] === maxSeverity);
  }

  // メンテナンス推奨事項生成
  generateMaintenanceRecommendations(robotData) {
    const criticalParts = robotData.parts.filter(part => part.status === 'critical');
    const warningParts = robotData.parts.filter(part => part.status === 'warning');
    
    let recommendations = [];
    
    if (criticalParts.length > 0) {
      recommendations.push("緊急メンテナンスが必要な部位があります。即座の点検と修理を実施してください。");
    }
    
    if (warningParts.length > 0) {
      recommendations.push("予防保全として、警告状態の部位の点検を計画してください。");
    }
    
    if (criticalParts.length === 0 && warningParts.length === 0) {
      recommendations.push("すべての部位が正常状態です。定期メンテナンスを継続してください。");
    }
    
    return recommendations;
  }
}

export default RobotDiagnosticAI;
