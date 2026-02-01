'use client';

import Image from 'next/image';
import { useBranding } from '@/hooks/use-branding';

export function Watermark() {
    const { brandingSettings, isLoading } = useBranding();

    if (isLoading || !brandingSettings?.logoUrl) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[-10] flex items-center justify-center p-8 opacity-[0.15] mix-blend-multiply pointer-events-none">
            <Image
                src={brandingSettings.logoUrl}
                alt="Watermark"
                width={500}
                height={500}
                className="object-contain"
            />
        </div>
    );
}
