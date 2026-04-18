from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class FormData(BaseModel):
    name: str
    email: str
    message: str


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/submit")
def submit_form(data: FormData):
    print(f"[受信] 名前: {data.name}, メール: {data.email}, メッセージ: {data.message}")
    return {"received": data}
