'use client';

import { useState } from 'react';
import { FileText, Loader2, Trash2 } from 'lucide-react';
import { createLeadStory, type CreateLeadStoryOutput } from '@/ai/flows/create-lead-story';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

export function StoryCreator() {
  const [reportDataUris, setReportDataUris] = useState<string[]>([]);
  const [storyResult, setStoryResult] = useState<CreateLeadStoryOutput | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
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
    setIsLoadingStory(true);
    setStoryResult(null);
    try {
      const response = await createLeadStory({ reportDataUris });
      setStoryResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Story Creation Failed', description: 'Could not generate the story.', variant: 'destructive' });
    } finally {
      setIsLoadingStory(false);
    }
  };

  const handleClear = () => {
    setReportDataUris([]);
    setStoryResult(null);
  };
  
  const acceptedFileTypes = uploadType === 'image' ? 'image/*' : 'application/pdf';

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
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
                className="grid grid-cols-2 gap-4 w-full mb-4 max-w-sm"
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

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                <Button onClick={handleCreateStory} disabled={reportDataUris.length === 0 || isLoadingStory} className="w-full">
                    {isLoadingStory ? <Loader2 className="animate-spin" /> : <><FileText className="mr-2 h-4 w-4"/> Create Lead Story</>}
                </Button>
                {reportDataUris.length > 0 && (
                    <Button onClick={handleClear} variant="outline" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" /> Clear All
                    </Button>
                )}
            </div>
          </CardContent>
        </Card>
      
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
                        rows={12}
                        className="font-code bg-secondary text-base"
                    />
                )}
            </CardContent>
        </Card>
      }
    </div>
  );
}
