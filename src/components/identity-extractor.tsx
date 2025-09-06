'use client';

import { useState } from 'react';
import { User, Loader2, Download, Wand2, ToyBrick, Trash2 } from 'lucide-react';
import { extractKeyInfoFromIdentityDocument, type ExtractKeyInfoFromIdentityDocumentOutput } from '@/ai/flows/extract-key-info-identity';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from './ui/input';

function ResultDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className="font-code bg-secondary p-3 rounded-md text-foreground">{value || 'N/A'}</p>
    </div>
  );
}

export function IdentityExtractor() {
  const [photoDataUri, setPhotoDataUri] = useState<string>('');
  const [infoResult, setInfoResult] = useState<ExtractKeyInfoFromIdentityDocumentOutput | null>(null);
  const [fieldsResult, setFieldsResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const { toast } = useToast();

  const handleScanInfo = async () => {
    if (!photoDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingInfo(true);
    setInfoResult(null);

    try {
      const response = await extractKeyInfoFromIdentityDocument({ photoDataUri });
      setInfoResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract information from the ID.', variant: 'destructive' });
    } finally {
      setIsLoadingInfo(false);
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

  const getFullText = () => {
    if (!infoResult) return '';
    return `Name: ${infoResult.name}\nAddress: ${infoResult.address}\nID Number: ${infoResult.idNumber}`;
  };

  const handleDownloadInfo = () => {
    const text = getFullText();
    if (!text) return;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'identity_info.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
  
  const isLoading = isLoadingInfo || isLoadingFields;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Upload Identity Document
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <FileUploader onFileSelect={setPhotoDataUri} />
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={handleScanInfo} disabled={!photoDataUri || isLoading} className="w-full">
                {isLoadingInfo ? <Loader2 className="animate-spin" /> : 'Extract Info'}
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
              Extracted Information
            </CardTitle>
            {infoResult && (
              <Button variant="outline" size="sm" onClick={handleDownloadInfo}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingInfo && (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
            {infoResult && (
              <div className="space-y-4">
                <ResultDisplay label="Full Name" value={infoResult.name} />
                <ResultDisplay label="Address" value={infoResult.address} />
                <ResultDisplay label="ID Number" value={infoResult.idNumber} />
              </div>
            )}
            {!isLoadingInfo && !infoResult && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Your results will appear here.</p>
              </div>
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
