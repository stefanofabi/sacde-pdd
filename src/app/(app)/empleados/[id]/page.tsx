
'use client';

import { useState, useTransition, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, ArrowLeft, Save, CalendarIcon, User, Clock, UserX, Sparkles, Link as LinkIcon, FileSpreadsheet } from "lucide-react";
import type { Employee, Project, EmployeeCondition, EmployeeStatus, DailyLaborData, DailyReport, DailyLaborEntry, Permission, AbsenceType, Crew, Phase, UnproductiveHourType, SpecialHourType, EmployeeSex, EmployeePosition } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import Link from "next/link";
import * as XLSX from 'xlsx';
import { Combobox } from "@/components/ui/combobox";


const emptyForm = {
    internalNumber: "",
    identificationNumber: "",
    lastName: "",
    firstName: "",
    hireDate: undefined as Date | undefined,
    sex: "" as EmployeeSex,
    projectId: "",
    positionId: "",
    condition: "" as EmployeeCondition | "",
    status: "" as EmployeeStatus | "",
    phoneNumber: "",
    email: "",
};

interface HistoryEntry {
    date: string;
    project: string;
    projectId: string;
    crew: string;
    crewId: string;
    details: string;
    variant: 'destructive' | 'secondary' | 'default';
    hours: number | null;
}

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

