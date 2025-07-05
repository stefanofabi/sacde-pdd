
export interface Obra {
  id: string;
  identifier: string;
  name: string;
}

export interface Phase {
  id: string;
  name: string;
  pepElement: string;
}

export interface CrewPhaseAssignment {
  id: string;
  phaseId: string;
  startDate: string; // ISO date string e.g. "2023-10-27"
  endDate: string; // ISO date string e.g. "2023-10-27"
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
  assignedPhases?: CrewPhaseAssignment[];
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

export interface AbsenceType {
  id: string;
  name: string;
  code: string;
}

export interface DailyLaborEntry {
  id: string;
  employeeId: string;
  crewId: string;
  hours: number | null;
  phaseId: string | null;
  absenceReason: string | null;
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
