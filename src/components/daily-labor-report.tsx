
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
import { Calendar as CalendarIcon, Loader2, Save, UserPlus, Trash2, AlertTriangle, Send, Info, ArrowRightLeft, Sparkles } from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { Crew, Employee, DailyLaborData, Obra, AbsenceType, DailyLaborNotificationData, DailyLaborEntry, Phase, SpecialHourType, UnproductiveHourType, LegacyDailyLaborEntry } from "@/types";
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
  initialSpecialHourTypes: SpecialHourType[];
  initialUnproductiveHourTypes: UnproductiveHourType[];
}

interface LaborEntryState {
    productiveHours: Record<string, number | null>;
    unproductiveHours: Record<string, number | null>;
    absenceReason: string | null;
    specialHours: Record<string, number | null>;
}

export default function DailyLaborReport({ 
  initialCrews, 
  initialEmployees, 
  initialLaborData, 
  initialObras, 
  initialNotificationData, 
  initialAbsenceTypes, 
  initialPhases,
  initialSpecialHourTypes,
  initialUnproductiveHourTypes
}: DailyLaborReportProps) {
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

  const [specialHoursModalState, setSpecialHoursModalState] = useState<{ isOpen: boolean; employee: Employee | null }>({ isOpen: false, employee: null });
  const [modalSpecialHours, setModalSpecialHours] = useState<Record<string, number | null>>({});

  const [unproductiveHoursModalState, setUnproductiveHoursModalState] = useState<{ isOpen: boolean; employee: Employee | null }>({ isOpen: false, employee: null });
  const [modalUnproductiveHours, setModalUnproductiveHours] = useState<Record<string, number | null>>({});


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
      .filter(e => e.crewId === selectedCrewId && 'manual' in e && e.manual)
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
              productiveHours: {},
              unproductiveHours: {},
              absenceReason: null,
              specialHours: {},
          };

          if (entriesForEmp.length > 0) {
              const firstEntry = entriesForEmp[0];
              // New format
              if ('productiveHours' in firstEntry && firstEntry.productiveHours) {
                  const entry = firstEntry as DailyLaborEntry;
                  initialEntryState.productiveHours = entry.productiveHours;
                  initialEntryState.unproductiveHours = entry.unproductiveHours;
                  initialEntryState.specialHours = entry.specialHours;
                  initialEntryState.absenceReason = entry.absenceReason;
              } else { // Legacy format
                  const legacyEntries = entriesForEmp as LegacyDailyLaborEntry[];
                  legacyEntries.forEach(e => {
                      if (e.phaseId && e.hours) {
                          initialEntryState.productiveHours[e.phaseId] = e.hours;
                      }
                      if (e.absenceReason) {
                          initialEntryState.absenceReason = e.absenceReason;
                      }
                  });
                  initialEntryState.specialHours = firstEntry.specialHours ?? {};
              }
          }
          newLaborEntries[emp.id] = initialEntryState;
      });
      setLaborEntries(newLaborEntries);
    } else {
      setLaborEntries({});
    }
  }, [formattedDate, selectedCrewId, laborData, allPersonnelForTable]);

  const handleAbsenceChange = (
      employeeId: string, 
      value: string | null
    ) => {
    setLaborEntries(prev => {
        const currentEntry = prev[employeeId] || { productiveHours: {}, unproductiveHours: {}, absenceReason: null, specialHours: {} };
        let newEntry = { ...currentEntry };

        newEntry.absenceReason = value === 'NONE' ? null : value;
        if (value !== 'NONE' && value !== null) {
            newEntry.productiveHours = {};
            newEntry.unproductiveHours = {};
            newEntry.specialHours = {};
        }
        
        return { ...prev, [employeeId]: newEntry };
    });
  };

  const handleProductiveHourChange = (employeeId: string, phaseId: string, value: string | null) => {
      setLaborEntries(prev => {
          const currentEntry = prev[employeeId] || { productiveHours: {}, unproductiveHours: {}, absenceReason: null, specialHours: {} };
          
          const newHours = (val: string | null) => {
            if (val === "" || val === null) return null;
            const num = parseFloat(val);
            return isNaN(num) || num < 0 ? null : num;
          };

          const updatedHours = newHours(value);

          let newProductiveHours = { ...currentEntry.productiveHours };
          newProductiveHours[phaseId] = updatedHours;
          
          const hasHours = Object.values(newProductiveHours).some(h => h && h > 0) || Object.values(currentEntry.unproductiveHours).some(h => h && h > 0);

          return {
              ...prev,
              [employeeId]: {
                  ...currentEntry,
                  productiveHours: newProductiveHours,
                  absenceReason: hasHours ? null : currentEntry.absenceReason,
                  specialHours: hasHours ? currentEntry.specialHours : {},
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

    const payloadToSave: Omit<DailyLaborEntry, 'id' | 'crewId'>[] = [];
    
    allPersonnelForTable.forEach(emp => {
      const stateEntry = laborEntries[emp.id];
      if (!stateEntry) return;

      const isManual = !selectedCrew?.employeeIds.includes(emp.id);

      const totalProductive = Object.values(stateEntry.productiveHours).reduce((sum, h) => sum + (h || 0), 0);
      const totalUnproductive = Object.values(stateEntry.unproductiveHours).reduce((sum, h) => sum + (h || 0), 0);
      const totalHours = totalProductive + totalUnproductive;
      const hasNovelty = stateEntry.absenceReason || totalHours > 0 || isManual;
      
      if (hasNovelty) {
         payloadToSave.push({ 
           employeeId: emp.id, 
           absenceReason: stateEntry.absenceReason,
           productiveHours: stateEntry.productiveHours,
           unproductiveHours: stateEntry.unproductiveHours,
           specialHours: stateEntry.specialHours,
           manual: isManual, 
         });
      }
    });

    startTransition(async () => {
      try {
        await saveDailyLabor(formattedDate, selectedCrewId, payloadToSave);

        const otherCrewEntries = (laborData[formattedDate] || []).filter(entry => entry.crewId !== selectedCrewId);
        const newCrewEntries: DailyLaborEntry[] = payloadToSave.map(d => ({ ...d, id: crypto.randomUUID(), crewId: selectedCrewId }));
        
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
        const totalProductive = Object.values(entry.productiveHours).reduce((sum, h) => sum + (h || 0), 0);
        const totalUnproductive = Object.values(entry.unproductiveHours).reduce((sum, h) => sum + (h || 0), 0);
        const hasHours = (totalProductive + totalUnproductive) > 0;
        const hasAbsence = !!entry.absenceReason;
        return !hasHours && !hasAbsence;
    });
    
    const personnelWithHoursAndNoPhase = allPersonnelForTable.filter(emp => {
      const entry = laborEntries[emp.id];
      if (!entry) return false;
      const totalProductive = Object.values(entry.productiveHours).reduce((sum, h) => sum + (h || 0), 0);
      return totalProductive > 0 && activePhases.length === 0;
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
    
    if (personnelWithHoursAndNoPhase.length > 0) {
        const employeeNames = personnelWithHoursAndNoPhase
            .map(emp => `${emp.apellido}, ${emp.nombre}`)
            .join('; ');
        toast({
            title: t('toast.missingEntriesTitle'),
            description: t('toast.phaseRequiredDescription', { employees: employeeNames }),
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

            const updatedLaborData = { ...laborData };
            const currentDayEntries = updatedLaborData[formattedDate] || [];
            updatedLaborData[formattedDate] = currentDayEntries.filter(e => !(e.crewId === selectedCrewId && e.employeeId === employeeToMove.id));
            setLaborData(updatedLaborData);
            
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
            const newEntry: DailyLaborEntry = {
                id: crypto.randomUUID(),
                employeeId: employeeToAdd,
                crewId: selectedCrewId,
                productiveHours: {},
                unproductiveHours: {},
                absenceReason: null,
                specialHours: {},
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
       const updatedEntries = (laborData[formattedDate] || []).filter(e => !(e.crewId === selectedCrewId && e.employeeId === employeeId));
       const newLaborData = { ...laborData, [formattedDate]: updatedEntries };
       await writeData(dailyLaborFilePath, newLaborData);
       setLaborData(newLaborData);
    });
  };

  useEffect(() => {
    setSelectedCrewId("");
    setLaborEntries({});
  }, [selectedObraId]);

  // Special Hours Modal Logic
  const handleOpenSpecialHoursModal = (employee: Employee) => {
    const currentEntry = laborEntries[employee.id] || { specialHours: {} };
    setModalSpecialHours(currentEntry.specialHours || {});
    setSpecialHoursModalState({ isOpen: true, employee });
  };

  const handleModalSpecialHourChange = (specialHourId: string, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    if (value !== "" && (isNaN(numValue!) || numValue! < 0)) return;
  
    setModalSpecialHours(prev => ({ ...prev, [specialHourId]: numValue }));
  };
  
  const handleSaveSpecialHours = () => {
    const { employee } = specialHoursModalState;
    if (!employee) return;
  
    const entry = laborEntries[employee.id];
    if (entry) {
        const totalProductive = Object.values(entry.productiveHours).reduce((acc, h) => acc + (h || 0), 0);
        const totalUnproductive = Object.values(entry.unproductiveHours).reduce((acc, h) => acc + (h || 0), 0);
        const totalHours = totalProductive + totalUnproductive;
        const newTotalSpecial = Object.values(modalSpecialHours).reduce((acc, h) => acc + (h || 0), 0);

        if (newTotalSpecial > totalHours) {
            toast({
                variant: "destructive",
                title: t('toast.error'),
                description: t('toast.specialHoursExceededError', { totalHours }),
            });
            return;
        }
    }
  
    setLaborEntries(prev => {
      const currentEntry = prev[employee.id] || { productiveHours: {}, unproductiveHours: {}, absenceReason: null, specialHours: {} };
      return {
        ...prev,
        [employee.id]: {
          ...currentEntry,
          specialHours: modalSpecialHours
        }
      };
    });
  
    setSpecialHoursModalState({ isOpen: false, employee: null });
  };


  const employeeInModal = specialHoursModalState.employee;
  const entryForModal = employeeInModal ? laborEntries[employeeInModal.id] : null;
  const totalHoursForModal = entryForModal 
    ? Object.values(entryForModal.productiveHours).reduce((a, b) => a + (b || 0), 0) + 
      Object.values(entryForModal.unproductiveHours).reduce((a, b) => a + (b || 0), 0)
    : 0;
  
  // Unproductive Hours Modal Logic
  const handleOpenUnproductiveHoursModal = (employee: Employee) => {
    const currentEntry = laborEntries[employee.id] || { unproductiveHours: {} };
    setModalUnproductiveHours(currentEntry.unproductiveHours || {});
    setUnproductiveHoursModalState({ isOpen: true, employee });
  };

  const handleModalUnproductiveHourChange = (unproductiveHourId: string, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    if (value !== "" && (isNaN(numValue!) || numValue! < 0)) return;
  
    setModalUnproductiveHours(prev => ({ ...prev, [unproductiveHourId]: numValue }));
  };
  
  const handleSaveUnproductiveHours = () => {
    const { employee } = unproductiveHoursModalState;
    if (!employee) return;
  
    setLaborEntries(prev => {
      const currentEntry = prev[employee.id] || { productiveHours: {}, unproductiveHours: {}, absenceReason: null, specialHours: {} };
      const hasUnproductiveHours = Object.values(modalUnproductiveHours).some(h => h && h > 0);
      const hasProductiveHours = Object.values(currentEntry.productiveHours).some(h => h && h > 0);

      return {
        ...prev,
        [employee.id]: {
          ...currentEntry,
          unproductiveHours: modalUnproductiveHours,
          absenceReason: (hasUnproductiveHours || hasProductiveHours) ? null : currentEntry.absenceReason,
        }
      };
    });
  
    setUnproductiveHoursModalState({ isOpen: false, employee: null });
  };

  const employeeInUnproductiveModal = unproductiveHoursModalState.employee;
  const entryForUnproductiveModal = employeeInUnproductiveModal ? laborEntries[employeeInUnproductiveModal.id] : null;
  const totalProductiveHoursForModal = entryForUnproductiveModal 
    ? Object.values(entryForUnproductiveModal.productiveHours).reduce((a, b) => a + (b || 0), 0)
    : 0;

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

            {selectedCrew && (
              <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border p-4 bg-muted/50">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{t('foremanLabel')}</p>
                  <p className="truncate">{employeeMap.get(selectedCrew.capatazId) ? `${employeeMap.get(selectedCrew.capatazId)?.apellido}, ${employeeMap.get(selectedCrew.capatazId)?.nombre}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{t('tallymanLabel')}</p>
                  <p className="truncate">{employeeMap.get(selectedCrew.apuntadorId) ? `${employeeMap.get(selectedCrew.apuntadorId)?.apellido}, ${employeeMap.get(selectedCrew.apuntadorId)?.nombre}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{t('siteManagerLabel')}</p>
                  <p className="truncate">{employeeMap.get(selectedCrew.jefeDeObraId) ? `${employeeMap.get(selectedCrew.jefeDeObraId)?.apellido}, ${employeeMap.get(selectedCrew.jefeDeObraId)?.nombre}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{t('mgmtControlLabel')}</p>
                  <p className="truncate">{employeeMap.get(selectedCrew.controlGestionId) ? `${employeeMap.get(selectedCrew.controlGestionId)?.apellido}, ${employeeMap.get(selectedCrew.controlGestionId)?.nombre}` : 'N/A'}</p>
                </div>
              </div>
            )}

            <fieldset disabled={isNotified}>
                <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10">{t('tableHeaderLegajo')}</TableHead>
                        <TableHead className="sticky left-[70px] bg-background z-10">{t('tableHeaderName')}</TableHead>
                        <TableHead className="w-[220px]">{t('tableHeaderAbsence')}</TableHead>
                        {activePhases.map(phase => (
                            <TableHead key={phase.id} className="w-[120px] text-center">{phase.name}</TableHead>
                        ))}
                        <TableHead className="w-[150px] text-center">{t('tableHeaderUnproductiveHours')}</TableHead>
                        <TableHead className="w-[120px] text-center font-bold text-foreground">{t('tableHeaderTotalHours')}</TableHead>
                        <TableHead className="w-[150px] text-center">{t('tableHeaderSpecialHours')}</TableHead>
                        <TableHead className="w-[100px] text-right">{t('tableHeaderActions')}</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {allPersonnelForTable.length > 0 ? (
                        allPersonnelForTable.map(emp => {
                        const entry = laborEntries[emp.id] || { productiveHours: {}, unproductiveHours: {}, absenceReason: null, specialHours: {} };
                        const hasAbsence = !!entry.absenceReason;
                        
                        const totalProductive = Object.values(entry.productiveHours).reduce((acc, h) => acc + (h || 0), 0);
                        const totalUnproductive = Object.values(entry.unproductiveHours).reduce((acc, h) => acc + (h || 0), 0);
                        const totalHours = totalProductive + totalUnproductive;
                        const hasHours = totalHours > 0;
                        const totalSpecialHours = Object.values(entry.specialHours).reduce((acc, h) => acc + (h || 0), 0);

                        const dailyEntries = laborData[formattedDate] || [];
                        const empEntry = dailyEntries.find(e => e.crewId === selectedCrewId && e.employeeId === emp.id)
                        const isManual = empEntry && 'manual' in empEntry && empEntry.manual;
                        
                        const hasOvertimeWarning = totalHours > 12;

                        return (
                        <TableRow key={emp.id} className={cn(
                            isManual ? "bg-accent/50" : "",
                            hasOvertimeWarning ? "bg-destructive/10" : ""
                        )}>
                            <TableCell className="font-mono sticky left-0 bg-background z-10">{emp.legajo}</TableCell>
                            <TableCell className="font-medium sticky left-[70px] bg-background z-10">
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
                             <TableCell>
                                <Select
                                    value={entry.absenceReason ?? "NONE"}
                                    onValueChange={(value) => handleAbsenceChange(emp.id, value)}
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
                            {activePhases.map(phase => (
                                <TableCell key={phase.id}>
                                    <Input
                                        type="number"
                                        className="text-center"
                                        placeholder="-"
                                        value={entry.productiveHours[phase.id] ?? ""}
                                        onChange={(e) => handleProductiveHourChange(emp.id, phase.id, e.target.value)}
                                        disabled={isPending || hasAbsence}
                                        step="0.5"
                                        min="0"
                                    />
                                </TableCell>
                            ))}
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="font-medium">{totalUnproductive > 0 ? totalUnproductive : "-"}</span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenUnproductiveHoursModal(emp)}
                                            disabled={isPending || hasAbsence}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{t('editUnproductiveHoursButtonSr', { name: `${emp.apellido}, ${emp.nombre}` })}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                </div>
                            </TableCell>
                             <TableCell className="text-center font-bold">
                                {totalHours > 0 ? totalHours : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="font-medium">{totalSpecialHours > 0 ? totalSpecialHours : "-"}</span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenSpecialHoursModal(emp)}
                                            disabled={isPending || hasAbsence || !hasHours}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{t('editSpecialHoursButtonSr', { name: `${emp.apellido}, ${emp.nombre}` })}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                </div>
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
                        <TableCell colSpan={7 + activePhases.length} className="h-24 text-center">
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

    <Dialog open={specialHoursModalState.isOpen} onOpenChange={(isOpen) => setSpecialHoursModalState({ isOpen, employee: isOpen ? specialHoursModalState.employee : null })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('specialHoursModalTitle')}</DialogTitle>
          <DialogDescription>
            {t('specialHoursModalDescription', { 
                name: `${specialHoursModalState.employee?.apellido}, ${specialHoursModalState.employee?.nombre}`,
                date: displayDate
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid gap-4">
          <div className="grid grid-cols-2 items-center gap-4 rounded-lg border p-4 bg-muted/50">
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('totalHoursLabel')}</p>
                <p className="text-2xl font-bold">{totalHoursForModal} hs</p>
             </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('tableHeaderSpecialHours')}</p>
                <p className="text-2xl font-bold">{Object.values(modalSpecialHours).reduce((acc, h) => acc + (h || 0), 0)} hs</p>
             </div>
          </div>
          {initialSpecialHourTypes.map(sht => (
            <div key={sht.id} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`special-hours-${sht.id}`} className="text-right">
                {sht.name}
              </Label>
              <Input 
                id={`special-hours-${sht.id}`}
                type="number"
                className="col-span-2"
                value={modalSpecialHours[sht.id] ?? ""}
                onChange={(e) => handleModalSpecialHourChange(sht.id, e.target.value)}
                step="0.5"
                min="0"
                max={totalHoursForModal}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSpecialHoursModalState({ isOpen: false, employee: null })}>{t('cancelButton')}</Button>
          <Button onClick={handleSaveSpecialHours}>{t('saveButton')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={unproductiveHoursModalState.isOpen} onOpenChange={(isOpen) => setUnproductiveHoursModalState({ isOpen, employee: isOpen ? unproductiveHoursModalState.employee : null })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('unproductiveHoursModalTitle')}</DialogTitle>
          <DialogDescription>
            {t('unproductiveHoursModalDescription', { 
                name: `${unproductiveHoursModalState.employee?.apellido}, ${unproductiveHoursModalState.employee?.nombre}`,
                date: displayDate
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid gap-4">
          <div className="grid grid-cols-2 items-center gap-4 rounded-lg border p-4 bg-muted/50">
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('totalProductiveHoursLabel')}</p>
                <p className="text-2xl font-bold">{totalProductiveHoursForModal} hs</p>
             </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('tableHeaderUnproductiveHours')}</p>
                <p className="text-2xl font-bold">{Object.values(modalUnproductiveHours).reduce((acc, h) => acc + (h || 0), 0)} hs</p>
             </div>
          </div>
          {initialUnproductiveHourTypes.map(uht => (
            <div key={uht.id} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`unproductive-hours-${uht.id}`} className="text-right">
                {uht.name}
              </Label>
              <Input 
                id={`unproductive-hours-${uht.id}`}
                type="number"
                className="col-span-2"
                value={modalUnproductiveHours[uht.id] ?? ""}
                onChange={(e) => handleModalUnproductiveHourChange(uht.id, e.target.value)}
                step="0.5"
                min="0"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setUnproductiveHoursModalState({ isOpen: false, employee: null })}>{t('cancelButton')}</Button>
          <Button onClick={handleSaveUnproductiveHours}>{t('saveButton')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    </TooltipProvider>
  );
}
