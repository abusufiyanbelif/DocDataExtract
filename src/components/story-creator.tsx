'use client';

import { useState } from 'react';
import { FileText, Loader2, Wand2, Trash2 } from 'lucide-react';
import { createLeadStory, type CreateLeadStoryOutput } from '@/ai/flows/create-lead-story';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from './ui/skeleton';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

export function StoryCreator() {
  const [reportDataUris, setReportDataUris] = useState<string[]>([]);
  const [storyResult, setStoryResult] = useState<CreateLeadStoryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'pdf'>('image');
  const { toast } = useToast();

  const handleFileSelection = (dataUris: string[]) => {
    setReportDataUris(dataUris);
  };

  const handleCreateStory = async () => {
    if (reportDataUris.length === 0) {
      toast({ title: 'Error', description: `Please upload at least one ${uploadType}.`, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setStoryResult(null);
    try {
      const response = await createLeadStory({ reportDataUris });
      setStoryResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Story Creation Failed', description: 'Could not generate the lead story.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setReportDataUris([]);
    setStoryResult(null);
  };

  const acceptedFileTypes = uploadType === 'image' ? 'image/*' : 'application/pdf';

  return (
    <div className="flex flex-col gap-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Upload Documents to Create a Story
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
                    <RadioGroupItem value="image" id="image-story" className="peer sr-only" />
                    <Label
                        htmlFor="image-story"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                    Image
                    </Label>
                </div>
                <div>
                    <RadioGroupItem value="pdf" id="pdf-story" className="peer sr-only" />
                    <Label
                        htmlFor="pdf-story"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                    PDF
                    </Label>
                </div>
            </RadioGroup>

            <FileUploader 
                onFileSelect={handleFileSelection} 
                acceptedFileTypes={acceptedFileTypes}
                key={uploadType}
                multiple={true} 
            />

            <Button onClick={handleCreateStory} disabled={reportDataUris.length === 0 || isLoading} className="w-full">
              {isLoading ? <Loader2 className="animate-spin" /> : <><Wand2 className="mr-2 h-4 w-4"/> Create Lead Story</>}
            </Button>
            {reportDataUris.length > 0 && (
                <Button onClick={handleClear} variant="outline" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear All
                </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-6 h-6" />
                Generated Story Abstract
            </CardTitle>
          </CardHeader>
          <CardContent>
              {isLoading && <Skeleton className="h-64 w-full" />}
              {!isLoading && !storyResult && (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <p>Your generated story will appear here.</p>
                </div>
              )}
              {storyResult && (
                  <Textarea 
                      value={storyResult.story}
                      readOnly
                      rows={12}
                      className="font-code bg-secondary"
                  />
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
