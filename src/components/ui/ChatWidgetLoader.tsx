'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false });

export default function ChatWidgetLoader() {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed')) return null;
  return <ChatWidget />;
}
