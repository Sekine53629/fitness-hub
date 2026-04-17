# Fitness Hub API

Django REST Framework ベースのフィットネストラッキングAPI

## 機能

- JWT認証によるユーザー管理
- トレーニング記録の管理
- 体重記録の管理
- 個人記録（PR）の追跡
- ストリーク（連続記録日数）の計算

## セットアップ

### 必要要件

- Python 3.11+
- pip

### インストール

```bash
# 依存パッケージのインストール
pip install -r requirements.txt

# データベースのマイグレーション
python manage.py migrate

# スーパーユーザーの作成（オプション）
python manage.py createsuperuser

# 開発サーバーの起動
python manage.py runserver
```

### 環境変数

`.env.example`を`.env`にコピーして、必要な環境変数を設定してください。

```bash
cp .env.example .env
```

## プロジェクト構造

```
fitness-hub-api/
├── config/              # プロジェクト設定
│   ├── settings/        # 環境別設定
│   │   ├── base.py      # 共通設定
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   └── api/             # メインアプリケーション
├── frontend/            # Reactフロントエンド
├── manage.py
└── requirements.txt
```

## APIエンドポイント

- `POST /api/register/` - ユーザー登録
- `POST /api/token/` - ログイン（JWT取得）
- `GET/POST /api/exercises/` - トレーニング記録
- `GET /api/exercises/previous/?exercise_name=` - 前回記録
- `GET /api/exercises/history/?exercise_name=` - 重量推移
- `GET /api/exercises/personal_bests/` - 全種目PR
- `GET/POST /api/weights/` - 体重記録
- `GET /api/completed/streak/` - ストリーク

## デプロイ

### Heroku

```bash
# Herokuアプリの作成
heroku create your-app-name

# PostgreSQLアドオンの追加
heroku addons:create heroku-postgresql:mini

# 環境変数の設定
heroku config:set SECRET_KEY=your-secret-key
heroku config:set DJANGO_ENV=production
heroku config:set ALLOWED_HOSTS=your-app.herokuapp.com
heroku config:set CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app

# デプロイ
git push heroku main

# マイグレーション
heroku run python manage.py migrate
```

## ライセンス

MIT
