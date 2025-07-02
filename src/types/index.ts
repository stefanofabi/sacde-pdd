
export interface Obra {
  id: string;
  name: string;
}

export interface Crew {
  id: string;
  name: string;
  responsible: string;
  obraId: string;
}

export type AttendanceStatus = boolean;

export type AttendanceData = Record<string, Record<string, AttendanceStatus>>;
