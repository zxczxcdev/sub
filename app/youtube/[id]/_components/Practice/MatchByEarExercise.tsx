'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Undo2 } from 'lucide-react';

interface MatchByEarExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
    sourceLang?: string; // Để nhận diện nếu cần chia text theo ký tự đơn (tiếng Trung)
  } | null;
  onNextQuestion: () => void;
  streamConfig: { sourceLang: string } | null;
}

const MatchByEarExercise: React.FC<MatchByEarExerciseProps> = ({
  currentSub,
  onNextQuestion,
  streamConfig,
}) => {
  const [poolTokens, setPoolTokens] = React.useState<string[]>([]); // Các từ chưa chọn
  const [selectedTokens, setSelectedTokens] = React.useState<string[]>([]); // Các từ đã chọn theo thứ tự
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>(
    'idle',
  );

  // Khởi tạo và xáo trộn từ vựng khi đổi câu sub
  React.useEffect(() => {
    if (!currentSub) return;

    let tokens: string[] = [];
    const text = currentSub.original_text.trim();
    const isChinese = ['zh-hans', 'zh-hant', 'zh'].includes(
      streamConfig?.sourceLang?.toLowerCase() || '',
    );

    if (isChinese) {
      // Tiếng Trung: Tách thành từng ký tự, loại bỏ khoảng trắng và dấu câu cơ bản
      tokens = text
        .replace(/[\s[:punct:]，。！？、（）()""'';；：:]/g, '')
        .split('');
    } else {
      // Ngôn ngữ khác: Tách theo khoảng trắng, loại bỏ dấu câu ở rìa từ
      tokens = text
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?，。]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 0);
    }

    // Sao chép mảng và xáo trộn ngẫu nhiên (Fisher-Yates)
    const shuffled = [...tokens];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setPoolTokens(shuffled);
    setSelectedTokens([]);
    setStatus('idle');
  }, [currentSub, streamConfig]);

  if (!currentSub) return null;

  // Chọn từ đưa lên khay đáp án
  const handleSelectToken = (token: string, index: number) => {
    if (status === 'success') return;
    setSelectedTokens([...selectedTokens, token]);
    setPoolTokens(poolTokens.filter((_, i) => i !== index));
    if (status === 'error') setStatus('idle');
  };

  // Trả từ ngược lại khay lựa chọn
  const handleUnselectToken = (token: string, index: number) => {
    if (status === 'success') return;
    setPoolTokens([...poolTokens, token]);
    setSelectedTokens(selectedTokens.filter((_, i) => i !== index));
    if (status === 'error') setStatus('idle');
  };

  // Reset nhanh toàn bộ từ đã chọn
  const handleReset = () => {
    if (status === 'success') return;
    setPoolTokens([...poolTokens, ...selectedTokens]);
    setSelectedTokens([]);
    setStatus('idle');
  };

  // Kiểm tra đáp án
  const handleCheckAnswer = () => {
    const isChinese = ['zh-hans', 'zh-hant', 'zh'].includes(
      streamConfig?.sourceLang?.toLowerCase() || '',
    );

    const cleanOriginal = currentSub.original_text
      .toLowerCase()
      .replace(/[\s[:punct:]，。！？、（）()""'';；：:]/g, '');

    const cleanUser = selectedTokens.join(isChinese ? '' : '').toLowerCase();

    if (cleanUser === cleanOriginal) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto pt-2 animate-in fade-in-50 duration-200">
      {/* 1. GỢI Ý NGHĨA DỊCH */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/60 select-none">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
          Gợi ý nghĩa bản dịch
        </span>
        <p className="text-sm font-medium text-foreground">
          "{currentSub.text}"
        </p>
      </div>

      {/* 2. KHAY CHỨA CÁC TỪ ĐÃ CHỌN (ANSWER AREA) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between select-none">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Câu trả lời của bạn
          </span>
          {selectedTokens.length > 0 && status !== 'success' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="w-3 h-3" /> Làm lại
            </Button>
          )}
        </div>

        <div className="min-h-[60px] p-3 rounded-xl border border-dashed bg-background/50 flex flex-wrap gap-2 items-center">
          {selectedTokens.length === 0 ? (
            <span className="text-xs text-muted-foreground/50 italic select-none pl-1">
              Click các thẻ từ bên dưới theo đúng thứ tự nghe thấy...
            </span>
          ) : (
            selectedTokens.map((token, idx) => (
              <Button
                key={idx}
                type="button"
                variant="secondary"
                size="sm"
                disabled={status === 'success'}
                onClick={() => handleUnselectToken(token, idx)}
                className="h-8 rounded-lg font-medium text-sm border shadow-sm animate-in zoom-in-95 duration-150"
              >
                {token}
              </Button>
            ))
          )}
        </div>
      </div>

      {/* 3. KHAY CHỨA CÁC TỪ GỢI Ý ĐỂ LỰA CHỌN (POOL AREA) */}
      {poolTokens.length > 0 && (
        <div className="space-y-2 select-none">
          <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wide">
            Thẻ từ vựng xáo trộn
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

      {/* 4. PHẢN HỒI KẾT QUẢ */}
      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-0.5">
            <p className="font-bold">Ghép từ chính xác!</p>
            <p className="text-xs text-muted-foreground/90">
              Mạch câu hoàn toàn chuẩn cấu trúc.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-0.5">
            <p className="font-bold">Sai thứ tự từ!</p>
            <p className="text-xs text-muted-foreground/90">
              Nghe lại phân đoạn audio và sắp xếp lại các thẻ chữ.
            </p>
          </div>
        </div>
      )}

      {/* 5. NÚT ĐIỀU HƯỚNG BÀI TẬP */}
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

export default MatchByEarExercise;
