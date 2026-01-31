
'use client';

import { useState } from 'react';
import { User, Loader2, Download, Wand2, ToyBrick, Trash2 } from 'lucide-react';
import { extractKeyInfoFromAadhaar, type ExtractKeyInfoFromAadhaarOutput } from '@/ai/flows/extract-key-info-identity';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicFields } from './dynamic-fields';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

function ResultDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className="font-code bg-secondary p-3 rounded-md text-foreground whitespace-pre-wrap">{value || 'N/A'}</p>
    </div>
  );
}

export function IdentityExtractor() {
  const [photoDataUris, setPhotoDataUris] = useState<string[]>([]);
  const [infoResult, setInfoResult] = useState<ExtractKeyInfoFromAadhaarOutput | null>(null);
  const [fieldsResult, setFieldsResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'pdf'>('image');
  const { toast } = useToast();

  const handleScanInfo = async () => {
    if (photoDataUris.length === 0) {
      toast({ title: 'Error', description: `Please upload an ${uploadType} first.`, variant: 'destructive' });
      return;
    }
    setIsLoadingInfo(true);
    setInfoResult(null);

    try {
      toast({ title: "Extracting info...", description: "Please wait." });
      const response = await extractKeyInfoFromAadhaar({ photoDataUri: photoDataUris[0] });
      setInfoResult(response);
    } catch (error: any) {
      console.warn("Identity scan failed:", error);
      toast({ title: 'Extraction Failed', description: error.message || `Could not extract information from the ${uploadType}.`, variant: 'destructive' });
    } finally {
      setIsLoadingInfo(false);
    }
  };
  
  const handleGetFields = async () => {
    if (photoDataUris.length === 0) {
      toast({ title: 'Error', description: `Please upload an ${uploadType} first.`, variant: 'destructive' });
      return;
    }
    setIsLoadingFields(true);
    setFieldsResult(null);

    try {
      toast({ title: "Extracting fields...", description: "Please wait." });
      const response = await extractDynamicFormFromImage({ photoDataUri: photoDataUris[0] });
      setFieldsResult(response);
    } catch (error: any) {
      console.warn("Get fields failed:", error);
      toast({ title: 'Extraction Failed', description: error.message || `Could not extract fields from the ${uploadType}.`, variant: 'destructive' });
    } finally {
      setIsLoadingFields(false);
    }
  };
  
  const handleClear = () => {
    setPhotoDataUris([]);
    setInfoResult(null);
    setFieldsResult(null);
  };

  const getFullText = () => {
    if (!infoResult) return '';
    return `Name: ${infoResult.name}\nDate of Birth: ${infoResult.dob}\nGender: ${infoResult.gender}\nAadhaar Number: ${infoResult.aadhaarNumber}\nAddress: ${infoResult.address}`;
  };

  const handleDownloadInfo = () => {
    const text = getFullText();
    if (!text) return;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'aadhaar_info.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const isLoading = isLoadingInfo || isLoadingFields;
  const acceptedFileTypes = uploadType === 'image' ? 'image/*' : 'application/pdf';

  return (
    <div className="flex flex-col gap-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Upload Aadhaar Card
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
                <RadioGroupItem value="image" id="image-id" className="peer sr-only" />
                <Label
                  htmlFor="image-id"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  Image
                </Label>
              </div>
              <div>
                <RadioGroupItem value="pdf" id="pdf-id" className="peer sr-only" />
                <Label
                  htmlFor="pdf-id"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  PDF
                </Label>
              </div>
            </RadioGroup>
            
            <FileUploader 
                onFileSelect={setPhotoDataUris} 
                acceptedFileTypes={acceptedFileTypes}
                key={uploadType}
            />
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={handleScanInfo} disabled={photoDataUris.length === 0 || isLoading} className="w-full">
                {isLoadingInfo ? <Loader2 className="animate-spin" /> : `Extract Info`}
              </Button>
              <Button onClick={handleGetFields} disabled={photoDataUris.length === 0 || isLoading} className="w-full">
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
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
            {infoResult && (
              <div className="space-y-4">
                <ResultDisplay label="Full Name" value={infoResult.name} />
                <ResultDisplay label="Date of Birth" value={infoResult.dob} />
                <ResultDisplay label="Gender" value={infoResult.gender} />
                <ResultDisplay label="Aadhaar Number" value={infoResult.aadhaarNumber} />
                <ResultDisplay label="Address" value={infoResult.address} />
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

      <DynamicFields 
        isLoading={isLoadingFields} 
        result={fieldsResult} 
        setResult={setFieldsResult} 
      />
    </div>
  );
}
