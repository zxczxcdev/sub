'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Play, SkipForward, Gauge, RefreshCw } from 'lucide-react';
import DictationExercise from './DictationExercise';
import MatchByEarExercise from './MatchByEarExercise';
import SpotErrorExercise from './SpotErrorExercise';
import FillBlankExercise from './FillBlankExercise';
import MatchTranslationExercise from './MatchTranslationExercise';
import PickTranslationExercise from './PickTranslationExercise';
import OrderLinesExercise from './OrderLinesExercise';
import TypeBlankExercise from './TypeBlankExercise';
import WordOrderExercise from './WordOrderExercise';
import TranslateBlankExercise from './TranslateBlankExercise';
import ShadowingExercise from './ShadowingExercise';

interface ExerciseWorkspaceProps {
  streamConfig: { sourceLang: string } | null;
  currentExercise: {
    category: string;
    type: string;
  } | null;
  onClose: () => void;
  subtitles: any[];
  currentLineIndex: number | null;
  player: any;
  // Bổ sung đầy đủ state lặp câu truyền từ page.tsx xuống
  isLoopLine: boolean;
  setIsLoopLine: (loop: boolean) => void;
  setLoopingLineIndex: (index: number | null) => void;
  handleReplayLine: () => void;
  handleNextLine: () => void;
  setHasPausedForLine: (val: number | null) => void;
}

