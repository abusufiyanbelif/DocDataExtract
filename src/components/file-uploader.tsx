'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setPreview(dataUri);
        onFileSelect(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setFileName('');
    onFileSelect('');
  };

  if (preview) {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="relative w-full max-w-sm h-64 border-2 border-dashed rounded-lg overflow-hidden">
          <Image src={preview} alt="File preview" fill style={{ objectFit: 'contain' }} data-ai-hint="document preview" />
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
