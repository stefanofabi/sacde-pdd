"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { smartTipSuggestion, SmartTipInput, SmartTipOutput } from '@/ai/flows/smart-tip';
import { Sparkles, Lightbulb } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface SmartTipperProps {
    onApplyTip: (tip: number) => void;
}

const SmartTipper: React.FC<SmartTipperProps> = ({ onApplyTip }) => {
    const [inputs, setInputs] = useState<SmartTipInput>({
        speedOfService: 'average',
        serverAttentiveness: 'attentive',
        foodQuality: 'good',
    });
    const [result, setResult] = useState<SmartTipOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (field: keyof SmartTipInput, value: string) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setResult(null);
        setError(null);
        try {
            const response = await smartTipSuggestion(inputs);
            setResult(response);
        } catch (err) {
            setError('Failed to get suggestion. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Smart Tip Assistant
                </CardTitle>
                <CardDescription>Let AI suggest a tip based on your experience.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="speed">Speed of Service</Label>
                            <Select value={inputs.speedOfService} onValueChange={(value) => handleInputChange('speedOfService', value)}>
                                <SelectTrigger id="speed"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="very-slow">Very Slow</SelectItem>
                                    <SelectItem value="slow">Slow</SelectItem>
                                    <SelectItem value="average">Average</SelectItem>
                                    <SelectItem value="fast">Fast</SelectItem>
                                    <SelectItem value="very-fast">Very Fast</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="attentiveness">Server Attentiveness</Label>
                            <Select value={inputs.serverAttentiveness} onValueChange={(value) => handleInputChange('serverAttentiveness', value)}>
                                <SelectTrigger id="attentiveness"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not-attentive">Not Attentive</SelectItem>
                                    <SelectItem value="slightly-attentive">Slightly Attentive</SelectItem>
                                    <SelectItem value="attentive">Attentive</SelectItem>
                                    <SelectItem value="very-attentive">Very Attentive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quality">Food Quality</Label>
                            <Select value={inputs.foodQuality} onValueChange={(value) => handleInputChange('foodQuality', value)}>
                                <SelectTrigger id="quality"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bad">Bad</SelectItem>
                                    <SelectItem value="poor">Poor</SelectItem>
                                    <SelectItem value="average">Average</SelectItem>
                                    <SelectItem value="good">Good</SelectItem>
                                    <SelectItem value="excellent">Excellent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {isLoading && (
                        <div className="space-y-4 pt-4">
                            <Skeleton className="h-8 w-1/3" />
                             <Skeleton className="h-4 w-full" />
                             <Skeleton className="h-4 w-4/5" />
                        </div>
                    )}
                    {error && <p className="text-destructive text-sm">{error}</p>}
                    {result && !isLoading && (
                         <div className="pt-4 animate-in fade-in duration-500">
                             <div className="bg-secondary p-4 rounded-lg border border-primary/20">
                                 <p className="text-3xl font-bold text-center text-primary">{result.tipPercentage}%</p>
                                 <p className="text-muted-foreground mt-2 text-center">{result.reasoning}</p>
                                 <Button onClick={() => onApplyTip(result.tipPercentage)} className="w-full mt-4" variant="outline">
                                    <Lightbulb className="mr-2 h-4 w-4" />
                                    Apply this Tip
                                 </Button>
                             </div>
                         </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isLoading} className="w-full transition-transform active:scale-95">
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isLoading ? 'Thinking...' : 'Get Suggestion'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default SmartTipper;
