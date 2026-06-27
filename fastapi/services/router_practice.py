from datetime import datetime
import random
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

import firebase_admin
from firebase_admin import auth, credentials

# IMPORT BIẾN DB DÙNG CHUNG TỪ FILE DATABASE.PY VÀO HỆ THỐNG
from app.database import db

router = APIRouter()

# --- KHỞI TẠO FIREBASE AN TOÀN TRÁNH TRÙNG LẶP ---
try:
    firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate("firebase-service-account.json")
    firebase_admin.initialize_app(cred)


# --- DEPENDENCY VERIFY ID TOKEN ---
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token  # Chứa uid, email, name...
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID Token")


# --- PYDANTIC MODELS ---
class QuizDetail(BaseModel):
    type: str
    subType: str
    subtitleId: str
    isCorrect: bool
    userAnswer: str
    correctAnswer: str


class PracticeResultSubmit(BaseModel):
    videoId: str
    totalScore: float
    details: List[QuizDetail]


# --- 1. API: TẠO ĐỀ THI 110 CÂU NGẪU NHIÊN ---
@router.get("/{video_id}")
async def get_practice_exam(
    video_id: str, current_user: dict = Depends(get_current_user)
):
    # 🌟 FIX: Đổi từ db["subtitles"] sang db["cached_subtitles"]
    # 🌟 FIX: Đổi điều kiện tìm kiếm từ {"videoId": video_id} sang {"video_id": video_id}
    cursor = db["cached_subtitles"].find({"video_id": video_id})
    subtitles = await cursor.to_list(length=1000)

    if not subtitles:
        raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu phụ đề.")

    for sub in subtitles:
        sub["id"] = str(sub["_id"])
        del sub["_id"]

    def get_random_samples(arr: list, count: int) -> list:
        if len(arr) <= count:
            return random.sample(arr, len(arr))
        return random.sample(arr, count)

    # Đóng gói bộ đề thi
    exam_paper = {
        "LISTEN": {
            "DICTATION": get_random_samples(subtitles, 10),
            "MATCH_BY_EAR": get_random_samples(subtitles, 10),
            "SPOT_THE_ERROR": get_random_samples(subtitles, 10),
        },
        "READ": {
            "FILL_BLANK": get_random_samples(subtitles, 10),
            "MATCH_TRANSLATION": get_random_samples(subtitles, 10),
            "PICK_TRANSLATION": get_random_samples(subtitles, 10),
            "ORDER_LINES": get_random_samples(subtitles, 10),
        },
        "WRITE": {
            "TYPE_BLANK": get_random_samples(subtitles, 10),
            "WORD_ORDER": get_random_samples(subtitles, 10),
            "TRANSLATE_SENTENCE": get_random_samples(subtitles, 10),
        },
        "SPEAK": {
            "SHADOWING": get_random_samples(subtitles, 10),
        },
    }
    return {"success": True, "examPaper": exam_paper}


# --- 2. API: LƯU KẾT QUẢ VÀO MONGODB ---
@router.post("/api/youtube/practice/submit")
async def submit_practice_result(
    data: PracticeResultSubmit, current_user: dict = Depends(get_current_user)
):
    document = {
        "userId": current_user["uid"],
        "email": current_user.get("email"),
        "videoId": data.videoId,
        "totalScore": data.totalScore,
        "details": [detail.dict() for detail in data.details],
        "completedAt": datetime.utcnow(),  # 🌟 FIX: Bỏ bớt chữ thừa kế thừa từ import datetime trực tiếp
    }
    result = await db["practice_results"].insert_one(document)
    return {"success": True, "resultId": str(result.insertedId)}
