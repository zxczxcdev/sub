'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderBarProps {
  streamConfig: {
    sourceLang: string;
    targetLang: string;
  } | null;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ streamConfig }) => {
  return (
    <div className="flex items-center justify-between">
      <Button className="rounded-full gap-2" asChild>
        <Link href="/">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
      </Button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Globe className="w-4 h-4" />
        <span className="font-medium font-mono">
          {streamConfig?.sourceLang?.toUpperCase() || '...'} ➔{' '}
          {streamConfig?.targetLang?.toUpperCase() || '...'}
        </span>
      </div>
    </div>
  );
};

export default HeaderBar;
