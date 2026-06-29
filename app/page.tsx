import * as React from 'react';
import VideoGrid from '@/components/VideoGrid';

export const revalidate = 10;

async function getCachedVideos() {
  try {
    // 🌟 Thay đổi tại đây
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${baseUrl}/api/youtube/list-cached`, {
      next: { revalidate: 10 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.videos || [];
  } catch (error) {
    console.error('Lỗi fetch dữ liệu SSR trang chủ:', error);
    return [];
  }
}

export default async function Home() {
  const initialVideos = await getCachedVideos();

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-7xl mx-auto space-y-8 mt-16">
      <div className="space-y-1.5 select-none border-b pb-4">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          Subtitled Video Library
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground font-medium">
          Explore and learn languages with our community-compiled YouTube smart
          caption hub.
        </p>
      </div>

      {/* Nạp mảng thô duy nhất xuống cho VideoGrid xử lý phân cụm */}
      <VideoGrid initialVideos={initialVideos} />
    </div>
  );
}
