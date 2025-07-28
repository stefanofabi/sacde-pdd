


export type PermissionKey = 
  | 'dashboard' 
  | 'crews'
  | 'crews.view'
  | 'crews.editInfo'
  | 'crews.assignPhase'
  | 'crews.managePersonnel'
  | 'employees' 
  | 'employees.view'
  | 'employees.manage'
  | 'users' 
  | 'attendance' 
  | 'dailyReports' 
  | 'dailyReports.view'
  | 'dailyReports.save' 
  | 'dailyReports.notify' 
  | 'dailyReports.addManual' 
  | 'dailyReports.moveEmployee'
  | 'dailyReports.delete' 
  | 'dailyReports.approveControl' 
  | 'dailyReports.approvePM' 
  | 'statistics' 
  | 'permissions'
  | 'permissions.view'
  | 'permissions.manage'
  | 'permissions.approveSupervisor'
  | 'permissions.approveHR'
  | 'settings'
  | 'settings.projects'
  | 'settings.absenceTypes'
  | 'settings.phases'
  | 'settings.positions'
  | 'settings.specialHourTypes'
  | 'settings.unproductiveHourTypes'
  | 'settings.roles';

export interface Role {
  id: string;
  name: string;
  permissions: PermissionKey[];
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  authUid?: string; // UID from Firebase Auth
  is_superuser?: boolean;
}

export interface Project {
  id: string;
  identifier: string;
  name: string;
  requiresControlGestionApproval?: boolean;
  requiresJefeDeObraApproval?: boolean;
  specialHourTypeIds?: string[];
  unproductiveHourTypeIds?: string[];
  absenceTypeIds?: string[];
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
  projectId: string;
  
  foremanId: string;
  substituteForemanIds: string[];

  tallymanId: string;
  substituteTallymanIds: string[];
  
  projectManagerId: string;
  substituteProjectManagerIds: string[];

  controlAndManagementId: string;
  substituteControlAndManagementIds: string[];

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
export type EmployeeSex = "M" | "F" | "X";

export interface Employee {
  id: string;
  internalNumber: string;
  identificationNumber?: string;
  lastName: string;
  firstName: string;
  hireDate: string; // ISO date string e.g. "2023-10-27"
  sex: EmployeeSex;
  projectId: string;
  positionId: string;
  condition: EmployeeCondition;
  status: EmployeeStatus;
  phoneNumber?: string;
  email?: string;
}

export interface EmployeePosition {
  id: string;
  name: string;
  code: string;
}

export type PermissionStatus = "APROBADO POR RRHH" | "APROBADO POR SUPERVISOR" | "NO APROBADO";

export interface Permission {
  id: string;
  employeeId: string;
  absenceTypeId: string;
  startDate: string; // ISO date string e.g. "2023-10-27"
  endDate: string; // ISO date string e.g. "2023-10-27"
  status?: PermissionStatus;
  
  approvedByProjectManagerId?: string;
  approvedByProjectManagerAt?: string;
  approvedByHumanResourceId?: string;
  approvedByHumanResourceAt?: string;

  designatedApproverProjectManagerId?: string;
  designatedApproverHumanResourceId?: string;
  
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

export type DailyReportStatus = "PENDING" | "NOTIFIED" | "APPROVED_CONTROL" | "APPROVED_PM" | "COMPLETED";

// Represents the header of a daily report
export interface DailyReport {
  id: string;
  date: string; // "yyyy-MM-dd"
  crewId: string;
  projectId: string;
  foremanId: string;
  tallymanId: string;
  projectManagerId: string;
  controlAndManagementId: string;
  status: DailyReportStatus;
  notifiedAt?: string | null;
}

// Represents a single employee's labor record for a given day and crew.
export interface DailyLaborEntry {
  id: string;
  dailyReportId: string;
  employeeId: string;
  absenceReason: string | null; // If present, all hour fields should be empty/null
  productiveHours: Record<string, number | null>; // Key: phaseId, Value: hours
  unproductiveHours: Record<string, number | null>; // Key: unproductiveTypeId, Value: hours
  specialHours: Record<string, number | null>; // Key: specialHourTypeId, Value: hours
  manual?: boolean;
}

// Maps a dailyReportId to its labor entries
export type DailyLaborData = Record<string, DailyLaborEntry[]>;


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


// This type is now deprecated, use Role and PermissionKey instead.
export type EmployeeRole = 'admin' | 'crew_manager' | 'foreman' | 'tallyman' | 'project_manager' | 'management_control' | 'recursos_humanos' | 'invitado';
