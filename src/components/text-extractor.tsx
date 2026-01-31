
'use client';

import { useState } from 'react';
import { FileText, Loader2, Download, Wand2, ToyBrick, Trash2 } from 'lucide-react';
import { extractAndCorrectText, type ExtractAndCorrectTextOutput } from '@/ai/flows/extract-and-correct-text';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';
import { useStorage } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from './ui/skeleton';
import { DynamicFields } from './dynamic-fields';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

export function TextExtractor() {
  const [photoDataUris, setPhotoDataUris] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [textResult, setTextResult] = useState<ExtractAndCorrectTextOutput | null>(null);
  const [fieldsResult, setFieldsResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'pdf'>('image');
  const { toast } = useToast();
  const storage = useStorage();

  const handleScanText = async () => {
    if (uploadedFiles.length === 0) {
      toast({ title: 'Error', description: `Please upload an ${uploadType} first.`, variant: 'destructive' });
      return;
    }
    setIsLoadingText(true);
    setTextResult(null);
    
    const file = uploadedFiles[0];
    const tempPath = `temp-scans/${Date.now()}-${file.name}`;
    const fileRef = storageRef(storage!, tempPath);

    try {
      toast({ title: "Preparing file...", description: "Uploading for secure analysis." });
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      toast({ title: "Extracting text...", description: "Please wait." });
      const response = await extractAndCorrectText({ photoDataUri: downloadURL });
      setTextResult(response);
    } catch (error: any) {
      console.warn("Text extraction failed:", error);
      toast({ title: 'Extraction Failed', description: error.message || `Could not extract text from the ${uploadType}.`, variant: 'destructive' });
    } finally {
      await deleteObject(fileRef).catch(err => console.error("Failed to delete temp file", err));
      setIsLoadingText(false);
    }
  };

  const handleGetFields = async () => {
    if (uploadedFiles.length === 0) {
      toast({ title: 'Error', description: `Please upload an ${uploadType} first.`, variant: 'destructive' });
      return;
    }
    setIsLoadingFields(true);
    setFieldsResult(null);
    
    const file = uploadedFiles[0];
    const tempPath = `temp-scans/${Date.now()}-${file.name}`;
    const fileRef = storageRef(storage!, tempPath);

    try {
      toast({ title: "Preparing file...", description: "Uploading for secure analysis." });
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      toast({ title: "Extracting fields...", description: "Please wait." });
      const response = await extractDynamicFormFromImage({ photoDataUri: downloadURL });
      setFieldsResult(response);
    } catch (error: any) {
      console.warn("Get fields failed:", error);
      toast({ title: 'Extraction Failed', description: error.message || `Could not extract fields from the ${uploadType}.`, variant: 'destructive' });
    } finally {
      await deleteObject(fileRef).catch(err => console.error("Failed to delete temp file", err));
      setIsLoadingFields(false);
    }
  };

  const handleClear = () => {
    setPhotoDataUris([]);
    setUploadedFiles([]);
    setTextResult(null);
    setFieldsResult(null);
  };
  
  const handleDownloadText = () => {
    if (!textResult?.extractedText) return;
    const element = document.createElement('a');
    const file = new Blob([textResult.extractedText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'extracted_text.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const isLoading = isLoadingText || isLoadingFields;
  const acceptedFileTypes = uploadType === 'image' ? 'image/*' : 'application/pdf';

  return (
    <div className="flex flex-col gap-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
             <RadioGroup
              defaultValue="image"
              onValueChange={(value: 'image' | 'pdf') => {
                setUploadType(value);
                handleClear();
              }}
              className="grid grid-cols-2 gap-4 w-full mb-4"
              value={uploadType}
            >
              <div>
                <RadioGroupItem value="image" id="image" className="peer sr-only" />
                <Label
                  htmlFor="image"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  Image
                </Label>
              </div>
              <div>
                <RadioGroupItem value="pdf" id="pdf" className="peer sr-only" />
                <Label
                  htmlFor="pdf"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  PDF
                </Label>
              </div>
            </RadioGroup>
            
            <FileUploader 
                onFileSelect={setPhotoDataUris} 
                onFilesChange={setUploadedFiles}
                acceptedFileTypes={acceptedFileTypes}
                key={uploadType} 
            />

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={handleScanText} disabled={uploadedFiles.length === 0 || isLoading} className="w-full">
                {isLoadingText ? <Loader2 className="animate-spin" /> : `Extract Text`}
              </Button>
              <Button onClick={handleGetFields} disabled={uploadedFiles.length === 0 || isLoading} className="w-full">
                {isLoadingFields ? <Loader2 className="animate-spin" /> : 'Get Fields'}
              </Button>
            </div>
            {photoDataUris.length > 0 && (
                <Button onClick={handleClear} variant="outline" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear
                </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-6 h-6" />
              Extracted Text
            </CardTitle>
            {textResult && (
              <Button variant="outline" size="sm" onClick={handleDownloadText}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingText && (
              <Skeleton className="h-64 w-full" />
            )}
            
            {!isLoadingText && !textResult && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Your extracted text will appear here.</p>
              </div>
            )}

            {!isLoadingText && textResult && (
              <Textarea
                value={textResult.extractedText}
                onChange={(e) => setTextResult({ extractedText: e.target.value })}
                rows={12}
                className="font-code bg-secondary"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <DynamicFields 
        isLoading={isLoadingFields} 
        result={fieldsResult} 
        setResult={setFieldsResult} 
      />
    </div>
  );
}
