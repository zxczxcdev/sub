"use client"

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
        pinyin_list = pinyin(text, style=Style.TONE)
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
    """Trích xuất thông tin chi tiết video qua yt_dlp kèm cấu hình bypass tường lửa"""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "prefer_insecure": True,
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        },
    }
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

        available_languages = []
        ytt_api = YouTubeTranscriptApi()

        try:
            transcript_list = ytt_api.list(video_id)
            for trans in transcript_list:
                available_languages.append(
                    {
                        "lang_code": trans.language_code,
                        "lang_name": trans.language,
                        "is_generated": trans.is_generated,
                    }
                )
        except Exception:
            try:
                ydl_opts = {
                    "writeautomaticsub": True,
                    "skip_download": True,
                    "quiet": True,
                    "http_headers": {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    },
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(
                        f"https://www.youtube.com/watch?v={video_id}", download=False
                    )
                    subtitles = info.get("subtitles", {})
                    automatic_subs = info.get("automatic_captions", {})

                    all_langs = set(
                        list(subtitles.keys()) + list(automatic_subs.keys())
                    )
                    for lang in all_langs:
                        available_languages.append(
                            {
                                "lang_code": lang,
                                "lang_name": lang.upper(),
                                "is_generated": lang in automatic_subs
                                and lang not in subtitles,
                            }
                        )
            except Exception:
                pass

        if not available_languages:
            raise HTTPException(
                status_code=404,
                detail="Video này hiện tại không chứa dữ liệu phụ đề công khai.",
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


@router.post("/process")
async def process_youtube_video(request: ProcessRequest):
    video_id = extract_video_id(request.url)
    if not video_id or len(video_id) != 11:
        raise HTTPException(
            status_code=400, detail="Đường dẫn URL YouTube không hợp lệ."
        )

    # 🌟 1. KIỂM TRA TRƯỚC TRONG DATABASE ĐỂ TRÁNH QUÉT TRÙNG LẶP YOUTUBE API
    video_cache_info = await db["cached_videos"].find_one({"video_id": video_id})

    # Đếm xem cặp ngôn ngữ này đã được dịch hoàn tất bao nhiêu dòng trong DB
    cached_subs_count = await db["cached_subtitles"].count_documents(
        {
            "video_id": video_id,
            "source_lang": request.source_lang,
            "target_lang": request.target_lang,
        }
    )

    # Nếu video đã xử lý thành công VÀ có chứa dữ liệu phụ đề dịch thuật trong DB -> Bật chế độ lấy thẳng 100% từ Database
    is_fully_cached = (
        video_cache_info
        and video_cache_info.get("status") == "success"
        and cached_subs_count > 0
    )

    transcript_data = []
    available_languages = []

    if is_fully_cached:
        # Chế độ lấy thẳng từ MongoDB: Tạo mảng giả lập độ dài từ database phụ đề có sẵn
        meta = video_cache_info["metadata"]
        total_lines_count = cached_subs_count
    else:
        # Chế độ chưa có Cache: Tiến hành luồng quét YouTube API và yt_dlp như cũ
        ytt_api = YouTubeTranscriptApi()
        try:
            transcript_list = ytt_api.list(video_id)
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
            try:
                ydl_opts = {
                    "writeautomaticsub": True,
                    "writesubtitles": True,
                    "skip_download": True,
                    "subtitleslangs": [request.source_lang],
                    "quiet": True,
                    "http_headers": {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    },
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(
                        f"https://www.youtube.com/watch?v={video_id}", download=False
                    )
                    subtitles_dict = info.get("subtitles", {})
                    auto_dict = info.get("automatic_captions", {})

                    for lang in set(
                        list(subtitles_dict.keys()) + list(auto_dict.keys())
                    ):
                        available_languages.append(
                            {
                                "lang_code": lang,
                                "lang_name": lang.upper(),
                                "is_generated": lang in auto_dict
                                and lang not in subtitles_dict,
                            }
                        )

                    requested_sub_list = subtitles_dict.get(
                        request.source_lang
                    ) or auto_dict.get(request.source_lang)
                    if not requested_sub_list:
                        raise Exception()

                    json3_url = next(
                        (
                            f["url"]
                            for f in requested_sub_list
                            if f.get("ext") == "json3"
                        ),
                        None,
                    )
                    if not json3_url:
                        json3_url = requested_sub_list[0]["url"]

                    raw_sub_content = ydl.urlopen(json3_url).read().decode("utf-8")
                    sub_json = json.loads(raw_sub_content)

                    for event in sub_json.get("events", []):
                        if (
                            "segs" in event
                            and "".join(
                                [s.get("utf8", "") for s in event["segs"]]
                            ).strip()
                            != ""
                        ):
                            text_combined = "".join(
                                [s.get("utf8", "") for s in event["segs"]]
                            )
                            start_ms = event.get("tStartMs", 0)
                            duration_ms = event.get("dDurationMs", 0)
                            transcript_data.append(
                                {
                                    "text": text_combined.strip(),
                                    "start": start_ms / 1000.0,
                                    "duration": duration_ms / 1000.0,
                                }
                            )
            except Exception as err:
                raise HTTPException(
                    status_code=404,
                    detail="Hệ thống YouTube đang thực hiện chặn yêu cầu cào dữ liệu từ IP máy chủ này. Vui lòng thử lại sau hoặc đổi sang video khác.",
                )

        if not transcript_data:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy hoặc không thể giải mã tệp phụ đề của video này.",
            )

        total_lines_count = len(transcript_data)
        if video_cache_info:
            meta = video_cache_info["metadata"]
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

    # 3. HÀM ENGINE STREAM DỮ LIỆU REALTIME
    async def event_generator():
        google_source = LANGUAGE_MAPPING.get(request.source_lang, request.source_lang)
        google_target = LANGUAGE_MAPPING.get(request.target_lang, request.target_lang)

        # BẮN PHÁT 1: Trả về Metadata cấu trúc tổng quan luôn
        yield (
            json.dumps(
                {
                    "status": "processing",
                    "type": "metadata",
                    "video_id": video_id,
                    "metadata": meta,
                    "total_lines": total_lines_count,
                },
                ensure_ascii=False,
            )
            + "\n"
        )
        await asyncio.sleep(0.01)

        # Đọc kho phụ đề từ MongoDB ra
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

        # Trường hợp 1: Nếu đã có Cache đầy đủ hoàn tất trong hệ thống DB -> Stream thẳng dữ liệu tĩnh ra ngoài
        if is_fully_cached:
            for item in db_subtitles:
                yield (
                    json.dumps(
                        {
                            "status": "processing",
                            "type": "subtitle_line",
                            "index": item["index"],
                            "line": {
                                "start": item["start"],
                                "duration": item["duration"],
                                "timestamp": item["timestamp"],
                                "text": item["translated_text"],
                                "original_text": item["original_text"],
                                "pinyin": item.get("pinyin", ""),
                            },
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
                # Tạo độ trễ siêu nhỏ mô phỏng hiệu ứng luồng gối đầu mượt mà cho client
                await asyncio.sleep(0.001)
        else:
            # Trường hợp 2: Chưa có Cache hoặc thiếu dòng -> Kích hoạt lõi dịch đa luồng Batch Multi-Threading
            cached_subs_dict = {
                item["index"]: {
                    "translated_text": item.get("translated_text", ""),
                    "pinyin": item.get("pinyin", ""),
                }
                for item in db_subtitles
            }

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
                        entry_text = (
                            entry.get("text") if isinstance(entry, dict) else entry.text
                        )
                        tasks.append(
                            loop.run_in_executor(
                                executor,
                                translate_single_text,
                                google_source,
                                google_target,
                                entry_text,
                            )
                        )

                translated_batch_results = await asyncio.gather(*tasks)

                for sub_idx, entry in enumerate(batch_entries):
                    global_index = batch_indices[sub_idx]
                    translated_text = translated_batch_results[sub_idx]

                    entry_text = (
                        entry.get("text") if isinstance(entry, dict) else entry.text
                    )
                    start_time = (
                        entry.get("start") if isinstance(entry, dict) else entry.start
                    )
                    duration = (
                        entry.get("duration")
                        if isinstance(entry, dict)
                        else entry.duration
                    )

                    minutes, seconds = divmod(start_time, 60)
                    hours, minutes = divmod(minutes, 60)
                    timestamp = (
                        f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"
                    )

                    pinyin_text = ""
                    if global_index in cached_subs_dict:
                        pinyin_text = cached_subs_dict[global_index]["pinyin"]
                    else:
                        if google_source in ["zh-CN", "zh-TW"]:
                            pinyin_text = generate_pinyin(entry_text)
                        elif google_target in ["zh-CN", "zh-TW"]:
                            pinyin_text = generate_pinyin(translated_text)

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
                                "original_text": entry_text,
                                "translated_text": translated_text,
                                "pinyin": pinyin_text,
                                "created_at": datetime.datetime.utcnow(),
                            }
                        )

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
                                    "original_text": entry_text,
                                    "pinyin": pinyin_text,
                                },
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )

                await asyncio.sleep(0.001)

            # Chỉ cập nhật trạng thái bảng tổng sau khi kết thúc luồng dịch đa luồng mới hoàn toàn
            await db["cached_videos"].update_one(
                {"video_id": video_id},
                {
                    "$set": {
                        "status": "success",
                        "updated_at": datetime.datetime.utcnow(),
                    }
                },
            )

        # BẮN PHÁT CUỐI: Chốt hạ đóng cổng Stream thành công
        yield (
            json.dumps({"status": "success", "type": "done"}, ensure_ascii=False) + "\n"
        )

    return StreamingResponse(event_generator(), media_type="text/event-stream")
