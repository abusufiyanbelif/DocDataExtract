'use client';

import { useState } from 'react';
import { FileText, Loader2, Download, Wand2, ToyBrick, Trash2 } from 'lucide-react';
import { extractAndCorrectText, type ExtractAndCorrectTextOutput } from '@/ai/flows/extract-and-correct-text';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';

export function TextExtractor() {
  const [photoDataUri, setPhotoDataUri] = useState<string>('');
  const [textResult, setTextResult] = useState<ExtractAndCorrectTextOutput | null>(null);
  const [fieldsResult, setFieldsResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const { toast } = useToast();

  const handleScanText = async () => {
    if (!photoDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingText(true);
    setTextResult(null);

    try {
      const response = await extractAndCorrectText({ photoDataUri });
      setTextResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract text from the image.', variant: 'destructive' });
    } finally {
      setIsLoadingText(false);
    }
  };

  const handleGetFields = async () => {
    if (!photoDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingFields(true);
    setFieldsResult(null);

    try {
      const response = await extractDynamicFormFromImage({ photoDataUri });
      setFieldsResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract fields from the image.', variant: 'destructive' });
    } finally {
      setIsLoadingFields(false);
    }
  };
  
  const handleFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    if (!fieldsResult) return;
    const newFields = [...fieldsResult.fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setFieldsResult({ fields: newFields });
  };
  
  const handleRemoveField = (index: number) => {
    if (!fieldsResult) return;
    const newFields = fieldsResult.fields.filter((_, i) => i !== index);
    setFieldsResult({ fields: newFields });
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

  const handleDownloadFields = (format: 'json' | 'csv') => {
    if (!fieldsResult?.fields || fieldsResult.fields.length === 0) return;

    let content = '';
    let mimeType = '';
    let fileName = '';

    if (format === 'json') {
      const jsonObject = fieldsResult.fields.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      content = JSON.stringify(jsonObject, null, 2);
      mimeType = 'application/json';
      fileName = 'extracted_fields.json';
    } else { // csv
      const header = 'key,value\n';
      const rows = fieldsResult.fields.map(({ key, value }) => `"${key.replace(/"/g, '""')}","${value.replace(/"/g, '""')}"`).join('\n');
      content = header + rows;
      mimeType = 'text/csv';
      fileName = 'extracted_fields.csv';
    }

    const element = document.createElement('a');
    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const isLoading = isLoadingText || isLoadingFields;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <FileUploader onFileSelect={setPhotoDataUri} />
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={handleScanText} disabled={!photoDataUri || isLoading} className="w-full">
                {isLoadingText ? <Loader2 className="animate-spin" /> : 'Extract Text'}
              </Button>
              <Button onClick={handleGetFields} disabled={!photoDataUri || isLoading} className="w-full">
                {isLoadingFields ? <Loader2 className="animate-spin" /> : 'Get Fields'}
              </Button>
            </div>
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
                readOnly
                rows={12}
                className="font-code bg-secondary"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {(isLoadingFields || fieldsResult) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ToyBrick className="w-6 h-6" />
              Extracted Fields
            </CardTitle>
            {fieldsResult && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownloadFields('json')}>
                  <Download className="mr-2 h-4 w-4" /> JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadFields('csv')}>
                  <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingFields && (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-10 w-2/3" />
                  </div>
                ))}
              </div>
            )}
            
            {!isLoadingFields && fieldsResult && (
              <div className="space-y-3 max-h-[24rem] overflow-y-auto pr-2">
                {fieldsResult.fields.map((field, index) => (
                  <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                    <Input
                      value={field.key}
                      onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                      placeholder="Key"
                      className="font-code"
                    />
                    <Input
                      value={field.value}
                      onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="font-code"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveField(index)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
