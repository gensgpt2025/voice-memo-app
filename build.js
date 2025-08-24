const fs = require('fs');
const path = require('path');

// 出力ディレクトリの作成
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// script.jsを読み込み、環境変数で置換
let scriptContent = fs.readFileSync('script.js', 'utf8');

// 環境変数で置換
const apiKey = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';
const clientId = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';

scriptContent = scriptContent.replace(
    /apiKey: window\.APP_CONFIG\?\.GOOGLE_API_KEY \|\| 'AIzaSyC4gcw9yAjdByZJpC_Nga56jsl7LrPb_oE'/g,
    `apiKey: '${apiKey}'`
);

scriptContent = scriptContent.replace(
    /client_id: window\.APP_CONFIG\?\.GOOGLE_CLIENT_ID \|\| '602143559288-cbm0nfgsu8tqkq50dtcg6fn3ps6f2j50\.apps\.googleusercontent\.com'/g,
    `client_id: '${clientId}'`
);

// ファイルをdistディレクトリにコピー
fs.writeFileSync(path.join(distDir, 'script.js'), scriptContent);
fs.copyFileSync('index.html', path.join(distDir, 'index.html'));
fs.copyFileSync('style.css', path.join(distDir, 'style.css'));
fs.copyFileSync('manifest.json', path.join(distDir, 'manifest.json'));
fs.copyFileSync('sw.js', path.join(distDir, 'sw.js'));

console.log('✅ Build completed successfully!');
console.log('📁 Files generated in dist/ directory');

// Vercelのサーバーレス関数として動作するため
module.exports = (req, res) => {
    res.status(200).json({ message: 'Build completed' });
};