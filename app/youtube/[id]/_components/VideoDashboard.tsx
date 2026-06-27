'use client';

import React from 'react';
import YouTube from 'react-youtube';
import ControlBar from './ControlBar';
import SubtitleBoard from './SubtitleBoard';

interface VideoDashboardProps {
  videoId: string;
  player: any;
  setPlayer: (player: any) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  volume: number;
  isMuted: boolean;
  captionPosition: string;
  currentLineIndex: number | null;
  loopingLineIndex: number | null;
  isLoopLine: boolean;
  playbackSpeed: string;
  fontSize: string;
  listenPractice: boolean;
  status: 'processing' | 'success' | 'error';
  subtitles: any[];
  totalLines: number;
  streamConfig: {
    sourceLang: string;
    targetLang: string;
    videoUrl: string;
  } | null;
  subtitleRefs: React.MutableRefObject<{
    [key: number]: HTMLDivElement | null;
  }>;

  // State Setters & Handlers
  setLoopingLineIndex: (index: number | null) => void;
  setIsLoopLine: (loop: boolean) => void;
  setPlaybackSpeed: (speed: string) => void;
  setFontSize: (size: string) => void;
  setCaptionPosition: (position: string) => void;
  setListenPractice: (practice: boolean) => void;

  handlePlayPause: () => void;
  handlePreLine: () => void;
  handleNextLine: () => void;
  handleReplayLine: () => void;
  handleSeekSlider: (value: number[]) => void;
  handleVolumeChange: (value: number[]) => void;
  toggleMute: () => void;
  handleUserScroll: () => void;
  handleSpecificLineReplay: (e: React.MouseEvent, start: number) => void;
  handleSpecificLineLoop: (
    e: React.MouseEvent,
    index: number,
    start: number,
  ) => void;
  setHasPausedForLine: (index: number | null) => void;
}

const VideoDashboard: React.FC<VideoDashboardProps> = ({
  videoId,
  player,
  setPlayer,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  duration,
  volume,
  isMuted,
  captionPosition,
  currentLineIndex,
  loopingLineIndex,
  isLoopLine,
  playbackSpeed,
  fontSize,
  listenPractice,
  status,
  subtitles,
  totalLines,
  streamConfig,
  subtitleRefs,
  setLoopingLineIndex,
  setIsLoopLine,
  setPlaybackSpeed,
  setFontSize,
  setCaptionPosition,
  setListenPractice,
  handlePlayPause,
  handlePreLine,
  handleNextLine,
  handleReplayLine,
  handleSeekSlider,
  handleVolumeChange,
  toggleMute,
  handleUserScroll,
  handleSpecificLineReplay,
  handleSpecificLineLoop,
  setHasPausedForLine,
}) => {
  const getFontSizeClass = () => {
    if (fontSize === 'small') return 'text-xs md:text-sm';
    if (fontSize === 'larger') return 'text-xl md:text-2xl';
    return 'text-base md:text-lg';
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

  return (
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
          {/* Overlay Subtitles */}
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

        {/* CONTROL BAR COMPONENT */}
        <ControlBar
          player={player}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          isMuted={isMuted}
          volume={volume}
          playbackSpeed={playbackSpeed}
          fontSize={fontSize}
          captionPosition={captionPosition}
          listenPractice={listenPractice}
          isLoopLine={isLoopLine}
          setLoopingLineIndex={setLoopingLineIndex}
          setIsLoopLine={setIsLoopLine}
          setPlaybackSpeed={setPlaybackSpeed}
          setFontSize={setFontSize}
          setCaptionPosition={setCaptionPosition}
          setListenPractice={setListenPractice}
          handleSeekSlider={handleSeekSlider}
          handleVolumeChange={handleVolumeChange}
          toggleMute={toggleMute}
          handlePlayPause={handlePlayPause}
          handlePreLine={handlePreLine}
          handleNextLine={handleNextLine}
          handleReplayLine={handleReplayLine}
        />
      </div>

      {/* SUBTITLE BOARD COMPONENT */}
      <SubtitleBoard
        status={status}
        subtitles={subtitles}
        totalLines={totalLines}
        currentLineIndex={currentLineIndex}
        loopingLineIndex={loopingLineIndex}
        streamConfig={streamConfig}
        player={player}
        subtitleRefs={subtitleRefs}
        handleUserScroll={handleUserScroll}
        handleSpecificLineReplay={handleSpecificLineReplay}
        handleSpecificLineLoop={handleSpecificLineLoop}
        setHasPausedForLine={setHasPausedForLine}
      />
    </div>
  );
};

export default VideoDashboard;
