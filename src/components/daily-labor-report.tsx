
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
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
import { Calendar as CalendarIcon, Loader2, Save, UserPlus, Trash2, AlertTriangle, Send, Info, ArrowRightLeft, Sparkles, Hourglass, ArrowLeft, Edit } from "lucide-react";
import { format, startOfToday, parse } from "date-fns";
import { es } from "date-fns/locale";
import type { Crew, Employee, DailyLaborData, Project, AbsenceType, Phase, SpecialHourType, UnproductiveHourType, Permission, DailyReport, DailyLaborEntry } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, doc, query, where, getDocs, writeBatch, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";


interface DailyLaborReportProps {
  initialCrews: Crew[];
  initialEmployees: Employee[];
  initialDailyReports: DailyReport[];
  initialLaborData: DailyLaborData;
  initialProjects: Project[];
  initialAbsenceTypes: AbsenceType[];
  initialPhases: Phase[];
  initialSpecialHourTypes: SpecialHourType[];
  initialUnproductiveHourTypes: UnproductiveHourType[];
  initialPermissions: Permission[];
  preselectedDate: string | null;
  preselectedProject: string | null;
  preselectedCrew: string | null;
}

interface LaborEntryState {
    productiveHours: Record<string, number | null>;
    unproductiveHours: Record<string, number | null>;
    absenceReason: string | null;
    specialHours: Record<string, number | null>;
    manual?: boolean;
}

interface MobileHoursModalState {
    isOpen: boolean;
    employee: Employee | null;
    absence: string | null;
    productive: Record<string, number | null>;
    unproductive: Record<string, number | null>;
}

