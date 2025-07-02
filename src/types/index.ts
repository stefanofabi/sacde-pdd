
export interface Obra {
  id: string;
  name: string;
}

export interface Crew {
  id: string;
  name: string;
  capataz: string;
  apuntador: string;
  obraId: string;
}

export type AttendanceStatus = boolean;

export type AttendanceData = Record<string, Record<string, AttendanceStatus>>;

export type EmployeeCondition = "jornal" | "mensual";
export type EmployeeStatus = "activo" | "suspendido" | "baja";

export interface Employee {
  id: string;
  legajo: string;
  cuil: string;
  apellido: string;
  nombre: string;
  fechaIngreso: string; // ISO date string e.g. "2023-10-27"
  obraId: string;
  denominacionPosicion: string;
  condicion: EmployeeCondition;
  estado: EmployeeStatus;
  celular: string;
  correo: string;
}
