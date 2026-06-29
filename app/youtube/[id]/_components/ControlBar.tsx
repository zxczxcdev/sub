'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RefreshCw,
  Volume2,
  VolumeX,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ControlBarProps {
  player: any;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackSpeed: string;
  fontSize: string;
  captionPosition: string;
  listenPractice: boolean;
  isLoopLine: boolean;
  setLoopingLineIndex: (index: number | null) => void;
  setIsLoopLine: (loop: boolean) => void;
  setPlaybackSpeed: (speed: string) => void;
  setFontSize: (size: string) => void;
  setCaptionPosition: (position: string) => void;
  setListenPractice: (practice: boolean) => void;
  handleSeekSlider: (value: number[]) => void;
  handleVolumeChange: (value: number[]) => void;
  toggleMute: () => void;
  handlePlayPause: () => void;
  handlePreLine: () => void;
  handleNextLine: () => void;
  handleReplayLine: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  player,
  currentTime,
  duration,
  isPlaying,
  isMuted,
  volume,
  playbackSpeed,
  fontSize,
  captionPosition,
  listenPractice,
  isLoopLine,
  setLoopingLineIndex,
  setIsLoopLine,
  setPlaybackSpeed,
  setFontSize,
  setCaptionPosition,
  setListenPractice,
  handleSeekSlider,
  handleVolumeChange,
  toggleMute,
  handlePlayPause,
  handlePreLine,
  handleNextLine,
  handleReplayLine,
}) => {
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 rounded-xl md:rounded-2xl border bg-card/60 backdrop-blur-sm space-y-3 shadow-sm">
      {/* Slider thời gian */}
      <div className="flex items-center gap-4">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeekSlider}
          className="flex-1 cursor-pointer"
        />
        <span className="text-xs font-mono font-bold tracking-tight text-muted-foreground shrink-0 select-none">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Thanh điều hướng chính */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3 w-full flex-wrap sm:flex-nowrap justify-between sm:justify-start">
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              onClick={handlePreLine}
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              title="Câu trước"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              onClick={handlePlayPause}
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full shadow"
              title={isPlaying ? 'Dừng' : 'Phát'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </Button>
            <Button
              onClick={handleNextLine}
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              title="Câu tiếp"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleReplayLine}
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              title="Nghe lại câu này"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => {
                setIsLoopLine(!isLoopLine);
                setLoopingLineIndex(null);
              }}
              variant={isLoopLine ? 'default' : 'outline'}
              size="sm"
              className="rounded-full px-3 text-xs gap-1 font-medium"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoopLine ? 'animate-spin' : ''}`}
              />{' '}
              Lặp câu
            </Button>
          </div>

          {/* Slider Âm lượng */}
          <div className="flex items-center gap-3 bg-muted/30 border px-3 h-9 rounded-full w-full sm:w-auto sm:min-w-[150px] flex-1 sm:flex-none">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground shrink-0"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-destructive" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="flex-1 sm:w-20 cursor-pointer"
            />
            <span className="text-[10px] font-bold font-mono text-muted-foreground w-8 text-right select-none shrink-0">
              {isMuted ? 0 : volume}%
            </span>
          </div>
        </div>

        {/* Dropdown Menu Cài đặt */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full shrink-0 ml-2"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-xl mt-2" align="end">
            <DropdownMenuLabel className="text-xs">
              Cấu hình trình phát
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-muted-foreground">
                Tốc độ phát (Speed)
              </span>
              <DropdownMenuRadioGroup
                value={playbackSpeed}
                onValueChange={(val) => {
                  setPlaybackSpeed(val);
                  if (player) player.setPlaybackRate(parseFloat(val));
                }}
              >
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {['0.5', '0.75', '1', '1.25', '1.5', '2'].map((speed) => (
                    <DropdownMenuRadioItem
                      key={speed}
                      value={speed}
                      className="text-xs p-1 justify-center rounded-md cursor-pointer"
                    >
                      {speed === '1' ? 'Chuẩn' : `${speed}x`}
                    </DropdownMenuRadioItem>
                  ))}
                </div>
              </DropdownMenuRadioGroup>
            </div>
            <DropdownMenuSeparator />
            <div className="p-2 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-muted-foreground">
                Kích cỡ phụ đề
              </span>
              <DropdownMenuRadioGroup
                value={fontSize}
                onValueChange={setFontSize}
              >
                <div className="flex gap-1 pt-1">
                  {['small', 'medium', 'larger'].map((sz) => (
                    <DropdownMenuRadioItem
                      key={sz}
                      value={sz}
                      className="text-xs flex-1 justify-center rounded-md capitalize cursor-pointer"
                    >
                      {sz === 'larger'
                        ? 'Lớn'
                        : sz === 'medium'
                          ? 'Vừa'
                          : 'Nhỏ'}
                    </DropdownMenuRadioItem>
                  ))}
                </div>
              </DropdownMenuRadioGroup>
            </div>
            <DropdownMenuSeparator />
            <div className="p-2 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-muted-foreground">
                Hiển thị phụ đề trên video
              </span>
              <DropdownMenuRadioGroup
                value={captionPosition}
                onValueChange={setCaptionPosition}
              >
                <div className="flex gap-1 pt-1">
                  {[
                    { key: 'bottom', label: 'Dưới' },
                    { key: 'top', label: 'Trên' },
                    { key: 'off', label: 'Tắt' },
                  ].map((pos) => (
                    <DropdownMenuRadioItem
                      key={pos.key}
                      value={pos.key}
                      className="text-xs flex-1 justify-center rounded-md cursor-pointer"
                    >
                      {pos.label}
                    </DropdownMenuRadioItem>
                  ))}
                </div>
              </DropdownMenuRadioGroup>
            </div>
            <DropdownMenuSeparator />
            <div className="p-2 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">
                  Luyện nghe dừng câu
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Tự động dừng khi hết câu sub
                </span>
              </div>
              <Switch
                checked={listenPractice}
                onCheckedChange={(checked) => {
                  setListenPractice(checked);
                }}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ControlBar;
