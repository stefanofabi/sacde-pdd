
export interface Crew {
  id: string;
  name: string;
  responsible: string;
}

export type AttendanceStatus = boolean;

export type AttendanceData = Record<string, Record<string, AttendanceStatus>>;
