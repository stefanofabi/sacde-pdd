
"use client";

import { useState, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { addDays, format, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { MultiSelectCombobox, type ComboboxOption } from "@/components/ui/multi-select-combobox";
import { Calendar as CalendarIcon, Users, Clock, AlertCircle, UserX, Percent } from "lucide-react";
import type { Crew, Employee, DailyLaborData, Project, AbsenceType, SpecialHourType, UnproductiveHourType, DailyLaborEntry, DailyReport, EmployeeSex, EmployeePosition } from "@/types";

interface StatisticsDashboardProps {
  initialCrews: Crew[];
  initialEmployees: Employee[];
  initialDailyReports: DailyReport[];
  initialDailyLabor: DailyLaborData;
  initialProjects: Project[];
  initialAbsenceTypes: AbsenceType[];
  initialSpecialHourTypes: SpecialHourType[];
  initialUnproductiveHourTypes: UnproductiveHourType[];
  initialPositions: EmployeePosition[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];
const GENDER_COLORS: Record<EmployeeSex, string> = {
    'M': '#3b82f6', // blue-500
    'F': '#ec4899', // pink-500
    'X': '#a855f7', // purple-500
};

export default function StatisticsDashboard({
  initialCrews,
  initialEmployees,
  initialDailyReports,
  initialDailyLabor,
  initialProjects,
  initialAbsenceTypes,
  initialPositions,
}: StatisticsDashboardProps) {

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedCrews, setSelectedCrews] = useState<string[]>([]);

  const projectOptions: ComboboxOption[] = useMemo(() =>
    initialProjects.map(o => ({ value: o.id, label: o.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [initialProjects]
  );
  
  const crewOptions: ComboboxOption[] = useMemo(() =>
    initialCrews
      .filter(c => selectedProjects.length === 0 || selectedProjects.includes(c.projectId))
      .map(c => ({ value: c.id, label: c.name })),
    [initialCrews, selectedProjects]
  );
  
  const absenceTypeMap = useMemo(() => new Map(initialAbsenceTypes.map(at => [at.id, at.name])), [initialAbsenceTypes]);
  const crewMap = useMemo(() => new Map(initialCrews.map(c => [c.id, c])), [initialCrews]);
  const positionMap = useMemo(() => new Map(initialPositions.map(p => [p.id, p.name])), [initialPositions]);

  const filteredData = useMemo(() => {
    let totalHours = 0;
    let totalUnproductiveHours = 0;
    let totalSpecialHours = 0;
    let totalAbsences = 0;
    let productiveHours = 0;
    
    const absenceCounts: Record<string, number> = {};
    const absenceByCrew: Record<string, number> = {};
    const sexDistribution: Record<string, number> = { 'Masculino': 0, 'Femenino': 0, 'No binario': 0 };
    const positionDistribution: Record<string, number> = {};

    const filteredCrewIds = selectedCrews.length > 0 ? new Set(selectedCrews) : new Set(crewOptions.map(c => c.value));
    
    const relevantReports = initialDailyReports.filter(report => {
        if (!date?.from || !date.to) return false;
        const reportDate = new Date(report.date + "T00:00:00");
        if (!isWithinInterval(reportDate, {start: date.from, end: date.to})) return false;
        if (selectedProjects.length > 0 && !selectedProjects.includes(report.projectId)) return false;
        if (!filteredCrewIds.has(report.crewId)) return false;
        return true;
    });

    const relevantEmployeeIds = new Set<string>();
    
    relevantReports.forEach(report => {
        const laborEntries = initialDailyLabor[report.id] || [];
        laborEntries.forEach(entry => {
            relevantEmployeeIds.add(entry.employeeId);
            if (entry.absenceReason) {
                totalAbsences++;
                const reasonName = absenceTypeMap.get(entry.absenceReason) || "Unknown";
                absenceCounts[reasonName] = (absenceCounts[reasonName] || 0) + 1;

                const crewName = crewMap.get(report.crewId)?.name || 'Unknown';
                absenceByCrew[crewName] = (absenceByCrew[crewName] || 0) + 1;
            } else {
                let entryProductive = Object.values(entry.productiveHours).reduce((sum, h) => sum + (h || 0), 0);
                let entryUnproductive = Object.values(entry.unproductiveHours).reduce((sum, h) => sum + (h || 0), 0);

                productiveHours += entryProductive;
                totalUnproductiveHours += entryUnproductive;
                totalHours += entryProductive + entryUnproductive;
                
                if(entry.specialHours) {
                    totalSpecialHours += Object.values(entry.specialHours).reduce((sum, h) => sum + (h || 0), 0);
                }
            }
        });
    });
    
    initialEmployees.forEach(emp => {
      if(relevantEmployeeIds.has(emp.id)) {
        if(emp.sex === 'M') sexDistribution['Masculino']++;
        else if(emp.sex === 'F') sexDistribution['Femenino']++;
        else if(emp.sex === 'X') sexDistribution['No binario']++;
        
        const positionName = positionMap.get(emp.positionId) || 'Sin Posición';
        positionDistribution[positionName] = (positionDistribution[positionName] || 0) + 1;
      }
    });

    const totalPersonnelInCrews = relevantEmployeeIds.size;
    const presentPersonnelCount = totalPersonnelInCrews - totalAbsences;
    const attendancePercentage = totalPersonnelInCrews > 0 ? (presentPersonnelCount / totalPersonnelInCrews) * 100 : 0;
    
    const absenceChartData = Object.entries(absenceCounts).map(([name, value]) => ({ name, value }));
    const absenceByCrewChartData = Object.entries(absenceByCrew).map(([name, value]) => ({ name, value }));
    const hoursChartData = [
        { name: "Productivas", value: productiveHours },
        { name: "Improductivas", value: totalUnproductiveHours },
    ];

    const sexChartData = Object.entries(sexDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
      
    const positionChartData = Object.entries(positionDistribution).map(([name, value]) => ({ name, value }));

    return {
      totalHours,
      totalUnproductiveHours,
      totalSpecialHours,
      totalAbsences,
      attendancePercentage,
      absenceChartData,
      absenceByCrewChartData,
      hoursChartData,
      sexChartData,
      positionChartData
    };
  }, [date, selectedProjects, selectedCrews, initialDailyReports, initialDailyLabor, crewOptions, absenceTypeMap, crewMap, initialEmployees, positionMap]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Seleccione un rango de fechas, proyectos y cuadrillas para analizar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className="w-full md:w-[300px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                      {format(date.to, "LLL dd, y", { locale: es })}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y", { locale: es })
                  )
                ) : (
                  <span>Seleccione un rango de fechas</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
          <MultiSelectCombobox
            options={projectOptions}
            selected={selectedProjects}
            onChange={setSelectedProjects}
            placeholder="Seleccionar proyectos..."
            className="w-full md:w-[250px]"
            selectAllLabel="Seleccionar todos los proyectos"
            deselectAllLabel="Deseleccionar todos los proyectos"
          />
          <MultiSelectCombobox
            options={crewOptions}
            selected={selectedCrews}
            onChange={setSelectedCrews}
            placeholder="Seleccionar cuadrillas..."
            className="w-full md:w-[250px]"
            disabled={crewOptions.length === 0}
            selectAllLabel="Seleccionar todas las cuadrillas"
            deselectAllLabel="Deseleccionar todas las cuadrillas"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Totales</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.totalHours.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Improductivas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.totalUnproductiveHours.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausentismo Total</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.totalAbsences}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Presentismo</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.attendancePercentage.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Distribución de Tipos de Ausentismo</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={filteredData.absenceChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {filteredData.absenceChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Composición de Horas</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={filteredData.hoursChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {filteredData.hoursChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toFixed(2)} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Distribución de Empleados por Sexo</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={filteredData.sexChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {filteredData.sexChartData.map((entry) => {
                              let color = GENDER_COLORS.X;
                              if (entry.name === 'Masculino') color = GENDER_COLORS.M;
                              if (entry.name === 'Femenino') color = GENDER_COLORS.F;
                              return <Cell key={`cell-${entry.name}`} fill={color} />
                            })}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Distribución por Posición</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={filteredData.positionChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                            {filteredData.positionChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
       <Card>
            <CardHeader>
                <CardTitle>Ausentismo por Cuadrilla</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredData.absenceByCrewChartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#82ca9d" name={"Ausencias"} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    </div>
  );
}
