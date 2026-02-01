
'use client';

import Image from 'next/image';
import { useBranding } from '@/hooks/use-branding';

export function Watermark() {
    const { brandingSettings, isLoading } = useBranding();

    if (isLoading || !brandingSettings?.logoUrl) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[-10] opacity-5 pointer-events-none flex items-center justify-center p-8">
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
