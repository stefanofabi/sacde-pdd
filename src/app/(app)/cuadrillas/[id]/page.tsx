
'use client';

import { useState, useTransition, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelectCombobox, type ComboboxOption } from "@/components/ui/multi-select-combobox";
import { Loader2, ArrowLeft, Plus, X, Search, CalendarIcon, ArrowRightLeft, AlertTriangle, Save, Clock, UserX, Sparkles } from "lucide-react";
import type { Crew, Project, Employee, Phase, CrewPhaseAssignment, DailyLaborData, DailyLaborEntry, LegacyDailyLaborEntry, AbsenceType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { format, endOfMonth, isWithinInterval, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Line } from 'recharts';


const emptyForm: Omit<Crew, 'id'> = {
    name: "",
    projectId: "",
    foremanId: "",
    substituteForemanIds: [],
    tallymanId: "",
    substituteTallymanIds: [],
    projectManagerId: "",
    substituteProjectManagerIds: [],
    controlAndManagementId: "",
    substituteControlAndManagementIds: [],
    employeeIds: [],
    assignedPhases: [],
};

const getCurrentFortnight = (): DateRange => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    if (day <= 15) {
        return { from: new Date(year, month, 1), to: new Date(year, month, 15) };
    } else {
        return { from: new Date(year, month, 16), to: endOfMonth(today) };
    }
};

