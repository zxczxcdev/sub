import asyncio
from concurrent.futures import ThreadPoolExecutor
import datetime
import json
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from deep_translator import GoogleTranslator
import yt_dlp
from pypinyin import pinyin, Style

# IMPORT BIẾN DB DÙNG CHUNG TỪ FILE DATABASE.PY VÀO HỆ THỐNG
from app.database import db

router = APIRouter()

# --- CONFIGS & SCHEMAS ---

LANGUAGE_MAPPING = {
    "zh-Hans": "zh-CN",
    "zh-Hant": "zh-TW",
    "zh-HK": "zh-TW",
    "iw": "he",
}

# Giới hạn tối đa workers an toàn để bảo vệ tài nguyên hệ thống
executor = ThreadPoolExecutor(max_workers=70)


class CheckRequest(BaseModel):
    url: str


class ProcessRequest(BaseModel):
    url: str
    source_lang: str
    target_lang: str = "vi"


# --- HÀM TRỢ GIÚP (HELPERS) ---


def generate_pinyin(text: str) -> str:
    """Tự động chuyển đổi văn bản tiếng Trung thành chuỗi phiên âm Pinyin kèm dấu thanh điệu"""
    try:
        # Chuyển đổi thành dạng mảng pinyin kèm dấu điệu (Ví dụ: [['Chéng'], ['dū']])
        pinyin_list = pinyin(text, style=Style.TONE)
        # Gộp các ký tự đơn lẻ lại phân cách bằng khoảng trắng
        return " ".join([item[0] for item in pinyin_list])
    except Exception:
        return ""


def translate_single_text(source_lang, target_lang, text):
    """Khởi tạo instance Translator riêng biệt trong phạm vi local của từng Thread"""
    try:
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        return translator.translate(text)
    except Exception:
        return text


def extract_video_id(url: str) -> str:
    """Tách lấy 11 ký tự Video ID từ link YouTube"""
    video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    return video_id_match.group(1) if video_id_match else url


