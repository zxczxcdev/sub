'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Undo2 } from 'lucide-react';

interface OrderLinesExerciseProps {
  subtitles: any[];
  currentLineIndex: number | null;
  onNextQuestion: () => void;
}

interface LineToken {
  index: number;
  original_text: string;
  text: string;
}

const OrderLinesExercise: React.FC<OrderLinesExerciseProps> = ({
  subtitles,
  currentLineIndex,
  onNextQuestion,
}) => {
  const [poolLines, setPoolLines] = React.useState<LineToken[]>([]); // Khay chứa câu chưa xếp
  const [selectedLines, setSelectedLines] = React.useState<LineToken[]>([]); // Khay chứa câu đã xếp theo thứ tự
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [correctSequence, setCorrectSequence] = React.useState<number[]>([]); // Lưu chuỗi index chuẩn để so sánh

  // Khởi tạo bộ 3 câu liên tiếp khi câu hiện tại thay đổi
  React.useEffect(() => {
    if (currentLineIndex === null || !subtitles || subtitles.length === 0)
      return;

    // Xác định mốc câu: trước, hiện tại, sau
    const startIdx = Math.max(0, currentLineIndex - 1);
    const endIdx = Math.min(subtitles.length - 1, startIdx + 2);

    // Điều chỉnh lại startIdx nếu endIdx chạm đáy video để luôn có đủ 2-3 câu
    const finalStartIdx = Math.max(0, endIdx - 2);

    const sequence: LineToken[] = [];
    const correctIdxs: number[] = [];

    for (let i = finalStartIdx; i <= endIdx; i++) {
      if (subtitles[i]) {
        sequence.push({
          index: i,
          original_text: subtitles[i].original_text,
          text: subtitles[i].text,
        });
        correctIdxs.push(i);
      }
    }

    // Lưu chuỗi đúng để check đáp án sau này
    setCorrectSequence(correctIdxs);

    // Xáo trộn chuỗi câu thoại (Fisher-Yates)
    const shuffled = [...sequence];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setPoolLines(shuffled);
    setSelectedLines([]);
    setStatus('idle');
  }, [currentLineIndex, subtitles]);

  // Click chọn câu đưa vào khay trả lời
  const handleSelectLine = (line: LineToken, index: number) => {
    if (status === 'success') return;
    setSelectedLines([...selectedLines, line]);
    setPoolLines(poolLines.filter((_, i) => i !== index));
    if (status === 'error') setStatus('idle');
  };

  // Click trả lại câu về khay chờ
  const handleUnselectLine = (line: LineToken, index: number) => {
    if (status === 'success') return;
    setPoolLines([...poolLines, line]);
    setSelectedLines(selectedLines.filter((_, i) => i !== index));
    if (status === 'error') setStatus('idle');
  };

  // Làm lại nhanh
  const handleReset = () => {
    if (status === 'success') return;
    setPoolLines([...poolLines, ...selectedLines]);
    setSelectedLines([]);
    setStatus('idle');
  };

  // Kiểm tra đáp án
  const handleCheckAnswer = () => {
    const userSequence = selectedLines.map((l) => l.index);
    const isCorrect =
      JSON.stringify(userSequence) === JSON.stringify(correctSequence);

    if (isCorrect) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto pt-2 animate-in fade-in-50 duration-200">
      {/* 1. KHAY CHỨA CÁC CÂU THOẠI ĐÃ SẮP XẾP */}
      <div className="space-y-2">
        <div className="flex items-center justify-between select-none">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Thứ tự sắp xếp của bạn
          </span>
          {selectedLines.length > 0 && status !== 'success' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="w-3 h-3" /> Xếp lại
            </Button>
          )}
        </div>

        <div className="min-h-[100px] p-3 rounded-xl border border-dashed bg-background/50 flex flex-col gap-2">
          {selectedLines.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/50 italic select-none py-6">
              Bấm các khối câu thoại bên dưới theo thứ tự xuất hiện trước -
              sau...
            </div>
          ) : (
            selectedLines.map((line, idx) => (
              <div
                key={idx}
                onClick={() => handleUnselectLine(line, idx)}
                className={`p-3 rounded-xl border bg-secondary/40 text-left text-sm font-medium cursor-pointer shadow-sm hover:bg-secondary/60 transition-all flex gap-3 items-center animate-in slide-in-from-top-2 duration-150 ${
                  status === 'success' ? 'pointer-events-none' : ''
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-bold">
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-0.5">
                  <p className="font-bold text-foreground">
                    {line.original_text}
                  </p>
                  <p className="text-xs text-muted-foreground">{line.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. KHAY CHỨA CÁC CÂU THOẠI XÁO TRỘN ĐANG CHỜ CHỌN */}
      {poolLines.length > 0 && (
        <div className="space-y-2 select-none">
          <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wide">
            Các câu thoại cần sắp xếp
          </span>
          <div className="flex flex-col gap-2">
            {poolLines.map((line, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectLine(line, idx)}
                className="p-3.5 rounded-xl border bg-background text-left text-sm font-medium hover:bg-muted/50 border-zinc-200 transition-all shadow-sm active:scale-[0.99]"
              >
                <p className="font-bold text-foreground leading-relaxed">
                  {line.original_text}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {line.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. KẾT QUẢ PHẢN HỒI */}
      {status === 'success' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Logic câu thoại chính xác!</p>
            <p className="text-xs text-muted-foreground/90">
              Bạn nắm vững mạch liên kết nội dung câu rất tốt.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Sai mạch dòng thời gian!</p>
            <p className="text-xs text-muted-foreground/90">
              Thứ tự diễn biến câu chưa khớp với video. Hãy nghe lại audio và
              sắp xếp lại.
            </p>
          </div>
        </div>
      )}

      {/* 4. THANH HÀNH ĐỘNG ACTION */}
      <div className="flex justify-end pt-2 border-t border-dashed">
        {status !== 'success' ? (
          <Button
            onClick={handleCheckAnswer}
            disabled={poolLines.length > 0}
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

export default OrderLinesExercise;
