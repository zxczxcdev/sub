'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

interface FillBlankExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
  } | null;
  onNextQuestion: () => void;
  streamConfig: { sourceLang: string } | null;
}

const FillBlankExercise: React.FC<FillBlankExerciseProps> = ({
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

  // Hàm khởi tạo câu đố đục lỗ
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

    // Lọc các token hợp lệ (không phải dấu câu, độ dài > 0)
    const validIndices = tokens
      .map((t, idx) =>
        t.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?，。]/g, '').length > 0
          ? idx
          : -1,
      )
      .filter((idx) => idx !== -1);

    // Nếu không tìm được từ hợp lệ, chọn đại vị trí đầu tiên
    const blankIdx =
      validIndices.length > 0
        ? validIndices[Math.floor(Math.random() * validIndices.length)]
        : 0;

    const targetWord = tokens[blankIdx].replace(
      /[.,\/#!$%\^&\*;:{}=\-_`~()!?，。]/g,
      '',
    );

    // Tách câu làm 2 phần trước và sau vị trí đục lỗ để hiển thị trực quan
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
            <RotateCcw className="w-3 h-3" /> Trộn lại
          </Button>
        )}
      </div>

      {/* VÙNG ĐỌC VÀ ĐIỀN CHỖ TRỐNG TRỰC TIẾP TRÊN DÒNG CHỮ */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide select-none">
          Đọc ngữ cảnh và điền từ còn thiếu:
        </span>

        <div className="p-6 rounded-xl border bg-background flex flex-wrap items-center gap-y-2 leading-relaxed text-lg font-semibold text-foreground/90">
          <span>{beforeBlank}</span>

          <Input
            placeholder="..."
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            disabled={status === 'success'}
            className="h-8 mx-1 text-center font-bold text-primary border-b-2 border-t-0 border-x-0 border-muted-foreground/40 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary p-1 text-lg transition-colors"
            style={{ width: `${Math.max(45, userAnswer.length * 12 + 20)}px` }}
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
          <div className="text-sm space-y-0.5">
            <p className="font-bold">Hoàn toàn chính xác!</p>
            <p className="text-xs text-muted-foreground/90">
              Bạn đã điền đúng từ:{' '}
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
          <div className="text-sm space-y-1">
            <p className="font-bold">Từ điền chưa khớp!</p>
            <p className="text-xs text-muted-foreground/90">
              Hãy dựa vào âm thanh hoặc nghĩa dịch để thử lại một từ khác.
            </p>
            <div className="text-xs pt-1 border-t border-destructive/10 mt-2 font-mono text-muted-foreground">
              Gợi ý: Từ này có{' '}
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

export default FillBlankExercise;
