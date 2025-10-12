'use client';

import dynamic from 'next/dynamic';

const SightseeingClient = dynamic(() => import('./SightseeingClient.jsx'), { ssr: false });

export default function SightseeingPage() {
  return <SightseeingClient />;
}