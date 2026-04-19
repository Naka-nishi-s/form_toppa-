from fastapi import FastAPI, Response, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

VALID_USERNAME = "admin"
VALID_PASSWORD = "password123"


class LoginData(BaseModel):
    username: str
    password: str


class SubmitData(BaseModel):
    name: str
    email: str
    message: str


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/login")
def login(data: LoginData, response: Response):
    if data.username != VALID_USERNAME or data.password != VALID_PASSWORD:
        raise HTTPException(
            status_code=401, detail="ユーザー名またはパスワードが違います"
        )

    response.set_cookie(
        key="session_id",
        value="abc123_secret_token",
        httponly=False,
    )
    print(f"[ログイン成功] ユーザー: {data.username}")
    return {"username": data.username}


@app.post("/submit")
def submit(data: SubmitData, response: Response):
    response.set_cookie(
        key="session_id",
        value="abc123_secret_token",
        httponly=False,  # 意図的にJSから読めるようにする（本来はTrue）
    )
    print(f"[受信] 名前: {data.name}, メール: {data.email}, メッセージ: {data.message}")
    return {"received": data}


# session_id → ユーザー情報のマッピング（本来はDBで管理）
SESSION_STORE = {
    "abc123_secret_token": {"username": "admin", "email": "admin@example.com", "role": "admin"},
}


@app.get("/me")
def me(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in SESSION_STORE:
        raise HTTPException(status_code=401, detail="未認証です")
    print(f"[/me アクセス] session_id: {session_id}")
    return SESSION_STORE[session_id]