const ExerciseWorkspace: React.FC<ExerciseWorkspaceProps> = ({
  currentExercise,
  onClose,
  subtitles,
  currentLineIndex,
  player,
  isLoopLine,
  setIsLoopLine,
  setLoopingLineIndex,
  handleReplayLine,
  handleNextLine,
  streamConfig,
  setHasPausedForLine,
}) => {
  const isOpen = currentExercise !== null;
  const [isSlowMode, setIsSlowMode] = React.useState(false);
  // Hàm chuyển nhanh câu thoại cho nút Next của riêng cấu trúc bài tập bên dưới
  const triggerNextLine = () => {
    if (!player || subtitles.length === 0 || currentLineIndex === null) return;
    const nextIdx = Math.min(subtitles.length - 1, currentLineIndex + 1);
    // 🌟 RESET MỐC CHẶN TRƯỚC KHI NHẢY CÂU MỚI
    setHasPausedForLine(null);
    player.setPlaybackRate(isSlowMode ? 0.5 : 1);
    player.seekTo(subtitles[nextIdx].start, true);
    player.playVideo();
    if (isLoopLine) {
      setIsLoopLine(false);
      setLoopingLineIndex(null);
    }
  };
  const currentSub =
    currentLineIndex !== null ? subtitles[currentLineIndex] : null;

  // Xử lý bật/tắt tốc độ chậm 0.5x cho riêng bài tập
  const toggleSlowMode = () => {
    if (!player) return;
    if (isSlowMode) {
      player.setPlaybackRate(1);
      setIsSlowMode(false);
    } else {
      player.setPlaybackRate(0.5);
      setIsSlowMode(true);
    }
  };

  // 🌟 FIX: Khôi phục lại chế độ bật/tắt lặp câu (Toggle Repeat)
  const toggleRepeatMode = () => {
    if (!player) return;

    const nextLoopState = !isLoopLine;
    setIsLoopLine(nextLoopState);
    setLoopingLineIndex(null);

    // Nếu người dùng chuyển sang trạng thái BẬT lặp câu (Repeat: On)
    if (nextLoopState) {
      player.setPlaybackRate(isSlowMode ? 0.5 : 1);
      handleReplayLine(); // Gọi hàm tua lại đầu câu phụ đề hiện tại và tự động bấm nút Play luôn
    }
  };

  // 🌟 FIX: Kịch bản phát Audio chạy 1 lần
  const triggerPlayAudio = () => {
    if (!player) return;

    // Áp dụng tốc độ phát hiện tại (Chuẩn hoặc 0.5x)
    player.setPlaybackRate(isSlowMode ? 0.5 : 1);

    // Nếu người dùng KHÔNG bật nút Repeat, ta tạm thời tắt lặp đi
    // để khi video chạy hết câu phụ đề hiện tại, nó sẽ tự động Pause dựa trên logic của page.tsx
    if (!isLoopLine) {
      setIsLoopLine(false);
      setLoopingLineIndex(null);
    }

    handleReplayLine(); // Tua lại đầu câu và phát
  };

  const renderExerciseContent = () => {
    switch (currentExercise?.type) {
      case 'dictation':
        return (
          <DictationExercise
            currentSub={currentSub}
            onNextQuestion={triggerNextLine}
          />
        );
      case 'match_by_ear':
        return (
          <MatchByEarExercise
            currentSub={currentSub}
            onNextQuestion={triggerNextLine}
            streamConfig={streamConfig}
          />
        );
      case 'spot_error':
        return (
          <SpotErrorExercise
            currentSub={currentSub}
            onNextQuestion={triggerNextLine}
            streamConfig={streamConfig}
          />
        );
      case 'fill_blank':
        return (
          <FillBlankExercise
            currentSub={currentSub}
            onNextQuestion={triggerNextLine}
            streamConfig={streamConfig}
          />
        );
      //       case 'pick_translation':
      //         return (
      //           <PickTranslationExercise
      //             currentSub={currentSub}
      //             subtitles={subtitles}
      //             onNextQuestion={triggerNextLine}
      //             streamConfig={streamConfig}
      //           />
      //         );
      case 'match_translation':
        return (
          <MatchTranslationExercise
            currentSub={currentSub}
            subtitles={subtitles} // Cần mảng full subtitles để lấy câu nhiễu bẫy trắc nghiệm
            onNextQuestion={triggerNextLine}
          />
        );
      case 'order_lines':
        return (
          <OrderLinesExercise
            subtitles={subtitles}
            currentLineIndex={currentLineIndex}
            onNextQuestion={triggerNextLine}
          />
        );
      case 'type_blank':
        return (
          <TypeBlankExercise
            currentSub={currentSub}
            onNextQuestion={triggerNextLine}
            streamConfig={streamConfig}
          />
        );
      case 'word_order':
        return (
          <WordOrderExercise
            currentSub={currentSub}
            onNextQuestion={triggerNextLine}
            streamConfig={streamConfig}
          />
        );
      case 'translate_blank':
        return (
          <TranslateBlankExercise
            currentSub={currentSub}
            onNextQuestion={triggerNextLine}
            streamConfig={streamConfig}
          />
        );
      case 'shadowing':
        return (
          <ShadowingExercise
            currentSub={currentSub}
            onNextQuestion={triggerNextLine}
            streamConfig={streamConfig}
          />
        );
      default:
        return (
          <p className="text-sm text-muted-foreground italic">
            Giao diện chi tiết đang được đồng bộ dữ liệu...
          </p>
        );
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        {/* HEADER CHUẨN SHADCN */}
        <DialogHeader className="space-y-3">
          <div className="flex flex-col">
            <span className="uppercase font-bold tracking-wider text-primary">
              {currentExercise?.category} {' > '}
              {currentExercise?.type.replace(/_/g, ' ')}
            </span>
          </div>

          {/* BAR BUTTON CHỨC NĂNG DÙNG CHUNG CHO AUDIO */}
          <div className="flex items-center gap-1.5 flex-wrap bg-muted/40 p-1.5 rounded-lg border">
            {/* 🌟 Nút Play Audio: Bấm vào chỉ phát 1 lần rồi dừng (trừ khi bật Repeat phía sau) */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={triggerPlayAudio}
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Play audio
            </Button>

            <Button
              type="button"
              variant={isSlowMode ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={toggleSlowMode}
            >
              <Gauge className="w-3.5 h-3.5" /> Slow 0.5x
            </Button>

            {/* 🌟 ĐÃ FIX: Chuyển lại thành Toggle Repeat (Bật/Tắt lặp vòng câu sub) */}
            <Button
              type="button"
              variant={isLoopLine ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1 transition-all"
              onClick={toggleRepeatMode}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoopLine ? 'animate-spin' : ''}`}
              />
              {isLoopLine ? 'Repeat: On' : 'Repeat: Off'}
            </Button>

            <div className="flex-1" />

            {/* Khi bấm sang câu tiếp theo (Next) */}
            {/* 🌟 FIX CHI TIẾT NÚT NEXT: Giải phóng mốc thời gian chặn để nhảy câu mượt mà */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => {
                if (
                  !player ||
                  subtitles.length === 0 ||
                  currentLineIndex === null
                )
                  return;

                // 1. Tính toán index của câu tiếp theo trực tiếp trong component con
                const nextIdx = Math.min(
                  subtitles.length - 1,
                  currentLineIndex + 1,
                );
                const nextTargetStart = subtitles[nextIdx].start;
                setHasPausedForLine(null);

                // 2. Ép Player nhảy sang mốc thời gian của câu mới và phát NGAY LẬP TỨC
                player.setPlaybackRate(isSlowMode ? 0.5 : 1);
                player.seekTo(nextTargetStart, true);
                player.playVideo();

                // 3. Tạm thời tắt chế độ lặp câu nếu user đang bật lặp câu cũ,
                // để câu mới chạy đến cuối có thể kích hoạt cơ chế dừng câu của listenPractice
                if (isLoopLine) {
                  setIsLoopLine(false);
                  setLoopingLineIndex(null);
                }
              }}
            >
              Next <SkipForward className="w-3.5 h-3.5 fill-current" />
            </Button>
          </div>
        </DialogHeader>

        {/* NỘI DUNG BÀI TẬP */}
        <div className="py-4 min-h-[120px]">{renderExerciseContent()}</div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseWorkspace;
