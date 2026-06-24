import { AuthGuard } from '@/components/auth-guard';

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
