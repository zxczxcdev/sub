import { AuthGuard } from '@/components/auth-guard';

export default function layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
