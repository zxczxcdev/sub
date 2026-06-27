'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

interface MatchTranslationExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
  } | null;
  subtitles: any[];
  onNextQuestion: () => void;
}

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

const MatchTranslationExercise: React.FC<MatchTranslationExerciseProps> = ({
  currentSub,
  subtitles,
  onNextQuestion,
}) => {
  const [options, setOptions] = React.useState<Option[]>([]);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(
    null,
  );
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>(
    'idle',
  );

  // Hàm tạo danh sách câu hỏi trắc nghiệm nghĩa dịch
  const initExercise = React.useCallback(() => {
    if (!currentSub || !subtitles || subtitles.length === 0) return;

    // 1. Đáp án đúng
    const correctOpt: Option = {
      id: 'correct',
      text: currentSub.text,
      isCorrect: true,
    };

    // 2. Lấy danh sách các câu dịch khác làm câu nhiễu (Loại bỏ câu hiện tại)
    const otherSubs = subtitles.filter(
      (sub) =>
        sub.text.trim() !== currentSub.text.trim() &&
        sub.text.trim().length > 0,
    );

    // Xáo trộn danh sách câu khác để lấy ra tối đa 3 câu làm bẫy
    const shuffledOthers = [...otherSubs].sort(() => 0.5 - Math.random());
    const distractors = shuffledOthers.slice(0, 3).map((sub, index) => ({
      id: `wrong-${index}`,
      text: sub.text,
      isCorrect: false,
    }));

    // 3. Gộp đáp án đúng và các câu nhiễu rồi trộn ngẫu nhiên lại một lần nữa
    const allOptions = [correctOpt, ...distractors].sort(
      () => 0.5 - Math.random(),
    );

    setOptions(allOptions);
    setSelectedOptionId(null);
    setStatus('idle');
  }, [currentSub, subtitles]);

  React.useEffect(() => {
    initExercise();
  }, [initExercise]);

  if (!currentSub) return null;

  const handleOptionClick = (option: Option) => {
    if (status === 'success') return;
    setSelectedOptionId(option.id);

    if (option.isCorrect) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto pt-2 animate-in fade-in-50 duration-200">
      {/* CÂU GỐC TIẾNG NƯỚC NGOÀI */}
      <div className="p-5 rounded-xl border bg-muted/30 flex flex-col gap-1.5 items-center justify-center text-center select-none min-h-[80px]">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
          Văn bản gốc
        </span>
        <p className="text-xl font-bold text-foreground leading-relaxed">
          {currentSub.original_text}
        </p>
      </div>

      {/* DANH SÁCH CÁC LỰA CHỌN NGHĨA DỊCH TRẮC NGHIỆM */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide select-none block">
          Chọn bản dịch tiếng Việt chính xác nhất:
        </span>

        <div className="grid grid-cols-1 gap-2.5">
          {options.map((option) => {
            const isSelected = selectedOptionId === option.id;

            // Xác định màu sắc động dựa trên kết quả click
            let btnVariant: 'outline' | 'default' | 'destructive' = 'outline';
            let customClass =
              'hover:bg-muted/70 justify-start text-left h-auto p-4 rounded-xl text-sm font-medium leading-relaxed border-zinc-200';

            if (isSelected) {
              if (option.isCorrect) {
                customClass +=
                  ' bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10';
              } else {
                customClass +=
                  ' bg-destructive/10 border-destructive text-destructive hover:bg-destructive/10';
              }
            } else if (status === 'error' && option.isCorrect) {
              // Nếu user chọn sai, highlight nhẹ đáp án đúng lên cho họ thấy
              customClass +=
                ' border-emerald-500/50 text-emerald-600 dark:text-emerald-400 border-dashed';
            }

            return (
              <Button
                key={option.id}
                variant={btnVariant}
                disabled={status === 'success' && !isSelected}
                onClick={() => handleOptionClick(option)}
                className={customClass}
              >
                <div className="flex items-start gap-3 w-full">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full border bg-background text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                    {isSelected && option.isCorrect
                      ? '✓'
                      : isSelected
                        ? '✕'
                        : '•'}
                  </span>
                  <span className="break-words flex-1">{option.text}</span>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* PHẢN HỒI TRẠNG THÁI */}
      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Chính xác!</p>
            <p className="text-xs text-muted-foreground/90">
              Bạn đã chọn đúng nghĩa tương thích hoàn toàn với ngữ cảnh của câu
              thoại.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive animate-in fade-in duration-200 flex--wrap">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm flex-1 space-y-2">
            <div>
              <p className="font-bold">Lựa chọn chưa chính xác!</p>
              <p className="text-xs text-muted-foreground/90">
                Nghĩa dịch bạn chọn thuộc về một câu thoại khác trong video. Hãy
                thử chọn lại câu khác.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={initExercise}
              className="h-7 text-[11px] gap-1 border-destructive/20 text-destructive hover:bg-destructive/10 bg-background rounded-lg"
            >
              <RotateCcw className="w-3 h-3" /> Trộn lại phương án bẫy
            </Button>
          </div>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG CHUYỂN CÂU */}
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

export default MatchTranslationExercise;
