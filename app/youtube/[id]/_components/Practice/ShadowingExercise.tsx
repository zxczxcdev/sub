'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Mic, MicOff, Volume2 } from 'lucide-react';

interface ShadowingExerciseProps {
  currentSub: {
    original_text: string;
    text: string;
    pinyin?: string; // 🌟 Thêm pinyin vào kiểu dữ liệu nhận từ câu sub
  } | null;
  onNextQuestion: () => void;
  streamConfig: { sourceLang: string } | null;
}

const ShadowingExercise: React.FC<ShadowingExerciseProps> = ({
  currentSub,
  onNextQuestion,
  streamConfig,
}) => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [score, setScore] = React.useState<number | null>(null);
  const recognitionRef = React.useRef<any>(null);

  // Nhận diện nếu ngôn ngữ nguồn là tiếng Trung
  const isChinese = ['zh-hans', 'zh-hant', 'zh'].includes(
    streamConfig?.sourceLang?.toLowerCase() || '',
  );

  // Reset khi chuyển câu
  React.useEffect(() => {
    setTranscript('');
    setStatus('idle');
    setScore(null);
    setIsRecording(false);
  }, [currentSub]);

  if (!currentSub) return null;

  // Hàm chuẩn hóa chuỗi để so sánh
  const normalizeText = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[\s[:punct:]，。！？、（）()""'';；：:.]/g, '')
      .trim();
  };

  // Tính toán độ trùng khớp tương đối
  const calculateMatchScore = (userText: string, originalText: string) => {
    const cleanUser = normalizeText(userText);
    const cleanOriginal = normalizeText(originalText);

    if (!cleanUser) return 0;
    if (cleanUser === cleanOriginal) return 100;

    let matchCount = 0;
    const minLen = Math.min(cleanUser.length, cleanOriginal.length);

    for (let i = 0; i < minLen; i++) {
      if (cleanOriginal.includes(cleanUser[i])) {
        matchCount++;
      }
    }

    const finalScore = Math.round((matchCount / cleanOriginal.length) * 100);
    return Math.min(100, finalScore);
  };

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(
        'Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Web Speech API). Vui lòng dùng Google Chrome.',
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    const langMapping: { [key: string]: string } = {
      en: 'en-US',
      zh: 'zh-CN',
      'zh-hans': 'zh-CN',
      'zh-hant': 'zh-TW',
      vi: 'vi-VN',
    };
    recognition.lang =
      langMapping[streamConfig?.sourceLang?.toLowerCase() || 'en'] || 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      setStatus('idle');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + event.results[i][0].transcript);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
    };

    recognition.onerror = (err: any) => {
      console.error(err);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);

      setTimeout(() => {
        setTranscript((latestTranscript) => {
          const finalScore = calculateMatchScore(
            latestTranscript,
            currentSub.original_text,
          );
          setScore(finalScore);
          if (finalScore >= 65) {
            setStatus('success');
          } else {
            setStatus('error');
          }
          return latestTranscript;
        });
      }, 400);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto pt-2 animate-in fade-in-50 duration-200">
      {/* KHỐI HIỂN THỊ CÂU MẪU CẦN PHÁT ÂM */}
      <div className="p-5 rounded-xl border bg-muted/30 flex flex-col gap-2 items-center text-center select-none">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
          <Volume2 className="w-3 h-3" /> Văn bản bạn cần nhại lại
        </span>
        <p className="text-xl font-bold text-foreground leading-relaxed tracking-wide">
          {currentSub.original_text}
        </p>

        {/* 🌟 HIỂN THỊ PINYIN: Chỉ render khi là tiếng Trung và câu sub có sẵn trường pinyin */}
        {isChinese && currentSub.pinyin && (
          <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-500/5 px-2.5 py-1 rounded-md border border-indigo-500/10 mt-0.5 max-w-full break-words">
            {currentSub.pinyin}
          </p>
        )}

        <p className="text-xs text-muted-foreground italic mt-0.5">
          "{currentSub.text}"
        </p>
      </div>

      {/* KHU VỰC ĐIỀU KHIỂN MICRO VÀ TRÌNH BÀY KẾT QUẢ GHI ÂM CHỮ */}
      <div className="flex flex-col items-center justify-center gap-4 py-3">
        {!isRecording ? (
          <Button
            type="button"
            size="lg"
            onClick={startRecording}
            disabled={status === 'success'}
            className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center justify-center transition-all active:scale-95 text-white"
          >
            <Mic className="w-6 h-6" />
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={stopRecording}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 shadow-lg flex items-center justify-center transition-all active:scale-95 text-white"
          >
            <MicOff className="w-6 h-6 animate-pulse" />
          </Button>
        )}

        <span className="text-xs font-semibold text-muted-foreground">
          {isRecording
            ? 'Hệ thống đang nghe... Hãy đọc to câu thoại'
            : 'Nhấn nút Micro để bắt đầu nói'}
        </span>
      </div>

      {/* HIỂN THỊ CHỮ DỊCH ĐƯỢC TỪ GIỌNG NÓI USER */}
      {transcript && (
        <div className="space-y-1 bg-background p-4 rounded-xl border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Văn bản hệ thống nhận diện được:
          </span>
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 font-sans italic">
            "{transcript}"
          </p>
        </div>
      )}

      {/* PHẢN HỒI KẾT QUẢ VÀ ĐIỂM SỐ */}
      {status === 'success' && score !== null && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Shadowing Xuất Sắc! ({score}%)</p>
            <p className="text-xs text-muted-foreground/90">
              Phát âm và ngữ điệu đuổi theo bóng âm của bạn rất chuẩn âm điệu
              người bản xứ.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && score !== null && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Chưa đạt yêu cầu! ({score}%)</p>
            <p className="text-xs text-muted-foreground/90">
              Độ trùng khớp hơi thấp. Hãy bật "Play audio" nghe lại ngữ điệu
              ngắt nghỉ và thử nhại lại một lần nữa.
            </p>
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

export default ShadowingExercise;
