
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import type { Crew, AttendanceData, AttendanceStatus } from '@/types';

const crewsFilePath = path.join(process.cwd(), 'src', 'data', 'crews.json');
const attendanceFilePath = path.join(process.cwd(), 'src', 'data', 'attendance.json');

async function readData<T>(filePath: string): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (filePath.includes('crews')) return [] as T;
      if (filePath.includes('attendance')) return {} as T;
    }
    console.error(`Error reading file ${filePath}:`, error);
    throw new Error('Could not read data file.');
  }
}

async function writeData<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw new Error('Could not write data file.');
  }
}

export async function getCrews(): Promise<Crew[]> {
  return readData<Crew[]>(crewsFilePath);
}

export async function getAttendance(): Promise<AttendanceData> {
  return readData<AttendanceData>(attendanceFilePath);
}

export async function addCrew(newCrew: Omit<Crew, 'id'>): Promise<Crew> {
  const crews = await getCrews();
  const crewWithId = { ...newCrew, id: crypto.randomUUID() };
  const updatedCrews = [...crews, crewWithId];
  await writeData(crewsFilePath, updatedCrews);
  return crewWithId;
}

export async function deleteCrew(crewId: string): Promise<void> {
  const crews = await getCrews();
  const updatedCrews = crews.filter((crew) => crew.id !== crewId);
  await writeData(crewsFilePath, updatedCrews);

  const attendance = await getAttendance();
  Object.keys(attendance).forEach((dateKey) => {
    if (attendance[dateKey]?.[crewId]) {
      delete attendance[dateKey][crewId];
    }
  });
  await writeData(attendanceFilePath, attendance);
}

export async function updateAttendanceStatus(dateKey: string, crewId: string, status: AttendanceStatus): Promise<AttendanceStatus> {
  const attendance = await getAttendance();
  const dailyAttendance = attendance[dateKey] || {};
  const newDailyAttendance = {
    ...dailyAttendance,
    [crewId]: status,
  };
  const newAttendanceData = {
    ...attendance,
    [dateKey]: newDailyAttendance,
  };
  await writeData(attendanceFilePath, newAttendanceData);
  return status;
}

export async function removeAttendance(dateKey: string, crewId: string): Promise<void> {
  const attendance = await getAttendance();
  if (attendance[dateKey]?.[crewId]) {
    delete attendance[dateKey][crewId];
    await writeData(attendanceFilePath, attendance);
  }
}
