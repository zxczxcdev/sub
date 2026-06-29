from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services import router_youtube, router_practice

app = FastAPI(title="SubTubeCC Simple API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "Zalo : 0559595165 for pricing using this api",
    }


# Nạp các tính năng vào hệ thống định tuyến
app.include_router(router_youtube.router, prefix="/api/youtube", tags=["YouTube"])
app.include_router(router_practice.router, prefix="/api/practice", tags=["Practice"])
