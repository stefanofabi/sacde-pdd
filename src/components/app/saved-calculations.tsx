"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, History, UtensilsCrossed } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { SavedCalculation } from '@/types';

interface SavedCalculationsProps {
  calculations: SavedCalculation[];
  onRecall: (calculation: SavedCalculation) => void;
  onDelete: (id: string) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

const SavedCalculations: React.FC<SavedCalculationsProps> = ({ calculations, onRecall, onDelete }) => {
  return (
    <Card className="w-full shadow-lg h-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Saved Bills
        </CardTitle>
        <CardDescription>Recall or delete your past calculations.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {calculations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64">
              <UtensilsCrossed className="w-12 h-12 mb-4" />
              <p>No saved bills yet.</p>
              <p className="text-sm">Your saved calculations will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {calculations.map((calc) => (
                <div key={calc.id} className="border p-4 rounded-lg bg-background hover:bg-secondary/50 transition-colors animate-in fade-in duration-300">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-lg text-primary">{calc.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(calc.createdAt)}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRecall(calc)}>
                                <History className="w-4 h-4" />
                                <span className="sr-only">Recall</span>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete this saved calculation.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(calc.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                            <p className="text-muted-foreground text-xs">Bill</p>
                            <p className="font-semibold">{formatCurrency(calc.bill)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Total</p>
                            <p className="font-semibold">{formatCurrency(calc.totalAmount)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Per Person</p>
                            <p className="font-semibold">{formatCurrency(calc.perPersonAmount)}</p>
                        </div>
                    </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SavedCalculations;
