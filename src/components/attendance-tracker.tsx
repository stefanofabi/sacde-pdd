
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Search,
  Loader2,
  Copy,
  UserPlus,
  Trash2,
} from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { Crew, AttendanceData, Obra, Employee, AttendanceEntry } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addAttendanceRequest, updateAttendanceSentStatus, clonePreviousDayAttendance, deleteAttendanceRequest } from "@/app/actions";

interface AttendanceTrackerProps {
  initialCrews: Crew[];
  initialAttendance: AttendanceData;
  initialObras: Obra[];
  initialEmployees: Employee[];
}

export default function AttendanceTracker({ initialCrews, initialAttendance, initialObras, initialEmployees }: AttendanceTrackerProps) {
  const t = useTranslations('AttendanceTracker');
  const locale = useLocale();
  const dateLocale = locale === 'es' ? es : enUS;

  const { toast } = useToast();
  const [allCrews, setAllCrews] = useState<Crew[]>(initialCrews);
  const [attendance, setAttendance] = useState<AttendanceData>(initialAttendance);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [sentStatusFilter, setSentStatusFilter] = useState<"all" | "sent" | "not-sent">("all");
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<AttendanceEntry | null>(null);
  
  const [newRequestState, setNewRequestState] = useState({ obraId: "", crewId: "", responsibleId: "" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedDate(startOfToday());
    }
  }, []);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const displayDate = selectedDate
    ? format(selectedDate, "PPP", { locale: dateLocale })
    : t('selectDate');

  const obraNameMap = useMemo(() => {
    return Object.fromEntries(initialObras.map(obra => [obra.id, obra.name]));
  }, [initialObras]);

  const employeeNameMap = useMemo(() => {
    return Object.fromEntries(initialEmployees.map(emp => [emp.id, `${emp.nombre} ${emp.apellido}`]));
  }, [initialEmployees]);

  const employeeOptions = useMemo(() => {
    return initialEmployees.map(emp => ({
        value: emp.id,
        label: `${emp.nombre} ${emp.apellido} (L: ${emp.legajo}${emp.cuil ? `, C: ${emp.cuil}` : ''})`
    }));
  }, [initialEmployees]);
  
  const crewMap = useMemo(() => {
    return new Map(allCrews.map(crew => [crew.id, crew]));
  }, [allCrews]);

  const availableCrewsForRequest = useMemo(() => {
    if (!newRequestState.obraId) return [];
    return allCrews.filter(crew => crew.obraId === newRequestState.obraId);
  }, [allCrews, newRequestState.obraId]);
  
  const availableCrewOptionsForRequest = useMemo(() => {
    return availableCrewsForRequest.map(crew => ({
        value: crew.id,
        label: crew.name
    }));
  }, [availableCrewsForRequest]);
  
  const filteredEntriesForTable = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const dailyEntries = attendance[formattedDate] || [];
    
    return dailyEntries
      .filter((entry) => {
        if (sentStatusFilter === 'all') {
          return true;
        }
        return sentStatusFilter === 'sent' ? entry.sent : !entry.sent;
      })
      .filter((entry) => {
        const crew = crewMap.get(entry.crewId);
        if (!crew) return false;

        const responsibleName = entry.responsibleId ? (employeeNameMap[entry.responsibleId] || '') : '';
        
        return crew.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (obraNameMap[crew.obraId] || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (responsibleName).toLowerCase().includes(lowerCaseSearchTerm)
    });
  }, [attendance, formattedDate, searchTerm, sentStatusFilter, crewMap, obraNameMap, employeeNameMap]);
  
  const handleUpdateSentStatus = (entryId: string, sent: boolean) => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");

    startTransition(async () => {
      try {
        const updatedEntry = await updateAttendanceSentStatus(dateKey, entryId, sent);
        setAttendance((prev) => {
           const newDailyData = (prev[dateKey] || []).map(e => e.id === entryId ? updatedEntry : e);
           return { ...prev, [dateKey]: newDailyData };
        });
      } catch (error) {
        toast({
          title: t('toast.updateErrorTitle'),
          description: t('toast.updateErrorDescription'),
          variant: "destructive",
        });
      }
    });
  };

  const handleAddRequest = () => {
    if (!selectedDate || !newRequestState.obraId || !newRequestState.crewId || !newRequestState.responsibleId) {
      toast({
        title: t('toast.validationErrorTitle'),
        description: t('toast.addRequestValidationError'),
        variant: "destructive",
      });
      return;
    }
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    
    startTransition(async () => {
      try {
        const newEntry = await addAttendanceRequest(dateKey, newRequestState.crewId, newRequestState.responsibleId);
        setAttendance(prev => {
            const currentEntries = prev[dateKey] || [];
            return {
                ...prev,
                [dateKey]: [...currentEntries, newEntry]
            };
        });
        setNewRequestState({ obraId: "", crewId: "", responsibleId: "" });
        setIsRequestDialogOpen(false);
        toast({
          title: t('toast.requestCreatedTitle'),
          description: t('toast.requestCreatedDescription'),
        });
      } catch (error) {
        toast({
          title: t('toast.error'),
          description: error instanceof Error ? error.message : t('toast.addRequestError'),
          variant: "destructive",
        });
      }
    });
  };

  const handleDeleteRequest = () => {
    if (!requestToDelete || !selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");

    startTransition(async () => {
      try {
        await deleteAttendanceRequest(dateKey, requestToDelete.id);
        setAttendance((prev) => {
          const updatedDailyData = (prev[dateKey] || []).filter(e => e.id !== requestToDelete.id);
          return { ...prev, [dateKey]: updatedDailyData };
        });
        toast({
          title: t('toast.requestDeletedTitle'),
          description: t('toast.requestDeletedDescription'),
        });
      } catch (error) {
        toast({
          title: t('toast.error'),
          description: error instanceof Error ? error.message : t('toast.deleteRequestError'),
          variant: "destructive",
        });
      } finally {
        setRequestToDelete(null);
      }
    });
  };

  const handleCloneDay = () => {
      if (!selectedDate) return;
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      startTransition(async () => {
        try {
            const newAttendance = await clonePreviousDayAttendance(dateKey);
            setAttendance(newAttendance);
            setIsCloneDialogOpen(false);
            toast({
                title: t('toast.dayClonedTitle'),
                description: t('toast.dayClonedDescription'),
            });
        } catch (error) {
             toast({
              title: t('toast.cloneErrorTitle'),
              description: t('toast.cloneErrorDescription'),
              variant: "destructive",
            });
        }
      });
  }

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
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[280px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {displayDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  locale={dateLocale}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sentStatusFilter} onValueChange={(value: "all" | "sent" | "not-sent") => setSentStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t('filterByStatusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('statusAll')}</SelectItem>
                  <SelectItem value="sent">{t('statusSent')}</SelectItem>
                  <SelectItem value="not-sent">{t('statusNotSent')}</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsCloneDialogOpen(true)} variant="outline">
                    <Copy className="mr-2 h-4 w-4" />
                    {t('cloneDayButton')}
                </Button>
                <Button onClick={() => { setNewRequestState({ obraId: "", crewId: "", responsibleId: "" }); setIsRequestDialogOpen(true); }}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('createRequestButton')}
                </Button>
            </div>
          </div>

          <div className="rounded-lg border relative">
             {isPending && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tableHeaderCrew')}</TableHead>
                  <TableHead>{t('tableHeaderProject')}</TableHead>
                  <TableHead>{t('tableHeaderResponsible')}</TableHead>
                  <TableHead>{t('tableHeaderSentDate')}</TableHead>
                  <TableHead className="text-center w-[150px]">{t('tableHeaderSent')}</TableHead>
                  <TableHead className="text-right w-[100px]">{t('tableHeaderActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntriesForTable.length > 0 ? (
                  filteredEntriesForTable.map((entry) => {
                    const crew = crewMap.get(entry.crewId);
                     if (!crew) return null;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{crew.name}</TableCell>
                        <TableCell>{obraNameMap[crew.obraId] || 'N/A'}</TableCell>
                        <TableCell>{employeeNameMap[entry.responsibleId ?? ''] || 'N/A'}</TableCell>
                        <TableCell>
                          {entry.sentAt ? format(new Date(entry.sentAt), 'Pp', { locale: dateLocale }) : t('pendingStatus')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={entry.sent}
                            onCheckedChange={(checked) => handleUpdateSentStatus(entry.id, checked)}
                            disabled={isPending}
                            aria-label={`Marcar asistencia para ${crew.name}`}
                          />
                        </TableCell>
                         <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setRequestToDelete(entry)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{t('deleteRequestSr')}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {(attendance[formattedDate] || []).length === 0 
                        ? t('noCrewsForDay')
                        : t('noCrewsWithFilter')
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('newRequestDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('newRequestDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="request-obra">{t('projectLabel')}</Label>
                <Select
                    value={newRequestState.obraId}
                    onValueChange={(value) => setNewRequestState(prev => ({ ...prev, obraId: value, crewId: "" }))}
                    disabled={isPending}
                >
                    <SelectTrigger id="request-obra">
                        <SelectValue placeholder={t('selectProjectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        {initialObras.map((obra) => (
                            <SelectItem key={obra.id} value={obra.id}>
                                {obra.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-crew">{t('crewLabel')}</Label>
              <Combobox
                    options={availableCrewOptionsForRequest}
                    value={newRequestState.crewId}
                    onValueChange={(value) => setNewRequestState(prev => ({ ...prev, crewId: value }))}
                    placeholder={t('selectCrewPlaceholder')}
                    searchPlaceholder={t('searchCrewPlaceholder')}
                    emptyMessage={t('noCrewsForProject')}
                    disabled={isPending || !newRequestState.obraId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-responsible">{t('responsibleLabel')}</Label>
              <Combobox
                options={employeeOptions}
                value={newRequestState.responsibleId}
                onValueChange={(value) => setNewRequestState(prev => ({ ...prev, responsibleId: value }))}
                placeholder={t('selectEmployeePlaceholder')}
                searchPlaceholder={t('searchEmployeePlaceholder')}
                emptyMessage={t('employeeNotFound')}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>{t('cancelButton')}</Button></DialogClose>
            <Button type="submit" onClick={handleAddRequest} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('createRequestButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('cloneDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('cloneDialogDescription', { date: displayDate })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsCloneDialogOpen(false)} disabled={isPending}>{t('cancelButton')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloneDay} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('cloneDialogConfirmButton')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                   {t('deleteDialogDescription', { crewName: requestToDelete && crewMap.get(requestToDelete.crewId)?.name, responsibleName: requestToDelete && employeeNameMap[requestToDelete.responsibleId || ''] })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRequestToDelete(null)} disabled={isPending}>{t('cancelButton')}</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteRequest} 
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
