"use client";

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, Save, Percent } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';

interface TipCalculatorProps {
  bill: number | '';
  setBill: (value: number | '') => void;
  tip: number;
  setTip: (value: number) => void;
  people: number;
  setPeople: (value: number) => void;
  results: {
    tipAmount: number;
    totalAmount: number;
    perPersonAmount: number;
  };
  onSave: (name: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const TipCalculator: React.FC<TipCalculatorProps> = ({
  bill,
  setBill,
  tip,
  setTip,
  people,
  setPeople,
  results,
  onSave,
}) => {
  const [saveName, setSaveName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveClick = () => {
    onSave(saveName);
    setSaveName('');
    setIsDialogOpen(false);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Bill Details</CardTitle>
        <CardDescription>
          Enter the bill details to calculate your tip.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bill" className="text-base">Bill Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="bill"
              type="number"
              placeholder="0.00"
              value={bill}
              onChange={(e) => setBill(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="pl-10 text-lg"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tip" className="text-base">Tip Percentage</Label>
          <div className="flex items-center gap-4">
            <Slider
              id="tip"
              min={0}
              max={50}
              step={1}
              value={[tip]}
              onValueChange={(value) => setTip(value[0])}
              className="flex-1"
            />
            <div className="relative w-24">
              <Input
                type="number"
                value={tip}
                onChange={(e) => setTip(parseInt(e.target.value) || 0)}
                className="pr-8 text-lg text-center"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="people" className="text-base">Number of People</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="people"
              type="number"
              min={1}
              step={1}
              value={people}
              onChange={(e) => setPeople(parseInt(e.target.value) || 1)}
              className="pl-10 text-lg"
            />
          </div>
        </div>

        <div className="border-t border-dashed my-6"></div>

        <div className="space-y-4 animate-in fade-in duration-500">
          <h3 className="text-xl font-headline font-semibold">Results</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-secondary p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Tip Amount</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(results.tipAmount)}</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total Bill</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(results.totalAmount)}</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Per Person</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(results.perPersonAmount)}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground transition-transform active:scale-95" size="lg" disabled={!bill}>
              <Save className="mr-2 h-5 w-5" />
              Save Calculation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Calculation</DialogTitle>
              <DialogDescription>
                Give this calculation a name to save it for later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Lunch with friends"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveClick} disabled={!saveName}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default TipCalculator;
