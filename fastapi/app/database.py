# app/database.py
from motor.motor_asyncio import AsyncIOMotorClient

# Chuỗi URL kết nối MongoDB Local của bạn
MONGO_URL = "mongodb://subcc:subcc@192.168.1.204:27017/?authSource=subcc"

# Khởi tạo Client kết nối ngầm (Non-blocking)
client = AsyncIOMotorClient(MONGO_URL)

# Định nghĩa instance database dùng chung cho toàn dự án
db = client["subcc"]
