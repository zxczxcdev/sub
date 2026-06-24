'use client';

import * as React from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Loader2, Mail } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Lắng nghe trạng thái đăng nhập từ Firebase
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
    }
  };

  // 1. Màn hình Loading khi Firebase đang kiểm tra session
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 2. Màn hình chặn bắt buộc Đăng nhập nếu chưa có Session
  if (!user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Yêu cầu đăng nhập
            </h1>
            <p className="text-sm text-muted-foreground">
              Vui lòng đăng nhập tài khoản Google để truy cập và sử dụng tất cả
              các tính năng trên website.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleLogin}
            className="w-full h-11 rounded-full gap-2 font-medium transition-all duration-200 hover:bg-muted active:scale-[0.98] cursor-pointer"
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
            Đăng nhập với Google
          </Button>
        </div>
      </div>
    );
  }

  // 3. Nếu đã đăng nhập thành công, trả về giao diện bình thường
  return <>{children}</>;
}
