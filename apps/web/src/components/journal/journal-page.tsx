"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { JournalEntry } from './journal-entry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, PlusCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface Journal {
  _id: string;
  date: string;
  content: string;
  user: string;
  createdAt: string;
  updatedAt: string;
}

interface JournalResponse {
  journal: Journal;
}

interface JournalsResponse {
  journals: Journal[];
}

export function JournalPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  // Using sonner toast directly

  const fetchJournals = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<JournalsResponse>('/api/journals/overview/');
      setJournals(data.journals || []);
    } catch (error) {
      console.error('Error fetching journals:', error);
      toast.error('Failed to load your journal entries.');
    } finally {
      setIsLoading(false);
    }
  };

  const [todayJournal, setTodayJournal] = useState<Journal | null>(null);

  const fetchTodayJournal = async () => {
    try {
      const data = await apiClient.get<JournalResponse>('/api/journals/today/');
      if (data.journal) {
        setTodayJournal(data.journal);
      } else {
        setTodayJournal(null);
      }
    } catch (error) {
      console.error('Error fetching today\'s journal:', error);
      setTodayJournal(null);
    }
  };

  const fetchJournalByDate = async (date: string) => {
    try {
      const data = await apiClient.get<JournalResponse>(`/api/journals/${date}/`);
      setSelectedJournal(data.journal);
      setActiveTab('entry');
    } catch (error) {
      console.error(`Error fetching journal for ${date}:`, error);
      toast.error(`Failed to load journal entry for ${date}.`);
    }
  };

  useEffect(() => {
    fetchJournals();
    fetchTodayJournal();
  }, []);

  const handleCreateNew = () => {
    setSelectedJournal(null);
    setActiveTab('entry');
  };

  const formatJournalDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const getJournalPreview = (content: string) => {
    return content.length > 100 ? `${content.substring(0, 100)}...` : content;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Journal</h1>
        <Button onClick={handleCreateNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      </div>

      <div className="flex space-x-2 mb-4">
        <Button 
          variant={activeTab === 'today' ? 'default' : 'outline'}
          onClick={() => setActiveTab('today')}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Today
        </Button>
        <Button 
          variant={activeTab === 'history' ? 'default' : 'outline'}
          onClick={() => setActiveTab('history')}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          History
        </Button>
        <Button 
          variant={activeTab === 'entry' ? 'default' : 'outline'}
          onClick={() => setActiveTab('entry')}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Journal Entry
        </Button>
      </div>
        
        {activeTab === 'today' && (
          <div className="space-y-4">
            <JournalEntry
              initialDate={new Date()}
              initialContent={todayJournal?.content || ''}
              onSave={fetchJournals}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="col-span-full text-center py-10">Loading journal entries...</p>
            ) : journals.length === 0 ? (
              <div className="col-span-full text-center py-10">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No journal entries yet</h3>
                <p className="text-muted-foreground mt-2">
                  Start writing your thoughts and reflections today.
                </p>
                <Button onClick={handleCreateNew} className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Your First Entry
                </Button>
              </div>
            ) : (
              journals.map((journal) => (
                <Card 
                  key={journal._id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => fetchJournalByDate(format(new Date(journal.date), 'yyyy-MM-dd'))}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium">
                        {formatJournalDate(journal.date)}
                      </CardTitle>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3">
                      {getJournalPreview(journal.content)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        )}

        {activeTab === 'entry' && (
          <div className="mt-6">
            <JournalEntry 
              initialDate={selectedJournal ? new Date(selectedJournal.date) : new Date()} 
              initialContent={selectedJournal?.content || ''} 
              onSave={fetchJournals}
            />
          </div>
        )}
    </div>
  );
}
