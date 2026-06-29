import base64
import json
import random
import re
from pydantic import BaseModel
from fastapi import APIRouter
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import jieba

# 🌟 THƯ VIỆN NLP ĐỘNG ĐỂ KHỞI TẠO BẪY
from nltk.corpus import cmudict
import pypinyin
import pronouncing
from spellchecker import SpellChecker

router = APIRouter()

# Khởi tạo SpellChecker dùng chung một lần để tối ưu RAM
spell = SpellChecker()

# Khóa bí mật đối xứng dùng chung
SHARED_KEY = b"nguyenkhoa210999"

# Khởi tạo bộ từ điển phát âm CMU (chỉ load 1 lần khi chạy ứng dụng)
try:
    cmu_dict = cmudict.dict()
except LookupError:
    import nltk

    nltk.download("custom_data/cmudict" if False else "cmudict")
    cmu_dict = cmudict.dict()

# Quét dải Unicode chữ Hán thông dụng để làm kho ứng viên tráo từ động, tối ưu hiệu năng
CHINESE_CHARS_SAMPLE = [chr(i) for i in range(0x4E00, 0x5500)]


# --- HÀM TIỆN ÍCH MÃ HÓA AES-CBC ---
def encrypt_aes_cbc(data_dict: dict) -> str:
    """Mã hóa dữ liệu sang dạng AES-CBC kèm Padding chuẩn PKCS7"""
    plain_text = json.dumps(data_dict, ensure_ascii=False).encode("utf-8")

    from Crypto.Random import get_random_bytes

    iv = get_random_bytes(16)

    cipher = AES.new(SHARED_KEY, AES.MODE_CBC, iv=iv)
    ciphertext = cipher.encrypt(pad(plain_text, AES.block_size))

    packet = {
        "iv": base64.b64encode(iv).decode("utf-8"),
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
    }
    return json.dumps(packet)


# --- Thuật toán 1: Sinh bẫy Tiếng Anh (Kết hợp pronouncing và pyspellchecker) ---
def generate_english_trap_dynamic(word: str) -> str:
    """
    Tự động sinh bẫy lỗi sai nâng cao cho tiếng Anh.
    Ưu tiên 1: Tra cứu từ đồng âm (Homophones) bằng pronouncing.
    Ưu tiên 2: Tạo từ lỗi typo thực tế (Edit Distance = 1) bằng pyspellchecker.
    """
    word_clean = word.lower().strip()

    # 🌟 CHIẾN THUẬT 1: TÌM TỪ ĐỒNG ÂM (HOMOPHONE TRAP)
    phones_list = pronouncing.phones_for_word(word_clean)
    if phones_list:
        target_phone = phones_list[0]
        # Quét bộ từ điển để lấy các từ có chung chuỗi âm tiết phát âm
        homophone_candidates = pronouncing.search(f"^{target_phone}$")
        # Loại bỏ chính từ gốc ra khỏi danh sách kết quả
        homophone_candidates = [c for c in homophone_candidates if c != word_clean]

        if homophone_candidates:
            chosen_homophone = random.choice(homophone_candidates)
            # Khớp lại định dạng viết hoa nguyên bản của từ
            if word.isupper():
                return chosen_homophone.upper()
            if word[0].isupper():
                return chosen_homophone.capitalize()
            return chosen_homophone

    # 🌟 CHIẾN THUẬT 2: TẠO LỖI CHÍNH TẢ BÀN PHÍM TỰ ĐỘNG (TYPO TRAP)
    # Hàm .edit_distance_1 tự động sinh các biến thể trượt phím, thiếu chữ khoảng cách Levenshtein = 1
    typo_pool = list(spell.edit_distance_1(word_clean))
    # Lọc chỉ giữ lại những từ viết sai chính tả thực tế (không nằm trong từ điển chuẩn)
    valid_typos = [t for t in typo_pool if t not in spell]

    if valid_typos:
        chosen_typo = random.choice(valid_typos)
        if word.isupper():
            return chosen_typo.upper()
        if word[0].isupper():
            return chosen_typo.capitalize()
        return chosen_typo

    # Fallback an toàn nếu cả 2 thư viện không tính toán được biến thể thích hợp
    return word + "s"


# --- Thuật toán 2: Sinh bẫy Tiếng Trung HOÀN TOÀN ĐỘNG (Xử lý từ ghép 1-2-3 chữ bóc từ Jieba) ---
def generate_chinese_trap_dynamic(word_to_corrupt: str) -> str:
    """
    Nhận vào một từ ghép tiếng Trung bóc từ Jieba (độ dài 1, 2, hoặc 3 chữ Hán).
    Chọn ngẫu nhiên 1 vị trí ký tự trong từ đó để tráo đổi bằng chữ đồng âm/gần âm từ pypinyin.
    """
    if not word_to_corrupt:
        return "某"

    char_list = list(word_to_corrupt)
    c_idx = random.randint(0, len(char_list) - 1)
    target_char = char_list[c_idx]

    py_raw = pypinyin.pinyin(target_char, style=pypinyin.Style.NORMAL)
    if not py_raw or not py_raw[0]:
        char_list[c_idx] = "某"
        return "".join(char_list)

    target_pinyin = py_raw[0][0]
    py_tone = pypinyin.pinyin(target_char, style=pypinyin.Style.TONE)[0][0]

    candidates = []
    tone_error_candidates = []

    for c in CHINESE_CHARS_SAMPLE:
        if c == target_char:
            continue
        c_py_raw = pypinyin.pinyin(c, style=pypinyin.Style.NORMAL)
        if c_py_raw and c_py_raw[0][0] == target_pinyin:
            c_py_tone = pypinyin.pinyin(c, style=pypinyin.Style.TONE)[0][0]
            if c_py_tone == py_tone:
                candidates.append(c)
            else:
                tone_error_candidates.append(c)

    if candidates:
        char_list[c_idx] = random.choice(candidates)
    elif tone_error_candidates:
        char_list[c_idx] = random.choice(tone_error_candidates)
    else:
        char_list[c_idx] = "某"

    return "".join(char_list)


