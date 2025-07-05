
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Phase } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addPhase, deletePhase } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface PhasesManagerProps {
  initialPhases: Phase[];
}

export default function PhasesManager({ initialPhases }: PhasesManagerProps) {
  const t = useTranslations('PhasesManager');
  const { toast } = useToast();
  const [allPhases, setAllPhases] = useState<Phase[]>(initialPhases.sort((a, b) => a.name.localeCompare(b.name)));
  const [newPhase, setNewPhase] = useState({ name: "", pepElement: "" });
  const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddPhase = () => {
    if (!newPhase.name.trim() || !newPhase.pepElement.trim()) {
      toast({
        title: t('toast.validationErrorTitle'),
        description: t('toast.validationErrorDescription'),
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        const addedPhase = await addPhase({ name: newPhase.name, pepElement: newPhase.pepElement.toUpperCase() });
        setAllPhases((prev) => [...prev, addedPhase].sort((a, b) => a.name.localeCompare(b.name)));
        setNewPhase({ name: "", pepElement: "" });
        toast({
          title: t('toast.phaseAddedTitle'),
          description: t('toast.phaseAddedDescription', { name: addedPhase.name }),
        });
      } catch (error) {
        toast({
          title: t('toast.error'),
          description: error instanceof Error ? error.message : t('toast.addErrorDescription'),
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeletePhase = () => {
    if (!phaseToDelete) return;

    startTransition(async () => {
      try {
        await deletePhase(phaseToDelete.id);
        setAllPhases((prev) => prev.filter((p) => p.id !== phaseToDelete.id));
        toast({
          title: t('toast.phaseDeletedTitle'),
          description: t('toast.phaseDeletedDescription', { name: phaseToDelete.name }),
        });
      } catch (error) {
        toast({
          title: t('toast.deleteErrorTitle'),
          description: error instanceof Error ? error.message : t('toast.unexpectedError'),
          variant: "destructive",
        });
      } finally {
        setPhaseToDelete(null);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('cardTitle')}</CardTitle>
          <CardDescription>
            {t('cardDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">{t('addNewPhaseTitle')}</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="w-full sm:w-auto flex-[2]">
                  <Label htmlFor="new-phase-name" className="text-xs font-semibold">{t('phaseNameLabel')}</Label>
                  <Input
                    id="new-phase-name"
                    placeholder={t('phaseNamePlaceholder')}
                    value={newPhase.name}
                    onChange={(e) => setNewPhase(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="w-full sm:w-auto flex-1">
                  <Label htmlFor="new-phase-pep" className="text-xs font-semibold">{t('pepElementLabel')}</Label>
                  <Input
                    id="new-phase-pep"
                    placeholder={t('pepElementPlaceholder')}
                    value={newPhase.pepElement}
                    onChange={(e) => setNewPhase(prev => ({ ...prev, pepElement: e.target.value }))}
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleAddPhase();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddPhase} disabled={isPending || !newPhase.name.trim() || !newPhase.pepElement.trim()}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('addButton')}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">{t('existingPhasesTitle', { count: allPhases.length })}</h3>
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-4">
                  {allPhases.length > 0 ? (
                    <ul className="space-y-2">
                      {allPhases.map((phase) => (
                        <li key={phase.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">{phase.pepElement.toUpperCase()}</Badge>
                              <p className="font-medium">{phase.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setPhaseToDelete(phase)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{t('deleteSr', { name: phase.name })}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                      {t('noPhasesCreated')}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!phaseToDelete} onOpenChange={(open) => !open && setPhaseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('deleteDialogDescription', { name: phaseToDelete?.name })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPhaseToDelete(null)} disabled={isPending}>
                    {t('cancelButton')}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeletePhase} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('deleteDialogConfirmButton')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
