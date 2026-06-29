'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Eye,
  ThumbsUp,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { US, CN, KR, JP } from 'country-flag-icons/react/3x2';
import ConfigModal from '@/components/ConfigModal';
import { Button } from '@/components/ui/button';

export default function VideoGrid({ initialVideos }: { initialVideos: any[] }) {
  const router = useRouter();
  const [videos] = React.useState<any[]>(initialVideos);

  // --- TRẠNG THÁI QUẢN LÝ MODAL TẬP TRUNG ---
  const [isOpenModal, setIsOpenModal] = React.useState(false);
  const [selectedVideo, setSelectedVideo] = React.useState<any>(null);
  const [availableLanguages, setAvailableLanguages] = React.useState<any[]>([]);

  // --- QUẢN LÝ REFS ĐỂ ĐIỀU HƯỚNG CUỘN SLIDE TỪNG KHU VỰC ---
  const sectionRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>(
    {},
  );

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
  const handleCardClick = (video: any) => {
    setSelectedVideo(video);
    setAvailableLanguages(video.available_languages || []);
    setIsOpenModal(true);
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

  // 🌟 HÀM XỬ LÝ CUỘN TRÁI / PHẢI KHI CLICK NÚT ĐIỀU HƯỚNG
  const scrollSection = (sectionTitle: string, direction: 'left' | 'right') => {
    const container = sectionRefs.current[sectionTitle];
    if (container) {
      // Tính toán khoảng cách cuộn bằng chiều rộng thực tế của hộp chứa video
      const scrollAmount = container.clientWidth;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
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
      <div className="space-y-4 pt-2 max-w-full overflow-hidden">
        {/* Header chuyên mục: Flex-row để chèn cụm nút sang bên phải */}
        <div className="flex items-end justify-between px-4 md:px-0 select-none">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <span className="w-7 shadow-sm inline-block rounded-md overflow-hidden shrink-0 border border-muted/70 aspect-[3/2]">
                {flagIcon}
              </span>
              {title}
            </h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>

          {/* 🌟 CỤM NÚT ĐIỀU HƯỚNG TRÁI / PHẢI TRÊN PC (Ẩn trên mobile bằng lớp hidden sm:flex) */}
          <div className="hidden sm:flex items-center gap-1.5 pb-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm cursor-pointer border-border/80"
              onClick={() => scrollSection(title, 'left')}
              title="Cuộn sang trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm cursor-pointer border-border/80"
              onClick={() => scrollSection(title, 'right')}
              title="Cuộn sang phải"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* CONTAINER HỖ TRỢ LƯỚT NGANG */}
        {/* Gắn ref dựa trên tiêu đề chuyên mục để tránh nhầm lẫn luồng cuộn giữa các nước */}
        <div
          ref={(el) => {
            sectionRefs.current[title] = el;
          }}
          className="w-full overflow-x-auto pb-4 px-4 md:px-0 scrollbar-none snap-x snap-mandatory flex scroll-smooth"
        >
          <div className="grid grid-cols-none grid-with-cols grid-flow-col auto-cols-[calc(50%-10px)] md:auto-cols-[calc(25%-15px)] gap-5 w-full">
            {items.map((vid) => {
              const meta = vid.metadata || {};
              return (
                <div
                  key={vid.video_id}
                  onClick={() => handleCardClick(vid)}
                  className="group border border-border/60 rounded-2xl overflow-hidden bg-card/40 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer flex flex-col snap-start h-full"
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
                        {(meta.view_count || 0).toLocaleString('en-US')}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {(meta.like_count || 0).toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- GIAO DIỆN TRẠNG THÁI KHO TRỐNG ---
  if (videos.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center border border-dashed rounded-3xl bg-muted/10 p-6 text-center mx-4 md:mx-0">
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
