'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Noto_Sans_SC } from 'next/font/google';

// Import các components con cấu trúc lại
import HeaderBar from './_components/HeaderBar';
import VideoDashboard from './_components/VideoDashboard';
import PracticeContainer from './_components/Practice';
import { Button } from '@/components/ui/button';
import ExerciseWorkspace from './_components/Practice/ExerciseWorkspace';

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

  const [currentExercise, setCurrentExercise] = React.useState<{
    category: string;
    type: string;
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

  // Sử dụng useRef để lưu trữ subtitles mới nhất giúp setInterval không bị tạo lại liên tục
  const subtitlesRef = React.useRef<any[]>([]);
  React.useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  const handleSelectExercise = (category: string, type: string) => {
    setCurrentExercise({ category, type });
    if (typeof window !== 'undefined') {
      window.name = 'dashboard_active'; // Khóa cuộn màn hình
    }

    setListenPractice(true);
    setIsLoopLine(false);
    setLoopingLineIndex(null);

    if (player) {
      player.pauseVideo();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseExercise = () => {
    setCurrentExercise(null);
    if (typeof window !== 'undefined') {
      window.name = '';
    }

    setListenPractice(false);
    setIsLoopLine(false);

    if (player) {
      player.setPlaybackRate(1);
      player.playVideo();
    }
  };

  const handleUserScroll = () => {
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 3000);
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
  }, [videoId, router]);

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
                  return [...prev, { ...data.line, index: data.index }].sort(
                    (a, b) => a.start - b.start,
                  );
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

  // 🌟 KHẮC PHỤC CHÍNH: Cập nhật cơ chế quét phụ đề qua Ref nhằm tránh xung đột với Stream dữ liệu dang dở
  React.useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      const currentSubs = subtitlesRef.current;
      if (currentSubs.length === 0) return;

      const time = player.getCurrentTime();
      setCurrentTime(time);
      setDuration(player.getDuration() || 0);

      const activeIndex = currentSubs.findIndex((sub, idx) => {
        const nextSub = currentSubs[idx + 1];
        if (nextSub) return time >= sub.start && time < nextSub.start;
        return time >= sub.start && time <= sub.start + sub.duration;
      });

      if (activeIndex !== -1) {
        setCurrentLineIndex(activeIndex);
        const currentLine = currentSubs[activeIndex];
        const nextLine = currentSubs[activeIndex + 1];

        if (loopingLineIndex !== null) {
          const targetLine = currentSubs[loopingLineIndex];
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
          let shouldPause = false;
          if (nextLine) {
            if (time >= nextLine.start - 0.1) shouldPause = true;
          } else if (status === 'success') {
            // Chỉ kích hoạt dừng câu cuối khi phụ đề ĐÃ LOAD HOÀN TOÀN THÀNH CÔNG
            if (time >= currentLine.start + currentLine.duration - 0.1)
              shouldPause = true;
          }

          if (shouldPause) {
            player.pauseVideo();
            hasPausedForLine.current = activeIndex;
          }
        }
      } else {
        setCurrentLineIndex(null);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [player, listenPractice, isLoopLine, loopingLineIndex, status]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.name === 'dashboard_active')
      return;
    if (
      currentLineIndex === null ||
      !subtitleRefs.current[currentLineIndex] ||
      isUserScrolling
    )
      return;

    const activeElement = subtitleRefs.current[currentLineIndex];
    const container = activeElement?.parentElement;

    if (container && activeElement) {
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

  const [currentDashboardMode, setCurrentDashboardMode] = React.useState<
    string | null
  >(null);

  const handlePlayPause = () => {
    if (!player) return;
    if (currentDashboardMode && typeof window !== 'undefined') {
      window.name = '';
      player.setPlaybackRate(1);
    }
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

  return (
    <div
      className={`min-h-screen bg-background p-0 md:p-8 px-4 md:px-8 max-w-[111rem] mx-auto space-y-4 md:space-y-6 mt-12 ${cnFont.className}`}
    >
      <HeaderBar streamConfig={streamConfig} />

      <VideoDashboard
        videoId={videoId}
        player={player}
        setPlayer={setPlayer}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        captionPosition={captionPosition}
        currentLineIndex={currentLineIndex}
        loopingLineIndex={loopingLineIndex}
        isLoopLine={isLoopLine}
        playbackSpeed={playbackSpeed}
        fontSize={fontSize}
        listenPractice={listenPractice}
        status={status}
        subtitles={subtitles}
        totalLines={totalLines}
        streamConfig={streamConfig}
        subtitleRefs={subtitleRefs}
        setLoopingLineIndex={setLoopingLineIndex}
        setIsLoopLine={setIsLoopLine}
        setPlaybackSpeed={setPlaybackSpeed}
        setFontSize={setFontSize}
        setCaptionPosition={setCaptionPosition}
        setListenPractice={setListenPractice}
        handlePlayPause={handlePlayPause}
        handlePreLine={handlePreLine}
        handleNextLine={handleNextLine}
        handleReplayLine={handleReplayLine}
        handleSeekSlider={handleSeekSlider}
        handleVolumeChange={handleVolumeChange}
        toggleMute={toggleMute}
        handleUserScroll={handleUserScroll}
        handleSpecificLineReplay={handleSpecificLineReplay}
        handleSpecificLineLoop={handleSpecificLineLoop}
        setHasPausedForLine={(val) => {
          hasPausedForLine.current = val;
        }}
      />

      <PracticeContainer
        onSelectExercise={handleSelectExercise}
        currentExercise={currentExercise}
      />

      <ExerciseWorkspace
        currentExercise={currentExercise}
        onClose={handleCloseExercise}
        subtitles={subtitles}
        currentLineIndex={currentLineIndex}
        player={player}
        handleReplayLine={handleReplayLine}
        handleNextLine={handleNextLine}
        isLoopLine={isLoopLine}
        setIsLoopLine={setIsLoopLine}
        setLoopingLineIndex={setLoopingLineIndex}
        streamConfig={streamConfig}
        setHasPausedForLine={(val) => {
          hasPausedForLine.current = val;
        }}
      />
    </div>
  );
}
