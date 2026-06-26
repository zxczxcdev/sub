'use client';

import * as React from 'react';
import {
  Volume2,
  BookOpen,
  PenTool,
  Mic,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Star,
  AlertCircle,
  Snail,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface PracticeDashboardProps {
  subtitles: any[];
  player: any;
  currentLineIndex: number | null;
}

export default function PracticeDashboard({
  subtitles,
  player,
  currentLineIndex,
}: PracticeDashboardProps) {
  const [activeMode, setActiveMode] = React.useState<string | null>(null);

  // States gameplay dùng chung
  const [inputValue, setInputValue] = React.useState('');
  const [selectedOption, setSelectedOption] = React.useState<string | null>(
    null,
  );
  const [options, setOptions] = React.useState<string[]>([]);
  const [isAnswerChecked, setIsAnswerChecked] = React.useState(false);
  const [isCorrect, setIsCorrect] = React.useState(false);

  // States nâng cao dành riêng cho các bài tập bổ trợ
  const [shuffledWords, setShuffledWords] = React.useState<string[]>([]);
  const [wordOrderArr, setWordOrderArr] = React.useState<string[]>([]);
  const [spotErrorData, setSpotErrorData] = React.useState<{
    question: string;
    correct: string;
  } | null>(null);

  // 🌟 KHÓA TRẠNG THÁI LOOP RIÊNG CHO CÂU ĐANG HỌC
  const [isSingleLineLoop, setIsSingleLineLoop] = React.useState(false);

  const safeIndex =
    currentLineIndex !== null && subtitles[currentLineIndex]
      ? currentLineIndex
      : 0;
  const currentLine = subtitles[safeIndex] || null;
  const progressPercentage =
    subtitles.length > 0 ? ((safeIndex + 1) / subtitles.length) * 100 : 0;

  // Hàm điều khiển phát âm thanh cục bộ
  const handlePlayLineAudio = (start: number, speedRate: number = 1) => {
    if (player) {
      if (typeof window !== 'undefined') {
        window.name = 'dashboard_active'; // Khóa cuộn của WatchPage
      }
      player.setPlaybackRate(speedRate);
      player.seekTo(start, true);
      player.playVideo();
    }
  };

  // 🌟 1. TỰ ĐỘNG PHÁT LUÔN LINE ĐÓ KHI USER VÀO BÀI HỌC (CHỌN MODE)
  React.useEffect(() => {
    if (activeMode && currentLine) {
      // Đợi một nhịp nhỏ để player ổn định trạng thái
      const timer = setTimeout(() => {
        handlePlayLineAudio(currentLine.start, 1);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeMode, safeIndex]);

  // --- 🌟 HỆ THỐNG GIÁM SÁT THỜI GIAN ÂM THANH (CHẶN PHÁT TRÀN VÀ XỬ LÝ REPEAT LOOP) ---
  React.useEffect(() => {
    if (!player || !currentLine || !activeMode) return;

    const checkInterval = setInterval(() => {
      try {
        if (player.getPlayerState() === 1) {
          const currentTime = player.getCurrentTime();
          const endTime = currentLine.start + currentLine.duration;

          if (currentTime >= endTime - 0.1) {
            if (isSingleLineLoop) {
              // 🌟 Nếu đang bật chế độ Repeat -> Quay đầu lặp lại câu đó liên tục
              player.seekTo(currentLine.start, true);
            } else {
              // Nếu không lặp -> Dừng video tại cuối câu câu học
              player.pauseVideo();
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 50);

    return () => clearInterval(checkInterval);
  }, [player, currentLine, activeMode, isSingleLineLoop]);

  // --- ENGINE TỰ ĐỘNG SINH ĐỀ BÀI CHO 12 CHẾ ĐỘ ---
  React.useEffect(() => {
    if (!subtitles || subtitles.length === 0 || !currentLine) return;

    setInputValue('');
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setWordOrderArr([]);

    const correctText = currentLine.original_text;
    const correctTrans = currentLine.text;

    const poolTrans = subtitles
      .filter((s) => s.text !== correctTrans)
      .map((s) => s.text);
    setOptions(
      [correctTrans, ...poolTrans.slice(0, 3)].sort(() => Math.random() - 0.5),
    );

    const words = correctText.split(' ').filter((w: string) => w.length > 0);
    setShuffledWords([...words].sort(() => Math.random() - 0.5));

    if (words.length > 2) {
      const errorIndex = Math.floor(Math.random() * words.length);
      const fakeWords = [...words];
      fakeWords[errorIndex] = 'XXX';
      setSpotErrorData({
        question: fakeWords.join(' '),
        correct: words[errorIndex],
      });
    } else {
      setSpotErrorData({
        question: correctText + ' (error)',
        correct: 'error',
      });
    }
  }, [safeIndex, subtitles, activeMode]);

  if (!currentLine) return null;

  const checkAnswer = () => {
    const cleanStr = (str: string) =>
      str
        .trim()
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '');
    let userAns = inputValue.trim();
    let targetAns = currentLine.original_text;

    if (
      activeMode === 'match_ear' ||
      activeMode === 'pick_trans' ||
      activeMode === 'match_trans' ||
      activeMode === 'fill_blank'
    ) {
      userAns = selectedOption || '';
      targetAns = currentLine.text;
    } else if (activeMode === 'spot_error') {
      userAns = inputValue;
      targetAns = spotErrorData?.correct || '';
    } else if (activeMode === 'word_order') {
      userAns = wordOrderArr.join(' ');
    }

    setIsAnswerChecked(true);
    if (cleanStr(userAns) === cleanStr(targetAns)) {
      setIsCorrect(true);
      toast.success('Chính xác! Kỹ năng nghe hiểu tuyệt vời.');
    } else {
      setIsCorrect(false);
      toast.error('Chưa chính xác, hãy bấm thử lại.');
    }
  };

  return (
    <div className="bg-card/40 border rounded-2xl p-5 backdrop-blur-sm shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Star className="w-4 h-4 text-primary fill-primary" /> Phòng học
            tương tác (Full 12 AI Labs)
          </h3>
          <p className="text-xs text-muted-foreground">
            Luyện 4 kỹ năng Nghe - Đọc - Viết - Nói toàn diện từ video
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
          <span className="text-xs font-mono font-bold text-muted-foreground">
            Tiến độ: {safeIndex + 1} / {subtitles.length} câu
          </span>
          <Progress value={progressPercentage} className="w-full sm:w-36 h-2" />
        </div>
      </div>

      {/* DASHBOARD LỰA CHỌN 12 MODE LUYỆN TẬP */}
      {!activeMode ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 1. LISTEN GROUP */}
          <div className="border rounded-xl p-4 bg-muted/20 space-y-2">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Volume2 className="w-3.5 h-3.5" /> 1. Listen (Nghe)
            </span>
            <Button
              onClick={() => setActiveMode('dictation')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              ✍️ Dictation
            </Button>
            <Button
              onClick={() => setActiveMode('match_ear')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              👂 Match by ear
            </Button>
            <Button
              onClick={() => setActiveMode('spot_error')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              🔍 Spot the error
            </Button>
          </div>

          {/* 2. READ GROUP */}
          <div className="border rounded-xl p-4 bg-muted/20 space-y-2">
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" /> 2. Read (Đọc)
            </span>
            <Button
              onClick={() => setActiveMode('fill_blank')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              📝 Fill the blank
            </Button>
            <Button
              onClick={() => setActiveMode('match_trans')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              🔗 Match translation
            </Button>
            <Button
              onClick={() => setActiveMode('pick_trans')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              🎯 Pick translation
            </Button>
            <Button
              onClick={() => setActiveMode('order_lines')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              🗂️ Order the lines
            </Button>
          </div>

          {/* 3. WRITE GROUP */}
          <div className="border rounded-xl p-4 bg-muted/20 space-y-2">
            <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-wider">
              <PenTool className="w-3.5 h-3.5" /> 3. Write (Viết)
            </span>
            <Button
              onClick={() => setActiveMode('type_blank')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              ⌨️ Type the blank
            </Button>
            <Button
              onClick={() => setActiveMode('word_order')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              🔀 Word order
            </Button>
            <Button
              onClick={() => setActiveMode('trans_blank')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              🔠 Translate sentence
            </Button>
          </div>

          {/* 4. SPEAK GROUP */}
          <div className="border rounded-xl p-4 bg-muted/20 space-y-2">
            <span className="text-xs font-bold text-violet-500 flex items-center gap-1.5 uppercase tracking-wider">
              <Mic className="w-3.5 h-3.5" /> 4. Speak (Nói)
            </span>
            <Button
              onClick={() => setActiveMode('shadowing')}
              variant="outline"
              className="w-full justify-start text-xs h-8 rounded-lg cursor-pointer"
            >
              🗣️ Shadowing
            </Button>
          </div>
        </div>
      ) : (
        /* KHU VỰC INTERACTIVE GAMEPLAY */
        <div className="border rounded-xl p-5 bg-muted/10 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded">
              Chế độ: {activeMode.replace('_', ' ').toUpperCase()}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs rounded-full cursor-pointer"
              onClick={() => {
                setActiveMode(null);
                setIsSingleLineLoop(false);
                if (typeof window !== 'undefined') window.name = '';
              }}
            >
              🗙 Thoát
            </Button>
          </div>

          {/* CONTROL BOX ÂM THANH THEO FLOW MỚI YÊU CẦU */}
          <div className="flex flex-wrap items-center gap-2 bg-card/60 p-3 rounded-xl border select-none">
            {/* 🌟 BUTTON LISTEN: NGHE / NGHE LẠI CÂU ĐÓ */}
            <Button
              size="sm"
              variant="default"
              onClick={() => handlePlayLineAudio(currentLine.start, 1)}
              className="gap-1 rounded-full text-xs shadow cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" /> Listen (Nghe lại)
            </Button>

            {/* BUTTON SLOW */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePlayLineAudio(currentLine.start, 0.55)}
              className="gap-1 rounded-full text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10 cursor-pointer"
            >
              <Snail className="w-3.5 h-3.5" /> Slow (Chậm 0.55x)
            </Button>

            {/* 🌟 BUTTON REPEAT: BẬT/TẮT CHẾ ĐỘ LẶP LIÊN TỤC CÂU NÀY */}
            <Button
              size="sm"
              variant={isSingleLineLoop ? 'default' : 'outline'}
              onClick={() => {
                const nextState = !isSingleLineLoop;
                setIsSingleLineLoop(nextState);
                if (nextState) handlePlayLineAudio(currentLine.start, 1);
              }}
              className={`gap-1 rounded-full text-xs cursor-pointer ${isSingleLineLoop ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
            >
              <RefreshCw
                className={`w-3 h-3 ${isSingleLineLoop ? 'animate-spin' : ''}`}
              />{' '}
              {isSingleLineLoop ? 'Repeat: ON (Đang lặp)' : 'Repeat (Lặp câu)'}
            </Button>

            <span className="text-xs font-mono text-muted-foreground ml-auto">
              Timeline: {currentLine.timestamp}
            </span>
          </div>

          {/* PHÂN DIỆN FORM NHẬP LIỆU THEO TỪNG CHẾ ĐỘ */}
          <div className="space-y-3 pt-1">
            {activeMode === 'dictation' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground block">
                  Type what you hear (Gõ lại những gì bạn nghe được):
                </label>
                <Input
                  type="text"
                  placeholder="Nhập văn bản âm thanh gốc..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isAnswerChecked && isCorrect}
                  className="h-11 rounded-xl font-medium focus-visible:ring-primary"
                />
              </div>
            )}

            {activeMode === 'match_ear' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground block">
                  Chọn bản dịch khớp chính xác nhất với âm thanh vừa nghe:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {options.map((opt, i) => (
                    <Button
                      key={i}
                      variant={selectedOption === opt ? 'default' : 'outline'}
                      disabled={isAnswerChecked}
                      onClick={() => setSelectedOption(opt)}
                      className="justify-start text-xs h-auto min-h-9 py-2 text-left px-3 rounded-lg"
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {activeMode === 'spot_error' && (
              <div className="space-y-2">
                <p className="text-sm font-bold bg-muted/60 p-3 rounded-lg border text-center font-mono">
                  Dòng lỗi: "{spotErrorData?.question}"
                </p>
                <label className="text-xs font-bold text-muted-foreground block">
                  Tìm từ bị sai (XXX) trong câu trên và gõ lại từ đúng của nó:
                </label>
                <Input
                  type="text"
                  placeholder="Gõ từ đúng để sửa lỗi sai..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isAnswerChecked}
                  className="rounded-lg"
                />
              </div>
            )}

            {activeMode === 'fill_blank' && (
              <div className="space-y-2">
                <p className="text-sm font-bold bg-muted/60 p-3 rounded-lg border text-center font-mono">
                  "{currentLine.original_text.split(' ').slice(0, -1).join(' ')}{' '}
                  _____"
                </p>
                <label className="text-xs font-bold text-muted-foreground block">
                  Chọn bản dịch khớp chính xác với vế còn thiếu ở trên:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {options.map((opt, i) => (
                    <Button
                      key={i}
                      variant={selectedOption === opt ? 'default' : 'outline'}
                      disabled={isAnswerChecked}
                      onClick={() => setSelectedOption(opt)}
                      className="justify-start text-xs h-9 text-left px-3 rounded-lg"
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {(activeMode === 'match_trans' || activeMode === 'pick_trans') && (
              <div className="space-y-2">
                <p className="text-sm font-bold bg-primary/5 p-3 rounded-lg border text-center font-mono text-primary">
                  Câu gốc: "{currentLine.original_text}"
                </p>
                <label className="text-xs font-bold text-muted-foreground block">
                  Chọn bản dịch tiếng Việt tương ứng:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {options.map((opt, i) => (
                    <Button
                      key={i}
                      variant={selectedOption === opt ? 'default' : 'outline'}
                      disabled={isAnswerChecked}
                      onClick={() => setSelectedOption(opt)}
                      className="justify-start text-xs h-auto min-h-9 py-2 text-left px-3 rounded-lg"
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {activeMode === 'order_lines' && (
              <div className="space-y-3 text-center p-4 bg-card rounded-lg border">
                <AlertCircle className="w-5 h-5 mx-auto text-primary" />
                <p className="text-xs font-bold text-muted-foreground">
                  Hệ thống đang đồng bộ câu {safeIndex + 1} khớp trình tự
                  timeline.
                </p>
                <p className="text-sm font-mono font-bold text-foreground">
                  "{currentLine.original_text}"
                </p>
              </div>
            )}

            {activeMode === 'type_blank' && (
              <div className="space-y-2">
                <p className="text-sm font-bold bg-muted/60 p-3 rounded-lg border text-center font-mono">
                  "{currentLine.original_text.split(' ').slice(0, 2).join(' ')}{' '}
                  [.....]"
                </p>
                <label className="text-xs font-bold text-muted-foreground block">
                  Tự viết từ gốc hoàn thiện câu:
                </label>
                <Input
                  type="text"
                  placeholder="Nhập từ còn thiếu..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isAnswerChecked}
                  className="rounded-lg"
                />
              </div>
            )}

            {activeMode === 'word_order' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground block">
                  Chọn các từ theo thứ tự để ghép thành câu đúng:
                </label>
                <div className="p-3 border rounded-lg bg-card min-h-[44px] flex flex-wrap gap-1.5">
                  {wordOrderArr.map((w, idx) => (
                    <Button
                      key={idx}
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs rounded"
                      onClick={() =>
                        setWordOrderArr(
                          wordOrderArr.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      {w}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {shuffledWords.map((w, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded"
                      disabled={wordOrderArr.includes(w)}
                      onClick={() => setWordOrderArr([...wordOrderArr, w])}
                    >
                      {w}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {activeMode === 'trans_blank' && (
              <div className="space-y-2">
                <p className="text-sm font-bold bg-muted/50 p-3 rounded-lg border text-center text-primary">
                  Bản dịch: "{currentLine.text}"
                </p>
                <label className="text-xs font-bold text-muted-foreground block">
                  Dịch câu trên quay lại ngôn ngữ gốc đầy đủ:
                </label>
                <Input
                  type="text"
                  placeholder="Nhập câu dịch bằng tiếng gốc..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isAnswerChecked}
                  className="rounded-lg"
                />
              </div>
            )}

            {activeMode === 'shadowing' && (
              <div className="space-y-3 text-center p-4 bg-card rounded-lg border">
                <div className="space-y-1">
                  <p className="text-base font-bold text-foreground">
                    {currentLine.original_text}
                  </p>
                  {currentLine.pinyin && (
                    <p className="text-xs font-mono font-medium text-muted-foreground">
                      {currentLine.pinyin}
                    </p>
                  )}
                  <p className="text-xs font-medium italic text-primary pt-1">
                    Nghĩa: {currentLine.text}
                  </p>
                </div>
                <div className="pt-2 flex justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full gap-1.5 text-xs"
                  >
                    <Mic className="w-3.5 h-3.5 text-rose-500 animate-pulse" />{' '}
                    Đang nhận âm giọng...
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ACTION CONTROL BUTTON */}
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div>
              {isAnswerChecked && (
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  {isCorrect ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Chính xác! Bạn làm
                      đúng rồi.
                    </span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Chưa chính xác!
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isAnswerChecked && (
                <Button
                  onClick={() => {
                    if (
                      activeMode === 'shadowing' ||
                      activeMode === 'order_lines'
                    ) {
                      setIsAnswerChecked(true);
                      setIsCorrect(true);
                    } else {
                      checkAnswer();
                    }
                  }}
                  className="rounded-full h-9 px-5 font-bold text-xs cursor-pointer"
                >
                  Kiểm tra đáp án
                </Button>
              )}

              {isAnswerChecked && isCorrect && (
                <Button
                  variant="default"
                  onClick={() => {
                    // 🌟 GIẢI PHÁP TRIỆT TIÊU BUG NHẢY CÂU: Khóa tạm thời window.name TRƯỚC KHI đẩy giây Player đi tiếp
                    if (typeof window !== 'undefined') {
                      window.name = 'dashboard_active';
                    }
                    setIsAnswerChecked(false);
                    setInputValue('');
                    setSelectedOption(null);
                    setIsCorrect(false);
                    setWordOrderArr([]);
                    setIsSingleLineLoop(false); // Reset vòng lặp câu cũ

                    if (player) {
                      const next = Math.min(
                        subtitles.length - 1,
                        safeIndex + 1,
                      );
                      player.seekTo(subtitles[next].start, true);
                    }
                  }}
                  className="rounded-full h-9 px-4 text-xs gap-1.5 font-bold cursor-pointer"
                >
                  Câu tiếp theo <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {isAnswerChecked && !isCorrect && (
                <Button
                  variant="destructive"
                  onClick={() => setIsAnswerChecked(false)}
                  className="rounded-full h-9 px-5 text-xs font-bold gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 animate-spin animate-duration-[4s]" />{' '}
                  Thử lại câu này
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
