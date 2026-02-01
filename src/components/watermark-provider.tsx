'use client';

import React from 'react';
import { useBranding } from '@/hooks/use-branding';

export function WatermarkProvider({ children }: { children: React.ReactNode }) {
  const { brandingSettings } = useBranding();

  const watermarkStyle = brandingSettings?.logoUrl
    ? { '--watermark-url': `url(${brandingSettings.logoUrl})` }
    : {};

  return (
    <div className="watermark-container" style={watermarkStyle as React.CSSProperties}>
      {children}
    </div>
  );
}
