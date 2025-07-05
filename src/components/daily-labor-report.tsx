
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Loader2, Save, UserPlus, Trash2, AlertTriangle, Send, Info, ArrowRightLeft } from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { Crew, Employee, DailyLaborData, Obra, AbsenceType, DailyLaborNotificationData, DailyLaborEntry, Phase } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { saveDailyLabor, notifyDailyLabor, moveEmployeeBetweenCrews } from "@/app/actions";
import { cn } from "@/lib/utils";

interface DailyLaborReportProps {
  initialCrews: Crew[];
  initialEmployees: Employee[];
  initialLaborData: DailyLaborData;
  initialObras: Obra[];
  initialNotificationData: DailyLaborNotificationData;
  initialAbsenceTypes: AbsenceType[];
  initialPhases: Phase[];
}

interface LaborEntryState {
    hoursByPhase: Record<string, number | null>;
    absenceReason: string | null;
    horasAltura: number | null;
    horasHormigon: number | null;
    horasNocturnas: number | null;
}

export default function DailyLaborReport({ initialCrews, initialEmployees, initialLaborData, initialObras, initialNotificationData, initialAbsenceTypes, initialPhases }: DailyLaborReportProps) {
  const t = useTranslations('DailyLaborReport');
  const locale = useLocale();
  const dateLocale = locale === 'es' ? es : enUS;

  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [laborData, setLaborData] = useState<DailyLaborData>(initialLaborData);
  const [notificationData, setNotificationData] = useState<DailyLaborNotificationData>(initialNotificationData);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");
  const [laborEntries, setLaborEntries] = useState<Record<string, LaborEntryState>>({});
  
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [employeeToAdd, setEmployeeToAdd] = useState("");
  const [employeeToMove, setEmployeeToMove] = useState<Employee | null>(null);
  const [destinationCrewId, setDestinationCrewId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedDate(startOfToday());
    }
  }, []);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const displayDate = selectedDate
    ? format(selectedDate, "PPP", { locale: dateLocale })
    : t('selectDate');

  const employeeMap = useMemo(() => new Map(initialEmployees.map(emp => [emp.id, emp])), [initialEmployees]);
  const obraMap = useMemo(() => new Map(initialObras.map(o => [o.id, o.name])), [initialObras]);
  const phaseMap = useMemo(() => new Map(initialPhases.map(p => [p.id, p])), [initialPhases]);


  const obrasWithCrews = useMemo(() => {
    const obraIdsWithCrews = new Set(initialCrews.map(crew => crew.obraId));
    return initialObras.filter(obra => obraIdsWithCrews.has(obra.id));
  }, [initialCrews, initialObras]);
  
  const crewsForSelectedObra = useMemo(() => {
    if (!selectedObraId) return [];
    return initialCrews.filter(c => c.obraId === selectedObraId);
  }, [initialCrews, selectedObraId]);

  const availableCrewsForMove = useMemo(() => {
    return initialCrews
        .filter(c => 
            c.id !== selectedCrewId && 
            !notificationData[formattedDate]?.[c.id]?.notified
        )
        .map(c => ({ value: c.id, label: `${c.name} (${obraMap.get(c.obraId) || t('noProject')})` }));
  }, [initialCrews, selectedCrewId, notificationData, formattedDate, obraMap, t]);

  const selectedCrew = useMemo(() => {
    return initialCrews.find(c => c.id === selectedCrewId);
  }, [initialCrews, selectedCrewId]);

  const personnelForSelectedCrew = useMemo(() => {
    if (!selectedCrew) return [];
    return (selectedCrew.employeeIds || []).map(id => employeeMap.get(id)).filter(Boolean) as Employee[];
  }, [selectedCrew, employeeMap]);

  const manuallyAddedPersonnel = useMemo(() => {
    const dailyEntries = laborData[formattedDate] || [];
    const manualIdsForCrew = dailyEntries
      .filter(e => e.crewId === selectedCrewId && e.manual)
      .map(e => e.employeeId);
    return [...new Set(manualIdsForCrew)].map(id => employeeMap.get(id)).filter(Boolean) as Employee[];
  }, [laborData, formattedDate, selectedCrewId, employeeMap]);

  const allPersonnelForTable = useMemo(() => {
    const combined = [...personnelForSelectedCrew, ...manuallyAddedPersonnel];
    const uniqueIds = new Set<string>();
    return combined.filter(emp => {
      if (uniqueIds.has(emp.id)) {
        return false;
      }
      uniqueIds.add(emp.id);
      return true;
    }).sort((a,b) => a.apellido.localeCompare(b.apellido));
  }, [personnelForSelectedCrew, manuallyAddedPersonnel]);

  const availableEmployeesForManualAdd = useMemo(() => {
    const crewMemberIds = new Set(selectedCrew?.employeeIds || []);
    const manuallyAddedIds = new Set(manuallyAddedPersonnel.map(e => e.id));

    return initialEmployees
      .filter(emp => 
        emp.condicion === 'jornal' && 
        emp.estado === 'activo' &&
        !crewMemberIds.has(emp.id) && 
        !manuallyAddedIds.has(emp.id)
      )
      .map(emp => ({ value: emp.id, label: `${emp.apellido}, ${emp.nombre} (L: ${emp.legajo})` }));
  }, [initialEmployees, selectedCrew, manuallyAddedPersonnel]);

  const activePhases = useMemo(() => {
    if (!selectedCrew || !selectedDate) return [];
    const date = new Date(selectedDate);
    date.setUTCHours(0,0,0,0);
    
    return (selectedCrew.assignedPhases || [])
        .filter(p => {
            const startDate = new Date(p.startDate);
            const endDate = new Date(p.endDate);
            return date >= startDate && date <= endDate;
        })
        .map(p => phaseMap.get(p.phaseId))
        .filter((p): p is Phase => !!p)
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCrew, selectedDate, phaseMap]);


  const { isNotified, notifiedAt } = useMemo(() => {
    const status = notificationData[formattedDate]?.[selectedCrewId];
    return {
      isNotified: status?.notified || false,
      notifiedAt: status?.notifiedAt ? format(new Date(status.notifiedAt), 'Pp', { locale: dateLocale }) : null,
    }
  }, [notificationData, formattedDate, selectedCrewId, dateLocale]);
  
  useEffect(() => {
    if (formattedDate && selectedCrewId && allPersonnelForTable.length > 0) {
      const dailyEntries = laborData[formattedDate] || [];
      const crewEntries = dailyEntries.filter(entry => entry.crewId === selectedCrewId);
      
      const newLaborEntries: Record<string, LaborEntryState> = {};
      
      allPersonnelForTable.forEach(emp => {
          const entriesForEmp = crewEntries.filter(e => e.employeeId === emp.id);
          const initialEntryState: LaborEntryState = {
              hoursByPhase: {},
              absenceReason: null,
              horasAltura: null,
              horasHormigon: null,
              horasNocturnas: null,
          };

          if (entriesForEmp.length > 0) {
              const absenceEntry = entriesForEmp.find(e => e.absenceReason);
              initialEntryState.absenceReason = absenceEntry?.absenceReason ?? null;
              
              entriesForEmp.forEach(e => {
                  if (e.phaseId && e.hours) {
                      initialEntryState.hoursByPhase[e.phaseId] = e.hours;
                  }
              });

              const entryWithSpecialHours = entriesForEmp.find(e => e.horasAltura || e.horasHormigon || e.horasNocturnas);
              initialEntryState.horasAltura = entryWithSpecialHours?.horasAltura ?? null;
              initialEntryState.horasHormigon = entryWithSpecialHours?.horasHormigon ?? null;
              initialEntryState.horasNocturnas = entryWithSpecialHours?.horasNocturnas ?? null;
          }
          newLaborEntries[emp.id] = initialEntryState;
      });
      setLaborEntries(newLaborEntries);
    } else {
      setLaborEntries({});
    }
  }, [formattedDate, selectedCrewId, laborData, allPersonnelForTable]);

  const handleEntryChange = (
      employeeId: string, 
      field: keyof LaborEntryState, 
      value: string | null
    ) => {
    setLaborEntries(prev => {
        const currentEntry = prev[employeeId] || { hoursByPhase: {}, absenceReason: null, horasAltura: null, horasHormigon: null, horasNocturnas: null };
        let newEntry = { ...currentEntry };

        const parseNumericValue = (val: string | null) => {
            if (val === "" || val === null) return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        }

        if (field === 'absenceReason') {
            newEntry.absenceReason = value === 'NONE' ? null : value;
            if (value !== 'NONE' && value !== null) {
                newEntry.hoursByPhase = {};
            }
        } else if (field === 'horasAltura' || field === 'horasHormigon' || field === 'horasNocturnas') {
             const totalHours = Object.values(newEntry.hoursByPhase).reduce((sum, h) => sum + (h || 0), 0);
            let newSpecialHours = parseNumericValue(value);
            if (newSpecialHours !== null && newSpecialHours > 0) {
                if (totalHours > 0 && newSpecialHours > totalHours) {
                    newSpecialHours = totalHours;
                }
            } else {
                newSpecialHours = null;
            }
            newEntry[field] = newSpecialHours;
        }
        
        return { ...prev, [employeeId]: newEntry };
    });
  };

  const handlePhaseHourChange = (employeeId: string, phaseId: string, value: string | null) => {
      setLaborEntries(prev => {
          const currentEntry = prev[employeeId] || { hoursByPhase: {}, absenceReason: null, horasAltura: null, horasHormigon: null, horasNocturnas: null };
          
          const newHours = (val: string | null) => {
            if (val === "" || val === null) return null;
            const num = parseFloat(val);
            return isNaN(num) || num < 0 ? null : num;
          };

          const updatedHours = newHours(value);

          const newHoursByPhase = { ...currentEntry.hoursByPhase, [phaseId]: updatedHours };
          
          const hasHours = Object.values(newHoursByPhase).some(h => h && h > 0);

          return {
              ...prev,
              [employeeId]: {
                  ...currentEntry,
                  hoursByPhase: newHoursByPhase,
                  absenceReason: hasHours ? null : currentEntry.absenceReason,
              }
          }
      });
  }

  const handleSave = () => {
    if (!formattedDate || !selectedCrewId) {
      toast({
        title: t('toast.selectionRequiredTitle'),
        description: t('toast.selectionRequiredDescription'),
        variant: "destructive",
      });
      return;
    }

    const payloadToSave: Omit<DailyLaborEntry, 'id'>[] = [];
    const existingManualEntries = (laborData[formattedDate] || []).filter(e => e.crewId === selectedCrewId && e.manual).map(e => e.employeeId);

    allPersonnelForTable.forEach(emp => {
      const stateEntry = laborEntries[emp.id];
      if (!stateEntry) return;

      const isManual = !selectedCrew?.employeeIds.includes(emp.id) || existingManualEntries.includes(emp.id);

      if (stateEntry.absenceReason) {
        payloadToSave.push({ employeeId: emp.id, crewId: selectedCrewId, hours: null, phaseId: null, absenceReason: stateEntry.absenceReason, horasAltura: null, horasHormigon: null, horasNocturnas: null, manual: isManual });
      } else {
        const phaseEntries = Object.entries(stateEntry.hoursByPhase).filter(([, hours]) => hours && hours > 0);
        if (phaseEntries.length > 0) {
            phaseEntries.forEach(([phaseId, hours], index) => {
              payloadToSave.push({
                  employeeId: emp.id,
                  crewId: selectedCrewId,
                  hours: hours,
                  phaseId: phaseId,
                  absenceReason: null,
                  // Assign special hours only to the first entry to avoid duplication
                  horasAltura: index === 0 ? stateEntry.horasAltura : null,
                  horasHormigon: index === 0 ? stateEntry.horasHormigon : null,
                  horasNocturnas: index === 0 ? stateEntry.horasNocturnas : null,
                  manual: isManual
              });
            });
        } else if (isManual) {
            // Save manual employees even if they have no hours/absence, to keep them on the list
            payloadToSave.push({ employeeId: emp.id, crewId: selectedCrewId, hours: null, phaseId: null, absenceReason: null, horasAltura: null, horasHormigon: null, horasNocturnas: null, manual: true });
        }
      }
    });

    startTransition(async () => {
      try {
        await saveDailyLabor(formattedDate, selectedCrewId, payloadToSave as any);

        const otherCrewEntries = (laborData[formattedDate] || []).filter(entry => entry.crewId !== selectedCrewId);
        const newCrewEntries = payloadToSave.map(d => ({ ...d, id: crypto.randomUUID() }));
        
        setLaborData(prev => ({
            ...prev,
            [formattedDate]: [...otherCrewEntries, ...newCrewEntries]
        }));
        
        toast({
          title: t('toast.dataSavedTitle'),
          description: t('toast.dataSavedDescription'),
        });
      } catch (error) {
        toast({
          title: t('toast.saveErrorTitle'),
          description: t('toast.saveErrorDescription'),
          variant: "destructive",
        });
      }
    });
  };

  const handleNotify = () => {
    if (!formattedDate || !selectedCrewId) return;

    startTransition(async () => {
        try {
            await notifyDailyLabor(formattedDate, selectedCrewId);
            setNotificationData(prev => ({
                ...prev,
                [formattedDate]: {
                    ...(prev[formattedDate] || {}),
                    [selectedCrewId]: {
                        notified: true,
                        notifiedAt: new Date().toISOString()
                    }
                }
            }));
            setIsNotifyDialogOpen(false);
            toast({
                title: t('toast.reportNotifiedTitle'),
                description: t('toast.reportNotifiedDescription'),
            });
        } catch (error) {
            toast({
                title: t('toast.notifyErrorTitle'),
                description: t('toast.notifyErrorDescription'),
                variant: "destructive",
            });
        }
    });
  };

  const handleOpenNotifyDialog = () => {
    if (!selectedCrewId || !allPersonnelForTable) {
        toast({
            title: t('toast.error'),
            description: t('toast.selectCrewToNotify'),
            variant: "destructive"
        });
        return;
    }

    const personnelWithoutNovelty = allPersonnelForTable.filter(emp => {
        const entry = laborEntries[emp.id];
        if (!entry) return true;
        const hasHours = Object.values(entry.hoursByPhase).some(h => h && h > 0);
        const hasAbsence = !!entry.absenceReason;
        return !hasHours && !hasAbsence;
    });
    
    const personnelWithHoursAndNoPhase = allPersonnelForTable.filter(emp => {
      const entry = laborEntries[emp.id];
      if (!entry) return false;
      const hasHours = Object.values(entry.hoursByPhase).some(h => h && h > 0);
      return hasHours && activePhases.length === 0;
    });

    if (personnelWithoutNovelty.length > 0) {
        const employeeNames = personnelWithoutNovelty
            .map(emp => `${emp.apellido}, ${emp.nombre}`)
            .join('; ');
        toast({
            title: t('toast.missingEntriesTitle'),
            description: t('toast.missingEntriesDescription', { employees: employeeNames }),
            variant: "destructive",
            duration: 8000
        });
        return;
    }

    setIsNotifyDialogOpen(true);
  };
  
  const handleOpenMoveDialog = (employee: Employee) => {
    setEmployeeToMove(employee);
    setDestinationCrewId(""); 
  };

  const handleMoveEmployee = () => {
    if (!employeeToMove || !destinationCrewId || !selectedCrewId || !formattedDate) return;
    
    startTransition(async () => {
        try {
            await moveEmployeeBetweenCrews(formattedDate, employeeToMove.id, selectedCrewId, destinationCrewId);

            setLaborData(prev => {
                const dateEntries = prev[formattedDate] || [];
                const updatedEntries = dateEntries.filter(e => !(e.crewId === selectedCrewId && e.employeeId === employeeToMove.id));
                const newEntry: DailyLaborEntry = {
                    id: crypto.randomUUID(),
                    employeeId: employeeToMove.id,
                    crewId: destinationCrewId,
                    hours: null,
                    phaseId: null,
                    absenceReason: null,
                    horasAltura: null,
                    horasHormigon: null,
                    horasNocturnas: null,
                    manual: true
                };
                return {
                    ...prev,
                    [formattedDate]: [...updatedEntries, newEntry]
                };
            });
            
            toast({
                title: t('toast.employeeMovedTitle'),
                description: t('toast.employeeMovedDescription', { name: `${employeeToMove.apellido}, ${employeeToMove.nombre}` }),
            });
            
            setEmployeeToMove(null);
            setDestinationCrewId("");
        } catch (error) {
            toast({
                title: t('toast.moveErrorTitle'),
                description: error instanceof Error ? error.message : t('toast.moveErrorDescription'),
                variant: "destructive",
            });
        }
    });
};

  const handleAddManualEmployee = () => {
    if (employeeToAdd) {
        startTransition(async () => {
            const laborDataToSave = [{
                employeeId: employeeToAdd,
                hours: null,
                absenceReason: null,
                manual: true,
            }];
            await saveDailyLabor(formattedDate, selectedCrewId, laborDataToSave);
            
            const newEntry: DailyLaborEntry = {
                id: crypto.randomUUID(),
                employeeId: employeeToAdd,
                crewId: selectedCrewId,
                hours: null,
                phaseId: null,
                absenceReason: null,
                horasAltura: null,
                horasHormigon: null,
                horasNocturnas: null,
                manual: true
            };
            setLaborData(prev => ({
                ...prev,
                [formattedDate]: [...(prev[formattedDate] || []), newEntry]
            }));

            setEmployeeToAdd("");
            setIsAddEmployeeDialogOpen(false);
        });
    }
  };

  const handleRemoveManualEmployee = (employeeId: string) => {
    startTransition(async () => {
       await saveDailyLabor(formattedDate, selectedCrewId, [{ employeeId, hours: null, absenceReason: null, manual: false }]); // This will remove it
       setLaborData(prev => {
         const updatedEntries = (prev[formattedDate] || []).filter(e => !(e.crewId === selectedCrewId && e.employeeId === employeeId));
         return { ...prev, [formattedDate]: updatedEntries };
       });
    });
  };

  useEffect(() => {
    setSelectedCrewId("");
    setLaborEntries({});
  }, [selectedObraId]);

  return (
    <TooltipProvider>
    <Card>
      <CardHeader>
        <CardTitle>{t('cardTitle')}</CardTitle>
        <CardDescription>
          {t('cardDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {displayDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={dateLocale} disabled={(date) => date > new Date()} />
            </PopoverContent>
          </Popover>

          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder={t('selectProjectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {obrasWithCrews.map(obra => (
                <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Combobox
            options={crewsForSelectedObra.map(c => ({ value: c.id, label: c.name }))}
            value={selectedCrewId}
            onValueChange={setSelectedCrewId}
            placeholder={t('selectCrewPlaceholder')}
            searchPlaceholder={t('searchCrewPlaceholder')}
            emptyMessage={t('noCrewsForProject')}
            disabled={!selectedObraId}
            className="w-full sm:w-[250px]"
          />
        </div>
        
        {selectedCrewId ? (
          <div>
            {isNotified && (
              <Alert className="mb-4 border-primary/50 text-primary [&>svg]:text-primary">
                <Info className="h-4 w-4" />
                <AlertTitle>{t('alertNotifiedTitle')}</AlertTitle>
                <AlertDescription>
                  {t('alertNotifiedDescription', { date: notifiedAt })}
                </AlertDescription>
              </Alert>
            )}
            <fieldset disabled={isNotified}>
                <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>{t('tableHeaderLegajo')}</TableHead>
                        <TableHead>{t('tableHeaderName')}</TableHead>
                        <TableHead>{t('tableHeaderPosition')}</TableHead>
                        {activePhases.map(phase => (
                            <TableHead key={phase.id} className="w-[120px] text-center">{phase.name}</TableHead>
                        ))}
                        <TableHead className="w-[120px] text-center font-bold text-foreground">{t('tableHeaderTotalHours')}</TableHead>
                        <TableHead className="w-[110px] text-center">{t('tableHeaderHeightHours')}</TableHead>
                        <TableHead className="w-[110px] text-center">{t('tableHeaderConcreteHours')}</TableHead>
                        <TableHead className="w-[110px] text-center">{t('tableHeaderNightHours')}</TableHead>
                        <TableHead className="w-[220px]">{t('tableHeaderAbsence')}</TableHead>
                        <TableHead className="w-[100px] text-right">{t('tableHeaderActions')}</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {allPersonnelForTable.length > 0 ? (
                        allPersonnelForTable.map(emp => {
                        const entry = laborEntries[emp.id] || { hoursByPhase: {}, absenceReason: null, horasAltura: null, horasHormigon: null, horasNocturnas: null };
                        const hasAbsence = !!entry.absenceReason;
                        const totalHours = Object.values(entry.hoursByPhase).reduce((acc, h) => acc + (h || 0), 0);
                        const hasHours = totalHours > 0;

                        const dailyEntries = laborData[formattedDate] || [];
                        const isManual = dailyEntries.some(e => e.crewId === selectedCrewId && e.employeeId === emp.id && e.manual);
                        
                        const hasOvertimeWarning = totalHours > 12;

                        return (
                        <TableRow key={emp.id} className={cn(
                            isManual ? "bg-accent/50" : "",
                            hasOvertimeWarning ? "bg-destructive/10" : ""
                        )}>
                            <TableCell className="font-mono">{emp.legajo}</TableCell>
                            <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                {`${emp.apellido}, ${emp.nombre}`}
                                {isManual && (
                                <Tooltip>
                                    <TooltipTrigger>
                                    <UserPlus className="h-4 w-4 text-primary" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                    <p>{t('tooltipManuallyAdded')}</p>
                                    </TooltipContent>
                                </Tooltip>
                                )}
                                {hasOvertimeWarning && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <AlertTriangle className="h-4 w-4 text-destructive" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{t('warningOvertime', { hours: totalHours })}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                            </TableCell>
                            <TableCell>{emp.denominacionPosicion}</TableCell>
                            {activePhases.map(phase => (
                                <TableCell key={phase.id}>
                                    <Input
                                        type="number"
                                        className="text-center"
                                        placeholder="-"
                                        value={entry.hoursByPhase[phase.id] ?? ""}
                                        onChange={(e) => handlePhaseHourChange(emp.id, phase.id, e.target.value)}
                                        disabled={isPending || hasAbsence}
                                        step="0.5"
                                        min="0"
                                    />
                                </TableCell>
                            ))}
                             <TableCell className="text-center font-bold">
                                {totalHours > 0 ? totalHours : "-"}
                            </TableCell>
                            <TableCell>
                            <Input
                                type="number"
                                className="text-center"
                                placeholder="-"
                                value={entry.horasAltura ?? ""}
                                onChange={(e) => handleEntryChange(emp.id, 'horasAltura', e.target.value)}
                                disabled={isPending || !hasHours}
                                step="0.5"
                                min="0"
                                max={totalHours || 0}
                            />
                            </TableCell>
                            <TableCell>
                            <Input
                                type="number"
                                className="text-center"
                                placeholder="-"
                                value={entry.horasHormigon ?? ""}
                                onChange={(e) => handleEntryChange(emp.id, 'horasHormigon', e.target.value)}
                                disabled={isPending || !hasHours}
                                step="0.5"
                                min="0"
                                max={totalHours || 0}
                            />
                            </TableCell>
                            <TableCell>
                            <Input
                                type="number"
                                className="text-center"
                                placeholder="-"
                                value={entry.horasNocturnas ?? ""}
                                onChange={(e) => handleEntryChange(emp.id, 'horasNocturnas', e.target.value)}
                                disabled={isPending || !hasHours}
                                step="0.5"
                                min="0"
                                max={totalHours || 0}
                            />
                            </TableCell>
                            <TableCell>
                                <Select
                                    value={entry.absenceReason ?? "NONE"}
                                    onValueChange={(value) => handleEntryChange(emp.id, 'absenceReason', value)}
                                    disabled={isPending || hasHours}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('selectReasonPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">-</SelectItem>
                                        {initialAbsenceTypes.map(reason => (
                                            <SelectItem key={reason.id} value={reason.id}>
                                                {reason.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenMoveDialog(emp)}
                                        disabled={isPending}
                                    >
                                        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                                        <span className="sr-only">{t('tooltipMoveEmployee')}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>{t('tooltipMoveToOtherCrew')}</p>
                                  </TooltipContent>
                                </Tooltip>
                                {isManual && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveManualEmployee(emp.id)}
                                                disabled={isPending}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                <span className="sr-only">{t('tooltipRemoveEmployee')}</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t('tooltipRemoveFromReport')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                              </div>
                            </TableCell>
                        </TableRow>
                        )})
                    ) : (
                        <TableRow>
                        <TableCell colSpan={9 + activePhases.length} className="h-24 text-center">
                            {t('noPersonnelAssigned')}
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
                <div className="flex justify-between mt-4 p-4 border-t">
                <Button variant="outline" onClick={() => setIsAddEmployeeDialogOpen(true)} disabled={isPending}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('addEmployeeButton')}
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending || !selectedCrewId}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('saveReportButton')}
                    </Button>
                    <Button onClick={handleOpenNotifyDialog} disabled={isPending || !selectedCrewId}>
                        <Send className="mr-2 h-4 w-4" />
                        {t('notifyReportButton')}
                    </Button>
                </div>
                </div>
            </fieldset>
          </div>
        ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>{t('selectProjectAndCrewMessage')}</p>
            </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addManualEmployeeDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('addManualEmployeeDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="employee-to-add">{t('employeeLabel')}</Label>
          <Combobox
            options={availableEmployeesForManualAdd}
            value={employeeToAdd}
            onValueChange={setEmployeeToAdd}
            placeholder={t('selectEmployeePlaceholder')}
            searchPlaceholder={t('searchEmployeeByNamePlaceholder')}
            emptyMessage={t('noMoreEmployeesAvailable')}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">{t('cancelButton')}</Button></DialogClose>
          <Button onClick={handleAddManualEmployee} disabled={!employeeToAdd || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <Dialog open={!!employeeToMove} onOpenChange={(open) => !open && setEmployeeToMove(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('moveEmployeeDialogTitle')}</DialogTitle>
                <DialogDescription>
                    {t.rich('moveEmployeeDialogDescription', {
                        name: `${employeeToMove?.apellido}, ${employeeToMove?.nombre}`,
                        date: displayDate,
                        strong: (chunks) => <strong>{chunks}</strong>
                    })}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="destination-crew">{t('destinationCrewLabel')}</Label>
                <Select value={destinationCrewId} onValueChange={setDestinationCrewId}>
                    <SelectTrigger id="destination-crew">
                        <SelectValue placeholder={t('selectCrewPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        {availableCrewsForMove.length > 0 ? (
                            availableCrewsForMove.map(crew => (
                                <SelectItem key={crew.value} value={crew.value}>{crew.label}</SelectItem>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                {t('noOtherCrewsAvailable')}
                            </div>
                        )}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">{t('cancelButton')}</Button></DialogClose>
                <Button onClick={handleMoveEmployee} disabled={isPending || !destinationCrewId}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('moveButton')}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <AlertDialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('notifyDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t.rich('notifyDialogDescription', { 
                        crewName: selectedCrew?.name, 
                        date: displayDate,
                        strong: (chunks) => <strong>{chunks}</strong>
                    })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsNotifyDialogOpen(false)} disabled={isPending}>{t('cancelButton')}</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleNotify} 
                    disabled={isPending}
                    className={buttonVariants({ variant: "default" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('notifyDialogConfirmButton')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </TooltipProvider>
  );
}
