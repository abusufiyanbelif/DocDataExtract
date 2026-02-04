'use client';
import { useState, useEffect } from 'react';
import { Skeleton } from './ui/skeleton';

interface ProxiedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  imageUrl: string | null | undefined;
}

export function ProxiedImage({ imageUrl, className, ...props }: ProxiedImageProps) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isCancelled = false;

    const fetchImage = async () => {
      if (!imageUrl || !imageUrl.startsWith('http')) {
        setLocalUrl(imageUrl); // It might be a data URL already
        return;
      }
      
      setIsLoading(true);
      setError(false);
      
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Image fetch failed with status: ${response.status}`);
        }
        const blob = await response.blob();
        if (!isCancelled) {
          objectUrl = URL.createObjectURL(blob);
          setLocalUrl(objectUrl);
        }
      } catch (e) {
        console.error("Failed to fetch image as blob:", e);
        if (!isCancelled) {
            setLocalUrl(null);
            setError(true);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchImage();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl]);

  if (isLoading) {
    return <Skeleton className={className} />;
  }

  if (error || !localUrl) {
    return null; 
  }

  return <img src={localUrl} className={className} {...props} alt={props.alt || ''} />;
}