def get_video_metadata(video_url: str):
    """Trích xuất thông tin chi tiết video qua yt_dlp"""
    ydl_opts = {"quiet": True, "no_warnings": True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(video_url, download=False)
            return {
                "title": info.get("title", "N/A"),
                "author": info.get("uploader", "N/A"),
                "thumbnail": info.get("thumbnail", "N/A"),
                "view_count": info.get("view_count", 0),
                "like_count": info.get("like_count", 0),
            }
        except Exception:
            return None


# --- ENDPOINTS ---


@router.post("/check")
async def check_video_subtitles(request: CheckRequest):
    try:
        video_id = extract_video_id(request.url)
        if not video_id or len(video_id) != 11:
            raise HTTPException(
                status_code=400, detail="Đường dẫn URL YouTube không hợp lệ."
            )

        meta = get_video_metadata(request.url)
        if not meta:
            raise HTTPException(
                status_code=404, detail="Không thể lấy thông tin từ video này."
            )

        ytt_api = YouTubeTranscriptApi()
        try:
            transcript_list = ytt_api.list(video_id)
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"Video không hỗ trợ phụ đề: {str(e)}",
            )

        available_languages = []
        for trans in transcript_list:
            available_languages.append(
                {
                    "lang_code": trans.language_code,
                    "lang_name": trans.language,
                    "is_generated": trans.is_generated,
                }
            )

        return {
            "status": "success",
            "video_id": video_id,
            "metadata": meta,
            "available_languages": available_languages,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list-cached")
async def get_cached_videos_list():
    """
    Lấy toàn bộ danh sách các video đã dịch thành công trong hệ thống database
    """
    try:
        # Lấy các video có trạng thái hoàn thành, sắp xếp mới nhất lên đầu
        cursor = db["cached_videos"].find({"status": "success"}).sort("created_at", -1)
        videos = await cursor.to_list(length=100)  # Giới hạn tối đa 100 video

        result = []
        for vid in videos:
            result.append(
                {
                    "video_id": vid["video_id"],
                    "metadata": vid.get("metadata", {}),
                    "available_languages": vid.get("available_languages", []),
                    "created_at": vid.get("created_at"),
                }
            )

        return {"status": "success", "videos": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải kho dữ liệu: {str(e)}")


@router.post("/process")
async def process_youtube_video(request: ProcessRequest):
    video_id = extract_video_id(request.url)
    if not video_id or len(video_id) != 11:
        raise HTTPException(
            status_code=400, detail="Đường dẫn URL YouTube không hợp lệ."
        )

    # Tải trước danh sách phụ đề từ YouTube API để phục vụ phân loại chuyên mục
    ytt_api = YouTubeTranscriptApi()
    try:
        transcript_list = ytt_api.list(video_id)

        # Trích xuất nhanh mảng ngôn ngữ có sẵn để lưu vào database
        available_languages = []
        for trans in transcript_list:
            available_languages.append(
                {
                    "lang_code": trans.language_code,
                    "lang_name": trans.language,
                    "is_generated": trans.is_generated,
                }
            )

        transcript = transcript_list.find_transcript([request.source_lang])
        transcript_data = transcript.fetch()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Lỗi danh sách phụ đề: {str(e)}")

    # 1. Đồng bộ Metadata từ MongoDB hoặc cào mới
    video_cache_info = await db["cached_videos"].find_one({"video_id": video_id})
    if video_cache_info:
        meta = video_cache_info["metadata"]
        # Nếu cache cũ chưa có sẵn mảng ngôn ngữ, cập nhật bổ sung ngầm luôn
        if "available_languages" not in video_cache_info:
            await db["cached_videos"].update_one(
                {"video_id": video_id},
                {"$set": {"available_languages": available_languages}},
            )
    else:
        meta = get_video_metadata(request.url)
        if not meta:
            raise HTTPException(
                status_code=404, detail="Không thể lấy thông tin từ video này."
            )
        await db["cached_videos"].insert_one(
            {
                "video_id": video_id,
                "status": "processing",
                "metadata": meta,
                "available_languages": available_languages,
                "created_at": datetime.datetime.utcnow(),
            }
        )

    # 2. Tải phụ đề từ YouTube API
    ytt_api = YouTubeTranscriptApi()
    try:
        transcript_list = ytt_api.list(video_id)
        transcript = transcript_list.find_transcript([request.source_lang])
        transcript_data = transcript.fetch()
    except Exception as e:
        # 🌟 GIẢI PHÁP FALLBACK: Nếu API chính thức bị sập vì lỗi XML, sử dụng yt_dlp để cào sub thô an toàn hơn
        try:
            import yt_dlp

            ydl_opts = {
                "writeautomaticsub": True,
                "writesubtitles": True,
                "skip_download": True,
                "subtitleslangs": [request.source_lang],
                "quiet": True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(
                    f"https://www.youtube.com/watch?v={video_id}", download=False
                )
                # Thường dữ liệu từ yt_dlp trả về qua định dạng json3 hoặc vtt sẽ loại bỏ hoàn toàn lỗi XML lỗi thời này
                # Nếu dự án của bạn ưu tiên fix nhanh không cần cài thêm logic parse yt_dlp, hãy dùng thông báo lỗi thân thiện:
                raise HTTPException(
                    status_code=422,
                    detail=f"Phụ đề gốc của video này trên YouTube chứa ký tự lỗi cấu trúc XML. Không thể biên dịch.",
                )
        except Exception:
            raise HTTPException(
                status_code=404,
                detail=f"Lỗi danh sách phụ đề: Vui lòng thử lại với video hoặc ngôn ngữ khác.",
            )

    # 3. Hàm tạo luồng phát dữ liệu ĐA LUỒNG tích hợp STREAM
    async def event_generator():
        google_source = LANGUAGE_MAPPING.get(request.source_lang, request.source_lang)
        google_target = LANGUAGE_MAPPING.get(request.target_lang, request.target_lang)

        # BẮN LƯỢT 1: Metadata tổng quan trả về ngay lập tức
        yield (
            json.dumps(
                {
                    "status": "processing",
                    "type": "metadata",
                    "video_id": video_id,
                    "metadata": meta,
                    "total_lines": len(transcript_data),
                },
                ensure_ascii=False,
            )
            + "\n"
        )
        await asyncio.sleep(0.01)

        # Lấy checkpoint cũ lưu trong MongoDB
        cursor = (
            db["cached_subtitles"]
            .find(
                {
                    "video_id": video_id,
                    "source_lang": request.source_lang,
                    "target_lang": request.target_lang,
                }
            )
            .sort("index", 1)
        )
        db_subtitles = await cursor.to_list(length=None)

        # Tạo cấu trúc tra cứu cache nhanh: { index: { "translated_text": ..., "pinyin": ... } }
        cached_subs_dict = {
            item["index"]: {
                "translated_text": item.get("translated_text", ""),
                "pinyin": item.get("pinyin", ""),
            }
            for item in db_subtitles
        }

        # 🌟 THUẬT TOÁN ĐA LUỒNG THEO CỤM (BATCH MULTI-THREADING)
        batch_size = 30
        loop = asyncio.get_event_loop()

        for i in range(0, len(transcript_data), batch_size):
            batch_entries = transcript_data[i : i + batch_size]
            tasks = []
            batch_indices = []

            for sub_idx, entry in enumerate(batch_entries):
                global_index = i + sub_idx
                batch_indices.append(global_index)

                if global_index in cached_subs_dict:

                    async def get_cached(cached_item):
                        return cached_item["translated_text"]

                    tasks.append(get_cached(cached_subs_dict[global_index]))
                else:
                    tasks.append(
                        loop.run_in_executor(
                            executor,
                            translate_single_text,
                            google_source,
                            google_target,
                            entry.text,
                        )
                    )

            # 🚀 Kích hoạt dịch SONG SONG toàn bộ các câu trong cụm hiện tại
            translated_batch_results = await asyncio.gather(*tasks)

            # Đóng gói dữ liệu, ghi checkpoint MongoDB và yield bắn stream về Frontend
            for sub_idx, entry in enumerate(batch_entries):
                global_index = batch_indices[sub_idx]
                translated_text = translated_batch_results[sub_idx]

                start_time = entry.start
                duration = entry.duration
                minutes, seconds = divmod(start_time, 60)
                hours, minutes = divmod(minutes, 60)
                timestamp = f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"

                # 🌟 XỬ LÝ PINYIN: Kiểm tra xem ngôn ngữ gốc hoặc đích có phải tiếng Trung không
                pinyin_text = ""
                if global_index in cached_subs_dict:
                    pinyin_text = cached_subs_dict[global_index]["pinyin"]
                else:
                    if google_source in ["zh-CN", "zh-TW"]:
                        pinyin_text = generate_pinyin(entry.text)
                    elif google_target in ["zh-CN", "zh-TW"]:
                        pinyin_text = generate_pinyin(translated_text)

                # Ghi checkpoint mới vào MongoDB kèm trường pinyin nếu câu này chưa từng được lưu
                if global_index not in cached_subs_dict:
                    await db["cached_subtitles"].insert_one(
                        {
                            "video_id": video_id,
                            "source_lang": request.source_lang,
                            "target_lang": request.target_lang,
                            "index": global_index,
                            "start": start_time,
                            "duration": duration,
                            "timestamp": timestamp,
                            "original_text": entry.text,
                            "translated_text": translated_text,
                            "pinyin": pinyin_text,
                            "created_at": datetime.datetime.utcnow(),
                        }
                    )

                # Bắn stream realtime kết quả (bao gồm pinyin) về Next.js
                yield (
                    json.dumps(
                        {
                            "status": "processing",
                            "type": "subtitle_line",
                            "index": global_index,
                            "line": {
                                "start": start_time,
                                "duration": duration,
                                "timestamp": timestamp,
                                "text": translated_text,
                                "original_text": entry.text,
                                "pinyin": pinyin_text,
                            },
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )

            # Giải phóng nhẹ vòng lặp mạng sau mỗi cụm gối đầu
            await asyncio.sleep(0.001)

        # ĐÁNH DẤU HOÀN THÀNH TOÀN BỘ VIDEO
        await db["cached_videos"].update_one(
            {"video_id": video_id},
            {"$set": {"status": "success", "updated_at": datetime.datetime.utcnow()}},
        )

        yield (
            json.dumps({"status": "success", "type": "done"}, ensure_ascii=False) + "\n"
        )

    return StreamingResponse(event_generator(), media_type="text/event-stream")
