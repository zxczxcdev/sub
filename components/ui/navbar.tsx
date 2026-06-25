'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Search,
  Menu,
  Moon,
  Sun,
  Globe,
  Flame,
  History,
  LogIn,
  LogOut,
  User as UserIcon,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, User } from 'firebase/auth';

const TARGET_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh-CN', name: '中文 (简体)' },
];

export function Navbar() {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isOpenAuthModal, setIsOpenAuthModal] = React.useState(false);
  const [isOpenConfirmLogout, setIsOpenConfirmLogout] = React.useState(false);
  const [isOpenMobileMenu, setIsOpenMobileMenu] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);

  // --- STATES PHỤC VỤ LOGIC CHỌN SUB REALTIME ---
  const [loadingCheck, setLoadingCheck] = React.useState(false);
  const [isOpenConfigModal, setIsOpenConfigModal] = React.useState(false);
  const [videoData, setVideoData] = React.useState<any>(null);
  const [selectedSource, setSelectedSource] = React.useState('');
  const [selectedTarget, setSelectedTarget] = React.useState('vi');

  const mobileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (isOpenMobileMenu) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 150);
    }
  }, [isOpenMobileMenu]);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // Hàm xử lý kiểm tra phụ đề chung cho cả Desktop và Mobile
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const videoId = extractVideoId(searchQuery);
    if (!videoId) {
      alert('Đường dẫn YouTube không hợp lệ!');
      return;
    }

    setLoadingCheck(true);
    setIsOpenMobileMenu(false); // Đóng menu mobile nếu đang mở để không che Khuôn cấu hình

    try {
      const response = await fetch('http://127.0.0.1:8000/api/youtube/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: searchQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Không thể kiểm tra video này.');
      }

      const data = await response.json();
      setVideoData(data);

      if (data.available_languages && data.available_languages.length > 0) {
        setSelectedSource(data.available_languages[0].lang_code);
      }

      setIsOpenConfigModal(true); // Kích hoạt mở modal chọn cấu hình sub
    } catch (error: any) {
      alert(error.message);
    }
    {
      setLoadingCheck(false);
    }
  };

  const handleNavigateToWatch = () => {
    if (!selectedSource || !selectedTarget) {
      alert('Vui lòng chọn đầy đủ ngôn ngữ!');
      return;
    }
    setIsOpenConfigModal(false);

    // 🌟 BƯỚC MỚI: Lưu thông tin cấu hình vào sessionStorage để truyền ngầm
    const configData = {
      url: searchQuery,
      source_lang: selectedSource,
      target_lang: selectedTarget,
    };
    sessionStorage.setItem(
      `yt_config_${videoData.video_id}`,
      JSON.stringify(configData),
    );

    // 🚀 ĐIỀU HƯỚNG URL SẠCH TUYỆT ĐỐI
    router.push(`/youtube/${videoData.video_id}`);
    setSearchQuery(''); // Làm sạch ô nhập liệu
  };

  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setIsOpenAuthModal(false);
    } catch (error) {
      console.error('Lỗi Auth Firebase:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsOpenConfirmLogout(false);
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
    }
  };

  const navItems = [
    { label: 'Trang chủ', href: '/', icon: <Globe className="w-4 h-4 mr-2" /> },
    {
      label: 'Xu hướng',
      href: '/trending',
      icon: <Flame className="w-4 h-4 mr-2" />,
    },
    {
      label: 'Lịch sử xem',
      href: '/history',
      icon: <History className="w-4 h-4 mr-2" />,
    },
  ];

  // --- CÁC SUB-COMPONENTS GIAO DIỆN PHỤ TRỢ ---
  const AuthModalContent = () => (
    <DialogContent className="sm:max-w-[400px] rounded-2xl border-border bg-background/95 backdrop-blur-md">
      <DialogHeader className="items-center text-center pt-4">
        <DialogTitle className="text-xl font-bold text-foreground">
          Chào mừng tới SubTubeCC
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-center">
          Đăng nhập hoặc tạo tài khoản miễn phí để lưu lại lịch sử xem video và
          cài đặt phụ đề của bạn.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3 mt-4 mb-2">
        <Button
          variant="outline"
          onClick={handleGoogleAuth}
          className="w-full h-11 rounded-full gap-2 font-medium transition-all duration-200 hover:bg-muted cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.65 0 3.13.57 4.3 1.69l3.22-3.22C17.56 1.64 14.97 1 12 1 7.37 1 3.42 3.66 1.48 7.56l3.8 2.95C6.18 7.37 8.87 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-1.99 3.43-4.92 3.43-8.55z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.77c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2l-3.8-2.95C.52 9.22 0 10.56 0 12s.52 2.78 1.48 4.38l3.8-2.95z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.7-2.87c-1.1.74-2.52 1.18-4.26 1.18-3.13 0-5.82-2.33-6.77-5.47l-3.8 2.95C3.42 20.34 7.37 23 12 23z"
            />
          </svg>
          Tiếp tục với Google
        </Button>
      </div>
    </DialogContent>
  );

  const LogoutConfirmModalContent = () => (
    <DialogContent className="sm:max-w-[400px] rounded-2xl border-border bg-background/95 backdrop-blur-md">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold text-foreground">
          Xác nhận đăng xuất
        </DialogTitle>
        <DialogDescription className="text-muted-foreground pt-1">
          Bạn có chắc chắn muốn đăng xuất khỏi tài khoản **{user?.displayName}**
          không?
        </DialogDescription>
      </DialogHeader>
      <div className="flex items-center justify-end gap-3 mt-4">
        <Button
          variant="outline"
          onClick={() => setIsOpenConfirmLogout(false)}
          className="rounded-full"
        >
          Hủy bỏ
        </Button>
        <Button
          variant="destructive"
          onClick={handleSignOut}
          className="rounded-full px-5"
        >
          Đăng xuất
        </Button>
      </div>
    </DialogContent>
  );

  const UserMenuContent = () => {
    const fallbackLetters = user?.displayName
      ? user.displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : 'US';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full border p-0 cursor-pointer"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={user?.photoURL || undefined}
                alt={user?.displayName || 'User profile'}
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="text-xs bg-muted font-medium">
                {fallbackLetters}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 rounded-xl mt-2" align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground truncate">
                {user?.displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsOpenConfirmLogout(true)}
            className="text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Đăng xuất</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div className="fixed top-4 left-0 right-0 z-50 w-full px-4 md:px-8 max-w-7xl mx-auto pointer-events-none">
        <header className="pointer-events-auto w-full h-14 md:h-16 rounded-full border border-border bg-background/60 backdrop-blur-md shadow-sm transition-all duration-300">
          <div className="container h-full flex items-center justify-between px-6 mx-auto gap-4">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
              <Link href="/" className="flex items-center gap-1.5">
                <span className="text-foreground font-semibold">SubTubeCC</span>
                <span className="text-[10px] bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded-full border border-border ml-1 hidden xs:inline-block">
                  Vietsub
                </span>
              </Link>
            </div>

            {/* THANH TÌM KIẾM DESKTOP */}
            <form
              onSubmit={handleSearch}
              className="flex-1 max-w-sm mx-2 hidden md:flex items-center relative"
            >
              <Input
                type="text"
                placeholder="Dán link YouTube..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 w-full h-9 bg-muted/50 rounded-full border-input focus-visible:ring-ring"
                disabled={loadingCheck}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={loadingCheck || !searchQuery.trim()}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground"
              >
                {loadingCheck ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </form>

            <div className="flex items-center gap-1 md:gap-2">
              <nav className="items-center gap-1 hidden lg:flex mr-1">
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className="rounded-full h-9 px-4 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link
                      href={item.href}
                      className="flex items-center text-sm font-medium"
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </nav>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 text-muted-foreground"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>

              <div className="hidden sm:block">
                {user ? (
                  <UserMenuContent />
                ) : (
                  <Dialog
                    open={isOpenAuthModal}
                    onOpenChange={setIsOpenAuthModal}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        className="rounded-full h-9 px-5 text-sm font-medium"
                      >
                        Đăng nhập
                      </Button>
                    </DialogTrigger>
                    <AuthModalContent />
                  </Dialog>
                )}
              </div>

              {/* KHỐI ĐIỀU HƯỚNG CHO MOBILE & TABLET */}
              <div className="lg:hidden flex items-center gap-1">
                <Sheet
                  open={isOpenMobileMenu}
                  onOpenChange={setIsOpenMobileMenu}
                >
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9 text-muted-foreground"
                    >
                      <Menu className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent
                    side="right"
                    className="w-[280px] sm:w-[350px] flex flex-col justify-between pb-8 border-l border-border"
                  >
                    <div>
                      <SheetTitle className="text-center font-bold text-foreground flex items-center justify-center gap-2 mb-6 p-4">
                        SubTubeCC
                      </SheetTitle>

                      {/* THANH TÌM KIẾM TRÊN MOBILE MENU */}
                      <form
                        onSubmit={handleSearch}
                        className="flex items-center relative mb-6 px-1"
                      >
                        <Input
                          ref={mobileInputRef}
                          type="text"
                          placeholder="Dán link YouTube..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full h-10 pl-4 pr-11 bg-muted/40 rounded-full border-input"
                          disabled={loadingCheck}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          disabled={loadingCheck || !searchQuery.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground"
                        >
                          {loadingCheck ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                        </Button>
                      </form>

                      <div className="flex flex-col gap-2">
                        {navItems.map((item) => (
                          <Button
                            key={item.href}
                            variant="ghost"
                            className="justify-start w-full text-base rounded-xl text-muted-foreground"
                            asChild
                            onClick={() => setIsOpenMobileMenu(false)}
                          >
                            <Link href={item.href}>
                              {item.icon}
                              {item.label}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:hidden w-full pt-4 border-t border-border">
                      {user ? (
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-muted border overflow-hidden">
                              {user.photoURL && (
                                <img
                                  src={user.photoURL}
                                  alt="Avatar"
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                              {user.displayName}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setIsOpenMobileMenu(false);
                              setIsOpenConfirmLogout(true);
                            }}
                            className="text-destructive rounded-full"
                          >
                            <LogOut className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Dialog
                          open={isOpenAuthModal}
                          onOpenChange={setIsOpenAuthModal}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="default"
                              className="w-full rounded-full h-11 gap-2 text-base font-medium"
                            >
                              <LogIn className="w-4 h-4" /> Đăng nhập
                            </Button>
                          </DialogTrigger>
                          <AuthModalContent />
                        </Dialog>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* 🌟 DIALOG CHỌN CẤU HÌNH NGÔN NGỮ PHỤ ĐỀ */}
      <Dialog open={isOpenConfigModal} onOpenChange={setIsOpenConfigModal}>
        <DialogContent
          // 🎯 SỬ DỤNG LỆNH NÀY ĐỂ HOÀN TOÀN FIX LỖI TRANH CHẤP FOCUS GIỮA DIALOG VÀ SELECT DROPDOWN
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-[460px] rounded-2xl bg-background/95 backdrop-blur-md z-[100]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold line-clamp-2">
              {videoData?.metadata?.title || 'Đang tải tiêu đề...'}
            </DialogTitle>

            <DialogDescription className="text-xs font-medium text-muted-foreground pt-1">
              {videoData?.metadata ? (
                <>
                  Kênh:{' '}
                  <span className="font-semibold text-foreground">
                    {videoData.metadata.author}
                  </span>
                  {' • '}
                  Lượt xem:{' '}
                  <span className="font-semibold text-foreground">
                    {(videoData.metadata.view_count || 0).toLocaleString()}
                  </span>
                  {' • '}
                  Lượt thích:{' '}
                  <span className="font-semibold text-foreground">
                    {(videoData.metadata.like_count || 0).toLocaleString()}
                  </span>
                </>
              ) : (
                'Đang tải thông tin video...'
              )}
            </DialogDescription>
          </DialogHeader>

          {videoData?.metadata?.thumbnail && (
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-muted">
              <img
                src={videoData.metadata.thumbnail}
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
                  className="rounded-xl mt-1 z-[150]"
                >
                  {videoData?.available_languages?.map((lang: any) => (
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
                  className="rounded-xl mt-1 z-[150]"
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
              onClick={() => setIsOpenConfigModal(false)}
              className="rounded-full"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={handleNavigateToWatch}
              className="rounded-full px-6 cursor-pointer"
            >
              Xem ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpenConfirmLogout} onOpenChange={setIsOpenConfirmLogout}>
        <LogoutConfirmModalContent />
      </Dialog>
    </>
  );
}
