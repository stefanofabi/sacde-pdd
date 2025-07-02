
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import type { Crew, AttendanceData, Obra, Employee, AttendanceEntry } from '@/types';
import { format, subDays } from 'date-fns';

const dataDir = path.join(process.cwd(), 'src', 'data');
const crewsFilePath = path.join(dataDir, 'crews.json');
const attendanceFilePath = path.join(dataDir, 'attendance.json');
const obrasFilePath = path.join(dataDir, 'obras.json');
const employeesFilePath = path.join(dataDir, 'employees.json');


async function readData<T>(filePath: string): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (filePath.includes('crews') || filePath.includes('obras') || filePath.includes('employees')) return [] as T;
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

export async function getEmployees(): Promise<Employee[]> {
    return readData<Employee[]>(employeesFilePath);
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

export async function updateCrew(crewId: string, updatedCrewData: Partial<Omit<Crew, 'id'>>): Promise<Crew> {
    const crews = await getCrews();
    const crewIndex = crews.findIndex(c => c.id === crewId);

    if (crewIndex === -1) {
        throw new Error('La cuadrilla a actualizar no fue encontrada.');
    }

    if (updatedCrewData.employeeIds && !Array.isArray(updatedCrewData.employeeIds)) {
        updatedCrewData.employeeIds = [];
    }

    const updatedCrew = { ...crews[crewIndex], ...updatedCrewData };
    const updatedCrews = [...crews];
    updatedCrews[crewIndex] = updatedCrew;

    await writeData(crewsFilePath, updatedCrews);
    return updatedCrew;
}

export async function addEmployee(newEmployee: Omit<Employee, 'id'>): Promise<Employee> {
    const employees = await getEmployees();
    if (employees.some(emp => emp.legajo === newEmployee.legajo)) {
        throw new Error('Ya existe un empleado con el mismo legajo.');
    }
    const employeeWithId = { ...newEmployee, id: crypto.randomUUID() };
    const updatedEmployees = [...employees, employeeWithId];
    await writeData(employeesFilePath, updatedEmployees);
    return employeeWithId;
}

export async function deleteCrew(crewId: string): Promise<void> {
    const crews = await getCrews();
    const attendance = await getAttendance();

    const isCrewInUse = Object.values(attendance).flat().some(entry => entry.crewId === crewId);

    if (isCrewInUse) {
        throw new Error('No se puede eliminar la cuadrilla porque tiene registros de asistencia.');
    }

    const updatedCrews = crews.filter(crew => crew.id !== crewId);
    
    if (updatedCrews.length === crews.length) {
        throw new Error('La cuadrilla a eliminar no fue encontrada.');
    }

    await writeData(crewsFilePath, updatedCrews);
}

export async function deleteEmployee(employeeId: string): Promise<void> {
    const employees = await getEmployees();
    const updatedEmployees = employees.filter(emp => emp.id !== employeeId);

    if (updatedEmployees.length === employees.length) {
        throw new Error('El empleado a eliminar no fue encontrado.');
    }
    
    await writeData(employeesFilePath, updatedEmployees);
}


export async function addObra(newObra: Omit<Obra, 'id'>): Promise<Obra> {
    const obras = await getObras();
    const obraWithId = { ...newObra, id: crypto.randomUUID() };
    const updatedObras = [...obras, obraWithId];
    await writeData(obrasFilePath, updatedObras);
    return obraWithId;
}

export async function deleteObra(obraId: string): Promise<void> {
    const obras = await getObras();
    const crews = await getCrews();
    const employees = await getEmployees();

    const isObraInUseByCrew = crews.some(crew => crew.obraId === obraId);
    if (isObraInUseByCrew) {
        throw new Error('No se puede eliminar la obra porque tiene cuadrillas asignadas.');
    }

    const isObraInUseByEmployee = employees.some(emp => emp.obraId === obraId);
    if (isObraInUseByEmployee) {
        throw new Error('No se puede eliminar la obra porque tiene empleados asignados.');
    }

    const updatedObras = obras.filter(obra => obra.id !== obraId);
    
    if (updatedObras.length === obras.length) {
        throw new Error('La obra a eliminar no fue encontrada.');
    }

    await writeData(obrasFilePath, updatedObras);
}

export async function updateAttendanceSentStatus(dateKey: string, attendanceId: string, sent: boolean): Promise<AttendanceEntry> {
  const attendance = await getAttendance();
  const dailyAttendance = attendance[dateKey] || [];
  const entryIndex = dailyAttendance.findIndex(entry => entry.id === attendanceId);

  if (entryIndex === -1) {
    throw new Error('Attendance entry not found.');
  }
  
  const sentAt = sent ? new Date().toISOString() : null;
  
  const updatedEntry = { ...dailyAttendance[entryIndex], sent, sentAt };
  dailyAttendance[entryIndex] = updatedEntry;

  const newAttendanceData = {
    ...attendance,
    [dateKey]: dailyAttendance,
  };
  await writeData(attendanceFilePath, newAttendanceData);
  return updatedEntry;
}

export async function addAttendanceRequest(dateKey: string, crewId: string, responsibleId: string): Promise<AttendanceEntry> {
  const attendance = await getAttendance();
  const dailyAttendance = attendance[dateKey] || [];

  const alreadyExists = dailyAttendance.some(
    (entry) => entry.crewId === crewId && entry.responsibleId === responsibleId
  );

  if (alreadyExists) {
    throw new Error(
      "Ya existe una solicitud de asistencia para esta cuadrilla con el mismo responsable en esta fecha."
    );
  }

  const newEntry: AttendanceEntry = {
      id: crypto.randomUUID(),
      crewId,
      responsibleId,
      sent: false,
      sentAt: null,
  };

  const newDailyAttendance = [...dailyAttendance, newEntry];

  const newAttendanceData = {
    ...attendance,
    [dateKey]: newDailyAttendance,
  };
  await writeData(attendanceFilePath, newAttendanceData);
  return newEntry;
}

export async function deleteAttendanceRequest(dateKey: string, attendanceId: string): Promise<void> {
  const attendance = await getAttendance();
  const dailyAttendance = attendance[dateKey];

  if (!dailyAttendance) {
    throw new Error('No hay asistencias para la fecha seleccionada.');
  }

  const updatedDailyAttendance = dailyAttendance.filter(entry => entry.id !== attendanceId);

  if (updatedDailyAttendance.length === dailyAttendance.length) {
    throw new Error('La solicitud de asistencia a eliminar no fue encontrada.');
  }

  const newAttendanceData = {
    ...attendance,
    [dateKey]: updatedDailyAttendance,
  };

  await writeData(attendanceFilePath, newAttendanceData);
}

export async function clonePreviousDayAttendance(dateKey: string): Promise<AttendanceData> {
    const attendance = await getAttendance();
    const targetDate = new Date(dateKey);
    const previousDate = subDays(targetDate, 1);
    const previousDateKey = format(previousDate, "yyyy-MM-dd");

    const previousDayEntries = attendance[previousDateKey] || [];
    
    const newDailyEntries: AttendanceEntry[] = previousDayEntries.map(entry => ({
        id: crypto.randomUUID(),
        crewId: entry.crewId,
        responsibleId: entry.responsibleId,
        sent: false,
        sentAt: null,
    }));
    
    const newAttendanceData = {
        ...attendance,
        [dateKey]: newDailyEntries
    };

    await writeData(attendanceFilePath, newAttendanceData);
    return newAttendanceData;
}
