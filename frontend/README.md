# Fitness Hub - ローカル環境セットアップ

## 必要なもの
- Node.js 18以上 (`node -v` で確認)
- npm (`npm -v` で確認)

## セットアップ手順

```bash
# 1. このフォルダに移動
cd fitness-hub

# 2. 依存パッケージをインストール
npm install

# 3. 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開けば動きます。

## スマホから見る場合

同じWi-Fiネットワーク上にいれば、PCのIPアドレスで閲覧可能:
```
http://[PCのIPアドレス]:3000
```

IPアドレスの確認方法:
- Windows: `ipconfig`
- Mac: `ifconfig | grep inet`

## 本番ビルド（Vercelデプロイ用）

```bash
npm run build
```

`dist/` フォルダが生成されます。Vercelにデプロイする場合は:
1. GitHubにpush
2. vercel.com でリポジトリを接続
3. 自動デプロイ

## データ保存
- localStorage を使用（ブラウザに保存）
- トレーニング記録、体重記録、器具設定、ウェイトログが永続化されます
- ブラウザのデータを消去するとリセットされます