export default function EmployeeFormPage() {
    const { id: employeeId } = useParams();
    const router = useRouter();
    const isNewEmployee = employeeId === "nuevo";

    const { toast } = useToast();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [formState, setFormState] = useState(emptyForm);
    const [isPending, startTransition] = useTransition();

    // Data for history and stats
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [allCrews, setAllCrews] = useState<Crew[]>([]);
    const [allPhases, setAllPhases] = useState<Phase[]>([]);
    const [allPositions, setAllPositions] = useState<EmployeePosition[]>([]);
    const [allUnproductiveTypes, setAllUnproductiveTypes] = useState<UnproductiveHourType[]>([]);
    const [allSpecialHourTypes, setAllSpecialHourTypes] = useState<SpecialHourType[]>([]);
    const [allAbsenceTypes, setAllAbsenceTypes] = useState<AbsenceType[]>([]);
    const [employeeLaborData, setEmployeeLaborData] = useState<DailyLaborEntry[]>([]);
    const [employeeDailyReports, setEmployeeDailyReports] = useState<DailyReport[]>([]);
    const [employeePermissions, setEmployeePermissions] = useState<Permission[]>([]);
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(getCurrentFortnight());

    const canManage = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('employees.manage'), [user]);
    const sortedProjects = useMemo(() => [...allProjects].sort((a,b) => a.name.localeCompare(b.name)), [allProjects]);
    const positionOptions = useMemo(() => allPositions.map(p => ({ value: p.id, label: `${p.name} (${p.code})`})).sort((a, b) => a.label.localeCompare(b.label)), [allPositions]);


    useEffect(() => {
        async function fetchInitialData() {
            setLoading(true);
            try {
                const [
                    projectsSnapshot, 
                    crewsSnapshot,
                    phasesSnapshot,
                    unproductiveTypesSnapshot,
                    absenceTypesSnapshot,
                    specialHourTypesSnapshot,
                    positionsSnapshot
                ] = await Promise.all([
                    getDocs(collection(db, 'projects')),
                    getDocs(collection(db, 'crews')),
                    getDocs(collection(db, 'phases')),
                    getDocs(collection(db, 'unproductive-hour-types')),
                    getDocs(collection(db, 'absence-types')),
                    getDocs(collection(db, 'special-hour-types')),
                    getDocs(collection(db, 'employee-positions')),
                ]);
                
                setAllProjects(projectsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Project[]);
                setAllCrews(crewsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Crew[]);
                setAllPhases(phasesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Phase[]);
                setAllUnproductiveTypes(unproductiveTypesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as UnproductiveHourType[]);
                setAllSpecialHourTypes(specialHourTypesSnapshot.docs.map(d => ({id: d.id, ...d.data()})) as SpecialHourType[]);
                setAllAbsenceTypes(absenceTypesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AbsenceType[]);
                setAllPositions(positionsSnapshot.docs.map(d => ({ id: d.id, ...d.data()})) as EmployeePosition[]);

                if (!isNewEmployee) {
                    const employeeDocRef = doc(db, 'employees', employeeId as string);
                    const laborQuery = query(collection(db, 'daily-labor'), where("employeeId", "==", employeeId));
                    const permissionsQuery = query(collection(db, 'permissions'), where("employeeId", "==", employeeId));

                    const [employeeDoc, laborSnapshot, permissionsSnapshot] = await Promise.all([
                        getDoc(employeeDocRef),
                        getDocs(laborQuery),
                        getDocs(permissionsQuery)
                    ]);

                    const laborData = laborSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as DailyLaborEntry[];
                    setEmployeeLaborData(laborData);
                    
                    const reportIds = [...new Set(laborData.map(l => l.dailyReportId))];
                    if(reportIds.length > 0) {
                        const reportsQuery = query(collection(db, 'daily-reports'), where('__name__', 'in', reportIds));
                        const reportsSnapshot = await getDocs(reportsQuery);
                        setEmployeeDailyReports(reportsSnapshot.docs.map(d => ({id: d.id, ...d.data()})) as DailyReport[]);
                    }
                    
                    setEmployeePermissions(permissionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Permission[]);

                    if (employeeDoc.exists()) {
                        const employeeData = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;
                         setFormState({
                            ...emptyForm,
                            ...employeeData,
                            hireDate: employeeData.hireDate ? new Date(employeeData.hireDate + 'T00:00:00') : undefined,
                        });
                    } else {
                        toast({ title: "Error", description: "Empleado no encontrado.", variant: "destructive" });
                        router.push("/empleados");
                    }
                } else {
                    setFormState(emptyForm);
                }
            } catch (error) {
                console.error("Error fetching data for employee form:", error);
                toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        fetchInitialData();
    }, [employeeId, isNewEmployee, router, toast]);


    const { totalHoursInPeriod, totalAbsences, totalSpecialHours, history } = useMemo(() => {
        let totalHoursInPeriod = 0;
        let totalSpecialHours = 0;
        let totalAbsences = 0;
        const history: HistoryEntry[] = [];
        
        const projectMap = new Map(allProjects.map(p => [p.id, p.name]));
        const crewMap = new Map(allCrews.map(c => [c.id, c.name]));
        const phaseMap = new Map(allPhases.map(p => [p.id, p.name]));
        const unproductiveMap = new Map(allUnproductiveTypes.map(p => [p.id, p.name]));
        const specialHourTypeMap = new Map(allSpecialHourTypes.map(sht => [sht.id, sht.name]));
        const absenceTypeMap = new Map(allAbsenceTypes.map(at => [at.id, at.name]));
        const isInPeriod = (date: Date) => selectedDateRange?.from && selectedDateRange?.to && isWithinInterval(date, { start: selectedDateRange.from, end: selectedDateRange.to });

        employeeLaborData.forEach(entry => {
            const dailyReport = employeeDailyReports.find(dr => dr.id === entry.dailyReportId);
            if (!dailyReport) return;
            const dateStr = dailyReport.date;
            if (!dateStr) return;
            const entryDate = new Date(dateStr + 'T00:00:00');
            
            const isEntryInPeriod = isInPeriod(entryDate);

            const projectId = dailyReport.projectId;
            const project = projectMap.get(projectId) || 'N/A';
            const crewId = dailyReport.crewId;
            const crew = crewMap.get(crewId) || 'N/A';
            
            if (entry.absenceReason) {
                if (isEntryInPeriod) {
                    totalAbsences++;
                    history.push({
                        date: dateStr, project, crew, projectId, crewId,
                        details: absenceTypeMap.get(entry.absenceReason) || 'Motivo desconocido',
                        variant: 'destructive',
                        hours: null
                    });
                }
            } else {
                let productive = Object.values(entry.productiveHours).reduce((sum, h) => sum + (h || 0), 0);
                let unproductive = Object.values(entry.unproductiveHours).reduce((sum, h) => sum + (h || 0), 0);
                let special = Object.values(entry.specialHours || {}).reduce((sum, h) => sum + (h || 0), 0);
                
                if (isEntryInPeriod) {
                    Object.entries(entry.productiveHours).forEach(([phaseId, hours]) => {
                        if (hours && hours > 0) {
                            history.push({ date: dateStr, project, crew, projectId, crewId, details: phaseMap.get(phaseId) || 'Fase desconocida', variant: 'secondary', hours });
                        }
                    });
                    Object.entries(entry.unproductiveHours).forEach(([typeId, hours]) => {
                        if (hours && hours > 0) {
                            history.push({ date: dateStr, project, crew, projectId, crewId, details: unproductiveMap.get(typeId) || 'Tipo desconocido', variant: 'secondary', hours });
                        }
                    });
                    Object.entries(entry.specialHours || {}).forEach(([typeId, hours]) => {
                        if (hours && hours > 0) {
                            history.push({ date: dateStr, project, crew, projectId, crewId, details: specialHourTypeMap.get(typeId) || 'Tipo especial desconocido', variant: 'default', hours });
                        }
                    });
                }
                
                if (isEntryInPeriod) {
                    totalHoursInPeriod += productive + unproductive;
                    totalSpecialHours += special;
                }
            }
        });

        return {
            totalHoursInPeriod,
            totalAbsences,
            totalSpecialHours,
            history: history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        };
    }, [employeeLaborData, employeeDailyReports, allProjects, allCrews, allPhases, allUnproductiveTypes, allAbsenceTypes, allSpecialHourTypes, selectedDateRange]);

    const handleInputChange = (field: keyof typeof emptyForm, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveEmployee = () => {
        const { internalNumber, lastName, firstName, projectId, positionId, condition, status, hireDate, sex } = formState;

        if (!internalNumber || !lastName || !firstName || !projectId || !positionId || !condition || !status || !hireDate || !sex) {
          toast({
            title: "Error de validación",
            description: "Debe completar todos los campos obligatorios (*).",
            variant: "destructive",
          });
          return;
        }

        if (!/^\d+$/.test(internalNumber)) {
            toast({
                title: "Error de validación",
                description: "El legajo solo debe contener números.",
                variant: "destructive",
            });
            return;
        }

        const employeeData = {
            ...formState,
            hireDate: format(hireDate, "yyyy-MM-dd"),
            condition: formState.condition as EmployeeCondition,
            status: formState.status as EmployeeStatus,
            sex: formState.sex as EmployeeSex,
        };

        startTransition(async () => {
          try {
            if (!isNewEmployee) {
               const docRef = doc(db, "employees", employeeId as string);
               await updateDoc(docRef, employeeData);
               toast({
                title: "Empleado actualizado",
                description: `El empleado "${employeeData.firstName} ${employeeData.lastName}" ha sido actualizado.`,
               });
               // No redirect, stay on page
            } else {
                const employeesRef = collection(db, 'employees');
                const q = query(employeesRef, where("internalNumber", "==", employeeData.internalNumber));
                const existing = await getDocs(q);
                if (!existing.empty) {
                    throw new Error('Ya existe un empleado con el mismo legajo.');
                }
                const docRef = await addDoc(employeesRef, employeeData);
                toast({
                  title: "Empleado agregado",
                  description: `El empleado "${employeeData.firstName} ${employeeData.lastName}" ha sido creado.`,
                });
                router.push(`/empleados/${docRef.id}`);
            }
          } catch (error) {
            toast({
              title: isNewEmployee ? "Error al agregar" : "Error al actualizar",
              description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
              variant: "destructive",
            });
          }
        });
    };
    
    const handleExport = () => {
        startTransition(() => {
            try {
                const dataToExport = history.map(item => ({
                    "Fecha": format(new Date(item.date + 'T00:00:00'), 'dd/MM/yyyy'),
                    "Proyecto": item.project,
                    "Cuadrilla": item.crew,
                    "Detalle de Novedad": item.details,
                    "Horas": item.hours !== null ? item.hours : 0
                }));
    
                if (dataToExport.length === 0) {
                    toast({
                        title: "No hay datos para exportar",
                        description: "No hay novedades en el período seleccionado.",
                    });
                    return;
                }
    
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
                
                const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
                    wch: Math.max(
                        key.length,
                        ...dataToExport.map(row => (row[key as keyof typeof row] ? String(row[key as keyof typeof row]).length : 0))
                    ) + 2
                }));
                worksheet['!cols'] = colWidths;
                
                XLSX.writeFile(workbook, `Historial_${formState.internalNumber}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
                toast({
                    title: "Exportación exitosa",
                    description: "El historial del empleado se ha descargado.",
                });
            } catch (error) {
                toast({
                    title: "Error al exportar",
                    description: "No se pudo generar el archivo Excel.",
                    variant: "destructive"
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
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => router.push('/empleados')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-6 w-6"/>
                                    {isNewEmployee ? "Agregar Nuevo Empleado" : `Perfil de: ${formState.lastName}, ${formState.firstName}`}
                                </CardTitle>
                                <CardDescription>
                                    {isNewEmployee ? "Complete los datos para registrar un nuevo empleado." : "Modifique la información y vea el historial del empleado."}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="edit" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="edit">Editar Información</TabsTrigger>
                                <TabsTrigger value="history" disabled={isNewEmployee}>Historial y Estadísticas</TabsTrigger>
                            </TabsList>

                            <TabsContent value="edit" className="py-6">
                                <div className="space-y-6">
                                    <fieldset disabled={isPending || !canManage}>
                                        <div>
                                        <h3 className="mb-4 text-lg font-medium leading-none">Información Personal</h3>
                                        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="internalNumber">Legajo *</Label>
                                                <Input 
                                                    id="internalNumber" 
                                                    value={formState.internalNumber} 
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (/^\d*$/.test(value)) {
                                                            handleInputChange('internalNumber', value);
                                                        }
                                                    }} 
                                                    placeholder="Ej. 12345" 
                                                    disabled={isPending || !isNewEmployee}
                                                    pattern="[0-9]*"
                                                    inputMode="numeric"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="identificationNumber">CUIL</Label>
                                                <Input id="identificationNumber" value={formState.identificationNumber} onChange={(e) => handleInputChange('identificationNumber', e.target.value)} placeholder="Ej. 20-12345678-9" disabled={isPending}/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastName">Apellido *</Label>
                                                <Input id="lastName" value={formState.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} placeholder="Pérez" disabled={isPending}/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName">Nombre *</Label>
                                                <Input id="firstName" value={formState.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} placeholder="Juan" disabled={isPending}/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="sex">Sexo *</Label>
                                                <Select onValueChange={(value: EmployeeSex) => handleInputChange('sex', value)} value={formState.sex} disabled={isPending}>
                                                    <SelectTrigger><SelectValue placeholder="Seleccione sexo" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="M">Masculino</SelectItem>
                                                        <SelectItem value="F">Femenino</SelectItem>
                                                        <SelectItem value="X">No binario</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        </div>

                                        <Separator className="my-6" />

                                        <div>
                                        <h3 className="mb-4 text-lg font-medium leading-none">Información Laboral</h3>
                                        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="hireDate">F. Ingreso *</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {formState.hireDate ? format(formState.hireDate, 'PPP', { locale: es }) : <span>Seleccione fecha</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={formState.hireDate} onSelect={(date) => handleInputChange('hireDate', date)} initialFocus locale={es} />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="projectId">Proyecto *</Label>
                                                <Select onValueChange={(value) => handleInputChange('projectId', value)} value={formState.projectId} disabled={isPending}>
                                                    <SelectTrigger><SelectValue placeholder="Seleccione un proyecto" /></SelectTrigger>
                                                    <SelectContent>{sortedProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="positionId">Posición *</Label>
                                                <Combobox
                                                    options={positionOptions}
                                                    value={formState.positionId}
                                                    onValueChange={(value) => handleInputChange('positionId', value)}
                                                    placeholder="Seleccione una posición"
                                                    searchPlaceholder="Buscar posición..."
                                                    emptyMessage="Posición no encontrada."
                                                    disabled={isPending}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="condition">Condición *</Label>
                                                <Select onValueChange={(value: EmployeeCondition) => handleInputChange('condition', value)} value={formState.condition} disabled={isPending}>
                                                    <SelectTrigger><SelectValue placeholder="Seleccione condición" /></SelectTrigger>
                                                    <SelectContent>
                                                    <SelectItem value="DAY">Jornal</SelectItem>
                                                    <SelectItem value="MTH">Mensual</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="status">Estado *</Label>
                                                <Select onValueChange={(value: EmployeeStatus) => handleInputChange('status', value)} value={formState.status} disabled={isPending}>
                                                    <SelectTrigger><SelectValue placeholder="Seleccione estado" /></SelectTrigger>
                                                    <SelectContent>
                                                    <SelectItem value="activo">Activo</SelectItem>
                                                    <SelectItem value="suspendido">Suspendido</SelectItem>
                                                    <SelectItem value="baja">Baja</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        </div>

                                        <Separator className="my-6" />

                                        <div>
                                            <h3 className="mb-4 text-lg font-medium leading-none">Información de Contacto</h3>
                                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="phoneNumber">Celular</Label>
                                                    <Input id="phoneNumber" value={formState.phoneNumber} onChange={(e) => handleInputChange('phoneNumber', e.target.value)} placeholder="Ej. 1122334455" disabled={isPending}/>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Correo</Label>
                                                    <Input id="email" type="email" value={formState.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="empleado@sacde.com" disabled={isPending}/>
                                                </div>
                                            </div>
                                        </div>
                                    </fieldset>
                                </div>
                                <div className="flex justify-end pt-8 border-t mt-6">
                                    <Button type="submit" onClick={handleSaveEmployee} disabled={isPending || !canManage}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isPending ? 'Guardando...' : (isNewEmployee ? 'Crear Empleado' : 'Guardar Cambios')}
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="py-6 space-y-6">
                                <div className="space-y-4">
                                     <div className="flex flex-wrap items-center gap-4">
                                        <Label>Seleccionar período:</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="date"
                                                    variant={"outline"}
                                                    className={cn(
                                                    "w-full sm:w-[300px] justify-start text-left font-normal",
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
                                        <Button onClick={handleExport} variant="outline" disabled={isPending}>
                                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                                            Exportar a Excel
                                        </Button>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Horas en Período</CardTitle>
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{totalHoursInPeriod.toFixed(2)} hs</div>
                                                <p className="text-xs text-muted-foreground">Suma de horas productivas e improductivas.</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Horas Especiales</CardTitle>
                                                <Sparkles className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{totalSpecialHours.toFixed(2)} hs</div>
                                                <p className="text-xs text-muted-foreground">Suma de horas especiales en el período.</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Días de Ausentismo</CardTitle>
                                                <UserX className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{totalAbsences}</div>
                                                <p className="text-xs text-muted-foreground">Total de ausencias en el período.</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                                

                                <div className="space-y-2">
                                    <h3 className="font-semibold text-foreground">Historial de Novedades</h3>
                                    <ScrollArea className="h-96 rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Detalle de Novedad</TableHead>
                                                    <TableHead>Proyecto</TableHead>
                                                    <TableHead>Cuadrilla</TableHead>
                                                    <TableHead className="text-right">Horas/Info</TableHead>
                                                    <TableHead className="text-right">Ir al Parte</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {history.length > 0 ? (
                                                    history.map((item, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>{format(new Date(item.date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={item.variant} className="whitespace-nowrap">{item.details}</Badge>
                                                            </TableCell>
                                                            <TableCell>{item.project}</TableCell>
                                                            <TableCell>{item.crew}</TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {item.hours !== null ? `${item.hours} hs` : '0 hs'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="icon" asChild>
                                                                    <Link href={`/partes-diarios?date=${item.date}&project=${item.projectId}&crew=${item.crewId}`}>
                                                                        <LinkIcon className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-24 text-center">No hay novedades registradas para el período seleccionado.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </main>
    );

}
