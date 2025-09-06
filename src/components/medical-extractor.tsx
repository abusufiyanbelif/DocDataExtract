'use client';

import { useState } from 'react';
import { HeartPulse, Loader2, Download, Wand2, ToyBrick, Trash2, FileText } from 'lucide-react';
import { extractMedicalFindings, type ExtractMedicalFindingsOutput } from '@/ai/flows/extract-medical-findings';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';
import { createLeadStory, type CreateLeadStoryOutput } from '@/ai/flows/create-lead-story';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DynamicFields } from './dynamic-fields';
import { Textarea } from './ui/textarea';

function ResultDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className="font-code bg-secondary p-3 rounded-md text-foreground whitespace-pre-wrap">{value || 'N/A'}</p>
    </div>
  );
}

export function MedicalExtractor() {
  const [reportDataUris, setReportDataUris] = useState<string[]>([]);
  const [medicalResult, setMedicalResult] = useState<ExtractMedicalFindingsOutput | null>(null);
  const [fieldsResult, setFieldsResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [storyResult, setStoryResult] = useState<CreateLeadStoryOutput | null>(null);
  const [isLoadingMedical, setIsLoadingMedical] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const { toast } = useToast();

  const handleFileSelection = (dataUris: string[]) => {
    setReportDataUris(dataUris);
  };
  
  const handleScanMedical = async () => {
    if (reportDataUris.length === 0) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingMedical(true);
    setMedicalResult(null);

    try {
      // For simplicity, we'll analyze the first image for structured findings.
      const response = await extractMedicalFindings({ reportDataUri: reportDataUris[0] });
      setMedicalResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not analyze the medical report.', variant: 'destructive' });
    } finally {
      setIsLoadingMedical(false);
    }
  };

  const handleGetFields = async () => {
    if (reportDataUris.length === 0) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingFields(true);
    setFieldsResult(null);

    try {
      // For simplicity, we'll get fields from the first image.
      const response = await extractDynamicFormFromImage({ photoDataUri: reportDataUris[0] });
      setFieldsResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract fields from the image.', variant: 'destructive' });
    } finally {
      setIsLoadingFields(false);
    }
  };
  
  const handleCreateStory = async () => {
    if (reportDataUris.length === 0) {
      toast({ title: 'Error', description: 'Please upload at least one image.', variant: 'destructive' });
      return;
    }
    setIsLoadingStory(true);
    setStoryResult(null);
    try {
      const response = await createLeadStory({ reportDataUris });
      setStoryResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Story Creation Failed', description: 'Could not generate the lead story.', variant: 'destructive' });
    } finally {
      setIsLoadingStory(false);
    }
  };

  const handleClear = () => {
    setReportDataUris([]);
    setMedicalResult(null);
    setFieldsResult(null);
    setStoryResult(null);
  };
  
  const getFullText = () => {
    if (!medicalResult) return '';
    const findingsText = medicalResult.findings.map(f => `- ${f.finding}: ${f.details}`).join('\n');
    return `Diagnosis: ${medicalResult.diagnosis}\n\nFindings:\n${findingsText}`;
  };
  
  const handleDownloadMedical = () => {
    const text = getFullText();
    if (!text) return;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'medical_findings.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const isLoading = isLoadingMedical || isLoadingFields || isLoadingStory;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="w-6 h-6" />
              Upload Medical Report(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <FileUploader onFileSelect={handleFileSelection} multiple={true} />
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={handleScanMedical} disabled={reportDataUris.length === 0 || isLoading} className="w-full">
                {isLoadingMedical ? <Loader2 className="animate-spin" /> : 'Analyze Report'}
              </Button>
              <Button onClick={handleGetFields} disabled={reportDataUris.length === 0 || isLoading} className="w-full">
                {isLoadingFields ? <Loader2 className="animate-spin" /> : 'Get Fields'}
              </Button>
            </div>
            <Button onClick={handleCreateStory} disabled={reportDataUris.length === 0 || isLoading} className="w-full">
              {isLoadingStory ? <Loader2 className="animate-spin" /> : <><FileText className="mr-2 h-4 w-4"/> Create Lead Story</>}
            </Button>
            {reportDataUris.length > 0 && (
                <Button onClick={handleClear} variant="outline" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear All
                </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-6 h-6" />
              Medical Analysis
            </CardTitle>
            {medicalResult && (
              <Button variant="outline" size="sm" onClick={handleDownloadMedical}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingMedical && (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {medicalResult && (
              <div className="space-y-4">
                <ResultDisplay label="Diagnosis" value={medicalResult.diagnosis} />
                <div>
                   <h3 className="text-sm font-medium text-muted-foreground mb-1">Key Findings</h3>
                   <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Finding</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {medicalResult.findings.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.finding}</TableCell>
                            <TableCell>{item.details}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
            {!isLoadingMedical && !medicalResult && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Your structured analysis will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      { (isLoadingStory || storyResult) &&
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Lead Story Abstract
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoadingStory && <Skeleton className="h-48 w-full" />}
                {storyResult && (
                    <Textarea 
                        value={storyResult.story}
                        readOnly
                        rows={8}
                        className="font-code bg-secondary"
                    />
                )}
            </CardContent>
        </Card>
      }

      <DynamicFields 
        isLoading={isLoadingFields} 
        result={fieldsResult} 
        setResult={setFieldsResult} 
      />
    </div>
  );
}