export default function CrewFormPage() {
    const { id: crewId } = useParams();
    const router = useRouter();
    const isNewCrew = crewId === "nueva";

    const { toast } = useToast();
    const { user } = useAuth();
    
    const [allCrews, setAllCrews] = useState<Crew[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [allPhases, setAllPhases] = useState<Phase[]>([]);
    const [allLaborData, setAllLaborData] = useState<DailyLaborData>({});
    const [allAbsenceTypes, setAllAbsenceTypes] = useState<AbsenceType[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("info");

    const [formState, setFormState] = useState<Omit<Crew, 'id'>>(emptyForm);
    const [personnelSearchTerm, setPersonnelSearchTerm] = useState("");
    const [phaseAssignment, setPhaseAssignment] = useState<{phaseId: string; startDate?: Date; endDate?: Date}>({ phaseId: "" });
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(getCurrentFortnight());

    const [isPending, startTransition] = useTransition();
  
    const canEditInfo = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('crews.editInfo'), [user]);
    const canAssignPhase = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('crews.assignPhase'), [user]);
    const canManagePersonnel = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('crews.managePersonnel'), [user]);
    const canSave = canEditInfo || canAssignPhase || canManagePersonnel;
  
    const phaseMap = useMemo(() => new Map(allPhases.map(p => [p.id, p])), [allPhases]);
    const projectMap = useMemo(() => new Map(allProjects.map(p => [p.id, p.name])), [allProjects]);
  
    const employeeAssignments = useMemo(() => {
        const assignments = new Map<string, string[]>();
        for (const crew of allCrews) {
            for (const empId of crew.employeeIds) {
                if (!assignments.has(empId)) {
                    assignments.set(empId, []);
                }
                assignments.get(empId)!.push(crew.name);
            }
        }
        return assignments;
    }, [allCrews]);
  
    useEffect(() => {
        async function fetchInitialData() {
            setLoading(true);
            try {
                const [
                    crewsSnapshot, 
                    projectsSnapshot, 
                    employeesSnapshot, 
                    phasesSnapshot,
                    laborSnapshot,
                    absenceTypesSnapshot
                ] = await Promise.all([
                    getDocs(collection(db, 'crews')),
                    getDocs(collection(db, 'projects')),
                    getDocs(collection(db, 'employees')),
                    getDocs(collection(db, 'phases')),
                    getDocs(collection(db, 'daily-labor')),
                    getDocs(collection(db, 'absence-types')),
                ]);

                const crewsData = crewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Crew[];
                setAllCrews(crewsData);
                setAllProjects(projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[]);
                setAllEmployees(employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[]);
                setAllPhases(phasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Phase[]);
                setAllAbsenceTypes(absenceTypesSnapshot.docs.map(d => ({id: d.id, ...d.data()})) as AbsenceType[]);

                const laborData: DailyLaborData = {};
                laborSnapshot.docs.forEach(doc => {
                    const entry = { id: doc.id, ...doc.data() } as { date: string } & (DailyLaborEntry | LegacyDailyLaborEntry);
                    const { date, ...rest } = entry;
                    if (!laborData[date]) {
                        laborData[date] = [];
                    }
                    laborData[date].push(rest);
                });
                setAllLaborData(laborData);

                if (!isNewCrew) {
                    const crewDoc = crewsData.find(c => c.id === crewId);
                    if (crewDoc) {
                        setFormState({
                            ...emptyForm,
                            ...crewDoc,
                            tallymanId: crewDoc.tallymanId || "",
                            assignedPhases: (crewDoc.assignedPhases || []).map(p => ({
                                ...p,
                                startDate: p.startDate,
                                endDate: p.endDate
                            }))
                        });
                    } else {
                        toast({ title: "Error", description: "Cuadrilla no encontrada.", variant: "destructive" });
                        router.push("/cuadrillas");
                    }
                } else {
                    setFormState(emptyForm);
                }
            } catch (error) {
                console.error("Error fetching data for crew form:", error);
                toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        fetchInitialData();
    }, [crewId, isNewCrew, router, toast]);

    const stats = useMemo(() => {
        let totalHours = 0;
        let totalSpecialHours = 0;
        let totalAbsences = 0;
        const dailyHoursData: Record<string, number> = {};

        if (!selectedDateRange?.from || !selectedDateRange?.to || isNewCrew) {
            return { totalHours, totalSpecialHours, totalAbsences, chartData: [] };
        }

        const crewEmployeeIds = new Set(formState.employeeIds);

        // Initialize all days in the range with 0 hours
        const daysInInterval = eachDayOfInterval({ start: selectedDateRange.from, end: selectedDateRange.to });
        daysInInterval.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            dailyHoursData[dateKey] = 0;
        });

        Object.entries(allLaborData).forEach(([dateKey, entries]) => {
            const entryDate = new Date(dateKey + 'T00:00:00');
            if (!isWithinInterval(entryDate, { start: selectedDateRange.from!, end: selectedDateRange.to! })) {
                return;
            }

            entries.forEach(entry => {
                if (crewEmployeeIds.has(entry.employeeId)) {
                     if (entry.absenceReason) {
                        totalAbsences++;
                     } else {
                        let productive = 0;
                        let unproductive = 0;
                        let special = 0;
                        
                        if ('productiveHours' in entry && entry.productiveHours) {
                            productive = Object.values(entry.productiveHours).reduce((sum, h) => sum + (h || 0), 0);
                            unproductive = Object.values(entry.unproductiveHours).reduce((sum, h) => sum + (h || 0), 0);
                            special = Object.values(entry.specialHours || {}).reduce((sum, h) => sum + (h || 0), 0);
                        } else {
                            const legacyEntry = entry as LegacyDailyLaborEntry;
                            if (legacyEntry.hours && legacyEntry.hours > 0) {
                                productive = legacyEntry.hours;
                            }
                            if (legacyEntry.specialHours) {
                                special = Object.values(legacyEntry.specialHours).reduce((sum, h) => sum + (h || 0), 0);
                            }
                        }
                        const dailyTotal = productive + unproductive;
                        totalHours += dailyTotal;
                        totalSpecialHours += special;
                        if(dailyHoursData[dateKey] !== undefined) {
                            dailyHoursData[dateKey] += dailyTotal;
                        }
                     }
                }
            });
        });
        
        const chartData = Object.entries(dailyHoursData)
          .map(([date, totalHours]) => ({
            date: format(new Date(date + 'T00:00:00'), 'dd/MM'),
            'Horas Totales': totalHours,
          }))
          .sort((a,b) => a.date.localeCompare(b.date));

        return { totalHours, totalSpecialHours, totalAbsences, chartData };
    }, [allLaborData, formState.employeeIds, selectedDateRange, isNewCrew]);


    const employeeOptions = useMemo(() => {
      return allEmployees.map(emp => ({
          value: emp.id,
          label: `${emp.nombre} ${emp.apellido} (L: ${emp.legajo}${emp.cuil ? `, C: ${emp.cuil}` : ''})`
      }));
    }, [allEmployees]);
  
    const phaseOptions = useMemo(() => {
      return allPhases.map(phase => ({
          value: phase.id,
          label: `${phase.name} (${phase.pepElement})`
      }));
    }, [allPhases]);
  
    const jornalEmployees = useMemo(() => {
      return allEmployees.filter(emp => emp.condicion === 'jornal' && emp.estado === 'activo');
    }, [allEmployees]);
  
    const availablePersonnel = useMemo(() => {
      const lowerCaseSearch = personnelSearchTerm.toLowerCase().trim();
      if (!lowerCaseSearch) {
          return [];
      }
      return jornalEmployees
          .filter(emp => {
              const isNotAssigned = !formState.employeeIds.includes(emp.id);
              if (!isNotAssigned) return false;
  
              const fullName = `${emp.nombre} ${emp.apellido}`.toLowerCase();
              const legajo = emp.legajo;
              
              return fullName.includes(lowerCaseSearch) || 
                     legajo.includes(lowerCaseSearch) ||
                     (emp.cuil && emp.cuil.includes(lowerCaseSearch));
          });
    }, [jornalEmployees, formState.employeeIds, personnelSearchTerm]);
  
    const assignedPersonnel = useMemo(() => {
      return jornalEmployees.filter(emp => formState.employeeIds.includes(emp.id));
    }, [jornalEmployees, formState.employeeIds]);
    
    const handleInputChange = (field: keyof Omit<Crew, 'id'>, value: any) => {
      setFormState(prev => ({ ...prev, [field]: value }));
    };
  
    const handleAddPhaseAssignment = () => {
      const { phaseId, startDate, endDate } = phaseAssignment;
      if (!phaseId || !startDate || !endDate) return;
  
      if (endDate < startDate) {
          toast({
              title: "Error de validación",
              description: "La fecha de fin no puede ser anterior a la de inicio.",
              variant: "destructive"
          });
          return;
      }
  
      const newAssignment: CrewPhaseAssignment = {
          id: crypto.randomUUID(),
          phaseId,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
      };
      
      handleInputChange('assignedPhases', [...(formState.assignedPhases || []), newAssignment]);
      setPhaseAssignment({ phaseId: "" });
    };
  
    const handleRemovePhaseAssignment = (assignmentId: string) => {
      handleInputChange('assignedPhases', (formState.assignedPhases || []).filter(p => p.id !== assignmentId));
    };
  
    const handleSaveCrew = () => {
        const { name, projectId, foremanId, projectManagerId, controlAndManagementId } = formState;
        if (!name.trim() || !projectId || !foremanId || !projectManagerId || !controlAndManagementId) {
            toast({
                title: "Error de validación",
                description: "Debe completar todos los campos obligatorios (Nombre, Proyecto, Capataz, Jefe de Proyecto, Control y Gestión).",
                variant: "destructive",
            });
            return;
        }

        startTransition(async () => {
            try {
                // @ts-ignore - The assignedPhases might have Date objects, need to format them back to strings if they are dates
                const dataToSave = {
                    ...formState,
                    assignedPhases: (formState.assignedPhases || []).map(p => ({
                        ...p,
                        startDate: typeof p.startDate === 'string' ? p.startDate : format(p.startDate, "yyyy-MM-dd"),
                        endDate: typeof p.endDate === 'string' ? p.endDate : format(p.endDate, "yyyy-MM-dd"),
                    }))
                };

                if (isNewCrew) {
                    const docRef = await addDoc(collection(db, "crews"), dataToSave);
                    toast({ title: "Cuadrilla creada", description: `La cuadrilla "${dataToSave.name}" ha sido creada.` });
                    router.push(`/cuadrillas/${docRef.id}`);
                } else {
                    const docRef = doc(db, "crews", crewId as string);
                    await updateDoc(docRef, dataToSave);
                    toast({ title: "Cuadrilla actualizada", description: `La cuadrilla "${dataToSave.name}" ha sido actualizada.` });
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "No se pudo guardar la cuadrilla.",
                    variant: "destructive",
                });
            }
        });
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
  
    return (
        <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <TooltipProvider>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Button variant="outline" size="icon" onClick={() => router.push('/cuadrillas')}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div>
                                    <CardTitle>{isNewCrew ? "Agregar Nueva Cuadrilla" : `Editando: ${formState.name}`}</CardTitle>
                                    <CardDescription>
                                        Complete los detalles de la cuadrilla y asigne el personal necesario.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="info">Información General</TabsTrigger>
                                    <TabsTrigger value="responsibles">Responsables</TabsTrigger>
                                    <TabsTrigger value="phases">Fases Asignadas</TabsTrigger>
                                    <TabsTrigger value="stats" disabled={isNewCrew}>Estadísticas</TabsTrigger>
                                </TabsList>
                                <TabsContent value="info" className="py-6 space-y-8">
                                    <fieldset disabled={isPending || !canEditInfo} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="crew-name">Nombre *</Label>
                                                <Input id="crew-name" value={formState.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Ej. Equipo de Montaje"/>
                                            </div>
                                            <div>
                                                <Label htmlFor="crew-project">Proyecto *</Label>
                                                <Select onValueChange={(value) => handleInputChange('projectId', value)} value={formState.projectId}>
                                                <SelectTrigger><SelectValue placeholder="Seleccione un proyecto" /></SelectTrigger>
                                                <SelectContent>
                                                    {allProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                                                </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </fieldset>
                                    <Separator />
                                    <fieldset disabled={isPending || !canManagePersonnel}>
                                        <h3 className="font-semibold text-lg mb-4">Personal de Obra</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-72">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-semibold text-sm">Personal Disponible <Badge variant="outline">Jornal Activo</Badge></h4>
                                                    {personnelSearchTerm && <Badge variant="secondary">{availablePersonnel.length} encontrados</Badge>}
                                                </div>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input id="personnel-search" placeholder="Buscar por nombre, legajo o CUIL..." value={personnelSearchTerm} onChange={(e) => setPersonnelSearchTerm(e.target.value)} className="pl-10 h-9" />
                                                </div>
                                                <ScrollArea className="flex-1 rounded-md border p-2">
                                                    {availablePersonnel.length > 0 ? availablePersonnel.map(emp => (
                                                        <div key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                                            <div>
                                                                <p className="font-medium">{allEmployees.find(e => e.id === emp.id)?.apellido}, {allEmployees.find(e => e.id === emp.id)?.nombre}</p>
                                                                <p className="text-xs text-muted-foreground">L: {emp.legajo}</p>
                                                            </div>
                                                            <Button size="icon" variant="outline" onClick={() => handleInputChange('employeeIds', [...formState.employeeIds, emp.id])}><Plus className="h-4 w-4" /></Button>
                                                        </div>
                                                    )) : <div className="text-center text-sm text-muted-foreground py-4">{personnelSearchTerm ? "No se encontraron empleados." : "Escriba para buscar personal."}</div>}
                                                </ScrollArea>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <h4 className="font-semibold text-sm">Personal Asignado ({assignedPersonnel.length})</h4>
                                                <div className="h-9" />
                                                <ScrollArea className="flex-1 rounded-md border p-2">
                                                    {assignedPersonnel.length > 0 ? assignedPersonnel.map(emp => {
                                                        const assignments = employeeAssignments.get(emp.id) || [];
                                                        const isDuplicate = assignments.length > 0 && !assignments.every(cName => cName === formState.name);
                                                        return (
                                                            <div key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                                                <div className="flex items-center gap-2">
                                                                    <div>
                                                                        <p className="font-medium">{allEmployees.find(e => e.id === emp.id)?.apellido}, {allEmployees.find(e => e.id === emp.id)?.nombre}</p>
                                                                        <p className="text-xs text-muted-foreground">L: {emp.legajo}</p>
                                                                    </div>
                                                                    {isDuplicate && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger><AlertTriangle className="h-4 w-4 text-destructive" /></TooltipTrigger>
                                                                            <TooltipContent><p>También asignado en: {assignments.filter(cName => cName !== formState.name).join(', ')}</p></TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <Button size="icon" variant="ghost" disabled><ArrowRightLeft className="h-4 w-4" /></Button>
                                                                    <Button size="icon" variant="destructive" onClick={() => handleInputChange('employeeIds', formState.employeeIds.filter(id => id !== emp.id))}><X className="h-4 w-4" /></Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    }) : <div className="text-center text-sm text-muted-foreground py-4">No hay personal asignado.</div>}
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </fieldset>
                                </TabsContent>
                                <TabsContent value="responsibles" className="py-6">
                                    <fieldset disabled={isPending || !canEditInfo} className="space-y-6">
                                        {/* Capataz */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="crew-capataz">Capataz (Titular) *</Label>
                                                <Combobox options={employeeOptions} value={formState.foremanId} onValueChange={(v) => handleInputChange('foremanId', v)} placeholder="Seleccione un titular" />
                                            </div>
                                            <div>
                                                <Label htmlFor="crew-capataz-suplentes">Capataz (Suplentes)</Label>
                                                <MultiSelectCombobox options={employeeOptions} selected={formState.substituteForemanIds} onChange={(v) => handleInputChange('substituteForemanIds', v)} placeholder="Seleccione suplentes" />
                                            </div>
                                        </div>
                                        {/* Apuntador */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="crew-apuntador">Apuntador (Titular)</Label>
                                                <Combobox options={employeeOptions} value={formState.tallymanId} onValueChange={(v) => handleInputChange('tallymanId', v)} placeholder="Seleccione un titular" />
                                            </div>
                                            <div>
                                                <Label htmlFor="crew-apuntador-suplentes">Apuntador (Suplentes)</Label>
                                                <MultiSelectCombobox options={employeeOptions} selected={formState.substituteTallymanIds} onChange={(v) => handleInputChange('substituteTallymanIds', v)} placeholder="Seleccione suplentes" />
                                            </div>
                                        </div>
                                        {/* Jefe de Obra */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="crew-jefe">Jefe de Proyecto (Titular) *</Label>
                                                <Combobox options={employeeOptions} value={formState.projectManagerId} onValueChange={(v) => handleInputChange('projectManagerId', v)} placeholder="Seleccione un titular" />
                                            </div>
                                            <div>
                                                <Label htmlFor="crew-jefe-suplentes">Jefe de Proyecto (Suplentes)</Label>
                                                <MultiSelectCombobox options={employeeOptions} selected={formState.substituteProjectManagerIds} onChange={(v) => handleInputChange('substituteProjectManagerIds', v)} placeholder="Seleccione suplentes" />
                                            </div>
                                        </div>
                                        {/* Control y Gestion */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="crew-control">Control y Gestión (Titular) *</Label>
                                                <Combobox options={employeeOptions} value={formState.controlAndManagementId} onValueChange={(v) => handleInputChange('controlAndManagementId', v)} placeholder="Seleccione un titular" />
                                            </div>
                                            <div>
                                                <Label htmlFor="crew-control-suplentes">Control y Gestión (Suplentes)</Label>
                                                <MultiSelectCombobox options={employeeOptions} selected={formState.substituteControlAndManagementIds} onChange={(v) => handleInputChange('substituteControlAndManagementIds', v)} placeholder="Seleccione suplentes" />
                                            </div>
                                        </div>
                                    </fieldset>
                                </TabsContent>
                                <TabsContent value="phases" className="py-6">
                                    <fieldset disabled={isPending || !canAssignPhase}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4 rounded-md border p-4">
                                                <h4 className="font-semibold text-sm">Asignar Fases</h4>
                                                <div className="space-y-2">
                                                    <Label htmlFor="phase-id">Fase</Label>
                                                    <Combobox options={phaseOptions} value={phaseAssignment.phaseId} onValueChange={(value) => setPhaseAssignment(p => ({...p, phaseId: value}))} placeholder="Seleccione una fase" searchPlaceholder="Buscar fase..." emptyMessage="Fase no encontrada." />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Fecha Inicio</Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{phaseAssignment.startDate ? format(phaseAssignment.startDate, 'PPP', { locale: es }) : <span>Seleccione fecha</span>}</Button></PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={phaseAssignment.startDate} onSelect={(d) => setPhaseAssignment(p => ({...p, startDate: d}))} initialFocus locale={es} /></PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Fecha Fin</Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{phaseAssignment.endDate ? format(phaseAssignment.endDate, 'PPP', { locale: es }) : <span>Seleccione fecha</span>}</Button></PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={phaseAssignment.endDate} onSelect={(d) => setPhaseAssignment(p => ({...p, endDate: d}))} initialFocus locale={es} /></PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </div>
                                                <Button onClick={handleAddPhaseAssignment} className="w-full" disabled={!phaseAssignment.phaseId || !phaseAssignment.startDate || !phaseAssignment.endDate}><Plus className="mr-2 h-4 w-4" /> Agregar Fase</Button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <h4 className="font-semibold text-sm">Fases Asignadas ({(formState.assignedPhases || []).length})</h4>
                                                <ScrollArea className="flex-1 h-60 rounded-md border p-2">
                                                    {(formState.assignedPhases || []).length > 0 ? (formState.assignedPhases || []).map(p => (
                                                        <div key={p.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                                            <div>
                                                                <p className="font-medium">{phaseMap.get(p.phaseId)?.name}</p>
                                                                <p className="text-xs text-muted-foreground">{format(new Date(p.startDate), 'P', {locale: es})} - {format(new Date(p.endDate), 'P', {locale: es})}</p>
                                                            </div>
                                                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleRemovePhaseAssignment(p.id)}><X className="h-4 w-4" /><span className="sr-only">Quitar fase {phaseMap.get(p.phaseId)?.name}</span></Button>
                                                        </div>
                                                    )) : <div className="text-center text-sm text-muted-foreground py-4">No hay fases asignadas.</div>}
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </fieldset>
                                </TabsContent>
                                <TabsContent value="stats" className="py-6 space-y-6">
                                     <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Label>Seleccionar período:</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="date"
                                                        variant={"outline"}
                                                        className={cn(
                                                        "w-[300px] justify-start text-left font-normal",
                                                        !selectedDateRange && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {selectedDateRange?.from ? (
                                                        selectedDateRange.to ? (
                                                            <>
                                                            {format(selectedDateRange.from, "LLL dd, y", { locale: es })} -{" "}
                                                            {format(selectedDateRange.to, "LLL dd, y", { locale: es })}
                                                            </>
                                                        ) : (
                                                            format(selectedDateRange.from, "LLL dd, y", { locale: es })
                                                        )
                                                        ) : (
                                                        <span>Seleccione un rango</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        initialFocus
                                                        mode="range"
                                                        defaultMonth={selectedDateRange?.from}
                                                        selected={selectedDateRange}
                                                        onSelect={setSelectedDateRange}
                                                        numberOfMonths={2}
                                                        locale={es}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Horas en Período</CardTitle>
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{stats.totalHours.toFixed(2)} hs</div>
                                                    <p className="text-xs text-muted-foreground">Suma de horas productivas e improductivas.</p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Total Horas Especiales</CardTitle>
                                                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{stats.totalSpecialHours.toFixed(2)} hs</div>
                                                    <p className="text-xs text-muted-foreground">Suma de todas las horas especiales en el período.</p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Días de Ausentismo</CardTitle>
                                                    <UserX className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{stats.totalAbsences}</div>
                                                    <p className="text-xs text-muted-foreground">Total de ausencias en el período.</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Horas Totales por Día</CardTitle>
                                                <CardDescription>Evolución de horas trabajadas en el período seleccionado.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <LineChart data={stats.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis />
                                                        <RechartsTooltip />
                                                        <Legend />
                                                        <Line type="monotone" dataKey="Horas Totales" stroke="#8884d8" activeDot={{ r: 8 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                            
                            {activeTab !== 'stats' && (
                                <div className="flex justify-end pt-8 border-t">
                                    <Button type="submit" onClick={handleSaveCrew} disabled={isPending || !canSave}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isPending ? 'Guardando...' : (isNewCrew ? 'Crear Cuadrilla' : 'Guardar Cambios')}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TooltipProvider>
            </div>
        </main>
    );
}
