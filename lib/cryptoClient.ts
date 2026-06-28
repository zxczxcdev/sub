/**
 * Hàm giải mã gói tin AES-CBC trực tiếp trên trình duyệt (Client-side)
 */
export async function decryptClientData(
  encryptedPacketStr: string,
): Promise<any> {
  try {
    // Kỹ thuật che giấu Key thô: Không khai báo trực tiếp chuỗi liền mạch
    // Tránh việc các công cụ scan chuỗi string dịch ngược tìm ra cụm "SecretKey16Bytes"
    const part1 = 'nguyen';
    const part2 = 'khoa';
    const part3 = '210999';
    const finalKeyStr = part1 + part2 + part3;

    const enc = new TextEncoder();
    const keyBytes = enc.encode(finalKeyStr);

    // Import khóa vào Web Crypto API của Trình duyệt
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-CBC' },
      false,
      ['decrypt'],
    );

    const packet = JSON.parse(encryptedPacketStr);

    // Chuyển chuỗi Base64 từ Python về mảng byte dữ liệu của trình duyệt
    const ivBytes = Uint8Array.from(atob(packet.iv), (c) => c.charCodeAt(0));
    const ciphertextBytes = Uint8Array.from(atob(packet.ciphertext), (c) =>
      c.charCodeAt(0),
    );

    // Thực hiện giải mã trực tiếp bằng phần cứng trình duyệt (Zero latency, không tốn tài nguyên server)
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: ivBytes,
      },
      cryptoKey,
      ciphertextBytes,
    );

    const dec = new TextDecoder();
    const decryptedText = dec.decode(decryptedBuffer);

    return JSON.parse(decryptedText); // Khôi phục mảng gốc { tokens: [...] }
  } catch (error) {
    console.error('Giải mã thất bại ở Trình duyệt:', error);
    return { tokens: [] };
  }
}
