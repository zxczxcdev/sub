# 📂 Sơ đồ cấu trúc rút gọn (Chỉ 1 tầng duy nhất)

```
backend-subcc/
├── app/
│   ├── main.py                 # File chạy chính (CORS, nạp các tính năng)
│   ├── auth.py                 # Logic xác thực Firebase Token
│   ├── database.py             # Kết nối MongoDB
│   │
│   ├── router_youtube.py       # ✨ Tính năng 1: Gom tất cả những gì liên quan đến YouTube
│   ├── router_flashcard.py     # ✨ Tính năng 2: Gom tất cả về từ vựng, flashcard
│   └── router_hanzi.py         # ✨ Tính năng 3: Gom tất cả về tập viết chữ Hán
│
├── firebase-service-account.json
├── requirements.txt
└── .env
```
