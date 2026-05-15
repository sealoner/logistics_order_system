from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, students, orders, upload, stats

app = FastAPI(title="物流订单管理系统 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(orders.router)
app.include_router(upload.router)
app.include_router(stats.router)


@app.get("/")
def root():
    return {"message": "物流订单管理系统 API"}