'use client' // Error components must be Client Components
 
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle>Oops! Something went wrong.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                    We encountered an unexpected error. Please try again.
                </p>
                <p className="text-sm bg-destructive/10 p-3 rounded-md text-destructive font-mono">
                    {error.message || 'An unknown error occurred.'}
                </p>
                <Button
                    onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                    }
                >
                    Try again
                </Button>
            </CardContent>
        </Card>
    </div>
  )
}
