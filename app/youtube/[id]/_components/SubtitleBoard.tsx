'use client';

import React from 'react';
import { Loader2, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubtitleLine {
  index: number;
  start: number;
  duration: number;
  timestamp: string;
  original_text: string;
  text: string;
  pinyin?: string;
}

interface SubtitleBoardProps {
  status: 'processing' | 'success' | 'error';
  subtitles: SubtitleLine[];
  totalLines: number;
  currentLineIndex: number | null;
  loopingLineIndex: number | null;
  streamConfig: { sourceLang: string; targetLang: string } | null;
  player: any;
  subtitleRefs: React.MutableRefObject<{
    [key: number]: HTMLDivElement | null;
  }>;
  handleUserScroll: () => void;
  handleSpecificLineReplay: (e: React.MouseEvent, start: number) => void;
  handleSpecificLineLoop: (
    e: React.MouseEvent,
    index: number,
    start: number,
  ) => void;
  setHasPausedForLine: (index: number | null) => void;
}

const SubtitleBoard: React.FC<SubtitleBoardProps> = ({
  status,
  subtitles,
  totalLines,
  currentLineIndex,
  loopingLineIndex,
  streamConfig,
  player,
  subtitleRefs,
  handleUserScroll,
  handleSpecificLineReplay,
  handleSpecificLineLoop,
  setHasPausedForLine,
}) => {
  // Hàm hiển thị chữ Hán kèm Pinyin (Ruby) dời hoàn toàn sang đây
  const renderHanziWithRuby = (hanziText: string, pinyinText: string) => {
    if (!pinyinText) return <span>{hanziText}</span>;

    const hzChars = hanziText.replace(/\s+/g, '').split('');
    const pyWords = pinyinText.trim().split(/\s+/);

    if (hzChars.length !== pyWords.length) {
      return (
        <div className="flex flex-col items-center select-text">
          <span className="text-xs tracking-wide opacity-90 block mb-0.5 font-sans font-normal">
            {pinyinText}
          </span>
          <span className="leading-snug">{hanziText}</span>
        </div>
      );
    }

    return (
      <span className="inline-flex flex-wrap justify-center gap-x-1.5 gap-y-1 select-text">
        {hzChars.map((char, index) => (
          <ruby
            key={index}
            className="ruby-position-initial group/ruby flex flex-col items-center"
          >
            <rt className="text-[11px] md:text-xs tracking-normal font-sans font-normal mb-0.5 select-none opacity-90 leading-none h-4 flex items-end">
              {pyWords[index]}
            </rt>
            <span className="leading-none">{char}</span>
          </ruby>
        ))}
      </span>
    );
  };

  return (
    <div className="w-full border rounded-xl md:rounded-2xl h-[calc(100vh-14rem)] min-h-[400px] flex flex-col bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* HEADER BẢNG */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between shrink-0 select-none">
        <h2 className="font-semibold text-sm">Bảng phụ đề dịch thuật</h2>
        <div className="flex items-center gap-2">
          {status === 'processing' && (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium font-mono">
                Đang dịch: {subtitles.length}/{totalLines}
              </span>
            </>
          )}
          {status === 'success' && (
            <span className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Hoàn tất ({subtitles.length} câu)
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs text-destructive font-semibold bg-destructive/10 px-2 py-0.5 rounded-full">
              Lỗi dịch thuật
            </span>
          )}
        </div>
      </div>

      {/* DANH SÁCH SUBTITLE */}
      <div
        onScroll={handleUserScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
      >
        {status === 'error' && subtitles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 select-none">
            <div className="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-sm font-bold">
              !
            </div>
            <p className="text-xs font-semibold text-foreground">
              Không thể biên dịch video này
            </p>
            <p className="text-[11px] text-muted-foreground max-w-[200px]">
              Phụ đề gốc chứa ký tự lỗi XML hoặc mất kết nối API. Vui lòng thử
              lại video khác.
            </p>
          </div>
        ) : subtitles.length === 0 && status === 'processing' ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Đang biên dịch luồng phụ đề...
            </p>
          </div>
        ) : (
          <>
            {subtitles.map((sub, idx) => {
              const isActive = currentLineIndex === idx;
              const isCurrentLooping = loopingLineIndex === idx;
              return (
                <div
                  key={idx}
                  ref={(el) => {
                    subtitleRefs.current[idx] = el;
                  }}
                  onClick={() => {
                    if (player) {
                      player.seekTo(sub.start, true);
                      player.playVideo();
                      setHasPausedForLine(null);
                    }
                  }}
                  className={`group flex flex-col p-3 rounded-xl transition-all border duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 border-primary/40 shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono select-none ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {sub.timestamp}
                    </span>
                    {isActive && (
                      <div className="flex items-center gap-1.5 select-none">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          onClick={(e) =>
                            handleSpecificLineReplay(e, sub.start)
                          }
                          title="Nghe lại câu này"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant={isCurrentLooping ? 'default' : 'ghost'}
                          className={`h-6 w-6 p-0 rounded-full transition-all ${
                            isCurrentLooping
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                          }`}
                          onClick={(e) =>
                            handleSpecificLineLoop(e, idx, sub.start)
                          }
                          title={isCurrentLooping ? 'Đang lặp' : 'Lặp câu này'}
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isCurrentLooping ? 'animate-spin' : ''}`}
                          />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Nội dung text gốc */}
                  <div
                    className={`text-sm font-semibold leading-relaxed transition-colors flex flex-wrap gap-x-1 ${
                      isActive ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {['zh-Hans', 'zh-Hant'].includes(
                      streamConfig?.sourceLang || '',
                    )
                      ? renderHanziWithRuby(
                          sub.original_text || '',
                          sub.pinyin || '',
                        )
                      : sub.original_text}
                  </div>

                  {/* Nội dung dịch dịch nghĩa */}
                  <div className="text-xs text-muted-foreground/80 font-medium italic mt-2 flex flex-wrap gap-x-1">
                    {['zh-CN', 'zh-TW'].includes(streamConfig?.targetLang || '')
                      ? renderHanziWithRuby(sub.text || '', sub.pinyin || '')
                      : sub.text}
                  </div>
                </div>
              );
            })}
            {status === 'error' && subtitles.length > 0 && (
              <div className="p-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 text-center text-[11px] text-destructive font-medium select-none">
                Luồng dịch thuật bị ngắt quãng giữa chừng do phụ đề gốc chứa ký
                tự lỗi.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubtitleBoard;
