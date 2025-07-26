"use client";

import React, { useState, useMemo } from 'react';
import Header from '@/components/app/header';
import TipCalculator from '@/components/app/tip-calculator';
import SmartTipper from '@/components/app/smart-tipper';
import SavedCalculations from '@/components/app/saved-calculations';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { SavedCalculation } from '@/types';

export default function Home() {
  const [bill, setBill] = useState<number | ''>('');
  const [tip, setTip] = useState<number>(18);
  const [people, setPeople] = useState<number>(1);
  const [savedCalculations, setSavedCalculations] = useLocalStorage<SavedCalculation[]>('tip-calculations', []);

  const results = useMemo(() => {
    const billAmount = typeof bill === 'number' ? bill : 0;
    const numPeople = people > 0 ? people : 1;
    const tipPercentage = tip / 100;

    const tipAmount = billAmount * tipPercentage;
    const totalAmount = billAmount + tipAmount;
    const perPersonAmount = totalAmount / numPeople;

    return {
      tipAmount,
      totalAmount,
      perPersonAmount,
    };
  }, [bill, tip, people]);

  const handleSave = (name: string) => {
    if (!name || !bill) return;

    const newCalculation: SavedCalculation = {
      id: new Date().toISOString(),
      name,
      bill: typeof bill === 'number' ? bill : 0,
      tip,
      people,
      ...results,
      createdAt: new Date().toISOString(),
    };
    setSavedCalculations([newCalculation, ...savedCalculations]);
  };

  const handleRecall = (calculation: SavedCalculation) => {
    setBill(calculation.bill);
    setTip(calculation.tip);
    setPeople(calculation.people);
  };

  const handleDelete = (id: string) => {
    setSavedCalculations(savedCalculations.filter((calc) => calc.id !== id));
  };
  
  const handleApplySmartTip = (suggestedTip: number) => {
    setTip(suggestedTip);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 flex flex-col gap-8">
            <TipCalculator
              bill={bill}
              setBill={setBill}
              tip={tip}
              setTip={setTip}
              people={people}
              setPeople={setPeople}
              results={results}
              onSave={handleSave}
            />
            <SmartTipper onApplyTip={handleApplySmartTip} />
          </div>
          <div className="lg:col-span-2">
            <SavedCalculations
              calculations={savedCalculations}
              onRecall={handleRecall}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
