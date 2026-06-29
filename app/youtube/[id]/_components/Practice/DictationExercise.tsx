'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, HelpCircle, Eye } from 'lucide-react';

interface DictationExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
    pinyin?: string;
  } | null;
  onNextQuestion: () => void;
}

const DictationExercise: React.FC<DictationExerciseProps> = ({
  currentSub,
  onNextQuestion,
}) => {
  const [userInput, setUserInput] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [showAnswer, setShowAnswer] = React.useState(false);

  // Mỗi khi người dùng chuyển sang câu sub mới, reset toàn bộ trạng thái bài tập
  React.useEffect(() => {
    setUserInput('');
    setStatus('idle');
    setShowAnswer(false);
  }, [currentSub]);

  if (!currentSub) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-6">
        Không có dữ liệu câu thoại hiện tại. Vui lòng nhấn Next để tiếp tục.
      </p>
    );
  }

  // Hàm chuẩn hóa chuỗi để so sánh chính xác (Bỏ viết hoa, bỏ khoảng trắng, bỏ dấu câu)
  const normalizeText = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[\s[:punct:]，。！？、（）()""'';；：:]/g, '') // Xóa khoảng trắng và các loại dấu câu phổ biến (kể cả tiếng Trung)
      .trim();
  };

  const handleCheckAnswer = () => {
    const cleanUser = normalizeText(userInput);
    const cleanOriginal = normalizeText(currentSub.original_text);

    if (cleanUser === cleanOriginal) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto pt-2 animate-in fade-in-50 duration-200">
      {/* KHỐI HIỂN THỊ GỢI Ý BẢN DỊCH NGHĨA */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border/60 space-y-1.5 select-none">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
          Gợi ý nghĩa bản dịch
        </span>
        <p className="text-base font-medium text-foreground leading-relaxed">
          "{currentSub.text}"
        </p>
      </div>

      {/* KHU VỰC NHẬP LIỆU CỦA USER */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Gõ lại câu bạn nghe được
          </label>
          <span className="text-[11px] text-muted-foreground/60 italic">
            (Bỏ qua kiểm tra dấu câu và viết hoa)
          </span>
        </div>

        <Textarea
          placeholder="Nhập chữ cái hoặc ký tự ngôn ngữ bạn nghe thấy..."
          value={userInput}
          onChange={(e: any) => {
            if (status === 'idle') setUserInput(e.target.value);
          }}
          disabled={status === 'success'}
          className="min-h-[100px] resize-none text-base font-medium rounded-xl border-zinc-200 focus-visible:ring-primary shadow-sm"
          onKeyDown={(e: any) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              userInput.trim() &&
              status === 'idle'
            ) {
              e.preventDefault();
              handleCheckAnswer();
            }
          }}
        />
      </div>

      {/* KHỐI HIỂN THỊ KẾT QUẢ PHẢN HỒI (SAU KHI CHECK) */}
      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold">Chính xác tuyệt vời!</p>
            <p className="text-xs text-muted-foreground/90">
              Bạn đã nghe và chép lại hoàn toàn đúng âm thoại.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-bold">Chưa chính xác!</p>
              <p className="text-xs text-muted-foreground/90">
                Hãy thử nghe lại kỹ một lần nữa hoặc bấm xem đáp án.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs font-semibold h-7 rounded-lg text-destructive hover:bg-destructive/10"
              onClick={() => setStatus('idle')}
            >
              Thử lại
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs font-semibold h-7 rounded-lg text-muted-foreground hover:bg-muted"
              onClick={() => setShowAnswer(!showAnswer)}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />{' '}
              {showAnswer ? 'Ẩn đáp án' : 'Xem đáp án'}
            </Button>
          </div>
        </div>
      )}

      {/* VÙNG HIỂN THỊ ĐÁP ÁN KHI USER BẤM "XEM ĐÁP ÁN" */}
      {showAnswer && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
            Đáp án đúng chuẩn
          </span>
          {currentSub.pinyin && (
            <p className="text-xs text-muted-foreground font-mono">
              {currentSub.pinyin}
            </p>
          )}
          <p className="text-lg font-bold tracking-wide text-foreground select-text">
            {currentSub.original_text}
          </p>
        </div>
      )}

      {/* THANH THAO TÁC NÚT CHECK / NEXT BÊN DƯỚI BÀI TẬP */}
      <div className="flex justify-end pt-2 border-t border-dashed">
        {status !== 'success' ? (
          <Button
            onClick={handleCheckAnswer}
            disabled={!userInput.trim() || status === 'error'}
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

export default DictationExercise;
