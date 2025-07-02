
export interface Crew {
  id: string;
  name: string;
  responsible: string;
}

export type AttendanceStatus = "presente" | "ausente" | "franco" | "permiso";

export type AttendanceData = Record<string, Record<string, AttendanceStatus>>;
