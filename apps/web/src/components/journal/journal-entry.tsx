"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface JournalResponse {
  journal: {
    _id: string;
    date: string;
    content: string;
    user: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface JournalEntryProps {
  initialDate?: Date;
  initialContent?: string;
  onSave?: () => void;
}

export function JournalEntry({ initialDate, initialContent = '', onSave }: JournalEntryProps) {
  const [date, setDate] = useState<Date>(initialDate || new Date());
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  // Using sonner toast directly

  useEffect(() => {
    // If initialDate changes, update the state
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    // If initialContent changes, update the state
    if (initialContent !== undefined) {
      setContent(initialContent);
    }
  }, [initialContent]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.post<JournalResponse>('/api/journals/create-update/', {
        date: date.toISOString(),
        content,
      });
      
      toast.success('Journal entry saved successfully');
      
      if (onSave) {
        onSave();
      }
      
      return data;
    } catch (error) {
      console.error('Error saving journal:', error);
      toast.error('Failed to save your journal entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Journal Entry</CardTitle>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={format(date, "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) {
                  setDate(new Date(e.target.value));
                }
              }}
              className="w-[180px]"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Write your journal entry here..."
          className="min-h-[200px] resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Journal
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
