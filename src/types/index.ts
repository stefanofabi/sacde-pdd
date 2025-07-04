
export interface Obra {
  id: string;
  identifier: string;
  name: string;
}

export interface Crew {
  id: string;
  name: string;
  obraId: string;
  capatazId: string;
  apuntadorId: string;
  jefeDeObraId: string;
  controlGestionId: string;
  employeeIds: string[];
}

export interface AttendanceEntry {
  id: string; // Unique ID for each attendance request
  crewId: string;
  responsibleId: string | null;
  sent: boolean;
  sentAt: string | null;
}

export type DailyAttendance = AttendanceEntry[];

// Maps a date string (e.g., "2023-10-27") to an array of attendance entries for that day.
export type AttendanceData = Record<string, DailyAttendance>;


export type EmployeeCondition = "jornal" | "mensual";
export type EmployeeStatus = "activo" | "suspendido" | "baja";

export interface Employee {
  id: string;
  legajo: string;
  cuil?: string;
  apellido: string;
  nombre: string;
  fechaIngreso: string; // ISO date string e.g. "2023-10-27"
  obraId: string;
  denominacionPosicion: string;
  condicion: EmployeeCondition;
  estado: EmployeeStatus;
  celular?: string;
  correo?: string;
}

export type PermissionStatus = "APROBADO POR RRHH" | "APROBADO POR SUPERVISOR" | "NO APROBADO";

export interface Permission {
  id: string;
  employeeId: string;
  startDate: string; // ISO date string e.g. "2023-10-27"
  endDate: string; // ISO date string e.g. "2023-10-27"
  status: PermissionStatus;
  observations?: string;
}

export type AbsenceReason = 
  | "franco" 
  | "permiso" 
  | "art" 
  | "enfermedad" 
  | "sin aviso" 
  | "con aviso" 
  | "feriado" 
  | "licencia nacimiento" 
  | "licencia casamiento" 
  | "fallecimiento" 
  | "donacion de sangre" 
  | "vacaciones" 
  | "stand by"
  | "sin actividad";

export const absenceReasons: { value: AbsenceReason; label: string }[] = [
    { value: 'franco', label: 'Franco' },
    { value: 'permiso', label: 'Permiso' },
    { value: 'art', label: 'ART' },
    { value: 'enfermedad', label: 'Enfermedad' },
    { value: 'sin aviso', label: 'Ausente (S/A)' },
    { value: 'con aviso', label: 'Ausente (C/A)' },
    { value: 'feriado', label: 'Feriado' },
    { value: 'licencia nacimiento', label: 'Lic. Nacimiento' },
    { value: 'licencia casamiento', label: 'Lic. Casamiento' },
    { value: 'fallecimiento', label: 'Lic. Fallecimiento' },
    { value: 'donacion de sangre', label: 'Lic. Donación Sangre' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'stand by', label: 'Stand By' },
    { value: 'sin actividad', label: 'Sin Actividad' },
];

export interface DailyLaborEntry {
  id: string;
  employeeId: string;
  crewId: string;
  hours: number | null;
  absenceReason: AbsenceReason | null;
  horasAltura: number | null;
  horasHormigon: number | null;
  horasNocturnas: number | null;
}

export type DailyLaborData = Record<string, DailyLaborEntry[]>;
