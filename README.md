# 🎤 音声メモアプリ

iPhone・Windows対応の音声入力メモアプリ。Googleスプレッドシートに自動保存。

## 🚀 セットアップ手順

### 1. Google API設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. Google Sheets API を有効化
4. 認証情報を作成（OAuth 2.0 クライアント ID）
5. 承認済みJavaScriptドメインを追加

### 2. APIキー設定

`script.js` の以下の部分を更新：

```javascript
await gapi.client.init({
    apiKey: 'YOUR_API_KEY',           // ← ここにAPIキーを入力
    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // ← ここにクライアントIDを入力
    // ...
});
```

### 3. ホスティング

以下のいずれかでホスティング：

- **GitHub Pages**
- **Netlify**
- **Vercel**

## 📱 対応ブラウザ

- ✅ iOS Safari 14+
- ✅ Chrome 80+
- ✅ Edge 80+
- ✅ Firefox 76+

## 🎯 主な機能

- 🎤 **音声入力**: Web Speech API使用
- ⌨️ **テキスト入力**: 通常の文字入力
- 🏷️ **タグ機能**: 日記・メモ・カスタムタグ
- 📊 **自動保存**: Googleスプレッドシートに保存
- 📱 **PWA対応**: オフライン機能・ホーム画面追加
- 🌐 **レスポンシブ**: スマホ・PC両対応

## 📋 使用方法

1. **Googleログイン**でサインイン
2. **音声入力**または**テキスト入力**を選択
3. **タグ**を選択（日記・メモ・カスタム）
4. **保存**ボタンで Googleスプレッドシート に自動保存

## 🔧 カスタマイズ

### タグの追加
- アプリ内の「+ タグ追加」ボタン
- または `localStorage` で管理

### スタイルの変更
- `style.css` を編集
- CSS変数で色テーマをカスタマイズ可能

## 📊 データ形式

Googleスプレッドシートの形式：

| 日時 | タグ | メモ内容 |
|------|------|----------|
| 2025-08-23 15:30:45 | 日記 | 今日は良い天気でした |
| 2025-08-23 16:15:22 | メモ | 買い物リスト：牛乳、パン |

## 🛠️ 開発者向け

### ローカル開発
```bash
# HTTPSが必要（音声認識のため）
python -m http.server 8000
# または
npx serve -s .
```

### ビルド不要
純粋なHTML/CSS/JavaScriptのため、ビルドプロセス不要。

## 📝 ライセンス

MIT License

## 🤝 サポート

問題・要望は GitHub Issues でお知らせください。