'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Undo2 } from 'lucide-react';

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

  const initExercise = React.useCallback(() => {
    if (!currentSub) return;

    let tokens: string[] = [];
    const text = currentSub.original_text.trim();
    const isChinese = ['zh-hans', 'zh-hant', 'zh'].includes(
      streamConfig?.sourceLang?.toLowerCase() || '',
    );

    if (isChinese) {
      tokens = text
        .replace(/[\s[:punct:]，。！？、（）()""'';；：:]/g, '')
        .split('');
    } else {
      tokens = text
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?，。]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 0);
    }

    const shuffled = [...tokens];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setPoolTokens(shuffled);
    setSelectedTokens([]);
    setStatus('idle');
  }, [currentSub, streamConfig]);

  React.useEffect(() => {
    initExercise();
  }, [initExercise]);

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
      {/* GỢI Ý NGHĨA DỊCH DẪN DẮT NGỮ PHÁP */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/60 select-none">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
          Dựa vào nghĩa dịch để sắp xếp câu viết:
        </span>
        <p className="text-sm font-medium text-foreground">
          "{currentSub.text}"
        </p>
      </div>

      {/* KHAY ĐÁP ÁN ĐANG GHÉP */}
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

      {/* KHAY CHỨA TỪ KHÓA CHỜ CHỌN */}
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

      {/* HIỂN THỊ TRẠNG THÁI */}
      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Cấu trúc câu hoàn toàn chính xác!</p>
            <p className="text-xs text-muted-foreground/90">
              Bạn đã thành thạo cách viết và trật tự ngữ pháp câu này.
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
              Các từ chưa được xếp đúng vị trí ngữ pháp chuẩn. Nhấn "Thu hồi từ"
              để chỉnh lại.
            </p>
          </div>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG ACTION BÊN DƯỚI */}
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
