'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { decryptClientData } from '@/lib/cryptoClient'; // 🌟 Import helper giải mã bảo mật

interface SpotErrorExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
  } | null;
  onNextQuestion: () => void;
  streamConfig: { sourceLang: string } | null;
}

const SpotErrorExercise: React.FC<SpotErrorExerciseProps> = ({
  currentSub,
  onNextQuestion,
  streamConfig,
}) => {
  const [tokens, setTokens] = React.useState<string[]>([]);
  const [errorIndex, setErrorIndex] = React.useState<number | null>(null);
  const [correctWord, setCorrectWord] = React.useState<string>('');
  const [selectedWordIndex, setSelectedWordIndex] = React.useState<
    number | null
  >(null);
  const [userCorrection, setUserCorrection] = React.useState('');
  const [status, setStatus] = React.useState<
    'idle' | 'finding' | 'success' | 'error'
  >('idle');
  const [isCorrectionError, setIsCorrectionError] = React.useState(false);

  // Biểu thức Unicode dọn sạch ký tự đặc biệt đồng bộ trên trình duyệt
  const CLEAN_REGEX = /[\s\p{P}’‘“”\-\[\]\{\}\\\/]/gu;

  const initExercise = React.useCallback(() => {
    if (!currentSub) return;

    const isChinese = ['zh-hans', 'zh-hant', 'zh'].includes(
      streamConfig?.sourceLang?.toLowerCase() || '',
    );

    const loadSpotErrorQuizDirectly = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        // 🌟 GỌI TRỰC TIẾP LÊN ENDPOINT TẠO BẪY THÔNG MINH CỦA FASTAPI
        const response = await fetch(`${baseUrl}/api/practice/spot-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: currentSub.original_text,
            is_chinese: isChinese,
          }),
        });

        const resData = await response.json();
        if (!resData.data) return;

        // 🌟 GIẢI MÃ GÓI TIN CHỨA ĐÁP ÁN BẰNG PHẦN CỨNG TRÌNH DUYỆT
        const decryptedData = await decryptClientData(resData.data);

        if (!decryptedData.tokens || decryptedData.error_index === -1) return;

        setTokens(decryptedData.tokens);
        setErrorIndex(decryptedData.error_index);
        setCorrectWord(decryptedData.correct_word);

        setSelectedWordIndex(null);
        setUserCorrection('');
        setStatus('idle');
        setIsCorrectionError(false);
      } catch (error) {
        console.error('Lỗi kết nối FastAPI hoặc giải mã tại SpotError:', error);

        // Luồng dự phòng (Fallback) cục bộ nếu mất kết nối server
        const originalTokens = isChinese
          ? currentSub.original_text.replace(CLEAN_REGEX, '').split('')
          : currentSub.original_text.split(/\s+/);

        if (originalTokens.length > 0) {
          const fallbackIdx = Math.floor(Math.random() * originalTokens.length);
          const rawWord = originalTokens[fallbackIdx];
          const display = [...originalTokens];
          display[fallbackIdx] = isChinese ? '某' : rawWord + 'x';

          setTokens(display);
          setErrorIndex(fallbackIdx);
          setCorrectWord(rawWord.replace(CLEAN_REGEX, ''));
        }
      }
    };

    loadSpotErrorQuizDirectly();
  }, [currentSub, streamConfig]);

  React.useEffect(() => {
    initExercise();
  }, [initExercise]);

  if (!currentSub) return null;

  const handleWordClick = (idx: number) => {
    if (status === 'success') return;
    setSelectedWordIndex(idx);
    if (status === 'error') setStatus('idle');
  };

  const handleVerifyErrorLocation = () => {
    if (selectedWordIndex === errorIndex) {
      setStatus('finding');
    } else {
      setStatus('error');
      setIsCorrectionError(false);
    }
  };

  const handleVerifyCorrection = () => {
    const cleanUser = userCorrection
      .trim()
      .toLowerCase()
      .replace(CLEAN_REGEX, '');
    const cleanCorrect = correctWord.toLowerCase();

    if (cleanUser === cleanCorrect) {
      setStatus('success');
      setIsCorrectionError(false);
    } else {
      setStatus('error');
      setIsCorrectionError(true);
    }
  };

  const renderDetailedError = () => {
    const cleanUser = userCorrection.trim();
    const cleanCorrect = correctWord;

    return (
      <div className="mt-2 text-xs border-t border-destructive/20 pt-2 space-y-1 bg-destructive/5 p-2.5 rounded-lg font-mono">
        <p className="font-semibold text-destructive/90">
          🔍 Phân tích chi tiết lỗi gõ:
        </p>
        <p className="text-muted-foreground">
          Bạn nhập:{' '}
          <span className="text-rose-500 bg-rose-500/10 px-1 rounded">
            {cleanUser || 'trống'}
          </span>
        </p>
        <p className="text-muted-foreground">
          Đáp án đúng:{' '}
          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
            {cleanCorrect}
          </span>
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto pt-2 animate-in fade-in-50 duration-200">
      {/* GỢI Ý BẢN DỊCH NGHĨA */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/60 select-none flex justify-between items-start">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Gợi ý nghĩa bản dịch
          </span>
          <p className="text-sm font-medium text-foreground">
            "{currentSub.text}"
          </p>
        </div>
        {status !== 'success' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={initExercise}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <RotateCcw className="w-3 h-3" /> Reset bẫy mới
          </Button>
        )}
      </div>

      {/* ĐOẠN PHỤ ĐỀ CHỨA LỖI SAI CHÍNH TẢ */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide select-none">
          Nghe kỹ Audio, tìm và bấm vào một từ/chữ viết sai chính tả ngữ âm:
        </span>

        <div className="p-4 rounded-xl border bg-background flex flex-wrap gap-x-2 gap-y-3 leading-relaxed items-center">
          {tokens.map((token, idx) => {
            const isWordSelected = selectedWordIndex === idx;
            return (
              <span
                key={idx}
                onClick={() => handleWordClick(idx)}
                className={`text-base font-semibold px-2 py-0.5 rounded-lg cursor-pointer transition-all select-none border ${
                  isWordSelected
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'bg-transparent border-transparent hover:bg-muted/70'
                }`}
              >
                {token}
              </span>
            );
          })}
        </div>
      </div>

      {/* HIỂN THỊ Ô SỬA LỖI CHÍNH TẢ KHI ĐÃ TÌM ĐÚNG VỊ TRÍ VÀNG */}
      {(status === 'finding' || isCorrectionError) && (
        <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 select-none">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Bạn đã tìm đúng từ bị sai!
              Giờ hãy sửa lại từ đó:
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Gõ lại từ viết đúng chuẩn chính tả..."
              value={userCorrection}
              onChange={(e) => {
                setUserCorrection(e.target.value);
                if (isCorrectionError) {
                  setStatus('finding');
                  setIsCorrectionError(false);
                }
              }}
              className="h-9 rounded-xl border-zinc-200 focus-visible:ring-amber-500 bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && userCorrection.trim())
                  handleVerifyCorrection();
              }}
            />
            <Button
              size="sm"
              onClick={handleVerifyCorrection}
              disabled={!userCorrection.trim()}
              className="h-9 rounded-xl px-4 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-sm"
            >
              Xác nhận sửa
            </Button>
          </div>
        </div>
      )}

      {/* TRẠNG THÁI PHẢN HỒI KẾT QUẢ */}
      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-0.5">
            <p className="font-bold">Tuyệt vời, sửa lỗi thành công!</p>
            <p className="text-xs text-muted-foreground/90">
              Từ đúng nguyên bản của câu là:{' '}
              <span className="font-bold underline">{correctWord}</span>
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive animate-in fade-in duration-200">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-0.5 flex-1">
            <p className="font-bold">Chưa chính xác!</p>
            <p className="text-xs text-muted-foreground/90">
              {selectedWordIndex !== errorIndex
                ? 'Từ bạn vừa chọn không phải là từ bị viết sai. Hãy nghe kỹ lại audio.'
                : 'Chính tả bạn vừa gõ sửa lại vẫn chưa khớp với video thoại.'}
            </p>
            {isCorrectionError && renderDetailedError()}
          </div>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG THAO TÁC ACTION */}
      {status !== 'success' && status !== 'finding' && !isCorrectionError && (
        <div className="flex justify-end pt-2 border-t border-dashed">
          <Button
            onClick={handleVerifyErrorLocation}
            disabled={selectedWordIndex === null}
            className="rounded-xl px-6 font-semibold shadow-sm text-xs h-9"
          >
            Xác nhận vị trí lỗi
          </Button>
        </div>
      )}

      {status === 'success' && (
        <div className="flex justify-end pt-2 border-t border-dashed">
          <Button
            onClick={onNextQuestion}
            className="rounded-xl px-6 font-semibold shadow-sm text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Chuyển câu tiếp theo
          </Button>
        </div>
      )}
    </div>
  );
};

export default SpotErrorExercise;
