
export interface Obra {
  id: string;
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

export interface AttendanceInfo {
  sent: boolean;
  responsibleId: string | null;
}

export type AttendanceData = Record<string, Record<string, AttendanceInfo>>;


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
