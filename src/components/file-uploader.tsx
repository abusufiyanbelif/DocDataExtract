
'use client';

import { useState, useRef, type ChangeEvent, type MouseEvent } from 'react';
import { UploadCloud, ZoomIn, ZoomOut, SearchX } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFileSelect: (dataUri: string) => void;
  acceptedFileTypes?: string;
}

export function FileUploader({
  onFileSelect,
  acceptedFileTypes = 'image/*',
}: FileUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setPreview(dataUri);
        onFileSelect(dataUri);
        // Reset zoom/pan when new file is uploaded
        setScale(1);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setFileName('');
    onFileSelect('');
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setScale(s => s * 1.2);
  const handleZoomOut = () => setScale(s => s / 1.2);
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.currentTarget.style.cursor = 'grabbing';
  };
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || scale <= 1) return;
    const x = e.clientX - startPos.current.x;
    const y = e.clientY - startPos.current.y;
    setPosition({ x, y });
  };
  
  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.style.cursor = scale > 1 ? 'grab' : 'default';
  };

  if (preview) {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div 
          className="relative w-full max-w-sm h-64 border-2 border-dashed rounded-lg overflow-hidden bg-secondary/20"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          ref={imageRef}
        >
          <Image 
            src={preview} 
            alt="File preview" 
            fill 
            style={{ 
              objectFit: 'contain',
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? 'grab' : 'default',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }} 
            data-ai-hint="document preview"
            draggable="false"
          />
           <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/70 p-1 rounded-md">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}><ZoomIn /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}><ZoomOut /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetZoom}><SearchX /></Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{fileName}</p>
        <Button onClick={handleReset} variant="outline">
          Choose a different file
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary transition-colors"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
          <p className="mb-2 text-sm text-center text-muted-foreground">
            <span className="font-semibold text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">Any image file (PNG, JPG, etc.)</p>
        </div>
        <Input
          id="file-upload"
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept={acceptedFileTypes}
        />
      </label>
    </div>
  );
}
