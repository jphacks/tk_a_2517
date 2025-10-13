import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // reportsディレクトリが存在しない場合は空の配列を返す
    if (!fs.existsSync(reportsDir)) {
      return res.status(200).json({
        success: true,
        reports: []
      });
    }
    
    // ディレクトリ内のファイルを取得
    const files = fs.readdirSync(reportsDir);
    
    // ファイル情報を取得
    const reports = files
      .filter(file => file.endsWith('.txt')) // .txtファイルのみ
      .map(file => {
        const filePath = path.join(reportsDir, file);
        const stats = fs.statSync(filePath);
        // Linux/コンテナ環境では birthtime が 1970-01-01 になることがあるため、
        // その場合は mtime を生成時刻の代理として使用する
        const hasValidBirthtime = stats.birthtime && stats.birthtime.getFullYear && stats.birthtime.getFullYear() > 1980;
        const createdDate = hasValidBirthtime ? stats.birthtime : stats.mtime;
        const modifiedDate = stats.mtime;

        return {
          filename: file,
          path: filePath,
          size: stats.size,
          createdAt: createdDate.toISOString(),
          modifiedAt: modifiedDate.toISOString(),
          isEmergency: file.startsWith('emergency_report_'),
          robotId: file.includes('ROBOT_') ? file.match(/ROBOT_\d+/)?.[0] : null
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // 新しい順にソート
    
    res.status(200).json({
      success: true,
      reports,
      totalCount: reports.length,
      emergencyCount: reports.filter(r => r.isEmergency).length
    });
    
  } catch (error) {
    console.error('Reports fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      detail: error.message
    });
  }
}
