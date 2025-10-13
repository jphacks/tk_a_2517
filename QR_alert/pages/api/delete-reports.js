import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // reportsディレクトリが存在しない場合は成功として返す
    if (!fs.existsSync(reportsDir)) {
      return res.status(200).json({
        success: true,
        message: 'レポートディレクトリが存在しません',
        deletedCount: 0
      });
    }
    
    // ディレクトリ内のファイルを取得
    const files = fs.readdirSync(reportsDir);
    
    let deletedCount = 0;
    
    // すべてのファイルを削除
    files.forEach(file => {
      try {
        const filePath = path.join(reportsDir, file);
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`レポートファイル削除: ${file}`);
      } catch (error) {
        console.error(`ファイル削除エラー: ${file}`, error);
      }
    });
    
    res.status(200).json({
      success: true,
      message: `${deletedCount}個のレポートファイルを削除しました`,
      deletedCount: deletedCount
    });

  } catch (error) {
    console.error('レポート削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'レポートの削除に失敗しました',
      detail: error.message
    });
  }
}
