
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
import type { UnproductiveHourType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addUnproductiveHourType, deleteUnproductiveHourType } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface UnproductiveHourTypesManagerProps {
  initialUnproductiveHourTypes: UnproductiveHourType[];
}

export default function UnproductiveHourTypesManager({ initialUnproductiveHourTypes }: UnproductiveHourTypesManagerProps) {
  const t = useTranslations('UnproductiveHourTypesManager');
  const { toast } = useToast();
  const [allTypes, setAllTypes] = useState<UnproductiveHourType[]>(initialUnproductiveHourTypes.sort((a, b) => a.name.localeCompare(b.name)));
  const [newType, setNewType] = useState({ name: "", code: "" });
  const [typeToDelete, setTypeToDelete] = useState<UnproductiveHourType | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddType = () => {
    if (!newType.name.trim() || !newType.code.trim()) {
      toast({
        title: t('toast.validationErrorTitle'),
        description: t('toast.validationErrorDescription'),
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        const addedType = await addUnproductiveHourType({ name: newType.name, code: newType.code.toUpperCase() });
        setAllTypes((prev) => [...prev, addedType].sort((a, b) => a.name.localeCompare(b.name)));
        setNewType({ name: "", code: "" });
        toast({
          title: t('toast.typeAddedTitle'),
          description: t('toast.typeAddedDescription', { name: addedType.name }),
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
  
  const handleDeleteType = () => {
    if (!typeToDelete) return;

    startTransition(async () => {
      try {
        await deleteUnproductiveHourType(typeToDelete.id);
        setAllTypes((prev) => prev.filter((o) => o.id !== typeToDelete.id));
        toast({
          title: t('toast.typeDeletedTitle'),
          description: t('toast.typeDeletedDescription', { name: typeToDelete.name }),
        });
      } catch (error) {
        toast({
          title: t('toast.deleteErrorTitle'),
          description: error instanceof Error ? error.message : t('toast.unexpectedError'),
          variant: "destructive",
        });
      } finally {
        setTypeToDelete(null);
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
              <h3 className="font-semibold">{t('addNewTypeTitle')}</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="w-full sm:w-auto flex-1">
                  <Label htmlFor="new-type-code" className="text-xs font-semibold">{t('codeLabel')}</Label>
                  <Input
                    id="new-type-code"
                    placeholder={t('codePlaceholder')}
                    value={newType.code}
                    onChange={(e) => setNewType(prev => ({ ...prev, code: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="w-full sm:w-auto flex-[2]">
                  <Label htmlFor="new-type-name" className="text-xs font-semibold">{t('nameLabel')}</Label>
                  <Input
                    id="new-type-name"
                    placeholder={t('namePlaceholder')}
                    value={newType.name}
                    onChange={(e) => setNewType(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleAddType();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddType} disabled={isPending || !newType.name.trim() || !newType.code.trim()}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('addButton')}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">{t('existingTypesTitle', { count: allTypes.length })}</h3>
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-4">
                  {allTypes.length > 0 ? (
                    <ul className="space-y-2">
                      {allTypes.map((type) => (
                        <li key={type.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">{type.code.toUpperCase()}</Badge>
                              <p className="font-medium">{type.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setTypeToDelete(type)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{t('deleteSr', { name: type.name })}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                      {t('noTypesCreated')}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('deleteDialogDescription', { name: typeToDelete?.name })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTypeToDelete(null)} disabled={isPending}>
                    {t('cancelButton')}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteType} 
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
