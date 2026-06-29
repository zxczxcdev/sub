'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

interface TypeBlankExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
  } | null;
  onNextQuestion: () => void;
  streamConfig: { sourceLang: string } | null;
}

const TypeBlankExercise: React.FC<TypeBlankExerciseProps> = ({
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

  // Khởi tạo câu đố khuyết từ dựa trên audio
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

    // Lọc lấy các index từ thực tế (bỏ qua dấu câu đơn lẻ)
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
      {/* KHỐI NHẮC NHỞ LUYỆN VIẾT */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 select-none flex justify-between items-center">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
            Yêu cầu bài tập
          </span>
          <p className="text-xs text-muted-foreground">
            Hãy nghe Audio và tự gõ chính xác từ còn thiếu vào ô trống bên dưới.
          </p>
        </div>
        {status !== 'success' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={initExercise}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <RotateCcw className="w-3 h-3" /> Đổi từ khác
          </Button>
        )}
      </div>

      {/* VÙNG ĐIỀN CHỖ TRỐNG KHÔNG GỢI Ý DỊCH */}
      <div className="space-y-3">
        <div className="p-6 rounded-xl border bg-background flex flex-wrap items-center gap-y-2 leading-relaxed text-lg font-semibold text-foreground/90 shadow-sm">
          <span>{beforeBlank}</span>

          <Input
            placeholder="gõ từ..."
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            disabled={status === 'success'}
            className="h-8 mx-1 text-center font-bold text-amber-600 border-b-2 border-t-0 border-x-0 border-amber-500/30 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-amber-500 p-1 text-lg transition-all placeholder:text-muted-foreground/30 placeholder:text-sm placeholder:font-normal"
            style={{ width: `${Math.max(70, userAnswer.length * 12 + 25)}px` }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userAnswer.trim() && status === 'idle') {
                handleCheckAnswer();
              }
            }}
          />

          <span>{afterBlank}</span>
        </div>
      </div>

      {/* PHẢN HỒI KẾT QUẢ */}
      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Nghe viết chính xác!</p>
            <p className="text-xs text-muted-foreground/90">
              Từ bạn gõ hoàn toàn trùng khớp với âm thoại:{' '}
              <span className="font-bold underline">{correctAnswer}</span>
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm flex-1 space-y-1">
            <p className="font-bold">Chưa khớp với Audio!</p>
            <p className="text-xs text-muted-foreground/90">
              Hãy bấm nút "Play audio" ở thanh trên để nghe lại kỹ phát âm của
              từ này.
            </p>
            <div className="mt-2 pt-2 border-t border-destructive/10 text-xs font-mono text-muted-foreground/80">
              Gợi ý độ dài: Từ này có tất cả{' '}
              <span className="font-bold text-destructive">
                {correctAnswer.length}
              </span>{' '}
              ký tự.
            </div>
          </div>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG ACTION */}
      <div className="flex justify-end pt-2 border-t border-dashed">
        {status !== 'success' ? (
          <Button
            onClick={handleCheckAnswer}
            disabled={!userAnswer.trim()}
            className="rounded-xl px-6 font-semibold shadow-sm text-xs h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-black"
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

export default TypeBlankExercise;
