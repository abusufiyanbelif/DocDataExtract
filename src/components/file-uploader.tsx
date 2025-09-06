
'use client';

import { useState, useRef, type ChangeEvent, type MouseEvent } from 'react';
import { UploadCloud, ZoomIn, ZoomOut, SearchX, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploaderProps {
  onFileSelect: (dataUris: string[]) => void;
  acceptedFileTypes?: string;
  multiple?: boolean;
}

export function FileUploader({
  onFileSelect,
  acceptedFileTypes = 'image/*',
  multiple = false,
}: FileUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPreviews: string[] = [];
      const newFileNames: string[] = [];
      const filePromises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            newPreviews.push(reader.result as string);
            newFileNames.push(file.name);
            resolve(reader.result as string)
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises).then(dataUris => {
        if (multiple) {
            const allPreviews = [...previews, ...newPreviews];
            const allFileNames = [...fileNames, ...newFileNames];
            setPreviews(allPreviews);
            setFileNames(allFileNames);
            onFileSelect(allPreviews);
            if (!activePreview) {
              setActivePreview(newPreviews[0]);
            }
        } else {
            setPreviews(newPreviews);
            setFileNames(newFileNames);
            onFileSelect(newPreviews);
            setActivePreview(newPreviews[0]);
        }
      });
      // Reset zoom/pan when new file is uploaded
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };
  
  const handleRemoveFile = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    const newFileNames = fileNames.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    setFileNames(newFileNames);
    onFileSelect(newPreviews);

    if (activePreview === previews[index]) {
        setActivePreview(newPreviews.length > 0 ? newPreviews[0] : null);
    }
  };

  const handleReset = () => {
    setPreviews([]);
    setFileNames([]);
    onFileSelect([]);
    setActivePreview(null);
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

  if (previews.length > 0) {
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
          {activePreview && <Image 
            src={activePreview} 
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
          />}
           <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/70 p-1 rounded-md">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}><ZoomIn /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}><ZoomOut /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetZoom}><SearchX /></Button>
          </div>
        </div>

        {multiple && previews.length > 0 && (
          <div className="w-full flex flex-wrap gap-2 justify-center">
            {previews.map((preview, index) => (
              <Card 
                key={index} 
                className={cn(
                  "p-1 w-20 h-20 relative cursor-pointer", 
                  activePreview === preview && "ring-2 ring-primary"
                )}
                onClick={() => setActivePreview(preview)}
              >
                <CardContent className="p-0 relative w-full h-full">
                  <Image src={preview} alt={fileNames[index]} fill style={{objectFit: 'cover'}} />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                  >
                    <X className="h-3 w-3"/>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground">{multiple ? `${fileNames.length} files selected` : fileNames[0]}</p>
        <div className="flex gap-2">
            <label htmlFor="file-reupload" className={cn(buttonVariants({ variant: 'outline' }), "cursor-pointer")}>
                Add another file
                <Input
                    id="file-reupload"
                    type="file"
                    className="hidden"
                    onChange={handleFilesChange}
                    accept={acceptedFileTypes}
                    multiple={multiple}
                />
            </label>
            <Button onClick={handleReset} variant="outline">
            Clear all files
            </Button>
        </div>
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
          onChange={handleFilesChange}
          accept={acceptedFileTypes}
          multiple={multiple}
        />
      </label>
    </div>
  );
}
