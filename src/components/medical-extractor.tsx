'use client';

import { useState } from 'react';
import { HeartPulse, Loader2, Download, Wand2, ToyBrick, Trash2 } from 'lucide-react';
import { extractMedicalFindings, type ExtractMedicalFindingsOutput } from '@/ai/flows/extract-medical-findings';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DynamicFields } from './dynamic-fields';

function ResultDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className="font-code bg-secondary p-3 rounded-md text-foreground whitespace-pre-wrap">{value || 'N/A'}</p>
    </div>
  );
}

export function MedicalExtractor() {
  const [reportDataUri, setReportDataUri] = useState<string>('');
  const [medicalResult, setMedicalResult] = useState<ExtractMedicalFindingsOutput | null>(null);
  const [fieldsResult, setFieldsResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoadingMedical, setIsLoadingMedical] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const { toast } = useToast();

  const handleScanMedical = async () => {
    if (!reportDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingMedical(true);
    setMedicalResult(null);

    try {
      const response = await extractMedicalFindings({ reportDataUri });
      setMedicalResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not analyze the medical report.', variant: 'destructive' });
    } finally {
      setIsLoadingMedical(false);
    }
  };

  const handleGetFields = async () => {
    if (!reportDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingFields(true);
    setFieldsResult(null);

    try {
      const response = await extractDynamicFormFromImage({ photoDataUri: reportDataUri });
      setFieldsResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract fields from the image.', variant: 'destructive' });
    } finally {
      setIsLoadingFields(false);
    }
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
  
  const isLoading = isLoadingMedical || isLoadingFields;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="w-6 h-6" />
              Upload Medical Report
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <FileUploader onFileSelect={setReportDataUri} />
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={handleScanMedical} disabled={!reportDataUri || isLoading} className="w-full">
                {isLoadingMedical ? <Loader2 className="animate-spin" /> : 'Analyze Report'}
              </Button>
              <Button onClick={handleGetFields} disabled={!reportDataUri || isLoading} className="w-full">
                {isLoadingFields ? <Loader2 className="animate-spin" /> : 'Get Fields'}
              </Button>
            </div>
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