# --- REQUEST SCHEMA ---
class SegmentRequest(BaseModel):
    text: str
    is_chinese: bool


# 🌟 ENDPOINT 1: BÀI TẬP XẾP CHỮ (GIỮ NGUYÊN FORM ĐÚNG CỦA BẠN)
@router.post("/segment")
async def segment_directly(payload: SegmentRequest):
    if not payload.text:
        return {"data": encrypt_aes_cbc({"tokens": []})}

    tokens = []
    if not payload.is_chinese:
        clean_text = re.sub(r"[.,\/#!$%\^&\*;:{}=\-_`~()!?，。]", "", payload.text)
        tokens = [t for t in clean_text.split() if t]
    else:
        clean_chinese = re.sub(
            r'[\s[:punct:]，。！？、（）()""\'\';；：:.]', "", payload.text
        )
        raw_tokens = jieba.cut(clean_chinese, cut_all=False)
        tokens = [t.strip() for t in raw_tokens if t.strip()]

    random.shuffle(tokens)
    encrypted_str = encrypt_aes_cbc({"tokens": tokens})
    return {"data": encrypted_str}


# 🌟 ENDPOINT 2: BÀI TẬP TÌM LỖI SAI (ĐỒNG BỘ JIEBA TÁCH TỪ GHÉP + MÃ HÓA AES-CBC)
@router.post("/spot-error")
async def spot_error_directly(payload: SegmentRequest):
    if not payload.text:
        return {
            "data": encrypt_aes_cbc(
                {"tokens": [], "error_index": -1, "correct_word": ""}
            )
        }

    original_text = payload.text.strip()

    # Phân tách mảng token dựa theo cấu trúc ngôn ngữ
    if payload.is_chinese:
        clean_chinese = re.sub(
            r"[.,\/#!$%\^&\*;:{}=\-_`~()!?，。！？、（）()\"';；：:’‘“”\[\]\{\}\\\s]",
            "",
            original_text,
        )

        # SỬ DỤNG JIEBA ĐỂ PHÂN TÁCH TỪ GHÉP LINH HOẠT CHÍNH QUY (1-2-3 CHỮ)
        raw_tokens = jieba.cut(clean_chinese, cut_all=False)
        original_tokens = [t.strip() for t in raw_tokens if t.strip()]
    else:
        original_tokens = original_text.split()

    if not original_tokens:
        return {
            "data": encrypt_aes_cbc(
                {"tokens": [], "error_index": -1, "correct_word": ""}
            )
        }

    # Lọc vị trí thích hợp để đặt bẫy
    valid_indices = [
        idx
        for idx, tok in enumerate(original_tokens)
        if payload.is_chinese or len(re.sub(r"[^a-zA-Z]", "", tok)) > 1
    ]
    if not valid_indices:
        valid_indices = list(range(len(original_tokens)))

    # Chọn ngẫu nhiên vị trí 1 từ ghép trong câu thoại để làm bẫy
    target_idx = random.choice(valid_indices)
    word_to_corrupt = original_tokens[target_idx]

    # KÍCH HOẠT THUẬT TOÁN TẠO BẪY ĐỘNG THEO TỪ GHÉP
    if payload.is_chinese:
        corrupted_word = generate_chinese_trap_dynamic(word_to_corrupt)
    else:
        # Chuẩn hóa Raw string cho English pattern bao quanh dấu câu
        punct_pattern = (
            r"[.,\/#!$%\^&\*;:{}=\-_`~()!?，。！？、（）()\"';；：:’‘“”\[\]\{\}\\]"
        )
        match = re.match(
            f"^({punct_pattern}*)(.*?)({punct_pattern}*)$", word_to_corrupt
        )
        if match:
            prefix, core, suffix = match.groups()
            corrupted_word = prefix + generate_english_trap_dynamic(core) + suffix
        else:
            corrupted_word = generate_english_trap_dynamic(word_to_corrupt)

    # Clone mảng hiển thị và nạp từ lỗi vào đúng index vàng
    display_tokens = original_tokens.copy()
    display_tokens[target_idx] = corrupted_word

    # Làm sạch dấu câu khỏi từ đúng để Frontend đối chiếu chấm điểm
    clean_correct_word = re.sub(
        r"[.,\/#!$%\^&\*;:{}=\-_`~()!?，。！？、（）()\"';；：:’‘“”\[\]\{\}\\\s]",
        "",
        word_to_corrupt,
    )

    # Đóng gói an toàn và mật mã hóa gói tin AES-CBC
    quiz_packet = {
        "tokens": display_tokens,
        "error_index": target_idx,
        "correct_word": clean_correct_word,
    }

    return {"data": encrypt_aes_cbc(quiz_packet)}
