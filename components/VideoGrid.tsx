'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Play, Eye, ThumbsUp, Loader2, Globe } from 'lucide-react';
import { US, CN, KR, JP } from 'country-flag-icons/react/3x2';
import ConfigModal from '@/components/ConfigModal';

export default function VideoGrid({ initialVideos }: { initialVideos: any[] }) {
  const router = useRouter();
  const [videos] = React.useState<any[]>(initialVideos);

  // --- TRẠNG THÁI QUẢN LÝ MODAL TẬP TRUNG ---
  const [isOpenModal, setIsOpenModal] = React.useState(false);
  const [isLoadingCheck, setIsLoadingCheck] = React.useState(false);
  const [selectedVideo, setSelectedVideo] = React.useState<any>(null);
  const [availableLanguages, setAvailableLanguages] = React.useState<any[]>([]);

  // --- THUẬT TOÁN PHÂN LOẠI VIDEO THEO CHUYÊN MỤC ---
  const filterByLang = (langCodes: string[]) => {
    return videos.filter((vid: any) =>
      vid.available_languages?.some((lang: any) =>
        langCodes.includes(lang.lang_code),
      ),
    );
  };

  const englishVideos = filterByLang(['en', 'en-US', 'en-GB']);
  const chineseVideos = filterByLang([
    'zh',
    'zh-Hans',
    'zh-Hant',
    'zh-CN',
    'zh-TW',
    'zh-HK',
  ]);
  const koreanVideos = filterByLang(['ko']);
  const japaneseVideos = filterByLang(['ja']);

  const otherVideos = videos.filter(
    (vid: any) =>
      !vid.available_languages?.some((lang: any) =>
        [
          'en',
          'en-US',
          'en-GB',
          'zh',
          'zh-Hans',
          'zh-Hant',
          'zh-CN',
          'zh-TW',
          'zh-HK',
          'ko',
          'ja',
        ].includes(lang.lang_code),
      ),
  );

  // --- XỬ LÝ CLICK CARD VIDEO ---
  const handleCardClick = async (video: any) => {
    setSelectedVideo(video);
    setIsLoadingCheck(true);

    const videoUrl = `https://www.youtube.com/watch?v=${video.video_id}`;
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${baseUrl}/api/youtube/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok) throw new Error('Không thể kiểm tra phụ đề video');
      const data = await response.json();

      setAvailableLanguages(data.available_languages || []);
      setIsOpenModal(true);
    } catch (error) {
      alert('Lỗi đồng bộ thông tin video hoặc video không có phụ đề!');
      console.error(error);
    } finally {
      setIsLoadingCheck(false);
    }
  };

  // --- XỬ LÝ XÁC NHẬN TỪ CONFIG MODAL CON ĐẨY LÊN ---
  const handleModalConfirm = (sourceLang: string, targetLang: string) => {
    setIsOpenModal(false);
    const videoId = selectedVideo.video_id;

    const configData = {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      source_lang: sourceLang,
      target_lang: targetLang,
    };

    sessionStorage.setItem(`yt_config_${videoId}`, JSON.stringify(configData));
    router.push(`/youtube/${videoId}`);
  };

  // --- HÀM RENDER CHUYÊN MỤC DÙNG CHUNG ---
  const renderVideoSection = (
    title: string,
    description: string,
    flagIcon: React.ReactNode,
    items: any[],
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-4 pt-2">
        <div className="space-y-0.5 select-none">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="w-8 shadow-sm inline-block  overflow-hidden shrink-0 border border-muted/50">
              {flagIcon}
            </span>
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {items.map((vid) => {
            const meta = vid.metadata || {};
            return (
              <div
                key={vid.video_id}
                onClick={() => handleCardClick(vid)}
                className="group border border-border/60 rounded-2xl overflow-hidden bg-card/40 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer flex flex-col"
              >
                {/* Thumbnail Section */}
                <div className="w-full aspect-video bg-muted relative overflow-hidden shrink-0">
                  <img
                    src={
                      meta.thumbnail ||
                      'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7'
                    }
                    alt={meta.title || 'Thumbnail'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground transform scale-90 group-hover:scale-100 transition-transform shadow">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {meta.title || 'N/A'}
                    </h3>
                    <p className="text-[11px] font-semibold text-muted-foreground truncate">
                      {meta.author || 'N/A'}
                    </p>
                  </div>

                  {/* Footer Meta Stats */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/90 border-t border-muted/40 pt-2 select-none shrink-0">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {(meta.view_count || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {(meta.like_count || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- GIAO DIỆN TRẠNG THÁI KHO TRỐNG ---
  if (videos.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center border border-dashed rounded-3xl bg-muted/10 p-6 text-center">
        <span className="text-sm font-semibold text-muted-foreground">
          The translation database is currently empty.
        </span>
        <span className="text-xs text-muted-foreground/70 mt-1">
          Paste a YouTube link into the navigation bar above to translate the
          very first video!
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-10 relative">
      {/* Loading Overlay Global */}
      {isLoadingCheck && (
        <div className="fixed inset-0 bg-background/40 backdrop-blur-[1px] z-[100] flex items-center justify-center">
          <div className="bg-card border p-4 rounded-xl shadow-md flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs font-medium">
              Loading subscription tracks...
            </span>
          </div>
        </div>
      )}

      {/* Render từng dòng chuyên mục đa quốc gia với cờ SVG tương ứng */}
      {renderVideoSection(
        'English Tracks',
        'Videos with native English subtitles and audio.',
        <US />,
        englishVideos,
      )}
      {renderVideoSection(
        'Chinese Hanzi & Pinyin',
        'Learn Mandarin with full Hanzi transcripts and automatic Pinyin guides.',
        <CN />,
        chineseVideos,
      )}
      {renderVideoSection(
        'Korean K-Pop & K-Drama',
        'Practice Hangul listening skills with authentic subbed content.',
        <KR />,
        koreanVideos,
      )}
      {renderVideoSection(
        'Japanese Anime & Culture',
        'Master Kanji and Kana with synchronized time-stamped captions.',
        <JP />,
        japaneseVideos,
      )}
      {renderVideoSection(
        'Other Languages',
        'Explore other translated international programs.',
        <Globe className="w-full h-full text-muted-foreground" />,
        otherVideos,
      )}

      {/* Gọi duy nhất một Modal xử lý đóng/mở tập trung */}
      <ConfigModal
        isOpen={isOpenModal}
        onOpenChange={setIsOpenModal}
        video={selectedVideo}
        availableLanguages={availableLanguages}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
}
