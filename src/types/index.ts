
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

export const absenceReasonValues = [
  "franco",
  "permiso",
  "art",
  "enfermedad",
  "sin aviso",
  "con aviso",
  "feriado",
  "licencia nacimiento",
  "licencia casamiento",
  "fallecimiento",
  "donacion de sangre",
  "vacaciones",
  "stand by",
  "sin actividad",
] as const;

export type AbsenceReason = (typeof absenceReasonValues)[number];

export interface DailyLaborEntry {
  id: string;
  employeeId: string;
  crewId: string;
  hours: number | null;
  absenceReason: AbsenceReason | null;
  horasAltura: number | null;
  horasHormigon: number | null;
  horasNocturnas: number | null;
  manual?: boolean;
}

export type DailyLaborData = Record<string, DailyLaborEntry[]>;

export interface DailyLaborNotificationStatus {
  notified: boolean;
  notifiedAt: string | null;
}

// dateKey -> crewId -> status
export type DailyLaborNotificationData = Record<string, Record<string, DailyLaborNotificationStatus>>;