export default function DailyLaborReport({ 
  initialCrews, 
  initialEmployees, 
  initialDailyReports,
  initialLaborData, 
  initialProjects, 
  initialAbsenceTypes, 
  initialPhases,
  initialSpecialHourTypes,
  initialUnproductiveHourTypes,
  initialPermissions,
  preselectedDate,
  preselectedProject,
  preselectedCrew
}: DailyLaborReportProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [dailyReports, setDailyReports] = useState<DailyReport[]>(initialDailyReports);
  const [laborData, setLaborData] = useState<DailyLaborData>(initialLaborData);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");
  const [laborEntries, setLaborEntries] = useState<Record<string, LaborEntryState>>({});
  
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToAdd, setEmployeeToAdd] = useState("");
  const [employeeToMove, setEmployeeToMove] = useState<Employee | null>(null);
  const [destinationCrewId, setDestinationCrewId] = useState<string>("");

  const [specialHoursModalState, setSpecialHoursModalState] = useState<{ isOpen: boolean; employee: Employee | null }>({ isOpen: false, employee: null });
  const [modalSpecialHours, setModalSpecialHours] = useState<Record<string, number | null>>({});

  const [unproductiveHoursModalState, setUnproductiveHoursModalState] = useState<{ isOpen: boolean; employee: Employee | null }>({ isOpen: false, employee: null });
  const [modalUnproductiveHours, setModalUnproductiveHours] = useState<Record<string, number | null>>({});
  
  const [mobileHoursModalState, setMobileHoursModalState] = useState<MobileHoursModalState>({ isOpen: false, employee: null, absence: null, productive: {}, unproductive: {} });

  const canSave = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('dailyReports.save'), [user]);
  const canNotify = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('dailyReports.notify'), [user]);
  const canAddManual = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('dailyReports.addManual'), [user]);
  const canMoveEmployee = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('dailyReports.moveEmployee'), [user]);
  const canApproveControl = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('dailyReports.approveControl'), [user]);
  const canApprovePM = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('dailyReports.approvePM'), [user]);
  const canDelete = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('dailyReports.delete'), [user]);


  useEffect(() => {
    if (preselectedDate) {
      const parsedDate = parse(preselectedDate, 'yyyy-MM-dd', new Date());
      setSelectedDate(parsedDate);
    } else if (typeof window !== "undefined") {
      setSelectedDate(startOfToday());
    }

    if(preselectedProject) {
      setSelectedProjectId(preselectedProject);
    }
    if(preselectedCrew) {
      setSelectedCrewId(preselectedCrew);
    }
  }, [preselectedDate, preselectedProject, preselectedCrew]);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const displayDate = selectedDate
    ? format(selectedDate, "PPP", { locale: es })
    : "Seleccione una fecha";

  const employeeMap = useMemo(() => new Map(initialEmployees.map(emp => [emp.id, emp])), [initialEmployees]);
  const projectMap = useMemo(() => new Map(initialProjects.map(p => [p.id, p])), [initialProjects]);
  const phaseMap = useMemo(() => new Map(initialPhases.map(p => [p.id, p])), [initialPhases]);
  const crewMap = useMemo(() => new Map(initialCrews.map(c => [c.id, c])), [initialCrews]);


  const projectsWithCrews = useMemo(() => {
    const projectIdsWithCrews = new Set(initialCrews.map(crew => crew.projectId));
    return initialProjects
      .filter(project => projectIdsWithCrews.has(project.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [initialCrews, initialProjects]);
  
  const crewOptions = useMemo(() => {
    if (!selectedProjectId) return [];
    const crews = initialCrews.filter(c => c.projectId === selectedProjectId);
    const options = crews.map(c => ({ value: c.id, label: c.name }));
     if (crews.length > 1) {
        options.unshift({ value: 'all', label: "Todas las Cuadrillas" });
    }
    return options;
  }, [initialCrews, selectedProjectId]);

  const crewsForListView = useMemo(() => {
    if (!selectedProjectId) return [];
    return initialCrews.filter(c => c.projectId === selectedProjectId);
  }, [initialCrews, selectedProjectId]);

  const activeDailyReport = useMemo(() => {
    if (!formattedDate || !selectedCrewId || selectedCrewId === 'all') return null;
    return dailyReports.find(r => r.date === formattedDate && r.crewId === selectedCrewId) || null;
  }, [dailyReports, formattedDate, selectedCrewId]);

  const availableCrewsForMove = useMemo(() => {
    return initialCrews
        .filter(c => {
          if (c.id === selectedCrewId) return false;
          const report = dailyReports.find(r => r.date === formattedDate && r.crewId === c.id);
          return !report || report.status !== 'NOTIFIED';
        })
        .map(c => ({ value: c.id, label: `${c.name} (${projectMap.get(c.projectId)?.name || "Sin Proyecto"})` }));
  }, [initialCrews, selectedCrewId, dailyReports, formattedDate, projectMap]);

  const selectedCrew = useMemo(() => {
    if (selectedCrewId === 'all' || !selectedCrewId) return null;
    return initialCrews.find(c => c.id === selectedCrewId);
  }, [initialCrews, selectedCrewId]);
  
  const projectForCrew = useMemo(() => {
    if (activeDailyReport) {
      return projectMap.get(activeDailyReport.projectId);
    }
    return selectedCrew ? projectMap.get(selectedCrew.projectId) : null;
  }, [activeDailyReport, selectedCrew, projectMap]);
  
  const isNotified = activeDailyReport?.status === 'NOTIFIED';
  
  const personnelForTable = useMemo(() => {
    if (!selectedCrewId || selectedCrewId === 'all') return [];
    
    // If a report exists, the personnel is defined by its labor entries.
    if (activeDailyReport) {
      const reportLaborEntries = laborData[activeDailyReport.id] || [];
      const personnelIds = new Set(reportLaborEntries.map(e => e.employeeId));
      return Array.from(personnelIds)
        .map(id => employeeMap.get(id))
        .filter(Boolean) as Employee[];
    }
    
    // If no report exists, the personnel is the current crew composition.
    const crew = crewMap.get(selectedCrewId);
    if (crew) {
        return crew.employeeIds.map(id => employeeMap.get(id)).filter(Boolean) as Employee[];
    }

    return [];
  }, [activeDailyReport, selectedCrewId, crewMap, laborData, employeeMap]);
  
  const hasExistingReport = !!activeDailyReport;
  
  const availableEmployeesForManualAdd = useMemo(() => {
    if (!selectedCrewId || selectedCrewId === 'all') return [];

    const alreadyInPart = new Set(personnelForTable.map(p => p.id));

    return initialEmployees
      .filter(emp => 
        emp.condition === 'jornal' && 
        emp.status === 'activo' &&
        !alreadyInPart.has(emp.id)
      )
      .map(emp => ({ value: emp.id, label: `${emp.lastName}, ${emp.firstName} (L: ${emp.internalNumber})` }));
  }, [initialEmployees, personnelForTable, selectedCrewId]);

  const activePhases = useMemo(() => {
    if (!selectedDate || !selectedCrew) return [];
    const date = new Date(selectedDate);
    date.setUTCHours(0,0,0,0);
    
    const allPhaseIds = new Set<string>();

    (selectedCrew.assignedPhases || []).forEach(p => {
        const startDate = new Date(p.startDate);
        const endDate = new Date(p.endDate);
        if (date >= startDate && date <= endDate) {
            allPhaseIds.add(p.phaseId);
        }
    });
    
    return Array.from(allPhaseIds)
        .map(pId => phaseMap.get(pId))
        .filter((p): p is Phase => !!p)
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCrew, selectedDate, phaseMap]);

  const permissionsForDate = useMemo(() => {
    if (!formattedDate || !initialPermissions) return new Map<string, string>();
    
    const date = new Date(formattedDate + 'T00:00:00');
    const permissionsMap = new Map<string, string>();

    initialPermissions.forEach(perm => {
        const startDate = new Date(perm.startDate + 'T00:00:00');
        const endDate = new Date(perm.endDate + 'T00:00:00');
        const isApproved = !!perm.approvedByProjectManagerId || !!perm.approvedByHumanResourceId;

        if (isApproved && date >= startDate && date <= endDate) {
            permissionsMap.set(perm.employeeId, perm.absenceTypeId);
        }
    });

    return permissionsMap;
}, [formattedDate, initialPermissions]);

  const approvalSettings = useMemo(() => {
    if (!projectForCrew) return { requiresControl: false, requiresPM: false };
    return {
      requiresControl: projectForCrew?.requiresControlGestionApproval ?? false,
      requiresPM: projectForCrew?.requiresJefeDeObraApproval ?? false
    }
  }, [projectForCrew]);

  const specialHourTypesForProject = useMemo(() => {
      if (!projectForCrew || !projectForCrew.specialHourTypeIds) return [];
      return initialSpecialHourTypes.filter(t => projectForCrew.specialHourTypeIds!.includes(t.id));
  }, [projectForCrew, initialSpecialHourTypes]);

  const unproductiveHourTypesForProject = useMemo(() => {
      if (!projectForCrew || !projectForCrew.unproductiveHourTypeIds) return [];
      return initialUnproductiveHourTypes.filter(t => projectForCrew.unproductiveHourTypeIds!.includes(t.id));
  }, [projectForCrew, initialUnproductiveHourTypes]);
  
  const absenceTypesForProject = useMemo(() => {
      if (!projectForCrew || !projectForCrew.absenceTypeIds) return [];
      return initialAbsenceTypes.filter(t => projectForCrew.absenceTypeIds!.includes(t.id));
  }, [projectForCrew, initialAbsenceTypes]);

  useEffect(() => {
    if (personnelForTable.length > 0) {
        const newLaborEntries: Record<string, LaborEntryState> = {};
        const reportLaborEntries = activeDailyReport ? (laborData[activeDailyReport.id] || []) : [];

        personnelForTable.forEach(emp => {
            const entryForEmp = reportLaborEntries.find(e => e.employeeId === emp.id);
            const initialEntryState: LaborEntryState = {
                productiveHours: {},
                unproductiveHours: {},
                absenceReason: null,
                specialHours: {},
                manual: false,
            };

            if (entryForEmp) {
                initialEntryState.productiveHours = entryForEmp.productiveHours;
                initialEntryState.unproductiveHours = entryForEmp.unproductiveHours;
                initialEntryState.specialHours = entryForEmp.specialHours;
                initialEntryState.absenceReason = entryForEmp.absenceReason;
                initialEntryState.manual = entryForEmp.manual;
            } else {
                const permissionAbsenceId = permissionsForDate.get(emp.id);
                if (permissionAbsenceId) {
                    initialEntryState.absenceReason = permissionAbsenceId;
                }
            }
            newLaborEntries[emp.id] = initialEntryState;
        });
        setLaborEntries(newLaborEntries);
    } else {
        setLaborEntries({});
    }
}, [personnelForTable, activeDailyReport, laborData, permissionsForDate]);

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
    if (!formattedDate || !selectedCrewId || selectedCrewId === 'all' || !selectedCrew) {
      toast({
        title: "Selección requerida",
        description: "Por favor, seleccione una fecha, proyecto y cuadrilla para guardar.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
        try {
            const batch = writeBatch(db);
            let reportId = activeDailyReport?.id;
            let finalDailyReport: DailyReport;

            // Create or get daily report
            if (!activeDailyReport) {
                const newReportData: Omit<DailyReport, 'id'> = {
                    date: formattedDate,
                    crewId: selectedCrewId,
                    projectId: selectedCrew.projectId,
                    foremanId: selectedCrew.foremanId,
                    tallymanId: selectedCrew.tallymanId,
                    projectManagerId: selectedCrew.projectManagerId,
                    controlAndManagementId: selectedCrew.controlAndManagementId,
                    status: 'PENDING'
                };
                const newReportRef = doc(collection(db, 'daily-reports'));
                batch.set(newReportRef, newReportData);
                reportId = newReportRef.id;
                finalDailyReport = { id: reportId, ...newReportData };
            } else {
                finalDailyReport = activeDailyReport;
            }

            if (!reportId) throw new Error("Could not establish a daily report ID.");
            
            // Delete old labor entries for this report
            const qOldLabor = query(collection(db, 'daily-labor'), where("dailyReportId", "==", reportId));
            const oldDocs = await getDocs(qOldLabor);
            oldDocs.forEach(doc => batch.delete(doc.ref));

            // Create new labor entries
            const newLaborEntries: DailyLaborEntry[] = [];
            personnelForTable.forEach(emp => {
                const stateEntry = laborEntries[emp.id];
                if (!stateEntry) return;

                const isManual = stateEntry.manual === true;
                
                const dataToSave: Omit<DailyLaborEntry, 'id'> = { 
                    dailyReportId: reportId!,
                    employeeId: emp.id, 
                    absenceReason: stateEntry.absenceReason,
                    productiveHours: stateEntry.productiveHours,
                    unproductiveHours: stateEntry.unproductiveHours,
                    specialHours: stateEntry.specialHours,
                    manual: isManual, 
                };
                const newDocRef = doc(collection(db, 'daily-labor'));
                batch.set(newDocRef, dataToSave);
                newLaborEntries.push({ id: newDocRef.id, ...dataToSave });
            });

            await batch.commit();

            // Update local state
            if (!activeDailyReport) {
                setDailyReports(prev => [...prev, finalDailyReport]);
            }
            setLaborData(prev => ({ ...prev, [reportId!]: newLaborEntries }));
            
            toast({
              title: "Datos Guardados",
              description: "Las horas y ausencias se han registrado correctamente.",
            });
        } catch (error) {
            console.error("Error saving data:", error);
            toast({
                title: "Error al Guardar",
                description: "No se pudieron guardar los datos.",
                variant: "destructive",
            });
        }
    });
  };

  const handleNotify = () => {
    if (!activeDailyReport) return;

    startTransition(async () => {
        try {
            const reportRef = doc(db, 'daily-reports', activeDailyReport.id);
            const updateData = {
                status: 'NOTIFIED',
                notifiedAt: new Date().toISOString(),
            };

            await updateDoc(reportRef, updateData);
            
            setDailyReports(prev => prev.map(r => r.id === activeDailyReport.id ? {...r, ...updateData} : r));

            setIsNotifyDialogOpen(false);
            toast({
                title: "Parte Notificado",
                description: "El parte diario se ha notificado y ya no se puede modificar.",
            });
        } catch (error) {
            toast({
                title: "Error al Notificar",
                description: "No se pudo notificar el parte.",
                variant: "destructive",
            });
        }
    });
  };

  const handleOpenNotifyDialog = () => {
    if (!selectedCrewId || selectedCrewId === 'all' || !personnelForTable) {
        toast({
            title: "Error",
            description: "Debe seleccionar una cuadrilla con personal para notificar.",
            variant: "destructive"
        });
        return;
    }

    const personnelWithoutNovelty = personnelForTable.filter(emp => {
        const entry = laborEntries[emp.id];
        if (!entry) return true;
        const totalProductive = Object.values(entry.productiveHours).reduce((sum, h) => sum + (h || 0), 0);
        const totalUnproductive = Object.values(entry.unproductiveHours).reduce((sum, h) => sum + (h || 0), 0);
        const hasHours = (totalProductive + totalUnproductive) > 0;
        const hasAbsence = !!entry.absenceReason;
        return !hasHours && !hasAbsence;
    });
    
    const personnelWithHoursAndNoPhase = personnelForTable.filter(emp => {
      const entry = laborEntries[emp.id];
      if (!entry) return false;
      const totalProductive = Object.values(entry.productiveHours).reduce((sum, h) => sum + (h || 0), 0);
      return totalProductive > 0 && activePhases.length === 0;
    });

    if (personnelWithoutNovelty.length > 0) {
        const employeeNames = personnelWithoutNovelty
            .map(emp => `${emp.lastName}, ${emp.firstName}`)
            .join('; ');
        toast({
            title: "Faltan Novedades para Notificar",
            description: `Los siguientes empleados no tienen horas ni ausencias registradas: ${employeeNames}.`,
            variant: "destructive",
            duration: 8000
        });
        return;
    }
    
    if (personnelWithHoursAndNoPhase.length > 0) {
        const employeeNames = personnelWithHoursAndNoPhase
            .map(emp => `${emp.lastName}, ${emp.firstName}`)
            .join('; ');
        toast({
            title: "Faltan Novedades para Notificar",
            description: `Los siguientes empleados con horas no tienen una fase asignada: ${employeeNames}.`,
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
    if (!employeeToMove || !destinationCrewId || !activeDailyReport) return;
    
    startTransition(async () => {
        try {
            const batch = writeBatch(db);
            const laborEntriesForReport = laborData[activeDailyReport.id] || [];
            const entryToMove = laborEntriesForReport.find(e => e.employeeId === employeeToMove.id);

            if (entryToMove) {
                batch.delete(doc(db, "daily-labor", entryToMove.id));
            }

            // Find or create destination report
            let destReport = dailyReports.find(r => r.date === formattedDate && r.crewId === destinationCrewId);
            let destReportId: string;

            if (destReport) {
                destReportId = destReport.id;
            } else {
                const destCrew = crewMap.get(destinationCrewId);
                if (!destCrew) throw new Error("Destination crew not found");
                const newReportData: Omit<DailyReport, 'id'> = {
                    date: formattedDate,
                    crewId: destinationCrewId,
                    projectId: destCrew.projectId,
                    foremanId: destCrew.foremanId,
                    tallymanId: destCrew.tallymanId,
                    projectManagerId: destCrew.projectManagerId,
                    controlAndManagementId: destCrew.controlAndManagementId,
                    status: 'PENDING'
                };
                const newReportRef = doc(collection(db, 'daily-reports'));
                batch.set(newReportRef, newReportData);
                destReportId = newReportRef.id;
                destReport = { id: destReportId, ...newReportData };
            }

            const newEntry = {
                dailyReportId: destReportId,
                employeeId: employeeToMove.id,
                productiveHours: {},
                unproductiveHours: {},
                absenceReason: null,
                specialHours: {},
                manual: true,
            };
            const newDocRef = doc(collection(db, "daily-labor"));
            batch.set(newDocRef, newEntry);
            
            await batch.commit();

            // Update state
            if (entryToMove) {
                setLaborData(prev => ({
                    ...prev,
                    [activeDailyReport.id]: prev[activeDailyReport.id].filter(e => e.id !== entryToMove.id)
                }));
            }
            if (!dailyReports.some(r => r.id === destReport!.id)) {
                setDailyReports(prev => [...prev, destReport!]);
            }
            setLaborData(prev => ({ ...prev, [destReport!.id]: [...(prev[destReport!.id] || []), {id: newDocRef.id, ...newEntry}] }));

            
            toast({
                title: "Empleado Movido",
                description: `${employeeToMove.lastName}, ${employeeToMove.firstName} ha sido movido con éxito.`,
            });
            
            setEmployeeToMove(null);
            setDestinationCrewId("");
        } catch (error) {
            toast({
                title: "Error al mover",
                description: error instanceof Error ? error.message : "No se pudo mover el empleado.",
                variant: "destructive",
            });
        }
    });
  };

  const handleAddManualEmployee = () => {
    if (!employeeToAdd || !activeDailyReport) return;

    startTransition(async () => {
        try {
            const batch = writeBatch(db);
            const laborRef = collection(db, 'daily-labor');
            const newEntryData = {
                dailyReportId: activeDailyReport.id,
                employeeId: employeeToAdd,
                productiveHours: {},
                unproductiveHours: {},
                absenceReason: null,
                specialHours: {},
                manual: true,
            };
            const newDocRef = doc(laborRef);
            batch.set(newDocRef, newEntryData);
            await batch.commit();
            
            const newEntryForState = { id: newDocRef.id, ...newEntryData };

            setLaborData(prev => ({
                ...prev,
                [activeDailyReport.id]: [...(prev[activeDailyReport.id] || []), newEntryForState]
            }));

            setEmployeeToAdd("");
            setIsAddEmployeeDialogOpen(false);
            toast({ title: "Empleado agregado" });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo agregar al empleado.", variant: "destructive" });
        }
    });
  };

  const handleRemoveManualEmployee = (employeeId: string) => {
    if (!activeDailyReport) return;
    
    startTransition(async () => {
        try {
            const batch = writeBatch(db);
            const laborEntriesForReport = laborData[activeDailyReport.id] || [];
            const entryToRemove = laborEntriesForReport.find(e => e.employeeId === employeeId);

            if (entryToRemove) {
              batch.delete(doc(db, 'daily-labor', entryToRemove.id));
              await batch.commit();
              
              const updatedEntries = laborEntriesForReport.filter(e => e.id !== entryToRemove.id);
              setLaborData(prev => ({ ...prev, [activeDailyReport.id]: updatedEntries }));

              toast({ title: "Empleado removido" });
            }
        } catch (error) {
            toast({ title: "Error", description: "No se pudo remover al empleado.", variant: "destructive" });
        }
    });
  };
  
  const handleDeleteDailyReport = () => {
    if (!activeDailyReport) return;

    startTransition(async () => {
        try {
            const batch = writeBatch(db);

            // Delete labor entries
            const laborEntriesToDelete = laborData[activeDailyReport.id] || [];
            laborEntriesToDelete.forEach(entry => {
                batch.delete(doc(db, 'daily-labor', entry.id));
            });

            // Delete daily report header
            batch.delete(doc(db, 'daily-reports', activeDailyReport.id));
            
            await batch.commit();

            // Update local state
            setDailyReports(prev => prev.filter(r => r.id !== activeDailyReport.id));
            const newLaborData = { ...laborData };
            delete newLaborData[activeDailyReport.id];
            setLaborData(newLaborData);

            // Reset view
            setLaborEntries({});
            setIsDeleteDialogOpen(false);

            toast({
              title: "Parte Diario Eliminado",
              description: "Todos los registros para esta cuadrilla en esta fecha han sido eliminados.",
            });
        } catch (error) {
            toast({
                title: "Error al Eliminar",
                description: "No se pudo eliminar el parte diario.",
                variant: "destructive",
            });
        }
    });
  }

  useEffect(() => {
    if (selectedProjectId) {
        const crewsForProject = initialCrews.filter(c => c.projectId === selectedProjectId);
        if (crewsForProject.length > 1 && !preselectedCrew) {
            setSelectedCrewId("all");
        } else if (crewsForProject.length === 1 && !preselectedCrew) {
            setSelectedCrewId(crewsForProject[0].id);
        } else if (preselectedCrew) {
            setSelectedCrewId(preselectedCrew)
        } else {
            setSelectedCrewId("");
        }
    } else {
        setSelectedCrewId("");
    }
    setLaborEntries({});
  }, [selectedProjectId, initialCrews, preselectedCrew]);

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
                title: "Error",
                description: `La suma de horas especiales no puede superar el total de horas trabajadas (${totalHours}h).`,
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
    
  const getCrewDetail = (field: 'foremanId' | 'tallymanId' | 'projectManagerId' | 'controlAndManagementId') => {
    let titularId;
    if (activeDailyReport && field in activeDailyReport) {
        titularId = activeDailyReport[field];
    }

    if (!titularId) return 'N/A';
    
    const titular = employeeMap.get(titularId);
    return titular ? `${titular.lastName}, ${titular.firstName}` : 'N/A';
  };

  const handleOpenMobileHoursModal = (employee: Employee) => {
    const currentEntry = laborEntries[employee.id] || { absenceReason: null, productiveHours: {}, unproductiveHours: {} };
    setMobileHoursModalState({
        isOpen: true,
        employee,
        absence: currentEntry.absenceReason,
        productive: currentEntry.productiveHours,
        unproductive: currentEntry.unproductiveHours,
    });
  };

  const handleSaveMobileHours = () => {
    const { employee, absence, productive, unproductive } = mobileHoursModalState;
    if (!employee) return;
  
    setLaborEntries(prev => {
        const currentEntry = prev[employee.id] || { productiveHours: {}, unproductiveHours: {}, absenceReason: null, specialHours: {} };
        const hasHours = Object.values(productive).some(h => h && h > 0) || Object.values(unproductive).some(h => h && h > 0);
        
        return {
            ...prev,
            [employee.id]: {
                ...currentEntry,
                absenceReason: hasHours ? null : (absence === 'NONE' ? null : absence),
                productiveHours: hasHours ? productive : {},
                unproductiveHours: hasHours ? unproductive : {},
            }
        };
    });
  
    setMobileHoursModalState({ isOpen: false, employee: null, absence: null, productive: {}, unproductive: {} });
  };


  return (
    <TooltipProvider>
    <Card>
      <CardHeader>
        <CardTitle>Carga de Horas por Empleado</CardTitle>
        <CardDescription>
          Seleccione fecha, proyecto y cuadrilla para registrar las horas o ausencias del personal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row flex-wrap items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-[280px] justify-start text-left font-normal" disabled={isPending}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {displayDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={es} disabled={(date) => date > new Date()} />
            </PopoverContent>
          </Popover>

          <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isPending}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Seleccione un proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projectsWithCrews.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Combobox
            options={crewOptions}
            value={selectedCrewId}
            onValueChange={setSelectedCrewId}
            placeholder="Seleccione una cuadrilla"
            searchPlaceholder="Buscar cuadrilla..."
            emptyMessage="No hay cuadrillas para este proyecto."
            disabled={!selectedProjectId || isPending}
            className="w-full md:w-[250px]"
          />
        </div>
        
        {selectedCrewId === 'all' && selectedProjectId ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuadrilla</TableHead>
                    <TableHead>Capataz</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crewsForListView.length > 0 ? (
                    crewsForListView.map(crew => {
                      const report = dailyReports.find(r => r.date === formattedDate && r.crewId === crew.id);
                      let statusText = "No Iniciado";
                      let statusColor = 'text-muted-foreground';
                      if (report) {
                          if (report.status === 'NOTIFIED') {
                              statusText = "Notificado";
                              statusColor = 'text-green-600';
                          } else {
                              statusText = "Pendiente";
                              statusColor = 'text-yellow-600';
                          }
                      }

                      return (
                        <TableRow key={crew.id}>
                          <TableCell className="font-medium">{crew.name}</TableCell>
                          <TableCell>{employeeMap.get(crew.foremanId)?.lastName}, {employeeMap.get(crew.foremanId)?.firstName}</TableCell>
                          <TableCell className={cn("font-semibold", statusColor)}>{statusText}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => setSelectedCrewId(crew.id)}>
                              Ver / Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No hay partes para mostrar para este proyecto y fecha.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : selectedCrewId ? (
          <div>
            {isNotified && (
              <Alert className="mb-4 border-primary/50 text-primary [&>svg]:text-primary">
                <Info className="h-4 w-4" />
                <AlertTitle>Parte Notificado</AlertTitle>
                <AlertDescription>
                  Este parte fue notificado el {activeDailyReport?.notifiedAt ? format(new Date(activeDailyReport.notifiedAt), 'Pp', { locale: es }) : ''}. No se admiten más cambios.
                </AlertDescription>
              </Alert>
            )}

            {activeDailyReport && (
              <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border p-4 bg-muted/50">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Capataz</p>
                  <p className="truncate">{getCrewDetail('foremanId')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Apuntador</p>
                  <p className="truncate">{getCrewDetail('tallymanId')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Jefe de Proyecto</p>
                  <p className="truncate">{getCrewDetail('projectManagerId')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Control y Gestión</p>
                  <p className="truncate">{getCrewDetail('controlAndManagementId')}</p>
                </div>
              </div>
            )}

            <fieldset disabled={isNotified}>
                {isMobile ? (
                    <div className="space-y-4">
                        {personnelForTable.map(emp => {
                            const entry = laborEntries[emp.id] || { productiveHours: {}, unproductiveHours: {}, absenceReason: null, specialHours: {} };
                            const totalProductive = Object.values(entry.productiveHours).reduce((acc, h) => acc + (h || 0), 0);
                            const totalUnproductive = Object.values(entry.unproductiveHours).reduce((acc, h) => acc + (h || 0), 0);
                            const totalHours = totalProductive + totalUnproductive;
                            const totalSpecialHours = Object.values(entry.specialHours).reduce((acc, h) => acc + (h || 0), 0);
                            const absenceName = entry.absenceReason ? absenceTypesForProject.find(at => at.id === entry.absenceReason)?.name : null;

                            return (
                                <Card key={emp.id} className={cn(entry.absenceReason ? "bg-red-50" : (totalHours > 0 ? "bg-green-50" : ""))}>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base">{`${emp.lastName}, ${emp.firstName}`}</CardTitle>
                                        <CardDescription>Legajo: {emp.internalNumber}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        {absenceName ? (
                                            <Badge variant="destructive">{absenceName}</Badge>
                                        ) : (
                                            <>
                                                <p><strong>Horas Prod:</strong> {totalProductive} hs</p>
                                                <p><strong>Horas Improd:</strong> {totalUnproductive} hs</p>
                                                <p><strong>Total Trabajadas:</strong> {totalHours} hs</p>
                                            </>
                                        )}
                                        {totalSpecialHours > 0 && <p><strong>Horas Especiales:</strong> {totalSpecialHours} hs</p>}
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2 items-stretch">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenMobileHoursModal(emp)} disabled={isPending || isNotified}><Edit className="mr-2 h-4 w-4" /> Cargar Novedades</Button>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenSpecialHoursModal(emp)} disabled={isPending || isNotified || !totalHours}><Sparkles className="mr-2 h-4 w-4" /> H. Especiales</Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-background z-10">Legajo</TableHead>
                                <TableHead className="sticky left-[70px] bg-background z-10 min-w-[200px]">Apellido y Nombre</TableHead>
                                <TableHead className="w-[220px]">Ausencia</TableHead>
                                {activePhases.map(phase => (
                                    <TableHead key={phase.id} className="w-[120px] text-center">{phase.name}</TableHead>
                                ))}
                                <TableHead className="w-[150px] text-center">Horas Improductivas</TableHead>
                                <TableHead className="w-[120px] text-center font-bold text-foreground">Horas Totales</TableHead>
                                <TableHead className="w-[150px] text-center">Horas Especiales</TableHead>
                                <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {personnelForTable.length > 0 ? (
                                personnelForTable.map(emp => {
                                const entry = laborEntries[emp.id] || { productiveHours: {}, unproductiveHours: {}, absenceReason: null, specialHours: {} };
                                const hasAbsence = !!entry.absenceReason;
                                
                                const totalProductive = Object.values(entry.productiveHours).reduce((acc, h) => acc + (h || 0), 0);
                                const totalUnproductive = Object.values(entry.unproductiveHours).reduce((acc, h) => acc + (h || 0), 0);
                                const totalHours = totalProductive + totalUnproductive;
                                const hasHours = totalHours > 0;
                                const totalSpecialHours = Object.values(entry.specialHours).reduce((acc, h) => acc + (h || 0), 0);

                                const isManual = entry.manual === true;
                                
                                const hasOvertimeWarning = totalHours > 12;

                                const permissionAbsenceId = permissionsForDate.get(emp.id);
                                const isAbsenceFromPermission = !!permissionAbsenceId && entry.absenceReason === permissionAbsenceId;

                                return (
                                <TableRow key={emp.id} className={cn(
                                    isManual ? "bg-accent/50" : "",
                                    hasOvertimeWarning ? "bg-destructive/10" : ""
                                )}>
                                    <TableCell className="font-mono sticky left-0 bg-background z-10">{emp.internalNumber}</TableCell>
                                    <TableCell className="font-medium sticky left-[70px] bg-background z-10">
                                      <div className="flex items-center gap-2">
                                          {`${emp.lastName}, ${emp.firstName}`}
                                          {isManual && (
                                          <Tooltip>
                                              <TooltipTrigger>
                                              <UserPlus className="h-4 w-4 text-primary" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                              <p>Empleado agregado manualmente</p>
                                              </TooltipContent>
                                          </Tooltip>
                                          )}
                                          {hasOvertimeWarning && (
                                              <Tooltip>
                                                  <TooltipTrigger>
                                                      <AlertTriangle className="h-4 w-4 text-destructive" />
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Advertencia: Más de 12 horas cargadas.</p>
                                                  </TooltipContent>
                                              </Tooltip>
                                          )}
                                      </div>
                                    </TableCell>
                                     <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Select
                                              value={entry.absenceReason ?? "NONE"}
                                              onValueChange={(value) => handleAbsenceChange(emp.id, value)}
                                              disabled={isPending || hasHours}
                                          >
                                              <SelectTrigger>
                                                  <SelectValue placeholder="Seleccionar motivo..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="NONE">-</SelectItem>
                                                  {absenceTypesForProject.map(reason => (
                                                      <SelectItem key={reason.id} value={reason.id}>
                                                          {reason.name}
                                                      </SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                          {isAbsenceFromPermission && (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Info className="h-4 w-4 text-primary" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Ausencia sugerida automáticamente por un permiso aprobado.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
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
                                                    <Hourglass className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Editar horas improductivas para {`${emp.lastName}, ${emp.firstName}`}</p>
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
                                                <p>Editar horas especiales para {`${emp.lastName}, ${emp.firstName}`}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end items-center">
                                        {canMoveEmployee && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => handleOpenMoveDialog(emp)}
                                                  disabled={isPending}
                                              >
                                                  <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                                                  <span className="sr-only">Mover empleado</span>
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Mover a otra cuadrilla</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
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
                                                        <span className="sr-only">Quitar empleado</span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Quitar de este parte</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                      </div>
                                    </TableCell>
                                </TableRow>
                                )})
                            ) : (
                                <TableRow>
                                <TableCell colSpan={8 + activePhases.length} className="h-24 text-center">
                                    Esta cuadrilla no tiene personal asignado o no se han cargado partes para este día.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row justify-between items-center mt-4 p-4 border-t gap-4">
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setIsAddEmployeeDialogOpen(true)} disabled={isPending || !canAddManual}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Agregar Empleado
                        </Button>
                        {canDelete && hasExistingReport && (
                            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isPending}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Parte
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedCrewId && selectedCrewId !== 'all' && crewOptions.some(o => o.value === 'all') && (
                            <Button variant="outline" onClick={() => setSelectedCrewId('all')} disabled={isPending}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver
                            </Button>
                        )}
                         {canApproveControl && approvalSettings.requiresControl && (
                            <Button disabled={isPending}>Aprobar (C&G)</Button>
                        )}
                        {canApprovePM && approvalSettings.requiresPM && (
                            <Button disabled={isPending}>Aprobar (PM)</Button>
                        )}
                        <Button onClick={handleSave} disabled={isPending || !selectedCrewId || !canSave}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar
                        </Button>
                        <Button onClick={handleOpenNotifyDialog} disabled={isPending || !selectedCrewId || !canNotify}>
                            <Send className="mr-2 h-4 w-4" />
                            Notificar
                        </Button>
                    </div>
                </div>
            </fieldset>
          </div>
        ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Seleccione un proyecto y una cuadrilla para ver al personal.</p>
            </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Empleado Manualmente</DialogTitle>
          <DialogDescription>
            Seleccione un empleado para agregarlo a este parte diario. Solo se guardará cuando presione "Guardar Parte".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="employee-to-add">Empleado</Label>
          <Combobox
            options={availableEmployeesForManualAdd}
            value={employeeToAdd}
            onValueChange={setEmployeeToAdd}
            placeholder="Seleccione un empleado"
            searchPlaceholder="Buscar por nombre o legajo..."
            emptyMessage="No hay más empleados disponibles."
          />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
          <Button onClick={handleAddManualEmployee} disabled={!employeeToAdd || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <Dialog open={!!employeeToMove} onOpenChange={(open) => !open && setEmployeeToMove(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mover Empleado</DialogTitle>
                <DialogDescription>
                    Mover a <strong>{employeeToMove?.lastName}, {employeeToMove?.firstName}</strong> a otra cuadrilla para la fecha <strong>{displayDate}</strong>. Esta acción quitará al empleado del parte actual y creará una entrada en blanco en el parte de destino.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="destination-crew">Cuadrilla de Destino</Label>
                <Select value={destinationCrewId} onValueChange={setDestinationCrewId}>
                    <SelectTrigger id="destination-crew">
                        <SelectValue placeholder="Seleccione una cuadrilla" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableCrewsForMove.length > 0 ? (
                            availableCrewsForMove.map(crew => (
                                <SelectItem key={crew.value} value={crew.value}>{crew.label}</SelectItem>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No hay otras cuadrillas disponibles para mover.
                            </div>
                        )}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                <Button onClick={handleMoveEmployee} disabled={isPending || !destinationCrewId}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mover
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <AlertDialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Notificar y cerrar el parte diario?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción es irreversible. Once notificado, el parte diario para la cuadrilla <strong>{selectedCrew?.name}</strong> en la fecha <strong>{displayDate}</strong> no podrá ser modificado. Asegúrese de que todos los datos son correctos.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsNotifyDialogOpen(false)} disabled={isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleNotify} 
                    disabled={isPending}
                    className={buttonVariants({ variant: "default" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, notificar y cerrar"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar el parte diario completo?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción es irreversible. Se eliminarán permanentemente todas las horas y ausencias cargadas para la cuadrilla <strong>{selectedCrew?.name}</strong> en la fecha <strong>{displayDate}</strong>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleDeleteDailyReport} 
                    disabled={isPending}
                    className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar parte"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog open={specialHoursModalState.isOpen} onOpenChange={(isOpen) => setSpecialHoursModalState({ isOpen, employee: isOpen ? specialHoursModalState.employee : null })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Horas Especiales</DialogTitle>
          <DialogDescription>
            Registre las horas especiales para {`${specialHoursModalState.employee?.lastName}, ${specialHoursModalState.employee?.firstName}`} en la fecha {displayDate}. El total no puede exceder las horas totales trabajadas.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid gap-4">
          <div className="grid grid-cols-2 items-center gap-4 rounded-lg border p-4 bg-muted/50">
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Horas Totales Trabajadas</p>
                <p className="text-2xl font-bold">{totalHoursForModal} hs</p>
             </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Horas Especiales</p>
                <p className="text-2xl font-bold">{Object.values(modalSpecialHours).reduce((acc, h) => acc + (h || 0), 0)} hs</p>
             </div>
          </div>
          {specialHourTypesForProject.length > 0 ? specialHourTypesForProject.map(sht => (
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
          )) : (
            <p className="text-center text-sm text-muted-foreground">Este proyecto no tiene tipos de horas especiales configurados.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSpecialHoursModalState({ isOpen: false, employee: null })}>Cancelar</Button>
          <Button onClick={handleSaveSpecialHours}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={unproductiveHoursModalState.isOpen} onOpenChange={(isOpen) => setUnproductiveHoursModalState({ isOpen, employee: isOpen ? unproductiveHoursModalState.employee : null })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Horas Improductivas</DialogTitle>
          <DialogDescription>
            Registre las horas improductivas para {`${unproductiveHoursModalState.employee?.lastName}, ${unproductiveHoursModalState.employee?.firstName}`} en la fecha {displayDate}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid gap-4">
          <div className="grid grid-cols-2 items-center gap-4 rounded-lg border p-4 bg-muted/50">
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Horas Productivas Totales</p>
                <p className="text-2xl font-bold">{totalProductiveHoursForModal} hs</p>
             </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Horas Improductivas</p>
                <p className="text-2xl font-bold">{Object.values(modalUnproductiveHours).reduce((acc, h) => acc + (h || 0), 0)} hs</p>
             </div>
          </div>
          {unproductiveHourTypesForProject.length > 0 ? unproductiveHourTypesForProject.map(uht => (
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
          )) : (
            <p className="text-center text-sm text-muted-foreground">Este proyecto no tiene tipos de horas improductivas configurados.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setUnproductiveHoursModalState({ isOpen: false, employee: null })}>Cancelar</Button>
          <Button onClick={handleSaveUnproductiveHours}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <Dialog open={mobileHoursModalState.isOpen} onOpenChange={(isOpen) => setMobileHoursModalState({ ...mobileHoursModalState, isOpen })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Cargar Novedades</DialogTitle>
                <DialogDescription>
                    Para {`${mobileHoursModalState.employee?.lastName}, ${mobileHoursModalState.employee?.firstName}`} en la fecha {displayDate}.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
                <div className="p-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Ausencia</Label>
                        <Select
                            value={mobileHoursModalState.absence ?? 'NONE'}
                            onValueChange={(value) => setMobileHoursModalState(p => ({ ...p, absence: value === 'NONE' ? null : value, productive: {}, unproductive: {} }))}
                            disabled={isPending}
                        >
                            <SelectTrigger><SelectValue placeholder="Seleccionar motivo..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">Sin Ausencia (trabajó)</SelectItem>
                                {absenceTypesForProject.map(reason => (
                                    <SelectItem key={reason.id} value={reason.id}>{reason.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {!mobileHoursModalState.absence && (
                        <>
                             <div>
                                <h4 className="font-medium mb-2">Horas Productivas</h4>
                                <div className="space-y-2 rounded-md border p-2">
                                    {activePhases.length > 0 ? activePhases.map(phase => (
                                        <div key={phase.id} className="flex items-center justify-between">
                                            <Label htmlFor={`mobile-prod-${phase.id}`} className="flex-1">{phase.name}</Label>
                                            <Input
                                                id={`mobile-prod-${phase.id}`}
                                                type="number"
                                                className="w-24 text-center"
                                                placeholder="-"
                                                value={mobileHoursModalState.productive[phase.id] ?? ""}
                                                onChange={(e) => setMobileHoursModalState(p => ({ ...p, productive: {...p.productive, [phase.id]: e.target.value === '' ? null : parseFloat(e.target.value)} }))}
                                                step="0.5" min="0"
                                            />
                                        </div>
                                    )) : <p className="text-center text-sm text-muted-foreground p-2">No hay fases activas.</p>}
                                </div>
                             </div>
                             <div>
                                <h4 className="font-medium mb-2">Horas Improductivas</h4>
                                <div className="space-y-2 rounded-md border p-2">
                                     {unproductiveHourTypesForProject.length > 0 ? unproductiveHourTypesForProject.map(type => (
                                        <div key={type.id} className="flex items-center justify-between">
                                            <Label htmlFor={`mobile-unprod-${type.id}`} className="flex-1">{type.name}</Label>
                                            <Input
                                                id={`mobile-unprod-${type.id}`}
                                                type="number"
                                                className="w-24 text-center"
                                                placeholder="-"
                                                value={mobileHoursModalState.unproductive[type.id] ?? ""}
                                                onChange={(e) => setMobileHoursModalState(p => ({ ...p, unproductive: {...p.unproductive, [type.id]: e.target.value === '' ? null : parseFloat(e.target.value)} }))}
                                                step="0.5" min="0"
                                            />
                                        </div>
                                    )) : <p className="text-center text-sm text-muted-foreground p-2">No hay tipos improductivos.</p>}
                                </div>
                             </div>
                        </>
                    )}
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={() => setMobileHoursModalState({ ...mobileHoursModalState, isOpen: false })}>Cancelar</Button>
                <Button onClick={handleSaveMobileHours}>Guardar Novedades</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </TooltipProvider>
  );
}
