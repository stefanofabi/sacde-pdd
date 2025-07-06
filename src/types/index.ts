

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
export type EmployeeRole = 'admin' | 'crew_manager' | 'foreman' | 'tallyman' | 'project_manager' | 'management_control' | 'unassigned';

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
  role: EmployeeRole;
  celular?: string;
  correo?: string;
}

export type PermissionStatus = "APROBADO POR RRHH" | "APROBADO POR SUPERVISOR" | "NO APROBADO";

export interface Permission {
  id: string;
  employeeId: string;
  absenceTypeId: string;
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

export interface SpecialHourType {
  id: string;
  name: string;
  code: string;
}

export interface UnproductiveHourType {
  id: string;
  name: string;
  code: string;
}

// Represents a single employee's labor record for a given day and crew.
export interface DailyLaborEntry {
  id: string;
  employeeId: string;
  crewId: string;
  absenceReason: string | null; // If present, all hour fields should be empty/null
  productiveHours: Record<string, number | null>; // Key: phaseId, Value: hours
  unproductiveHours: Record<string, number | null>; // Key: unproductiveTypeId, Value: hours
  specialHours: Record<string, number | null>; // Key: specialHourTypeId, Value: hours
  manual?: boolean;
}

// This type is for backward compatibility when reading old data.
export interface LegacyDailyLaborEntry {
  id: string;
  employeeId: string;
  crewId: string;
  hours: number | null;
  phaseId: string | null;
  absenceReason: string | null;
  specialHours?: Record<string, number | null>;
  manual?: boolean;
}

export type DailyLaborData = Record<string, (DailyLaborEntry | LegacyDailyLaborEntry)[]>;

export type ApprovalStatus = 
  | 'PENDING_FOREMAN'
  | 'PENDING_CONTROL'
  | 'PENDING_PM'
  | 'APPROVED'
  | 'REJECTED';

export interface ApprovalEvent {
    status: ApprovalStatus;
    updatedAt: string;
    updatedBy: string; // employeeId
    rejectionReason?: string;
}
export interface DailyLaborApproval {
  status: ApprovalStatus;
  rejectionReason?: string;
  history: ApprovalEvent[];
}

// dateKey -> crewId -> Approval
export type DailyLaborApprovalData = Record<string, Record<string, DailyLaborApproval>>;

// This is obsolete and will be replaced by the Approval system
export interface DailyLaborNotificationData {
  [dateKey: string]: {
      [crewId: string]: {
          notified: boolean;
          notifiedAt: string;
      };
  };
}
