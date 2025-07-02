
export interface Crew {
  id: string;
  name: string;
  responsible: string;
}

export type AttendanceData = Record<string, Record<string, boolean>>;
