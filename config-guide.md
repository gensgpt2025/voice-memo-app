# 🔧 Google API設定ガイド

## 手順1: Google Cloud Consoleでプロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 「プロジェクトを選択」→「新しいプロジェクト」
3. プロジェクト名: `voice-memo-app` 
4. 「作成」をクリック

## 手順2: Google Sheets API を有効化

1. 左側メニュー「APIとサービス」→「ライブラリ」
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

## 手順3: OAuth 2.0 認証情報を作成

1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuth クライアント ID」
3. 「同意画面を構成」（初回のみ）
   - ユーザータイプ: 「外部」
   - アプリ名: `音声メモアプリ`
   - メールアドレス: あなたのGmailアドレス
   - 承認済みドメイン: `localhost` または実際のドメイン
4. OAuth クライアント ID作成
   - アプリケーションの種類: 「ウェブアプリケーション」
   - 名前: `voice-memo-client`
   - 承認済みのJavaScript生成元:
     - `http://localhost:8080` （開発用）
     - `https://yourdomain.com` （本番用）

## 手順4: APIキーを作成

1. 「認証情報を作成」→「APIキー」
2. 作成されたAPIキーをコピー
3. 「制限」で「Google Sheets API」のみに制限（推奨）

## 手順5: script.jsに設定値を追加

`script.js` の39-40行目を更新：

```javascript
await gapi.client.init({
    apiKey: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX', // ← ここにAPIキー
    clientId: 'XXXXX.apps.googleusercontent.com', // ← ここにクライアントID
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    scope: 'https://www.googleapis.com/auth/spreadsheets'
});
```

## 🚀 テスト方法

1. ローカルサーバーを起動: `python -m http.server 8080`
2. ブラウザで `http://localhost:8080` にアクセス
3. 「Googleログイン」をクリック
4. 音声入力またはテキスト入力でメモを作成
5. 保存ボタンで Googleスプレッドシート に保存確認

## ⚠️ 注意事項

- **HTTPS必須**: 本番環境では必ずHTTPS
- **音声認識**: ChromeまたはSafariで対応
- **プライバシー**: スプレッドシートは作成者のみアクセス可能

## 🌐 本番デプロイ

### GitHub Pages
1. GitHubにリポジトリ作成
2. Settings → Pages でデプロイ
3. OAuth設定で `https://username.github.io/repo-name` を追加

### Netlify
1. [Netlify](https://netlify.com) にアカウント作成  
2. フォルダをドラッグ＆ドロップでデプロイ
3. 自動生成されたURLをOAuth設定に追加