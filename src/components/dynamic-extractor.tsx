'use client';

import { useState } from 'react';
import { ToyBrick, Loader2, Download, Wand2, Trash2 } from 'lucide-react';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from '@/components/ui/skeleton';

export function DynamicExtractor() {
  const [photoDataUri, setPhotoDataUri] = useState<string>('');
  const [result, setResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!photoDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await extractDynamicFormFromImage({ photoDataUri });
      setResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract dynamic data from the image.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    if (!result) return;
    const newFields = [...result.fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setResult({ fields: newFields });
  };
  
  const handleRemoveField = (index: number) => {
    if (!result) return;
    const newFields = result.fields.filter((_, i) => i !== index);
    setResult({ fields: newFields });
  };
  
  const handleDownload = (format: 'json' | 'csv') => {
    if (!result?.fields || result.fields.length === 0) return;

    let content = '';
    let mimeType = '';
    let fileName = '';

    if (format === 'json') {
      const jsonObject = result.fields.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      content = JSON.stringify(jsonObject, null, 2);
      mimeType = 'application/json';
      fileName = 'dynamic_data.json';
    } else { // csv
      const header = 'key,value\n';
      const rows = result.fields.map(({ key, value }) => `"${key.replace(/"/g, '""')}","${value.replace(/"/g, '""')}"`).join('\n');
      content = header + rows;
      mimeType = 'text/csv';
      fileName = 'dynamic_data.csv';
    }

    const element = document.createElement('a');
    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ToyBrick className="w-6 h-6" />
            Upload Document or Form
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <FileUploader onFileSelect={setPhotoDataUri} />
          <Button onClick={handleScan} disabled={!photoDataUri || isLoading} className="w-full">
            {isLoading ? <Loader2 className="animate-spin" /> : 'Extract Dynamic Data'}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-6 h-6" />
            Extracted Data
          </CardTitle>
           {result && (
             <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload('json')}>
                <Download className="mr-2 h-4 w-4" /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload('csv')}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-10 w-1/3" />
                  <Skeleton className="h-10 w-2/3" />
                </div>
              ))}
            </div>
          )}
          {result && (
            <div className="space-y-3">
              {result.fields.map((field, index) => (
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
          {!isLoading && !result && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Your results will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
