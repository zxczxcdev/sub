'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RotateCcw, HelpCircle } from 'lucide-react';

interface PickTranslationExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
  } | null;
  subtitles: any[];
  onNextQuestion: () => void;
  streamConfig: { sourceLang: string } | null;
}

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

const PickTranslationExercise: React.FC<PickTranslationExerciseProps> = ({
  currentSub,
  subtitles,
  onNextQuestion,
  streamConfig,
}) => {
  const [targetWord, setTargetWord] = React.useState('');
  const [options, setOptions] = React.useState<Option[]>([]);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(
    null,
  );
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>(
    'idle',
  );

  const initExercise = React.useCallback(() => {
    if (!currentSub || !subtitles || subtitles.length === 0) return;

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
      tokens = originalText
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?，。]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 0);
    }

    if (tokens.length === 0) return;

    // Chọn ngẫu nhiên 1 từ khóa tiêu điểm trong câu hỏi
    const pickedWord = tokens[Math.floor(Math.random() * tokens.length)];
    setTargetWord(pickedWord);

    // 1. Phương án đúng (chính là nghĩa dịch toàn câu chứa từ đó làm gợi ý tối cao)
    const correctOpt: Option = {
      id: 'correct',
      text: `Bản dịch câu chứa từ: "${currentSub.text}"`,
      isCorrect: true,
    };

    // 2. Lấy 3 câu nhiễu từ các phụ đề ngẫu nhiên khác
    const otherSubs = subtitles.filter(
      (sub) =>
        sub.text.trim() !== currentSub.text.trim() &&
        sub.text.trim().length > 0,
    );
    const shuffledOthers = [...otherSubs].sort(() => 0.5 - Math.random());
    const distractors = shuffledOthers.slice(0, 3).map((sub, index) => ({
      id: `wrong-${index}`,
      text: `Bản dịch ngữ cảnh: "${sub.text}"`,
      isCorrect: false,
    }));

    // 3. Trộn ngẫu nhiên đáp án đúng và sai
    const allOptions = [correctOpt, ...distractors].sort(
      () => 0.5 - Math.random(),
    );

    setOptions(allOptions);
    setSelectedOptionId(null);
    setStatus('idle');
  }, [currentSub, subtitles, streamConfig]);

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
      {/* KHỐI TRƯNG BÀY TỪ KHÓA MỤC TIÊU */}
      <div className="p-6 rounded-xl border bg-primary/5 flex flex-col gap-2 items-center justify-center text-center select-none border-primary/20">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded">
          Target Word / Character
        </span>
        <p className="text-3xl font-extrabold tracking-wide text-foreground font-sans">
          {targetWord}
        </p>
      </div>

      {/* DANH SÁCH PHƯƠNG ÁN LỰA CHỌN */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide select-none block">
          Từ khóa trên thuộc về ngữ cảnh dịch nào dưới đây?
        </span>

        <div className="grid grid-cols-1 gap-2.5">
          {options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            let customClass =
              'hover:bg-muted/70 justify-start text-left h-auto p-4 rounded-xl text-sm font-medium leading-relaxed border-zinc-200 transition-all';

            if (isSelected) {
              if (option.isCorrect) {
                customClass +=
                  ' bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400';
              } else {
                customClass +=
                  ' bg-destructive/10 border-destructive text-destructive';
              }
            } else if (status === 'error' && option.isCorrect) {
              customClass +=
                ' border-emerald-500/50 text-emerald-600 dark:text-emerald-400 border-dashed';
            }

            return (
              <Button
                key={option.id}
                variant="outline"
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

      {/* HIỂN THỊ PHẢN HỒI */}
      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Đọc hiểu rất tốt!</p>
            <p className="text-xs text-muted-foreground/90">
              Bạn đã nhận diện chính xác phạm vi xuất hiện và ý nghĩa thực tế
              của từ vựng này.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm flex-1 space-y-2">
            <div>
              <p className="font-bold">Sai ngữ cảnh từ vựng!</p>
              <p className="text-xs text-muted-foreground/90">
                Phương án bạn chọn không chứa từ khóa này. Hãy nghe lại audio
                hoặc chọn lại đáp án.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={initExercise}
              className="h-7 text-[11px] gap-1 border-destructive/20 text-destructive hover:bg-destructive/10 bg-background rounded-lg"
            >
              <RotateCcw className="w-3 h-3" /> Đổi từ khóa khác trong câu
            </Button>
          </div>
        </div>
      )}

      {/* FOOTER ACTION */}
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

export default PickTranslationExercise;
