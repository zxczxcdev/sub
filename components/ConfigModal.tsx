'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TARGET_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'zh-CN', name: '中文 (简体)' },
  { code: 'zh-TW', name: '中文 (繁體)' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
];

interface ConfigModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  video: any;
  availableLanguages: any[];
  onConfirm: (sourceLang: string, targetLang: string) => void;
}

export default function ConfigModal({
  isOpen,
  onOpenChange,
  video,
  availableLanguages,
  onConfirm,
}: ConfigModalProps) {
  const [selectedSource, setSelectedSource] = React.useState<string>('');
  const [selectedTarget, setSelectedTarget] = React.useState<string>('vi');

  // Tự động cập nhật ngôn ngữ gốc mặc định khi danh sách sub thay đổi
  React.useEffect(() => {
    if (availableLanguages && availableLanguages.length > 0) {
      setSelectedSource(availableLanguages[0].lang_code);
    } else {
      setSelectedSource('');
    }
  }, [availableLanguages]);

  const handleConfirm = () => {
    onConfirm(selectedSource, selectedTarget);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-[460px] rounded-2xl bg-background/95 backdrop-blur-md z-[110]"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold line-clamp-2">
            {video?.metadata?.title || 'Cấu hình dịch phụ đề'}
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-muted-foreground pt-1">
            {video?.metadata ? (
              <>
                Kênh:{' '}
                <span className="font-semibold text-foreground">
                  {video.metadata.author}
                </span>
                {' • '}
                Lượt xem:{' '}
                <span className="font-semibold text-foreground">
                  {(video.metadata.view_count || 0).toLocaleString()}
                </span>
              </>
            ) : (
              'Thiết lập thông số dịch thuật ngoại ngữ'
            )}
          </DialogDescription>
        </DialogHeader>

        {video?.metadata?.thumbnail && (
          <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-muted">
            <img
              src={video.metadata.thumbnail}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 my-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Phụ đề gốc
            </label>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-full rounded-xl bg-muted/40">
                <SelectValue placeholder="Chọn bản sub gốc" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="rounded-xl mt-1 z-[160]"
              >
                {availableLanguages.map((lang: any) => (
                  <SelectItem key={lang.lang_code} value={lang.lang_code}>
                    {lang.lang_name} {lang.is_generated ? '(Tự động)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Ngôn ngữ dịch
            </label>
            <Select value={selectedTarget} onValueChange={setSelectedTarget}>
              <SelectTrigger className="w-full rounded-xl bg-muted/40">
                <SelectValue placeholder="Chọn ngôn ngữ dịch" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="rounded-xl mt-1 z-[160]"
              >
                {TARGET_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleConfirm}
            className="rounded-full px-6 cursor-pointer"
          >
            Xem ngay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
