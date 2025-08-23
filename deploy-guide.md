# 🚀 デプロイ手順ガイド

## GitHub Pages での無料デプロイ

### 1. GitHubリポジトリ作成
1. [GitHub](https://github.com) にログイン
2. 「New repository」をクリック
3. Repository name: `voice-memo-app`
4. 「Public」を選択（無料）
5. 「Create repository」

### 2. コードをアップロード

```bash
# コマンドプロンプトでアプリフォルダに移動
cd "C:\Users\psuga\.claude\app02"

# Gitの初期化
git init
git add .
git commit -m "🎤 音声メモアプリ初回コミット"

# リモートリポジトリを追加（ユーザー名を変更）
git remote add origin https://github.com/あなたのユーザー名/voice-memo-app.git

# アップロード
git branch -M main
git push -u origin main
```

### 3. GitHub Pages 有効化
1. リポジトリの「Settings」タブ
2. 左メニュー「Pages」
3. Source: 「Deploy from a branch」
4. Branch: 「main」
5. 「Save」

### 4. 完成！
**あなたのアプリURL**: `https://あなたのユーザー名.github.io/voice-memo-app`

## OAuth設定の更新

取得したURLを Google Cloud Console に追加：

```
承認済みのJavaScript生成元:
- http://localhost:8080              (開発用)
- https://あなたのユーザー名.github.io  (本番用)
```

## 📱 スマホでの使用方法

1. iPhoneのSafariで上記URLにアクセス
2. 共有ボタン → 「ホーム画面に追加」
3. アプリアイコンでネイティブアプリのように使用可能！

## ⚡ 即座にデプロイしたい場合

### Netlify Drop（最速）
1. [Netlify Drop](https://app.netlify.com/drop) にアクセス
2. アプリフォルダを直接ドラッグ＆ドロップ
3. 即座にデプロイ完了！
4. URL例: `https://inspiring-curie-123456.netlify.app`

## 💡 おすすめ
- **開発・学習**: GitHub Pages
- **すぐ使いたい**: Netlify Drop
- **高性能**: Vercel

どちらも完全無料で使用できます！