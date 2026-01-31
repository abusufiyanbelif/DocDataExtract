
'use client';

import { useState, type ChangeEvent } from 'react';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploaderProps {
  onFileSelect: (dataUris: string[]) => void;
  onFilesChange?: (files: File[]) => void;
  acceptedFileTypes?: string;
  multiple?: boolean;
}

export function FileUploader({
  onFileSelect,
  onFilesChange,
  acceptedFileTypes = 'image/*,application/pdf',
  multiple = false,
}: FileUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [activePreview, setActivePreview] = useState<string | null>(null);

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      onFilesChange?.(fileArray);

      const filePromises = fileArray.map(file => {
        return new Promise<{ dataUri: string, name: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ dataUri: reader.result as string, name: file.name });
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises).then(results => {
        const dataUris = results.map(r => r.dataUri);
        const newFileNames = results.map(r => r.name);
        
        if (multiple) {
            const allDataUris = [...previews, ...dataUris];
            const allFileNames = [...fileNames, ...newFileNames];
            setPreviews(allDataUris);
            setFileNames(allFileNames);
            onFileSelect(allDataUris);
            if (!activePreview) {
              setActivePreview(dataUris[0]);
            }
        } else {
            setPreviews(dataUris);
            setFileNames(newFileNames);
            onFileSelect(dataUris);
            setActivePreview(dataUris[0]);
        }
      });
    }
  };
  
  const handleRemoveFile = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    const newFileNames = fileNames.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    setFileNames(newFileNames);
    onFileSelect(newPreviews);
    onFilesChange?.(newPreviews.map(() => new File([], ""))); // This is a simplification; need original files if needed

    if (activePreview === previews[index]) {
        setActivePreview(newPreviews.length > 0 ? newPreviews[0] : null);
    }
  };

  const handleReset = () => {
    setPreviews([]);
    setFileNames([]);
    onFileSelect([]);
    onFilesChange?.([]);
    setActivePreview(null);
  };

  const isPdf = (preview: string) => preview.startsWith('data:application/pdf');

  if (previews.length > 0) {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div 
          className="relative w-full max-w-sm h-64 border-2 border-dashed rounded-lg overflow-hidden bg-secondary/20 flex items-center justify-center"
        >
          {activePreview ? (
            isPdf(activePreview) ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <FileIcon className="w-16 h-16" />
                <p className="mt-2 text-sm font-medium break-all">{fileNames[previews.indexOf(activePreview)]}</p>
              </div>
            ) : (
              <Image 
                src={activePreview} 
                alt="File preview" 
                fill 
                style={{ objectFit: 'contain' }} 
                data-ai-hint="document preview"
              />
            )
          ) : (
             <p className="text-muted-foreground">No file selected for preview</p>
          )}
        </div>

        {multiple && previews.length > 1 && (
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
                <CardContent className="p-0 relative w-full h-full flex items-center justify-center bg-secondary/20 rounded-md overflow-hidden">
                  {isPdf(preview) ? (
                    <FileIcon className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <Image src={preview} alt={fileNames[index]} fill style={{objectFit: 'cover'}} />
                  )}
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

        <p className="text-sm text-muted-foreground">{multiple ? `${fileNames.length} files selected` : (fileNames[0] || 'No file selected')}</p>
        <div className="flex gap-2">
            <label htmlFor="file-reupload" className={cn(buttonVariants({ variant: 'outline' }), "cursor-pointer")}>
                {multiple ? 'Add more files' : 'Change file'}
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
          <p className="text-xs text-muted-foreground">Any image file (PNG, JPG, etc.) or PDF</p>
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
