'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

interface TranslateBlankExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
  } | null;
  onNextQuestion: () => void;
  streamConfig: { sourceLang: string } | null;
}

const TranslateBlankExercise: React.FC<TranslateBlankExerciseProps> = ({
  currentSub,
  onNextQuestion,
  streamConfig,
}) => {
  const [beforeBlank, setBeforeBlank] = React.useState('');
  const [afterBlank, setAfterBlank] = React.useState('');
  const [correctAnswer, setCorrectAnswer] = React.useState('');
  const [userAnswer, setUserAnswer] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>(
    'idle',
  );

  const initExercise = React.useCallback(() => {
    if (!currentSub) return;

    const originalText = currentSub.original_text.trim();
    const isChinese = ['zh-hans', 'zh-hant', 'zh'].includes(
      streamConfig?.sourceLang?.toLowerCase() || '',
    );

    let tokens: string[] = [];
    if (isChinese) {
      tokens = originalText
        .replace(/[\s[:punct:]，。！？、（）()""'';；：:]/g, '')
        .split('');
    } else {
      tokens = originalText.split(/\s+/);
    }

    if (tokens.length === 0) return;

    // Lấy các index token từ hợp lệ
    const validIndices = tokens
      .map((t, idx) =>
        t.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?，。]/g, '').length > 0
          ? idx
          : -1,
      )
      .filter((idx) => idx !== -1);

    const blankIdx =
      validIndices.length > 0
        ? validIndices[Math.floor(Math.random() * validIndices.length)]
        : 0;

    const targetWord = tokens[blankIdx].replace(
      /[.,\/#!$%\^&\*;:{}=\-_`~()!?，。]/g,
      '',
    );

    if (isChinese) {
      setBeforeBlank(tokens.slice(0, blankIdx).join(''));
      setAfterBlank(tokens.slice(blankIdx + 1).join(''));
    } else {
      setBeforeBlank(tokens.slice(0, blankIdx).join(' ') + ' ');
      setAfterBlank(' ' + tokens.slice(blankIdx + 1).join(' '));
    }

    setCorrectAnswer(targetWord);
    setUserAnswer('');
    setStatus('idle');
  }, [currentSub, streamConfig]);

  React.useEffect(() => {
    initExercise();
  }, [initExercise]);

  if (!currentSub) return null;

  const handleCheckAnswer = () => {
    const cleanUser = userAnswer
      .trim()
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?，。]/g, '');
    const cleanCorrect = correctAnswer.toLowerCase();

    if (cleanUser === cleanCorrect) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto pt-2 animate-in fade-in-50 duration-200">
      {/* KHỐI HIỂN THỊ NGHĨA DỊCH TOÀN CÂU */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/60 select-none flex justify-between items-start">
        <div className="space-y-1 flex-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Bản dịch nghĩa tiếng Việt gợi ý
          </span>
          <p className="text-sm font-semibold text-foreground leading-relaxed">
            "{currentSub.text}"
          </p>
        </div>
        {status !== 'success' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={initExercise}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground rounded-lg shrink-0 ml-2"
          >
            <RotateCcw className="w-3 h-3" /> Đổi vị trí đục lỗ
          </Button>
        )}
      </div>

      {/* VÙNG ĐIỀN CỤM TỪ KHUYẾT THEO DỊCH NGHĨA */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide select-none block">
          Dịch cụm từ tương ứng để hoàn thiện câu gốc:
        </span>

        <div className="p-6 rounded-xl border bg-background flex flex-wrap items-center gap-y-2 leading-relaxed text-lg font-semibold text-foreground/90 shadow-sm border-zinc-200/80">
          <span>{beforeBlank}</span>

          <Input
            placeholder="viết từ còn thiếu..."
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            disabled={status === 'success'}
            className="h-8 mx-1 text-center font-bold text-violet-600 border-b-2 border-t-0 border-x-0 border-violet-500/30 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-violet-500 p-1 text-lg transition-all placeholder:text-muted-foreground/30 placeholder:text-xs placeholder:font-normal"
            style={{ width: `${Math.max(120, userAnswer.length * 12 + 25)}px` }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userAnswer.trim() && status === 'idle') {
                handleCheckAnswer();
              }
            }}
          />

          <span>{afterBlank}</span>
        </div>
      </div>

      {/* PHẢN HỒI KẾT QUẢ VÀ HIỂN THỊ ĐÁP ÁN */}
      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Dịch và viết chính xác!</p>
            <p className="text-xs text-muted-foreground/90">
              Từ khuyết dịch chuẩn xác là:{' '}
              <span className="font-bold underline text-emerald-600 dark:text-emerald-400">
                {correctAnswer}
              </span>
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm flex-1 space-y-1">
            <p className="font-bold">Chưa khớp với từ nghĩa gốc!</p>
            <p className="text-xs text-muted-foreground/90">
              Từ vựng bạn nhập chưa khớp với cú pháp chính tả gốc. Hãy thử lại.
            </p>
            <div className="mt-2 pt-2 border-t border-destructive/10 text-xs font-mono text-muted-foreground/80">
              Gợi ý: Từ này bắt đầu bằng chữ cái "
              <span className="font-bold text-destructive">
                {correctAnswer.charAt(0)}
              </span>
              " và có{' '}
              <span className="font-bold text-destructive">
                {correctAnswer.length}
              </span>{' '}
              chữ cái.
            </div>
          </div>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG CHUYỂN CÂU */}
      <div className="flex justify-end pt-2 border-t border-dashed">
        {status !== 'success' ? (
          <Button
            onClick={handleCheckAnswer}
            disabled={!userAnswer.trim()}
            className="rounded-xl px-6 font-semibold shadow-sm text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white"
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

export default TranslateBlankExercise;
