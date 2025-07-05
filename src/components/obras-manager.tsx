
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
import type { Obra } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addObra, deleteObra } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ObrasManagerProps {
  initialObras: Obra[];
}

export default function ObrasManager({ initialObras }: ObrasManagerProps) {
  const t = useTranslations('ObrasManager');
  const { toast } = useToast();
  const [allObras, setAllObras] = useState<Obra[]>(initialObras.sort((a, b) => a.name.localeCompare(b.name)));
  const [newObra, setNewObra] = useState({ name: "", identifier: "" });
  const [obraToDelete, setObraToDelete] = useState<Obra | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddObra = () => {
    if (!newObra.name.trim() || !newObra.identifier.trim()) {
      toast({
        title: t('toast.validationErrorTitle'),
        description: t('toast.validationErrorDescription'),
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        const addedObra = await addObra({ name: newObra.name, identifier: newObra.identifier.toUpperCase() });
        setAllObras((prev) => [...prev, addedObra].sort((a, b) => a.name.localeCompare(b.name)));
        setNewObra({ name: "", identifier: "" });
        toast({
          title: t('toast.projectAddedTitle'),
          description: t('toast.projectAddedDescription', { name: addedObra.name }),
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
  
  const handleDeleteObra = () => {
    if (!obraToDelete) return;

    startTransition(async () => {
      try {
        await deleteObra(obraToDelete.id);
        setAllObras((prev) => prev.filter((o) => o.id !== obraToDelete.id));
        toast({
          title: t('toast.projectDeletedTitle'),
          description: t('toast.projectDeletedDescription', { name: obraToDelete.name }),
        });
      } catch (error) {
        toast({
          title: t('toast.deleteErrorTitle'),
          description: error instanceof Error ? error.message : t('toast.unexpectedError'),
          variant: "destructive",
        });
      } finally {
        setObraToDelete(null);
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
              <h3 className="font-semibold">{t('addNewProjectTitle')}</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="w-full sm:w-auto flex-1">
                  <Label htmlFor="new-obra-identifier" className="text-xs font-semibold">{t('identifierLabel')}</Label>
                  <Input
                    id="new-obra-identifier"
                    placeholder={t('identifierPlaceholder')}
                    value={newObra.identifier}
                    onChange={(e) => setNewObra(prev => ({ ...prev, identifier: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="w-full sm:w-auto flex-[2]">
                  <Label htmlFor="new-obra-name" className="text-xs font-semibold">{t('projectNameLabel')}</Label>
                  <Input
                    id="new-obra-name"
                    placeholder={t('projectNamePlaceholder')}
                    value={newObra.name}
                    onChange={(e) => setNewObra(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleAddObra();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddObra} disabled={isPending || !newObra.name.trim() || !newObra.identifier.trim()}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('addButton')}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">{t('existingProjectsTitle', { count: allObras.length })}</h3>
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-4">
                  {allObras.length > 0 ? (
                    <ul className="space-y-2">
                      {allObras.map((obra) => (
                        <li key={obra.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">{obra.identifier.toUpperCase()}</Badge>
                              <p className="font-medium">{obra.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setObraToDelete(obra)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{t('deleteSr', { name: obra.name })}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                      {t('noProjectsCreated')}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!obraToDelete} onOpenChange={(open) => !open && setObraToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('deleteDialogDescription', { name: obraToDelete?.name })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setObraToDelete(null)} disabled={isPending}>
                    {t('cancelButton')}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteObra} 
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
