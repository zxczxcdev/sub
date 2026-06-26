'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import YouTube from 'react-youtube';
import { Noto_Sans_SC } from 'next/font/google';
import {
  Loader2,
  Globe,
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import PracticeDashboard from '@/components/PracticeDashboard';

const cnFont = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [streamConfig, setStreamConfig] = React.useState<{
    videoUrl: string;
    sourceLang: string;
    targetLang: string;
  } | null>(null);

  const [videoMeta, setVideoMeta] = React.useState<any>(null);
  const [subtitles, setSubtitles] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState<
    'processing' | 'success' | 'error'
  >('processing');
  const [totalLines, setTotalLines] = React.useState<number>(0);

  // --- TRẠNG THÁI PLAYER & ĐIỀU KHIỂN ---
  const [player, setPlayer] = React.useState<any>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [currentLineIndex, setCurrentLineIndex] = React.useState<number | null>(
    null,
  );

  // --- TRẠNG THÁI ÂM LƯỢNG ---
  const [volume, setVolume] = React.useState<number>(80);
  const [isMuted, setIsMuted] = React.useState<boolean>(false);

  // --- THIẾT LẬP ICON SETTING QUẢN LÝ ---
  const [playbackSpeed, setPlaybackSpeed] = React.useState('1');
  const [fontSize, setFontSize] = React.useState('medium');
  const [captionPosition, setCaptionPosition] = React.useState('bottom');
  const [listenPractice, setListenPractice] = React.useState(false);
  const [isLoopLine, setIsLoopLine] = React.useState(false);
  const [loopingLineIndex, setLoopingLineIndex] = React.useState<number | null>(
    null,
  );

  // --- BIẾN KIỂM SOÁT HÀNH VI LƯỚT CỦA USER ---
  const [isUserScrolling, setIsUserScrolling] = React.useState(false);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const hasPausedForLine = React.useRef<number | null>(null);
  const subtitleRefs = React.useRef<{ [key: number]: HTMLDivElement | null }>(
    {},
  );

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleUserScroll = () => {
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 3000);
  };

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

  React.useEffect(() => {
    if (!videoId) return;
    const rawData = sessionStorage.getItem(`yt_config_${videoId}`);
    if (!rawData) {
      alert(
        'Không tìm thấy cấu hình dịch thuật, vui lòng tìm kiếm lại từ Navbar.',
      );
      router.push('/');
      return;
    }
    const parsed = JSON.parse(rawData);
    setStreamConfig({
      videoUrl: parsed.url,
      sourceLang: parsed.source_lang,
      targetLang: parsed.target_lang,
    });
  }, [videoId]);

  React.useEffect(() => {
    if (!videoId || !streamConfig) return;
    let isMounted = true;

    const connectToStream = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${baseUrl}/api/youtube/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: streamConfig.videoUrl,
            source_lang: streamConfig.sourceLang,
            target_lang: streamConfig.targetLang,
          }),
        });

        if (!response.ok) {
          if (isMounted) setStatus('error');
          return;
        }

        if (!response.body) throw new Error('Không thể kết nối luồng dữ liệu.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (isMounted) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || !isMounted) continue;
            try {
              const data = JSON.parse(line);

              if (data.status === 'error') {
                setStatus('error');
                break;
              }

              if (data.type === 'metadata') {
                setVideoMeta(data.metadata);
                setTotalLines(data.total_lines);
              } else if (data.type === 'subtitle_line') {
                setSubtitles((prev) => {
                  if (prev.some((item) => item.start === data.line.start))
                    return prev;
                  const newArr = [...prev, { ...data.line, index: data.index }];
                  return newArr.sort((a, b) => a.start - b.start);
                });
              } else if (data.type === 'done') {
                setStatus('success');
              }
            } catch (err) {
              console.error('Lỗi parse gói stream lẻ:', err);
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) setStatus('error');
      }
    };

    connectToStream();
    return () => {
      isMounted = false;
    };
  }, [videoId, streamConfig]);

  React.useEffect(() => {
    if (!player || subtitles.length === 0) return;

    const interval = setInterval(() => {
      const time = player.getCurrentTime();
      setCurrentTime(time);
      setDuration(player.getDuration() || 0);

      const activeIndex = subtitles.findIndex((sub, idx) => {
        const nextSub = subtitles[idx + 1];
        if (nextSub) {
          return time >= sub.start && time < nextSub.start;
        }
        return time >= sub.start && time <= sub.start + sub.duration;
      });

      if (activeIndex !== -1) {
        setCurrentLineIndex(activeIndex);
        const currentLine = subtitles[activeIndex];

        if (loopingLineIndex !== null) {
          const targetLine = subtitles[loopingLineIndex];
          if (
            targetLine &&
            time >= targetLine.start + targetLine.duration - 0.3
          ) {
            player.seekTo(targetLine.start, true);
            return;
          }
        } else if (
          isLoopLine &&
          time >= currentLine.start + currentLine.duration - 0.3
        ) {
          player.seekTo(currentLine.start, true);
          return;
        }

        if (listenPractice && hasPausedForLine.current !== activeIndex) {
          if (time >= currentLine.start + currentLine.duration - 0.2) {
            player.pauseVideo();
            hasPausedForLine.current = activeIndex;
          }
        }
      } else {
        setCurrentLineIndex(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, subtitles, listenPractice, isLoopLine, loopingLineIndex]);

  // --- 🌟 KHẮC PHỤC TRIỆT ĐỂ: CUỘN NỘI BỘ BOX CHỨA (PREVENTS VIEWPORT JUMPING) ---
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.name === 'dashboard_active') {
      return; // Chặn hành vi tự động nhảy khi đang thao tác trong bài học
    }

    if (
      currentLineIndex === null ||
      !subtitleRefs.current[currentLineIndex] ||
      isUserScrolling
    ) {
      return;
    }

    const activeElement = subtitleRefs.current[currentLineIndex];
    const container = activeElement?.parentElement;

    if (container && activeElement) {
      // 🧠 THAY THẾ HOÀN TOÀN LỆNH scrollIntoView:
      // Tính toán vị trí tương đối và sử dụng container.scrollTo để ép cuộn nội bộ 100%, không kéo màn hình tổng
      const targetScrollTop =
        activeElement.offsetTop - container.offsetTop - 12;
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }, [currentLineIndex, isUserScrolling]);

  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.name = '';
    };
  }, []);

  const handlePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
      if (currentLineIndex !== null) hasPausedForLine.current = null;
    }
  };

  const handlePreLine = () => {
    if (!player || subtitles.length === 0) return;
    const targetIdx =
      currentLineIndex !== null ? Math.max(0, currentLineIndex - 1) : 0;
    player.seekTo(subtitles[targetIdx].start, true);
    hasPausedForLine.current = null;
  };

  const handleNextLine = () => {
    if (!player || subtitles.length === 0) return;
    const targetIdx =
      currentLineIndex !== null
        ? Math.min(subtitles.length - 1, currentLineIndex + 1)
        : 0;
    player.seekTo(subtitles[targetIdx].start, true);
    hasPausedForLine.current = null;
  };

  const handleReplayLine = () => {
    if (!player || currentLineIndex === null) return;
    player.seekTo(subtitles[currentLineIndex].start, true);
    player.playVideo();
    hasPausedForLine.current = null;
  };

  const handleSpecificLineReplay = (e: React.MouseEvent, start: number) => {
    e.stopPropagation();
    if (!player) return;
    player.seekTo(start, true);
    player.playVideo();
    hasPausedForLine.current = null;
  };

  const handleSpecificLineLoop = (
    e: React.MouseEvent,
    index: number,
    start: number,
  ) => {
    e.stopPropagation();
    if (!player) return;
    if (loopingLineIndex === index) {
      setLoopingLineIndex(null);
    } else {
      setLoopingLineIndex(index);
      player.seekTo(start, true);
      player.playVideo();
    }
  };

  const handleSeekSlider = (value: number[]) => {
    if (!player) return;
    player.seekTo(value[0], true);
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (player) {
      player.setVolume(newVolume);
      if (newVolume > 0 && isMuted) {
        player.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!player) return;
    if (isMuted) {
      player.unMute();
      player.setVolume(volume);
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const getFontSizeClass = () => {
    if (fontSize === 'small') return 'text-xs md:text-sm';
    if (fontSize === 'larger') return 'text-xl md:text-2xl';
    return 'text-base md:text-lg';
  };

  return (
    <div
      className={`min-h-screen bg-background p-0 md:p-8 px-4 md:px-8 max-w-[111rem] mx-auto space-y-4 md:space-y-6 mt-12 ${cnFont.className}`}
    >
      {/* HEADER BAR */}
      <div className="flex items-center justify-between">
        <Button className="rounded-full gap-2" variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span>
            {streamConfig?.sourceLang?.toUpperCase() || ''} ➔{' '}
            {streamConfig?.targetLang?.toUpperCase() || ''}
          </span>
        </div>
      </div>

      {/* GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* YOUTUBE PLAYER SCREEN */}
          <div className="w-full aspect-video rounded-xl md:rounded-2xl overflow-hidden shadow-lg border bg-black relative group/player">
            <div
              onClick={handlePlayPause}
              className="absolute inset-0 z-10 bg-transparent pointer-events-auto cursor-pointer"
            />
            <YouTube
              videoId={videoId}
              className="w-full h-full relative z-0"
              iframeClassName="w-full h-full aspect-video"
              opts={{
                playerVars: {
                  autoplay: 1,
                  controls: 0,
                  disablekb: 1,
                  fs: 0,
                  rel: 0,
                  modestbranding: 1,
                },
              }}
              onReady={(e) => {
                setPlayer(e.target);
                e.target.setVolume(volume);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onStateChange={(e) => {
                if (e.data === 1) setIsPlaying(true);
                if (e.data === 2) setIsPlaying(false);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-0 group-hover/player:opacity-40 transition-opacity duration-200">
              <div className="p-4 rounded-full bg-black/60 text-white border border-white/10 shadow-md">
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 fill-current ml-1" />
                )}
              </div>
            </div>
            {captionPosition !== 'off' && currentLineIndex !== null && (
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-[90%] max-w-xl pointer-events-none transition-all duration-300 z-20 ${captionPosition === 'top' ? 'top-[6px]' : 'bottom-[6px]'}`}
              >
                <div className="bg-black/60 backdrop-blur-md rounded-xl p-1 text-center border border-white/10 shadow-2xl flex flex-col gap-1">
                  <span
                    className={`text-white font-medium tracking-wide flex justify-center items-center ${getFontSizeClass()}`}
                  >
                    {['zh-Hans', 'zh-Hant'].includes(
                      streamConfig?.sourceLang || '',
                    )
                      ? renderHanziWithRuby(
                          subtitles[currentLineIndex]?.original_text || '',
                          subtitles[currentLineIndex]?.pinyin || '',
                        )
                      : subtitles[currentLineIndex]?.original_text}
                  </span>
                  <span
                    className={`text-yellow-200/90 font-semibold flex justify-center items-center ${getFontSizeClass()}`}
                  >
                    {['zh-CN', 'zh-TW'].includes(streamConfig?.targetLang || '')
                      ? renderHanziWithRuby(
                          subtitles[currentLineIndex]?.text || '',
                          subtitles[currentLineIndex]?.pinyin || '',
                        )
                      : subtitles[currentLineIndex]?.text}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CONTROL BAR */}
          <div className="p-4 rounded-xl md:rounded-2xl border bg-card/60 backdrop-blur-sm space-y-3 shadow-sm">
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
                <DropdownMenuContent
                  className="w-64 rounded-xl mt-2"
                  align="end"
                >
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
                        {['0.5', '0.75', '1', '1.25', '1.5', '2'].map(
                          (speed) => (
                            <DropdownMenuRadioItem
                              key={speed}
                              value={speed}
                              className="text-xs p-1 justify-center rounded-md cursor-pointer"
                            >
                              {speed === '1' ? 'Chuẩn' : `${speed}x`}
                            </DropdownMenuRadioItem>
                          ),
                        )}
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
                        {/* 🌟 ĐÃ FIX LỖI TYPO ĐỒNG BỘ THÀNH DropdownMenuRadioItem TẠI ĐÂY */}
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
                        hasPausedForLine.current = null;
                      }}
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* BẢNG PHỤ ĐỀ DỊCH THUẬT */}
        <div className="w-full border rounded-xl md:rounded-2xl h-[calc(100vh-14rem)] min-h-[400px] flex flex-col bg-card/30 backdrop-blur-sm overflow-hidden">
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
                  Phụ đề gốc chứa ký tự lỗi XML hoặc mất kết nối API. Vui lòng
                  thử lại video khác.
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
                          hasPausedForLine.current = null;
                        }
                      }}
                      className={`group flex flex-col p-3 rounded-xl transition-all border duration-200 cursor-pointer ${isActive ? 'bg-primary/10 border-primary/40 shadow-sm' : 'bg-transparent border-transparent hover:bg-muted/60'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono select-none ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
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
                              className={`h-6 w-6 p-0 rounded-full transition-all ${isCurrentLooping ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                              onClick={(e) =>
                                handleSpecificLineLoop(e, idx, sub.start)
                              }
                              title={
                                isCurrentLooping ? 'Đang lặp' : 'Lặp câu này'
                              }
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${isCurrentLooping ? 'animate-spin' : ''}`}
                              />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div
                        className={`text-sm font-semibold leading-relaxed transition-colors flex flex-wrap gap-x-1 ${isActive ? 'text-primary' : 'text-foreground'}`}
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
                      <div className="text-xs text-muted-foreground/80 font-medium italic mt-2 flex flex-wrap gap-x-1">
                        {['zh-CN', 'zh-TW'].includes(
                          streamConfig?.targetLang || '',
                        )
                          ? renderHanziWithRuby(
                              sub.text || '',
                              sub.pinyin || '',
                            )
                          : sub.text}
                      </div>
                    </div>
                  );
                })}
                {status === 'error' && subtitles.length > 0 && (
                  <div className="p-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 text-center text-[11px] text-destructive font-medium select-none">
                    Luồng dịch thuật bị ngắt quãng giữa chừng do phụ đề gốc chứa
                    ký tự lỗi.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* PRACTICE DASHBOARD */}
      <PracticeDashboard
        subtitles={subtitles}
        player={player}
        currentLineIndex={currentLineIndex}
      />
    </div>
  );
}
