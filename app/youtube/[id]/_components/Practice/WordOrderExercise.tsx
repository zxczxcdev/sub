'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Undo2 } from 'lucide-react';
import { decryptClientData } from '@/lib/cryptoClient';

interface WordOrderExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
  } | null;
  onNextQuestion: () => void;
  streamConfig: { sourceLang: string } | null;
}

const WordOrderExercise: React.FC<WordOrderExerciseProps> = ({
  currentSub,
  onNextQuestion,
  streamConfig,
}) => {
  const [poolTokens, setPoolTokens] = React.useState<string[]>([]);
  const [selectedTokens, setSelectedTokens] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>(
    'idle',
  );

  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  React.useEffect(() => {
    if (!currentSub) return;

    const isChinese = ['zh-hans', 'zh-hant', 'zh'].includes(
      streamConfig?.sourceLang?.toLowerCase() || '',
    );

    const PUNCT_REGEX = /[\s[:punct:]，。！？、（）()""'';；：:._`~’‘“”]/g;

    const loadTokensDirectly = async () => {
      if (!isChinese) {
        const rawWords = currentSub.original_text.split(/\s+/);

        // Giữ nguyên từ gốc (chỉ loại bỏ khoảng trắng rỗng), không replace dấu câu lúc tạo token
        // để người dùng nhìn thấy từ hoàn chỉnh (ví dụ: "don't" thay vì biến thành "dont")
        const cleanWords = rawWords.filter((word) => word.trim().length > 0);

        setPoolTokens(shuffleArray(cleanWords));
        setSelectedTokens([]);
        setStatus('idle');
        return;
      }

      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${baseUrl}/api/practice/segment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: currentSub.original_text,
            is_chinese: true,
          }),
        });

        const resData = await response.json();
        if (!resData.data) return;

        const decryptedData = await decryptClientData(resData.data);
        const tokens: string[] = decryptedData.tokens || [];

        if (tokens.length === 0) return;

        setPoolTokens(tokens);
        setSelectedTokens([]);
        setStatus('idle');
      } catch (error) {
        console.error('Lỗi kết nối trực tiếp FastAPI ở WordOrder:', error);
        const fallbackChinese = currentSub.original_text
          .replace(PUNCT_REGEX, '')
          .split('');
        setPoolTokens(shuffleArray(fallbackChinese));
      }
    };

    loadTokensDirectly();
  }, [currentSub, streamConfig]);

  if (!currentSub) return null;

  const handleSelectToken = (token: string, index: number) => {
    if (status === 'success') return;
    setSelectedTokens([...selectedTokens, token]);
    setPoolTokens(poolTokens.filter((_, i) => i !== index));
    if (status === 'error') setStatus('idle');
  };

  const handleUnselectToken = (token: string, index: number) => {
    if (status === 'success') return;
    setPoolTokens([...poolTokens, token]);
    setSelectedTokens(selectedTokens.filter((_, i) => i !== index));
    if (status === 'error') setStatus('idle');
  };

  const handleReset = () => {
    if (status === 'success') return;
    setPoolTokens([...poolTokens, ...selectedTokens]);
    setSelectedTokens([]);
    setStatus('idle');
  };

  const handleCheckAnswer = () => {
    if (!currentSub) return;

    // 🌟 SỬ DỤNG REGEX UNICODE CHUẨN TRÌNH DUYỆT ĐỂ XÓA SẠCH DẤU CÂU + KHOẢNG TRẮNG
    // \p{P} đại diện cho tất cả các loại dấu câu trên thế giới (Anh, Trung, Hàn, Nhật...)
    // /g: tìm kiếm toàn bộ, /u: kích hoạt chế độ xử lý Unicode nâng cao
    const CLEAN_REGEX = /[\s\p{P}’‘“”]/gu;

    const cleanOriginal = currentSub.original_text
      .toLowerCase()
      .replace(CLEAN_REGEX, '');

    const cleanUser = selectedTokens
      .join('')
      .toLowerCase()
      .replace(CLEAN_REGEX, '');

    if (cleanUser === cleanOriginal) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  // Hàm in thông tin ra tab Console F12
  const printDebugInfo = (
    rawOriginal: string,
    userTokens: string[],
    cleanOrig: string,
    cleanUsr: string,
  ) => {
    console.log(
      '%c========= WORD ORDER DEBUG =========',
      'color: #3b82f6; font-weight: bold; font-size: 12px;',
    );
    console.log('1. Câu gốc chưa xử lý :', `"${rawOriginal}"`);
    console.log('2. Các token user xếp :', userTokens);
    console.log(
      '3. Chuỗi GỐC sau dọn dẹp :',
      `"${cleanOrig}" (Độ dài: ${cleanOrig.length})`,
    );
    console.log(
      '4. Chuỗi USER sau dọn dẹp:',
      `"${cleanUsr}" (Độ dài: ${cleanUsr.length})`,
    );
    console.log(
      '5. Kết quả so khớp trực tiếp :',
      cleanOrig === cleanUsr ? '%cĐÚNG KHỚP 100%' : '%cTHẤT BẠI (LỆCH CHUỖI)',
      cleanOrig === cleanUsr
        ? 'color: green; font-weight: bold;'
        : 'color: red; font-weight: bold;',
    );
    console.log(
      '%c=====================================',
      'color: #3b82f6; font-weight: bold;',
    );
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto pt-2 animate-in fade-in-50 duration-200">
      <div className="p-4 rounded-xl bg-muted/50 border border-border/60 select-none">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
          Dựa vào nghĩa dịch để sắp xếp câu viết:
        </span>
        <p className="text-sm font-medium text-foreground">
          "{currentSub.text}"
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between select-none">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Cấu trúc câu viết của bạn
          </span>
          {selectedTokens.length > 0 && status !== 'success' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="w-3 h-3" /> Thu hồi từ
            </Button>
          )}
        </div>

        <div className="min-h-[60px] p-3 rounded-xl border border-dashed bg-background/50 flex flex-wrap gap-2 items-center shadow-inner">
          {selectedTokens.length === 0 ? (
            <span className="text-xs text-muted-foreground/40 italic select-none pl-1">
              Bấm chọn các thẻ từ bên dưới để dựng lại câu chuẩn xác...
            </span>
          ) : (
            selectedTokens.map((token, idx) => (
              <Button
                key={idx}
                type="button"
                variant="default"
                size="sm"
                disabled={status === 'success'}
                onClick={() => handleUnselectToken(token, idx)}
                className="h-8 rounded-lg font-medium text-sm border shadow-sm animate-in zoom-in-95 duration-150 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-black"
              >
                {token}
              </Button>
            ))
          )}
        </div>
      </div>

      {poolTokens.length > 0 && (
        <div className="space-y-2 select-none">
          <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wide">
            Kho từ vựng lắp ráp
          </span>
          <div className="p-4 rounded-xl border bg-muted/20 flex flex-wrap gap-2">
            {poolTokens.map((token, idx) => (
              <Button
                key={idx}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectToken(token, idx)}
                className="h-8 rounded-lg font-medium text-sm bg-background hover:bg-muted border shadow-sm transition-all active:scale-95"
              >
                {token}
              </Button>
            ))}
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Cấu trúc câu hoàn toàn chính xác!</p>
            <p className="text-xs text-muted-foreground/90">
              Bạn đã thành thạo cách viết câu này.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Sai trật tự cú pháp!</p>
            <p className="text-xs text-muted-foreground/90">
              Các từ chưa được xếp đúng vị trí ngữ pháp chuẩn.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-dashed">
        {status !== 'success' ? (
          <Button
            onClick={handleCheckAnswer}
            disabled={selectedTokens.length === 0 || poolTokens.length > 0}
            className="rounded-xl px-6 font-semibold shadow-sm text-xs h-9"
          >
            Kiểm tra đáp án
          </Button>
        ) : (
          <Button
            onClick={onNextQuestion}
            className="rounded-xl px-6 font-semibold shadow-sm text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Chuyển câu tiếp theo
          </Button>
        )}
      </div>
    </div>
  );
};

export default WordOrderExercise;
