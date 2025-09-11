'use client';

import { useState } from 'react';
import { CreditCard, Loader2, Download, Wand2, ToyBrick, Trash2 } from 'lucide-react';
import { extractBillingDataFromImage, type ExtractBillingDataOutput } from '@/ai/flows/extract-billing-data';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from './ui/input';
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

export function BillingExtractor() {
  const [photoDataUris, setPhotoDataUris] = useState<string[]>([]);
  const [billingResult, setBillingResult] = useState<ExtractBillingDataOutput | null>(null);
  const [fieldsResult, setFieldsResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const { toast } = useToast();

  const handleScanBilling = async () => {
    if (photoDataUris.length === 0) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingBilling(true);
    setBillingResult(null);

    try {
      const response = await extractBillingDataFromImage({ photoDataUri: photoDataUris[0] });
      setBillingResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract billing data from the image.', variant: 'destructive' });
    } finally {
      setIsLoadingBilling(false);
    }
  };
  
  const handleGetFields = async () => {
    if (photoDataUris.length === 0) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingFields(true);
    setFieldsResult(null);

    try {
      const response = await extractDynamicFormFromImage({ photoDataUri: photoDataUris[0] });
      setFieldsResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract fields from the image.', variant: 'destructive' });
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleClear = () => {
    setPhotoDataUris([]);
    setBillingResult(null);
    setFieldsResult(null);
  };
  
  const getFullText = () => {
    if (!billingResult) return '';
    const itemsText = billingResult.purchasedItems
        .map(item => `${item.item} (Qty: ${item.quantity || 'N/A'}, Unit: ${item.unitPrice || 'N/A'}, Total: ${item.totalPrice})`)
        .join('\n');
    return `Vendor Information: ${billingResult.vendorInformation}\nDates: ${billingResult.dates}\nAmounts: ${billingResult.amounts}\n\nPurchased Items:\n${itemsText}`;
  };

  const handleDownloadBilling = () => {
    const text = getFullText();
    if (!text) return;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'billing_data.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const isLoading = isLoadingBilling || isLoadingFields;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Upload Bill or Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <FileUploader onFileSelect={setPhotoDataUris} />
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={handleScanBilling} disabled={photoDataUris.length === 0 || isLoading} className="w-full">
                {isLoadingBilling ? <Loader2 className="animate-spin" /> : 'Extract Bill Data'}
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
              Extracted Bill Data
            </CardTitle>
            {billingResult && (
              <Button variant="outline" size="sm" onClick={handleDownloadBilling}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingBilling && (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {billingResult && (
              <div className="space-y-4">
                <ResultDisplay label="Vendor Information" value={billingResult.vendorInformation} />
                <ResultDisplay label="Dates" value={billingResult.dates} />
                <ResultDisplay label="Amounts" value={billingResult.amounts} />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Purchased Items</h3>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billingResult.purchasedItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.item}</TableCell>
                            <TableCell className="text-right">{item.quantity ?? 'N/A'}</TableCell>
                            <TableCell className="text-right">{item.unitPrice?.toFixed(2) ?? 'N/A'}</TableCell>
                            <TableCell className="text-right">{item.totalPrice.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
            {!isLoadingBilling && !billingResult && (
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
