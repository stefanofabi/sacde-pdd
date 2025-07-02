
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import type { Crew, AttendanceData, AttendanceStatus, Obra } from '@/types';
import { format, subDays } from 'date-fns';

const dataDir = path.join(process.cwd(), 'src', 'data');
const crewsFilePath = path.join(dataDir, 'crews.json');
const attendanceFilePath = path.join(dataDir, 'attendance.json');
const obrasFilePath = path.join(dataDir, 'obras.json');


async function readData<T>(filePath: string): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (filePath.includes('crews') || filePath.includes('obras')) return [] as T;
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

export async function getObras(): Promise<Obra[]> {
    return readData<Obra[]>(obrasFilePath);
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

export async function addObra(newObra: Omit<Obra, 'id'>): Promise<Obra> {
    const obras = await getObras();
    const obraWithId = { ...newObra, id: crypto.randomUUID() };
    const updatedObras = [...obras, obraWithId];
    await writeData(obrasFilePath, updatedObras);
    return obraWithId;
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

export async function setDailyCrews(dateKey: string, crewIds: string[]): Promise<AttendanceData> {
    const attendance = await getAttendance();
    const existingDailyData = attendance[dateKey] || {};
    const newDailyData: Record<string, AttendanceStatus> = {};

    crewIds.forEach(id => {
        newDailyData[id] = existingDailyData[id] || false;
    });

    const newAttendanceData = {
        ...attendance,
        [dateKey]: newDailyData,
    };
    await writeData(attendanceFilePath, newAttendanceData);
    return newAttendanceData;
}

export async function clonePreviousDayAttendance(dateKey: string): Promise<AttendanceData> {
    const attendance = await getAttendance();
    const targetDate = new Date(dateKey);
    const previousDate = subDays(targetDate, 1);
    const previousDateKey = format(previousDate, "yyyy-MM-dd");

    const previousDayData = attendance[previousDateKey] || {};
    
    const newDailyData: Record<string, AttendanceStatus> = {};
    Object.keys(previousDayData).forEach(crewId => {
        newDailyData[crewId] = false; // Reset status to not sent
    });
    
    const newAttendanceData = {
        ...attendance,
        [dateKey]: newDailyData
    };

    await writeData(attendanceFilePath, newAttendanceData);
    return newAttendanceData;
}
