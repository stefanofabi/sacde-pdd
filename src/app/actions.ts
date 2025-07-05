
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import type { Crew, AttendanceData, Obra, Employee, AttendanceEntry, Permission, DailyLaborData, DailyLaborEntry, DailyLaborNotificationData, AbsenceType, Phase, CrewPhaseAssignment, SpecialHourType, UnproductiveHourType } from '@/types';
import { format, subDays } from 'date-fns';

const dataDir = path.join(process.cwd(), 'src', 'data');
const crewsFilePath = path.join(dataDir, 'crews.json');
const attendanceFilePath = path.join(dataDir, 'attendance.json');
const obrasFilePath = path.join(dataDir, 'obras.json');
const employeesFilePath = path.join(dataDir, 'employees.json');
const permissionsFilePath = path.join(dataDir, 'permissions.json');
const dailyLaborFilePath = path.join(dataDir, 'daily-labor.json');
const dailyLaborNotificationsFilePath = path.join(dataDir, 'daily-labor-notifications.json');
const absenceTypesFilePath = path.join(dataDir, 'absence-types.json');
const phasesFilePath = path.join(dataDir, 'phases.json');
const specialHourTypesFilePath = path.join(dataDir, 'special-hour-types.json');
const unproductiveHourTypesFilePath = path.join(dataDir, 'unproductive-hour-types.json');


async function readData<T>(filePath: string): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (filePath.includes('crews') || filePath.includes('obras') || filePath.includes('employees') || filePath.includes('permissions') || filePath.includes('absence-types') || filePath.includes('phases') || filePath.includes('special-hour-types') || filePath.includes('unproductive-hour-types')) return [] as T;
      if (filePath.includes('attendance') || filePath.includes('daily-labor') || filePath.includes('daily-labor-notifications')) return {} as T;
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

export async function getPermissions(): Promise<Permission[]> {
  return readData<Permission[]>(permissionsFilePath);
}

export async function getDailyLabor(): Promise<DailyLaborData> {
  return readData<DailyLaborData>(dailyLaborFilePath);
}

export async function getDailyLaborNotifications(): Promise<DailyLaborNotificationData> {
  return readData<DailyLaborNotificationData>(dailyLaborNotificationsFilePath);
}

export async function getAbsenceTypes(): Promise<AbsenceType[]> {
  return readData<AbsenceType[]>(absenceTypesFilePath);
}

export async function getPhases(): Promise<Phase[]> {
  return readData<Phase[]>(phasesFilePath);
}

export async function getSpecialHourTypes(): Promise<SpecialHourType[]> {
  return readData<SpecialHourType[]>(specialHourTypesFilePath);
}

export async function getUnproductiveHourTypes(): Promise<UnproductiveHourType[]> {
    return readData<UnproductiveHourType[]>(unproductiveHourTypesFilePath);
}

export async function addUnproductiveHourType(newType: Omit<UnproductiveHourType, 'id'>): Promise<UnproductiveHourType> {
    const types = await getUnproductiveHourTypes();
    if (types.some(t => t.code.toLowerCase() === newType.code.toLowerCase())) {
        throw new Error('Ya existe un tipo de hora improductiva con el mismo código.');
    }
    const typeWithId = { ...newType, id: crypto.randomUUID() };
    const updatedTypes = [...types, typeWithId];
    await writeData(unproductiveHourTypesFilePath, updatedTypes);
    return typeWithId;
}

export async function deleteUnproductiveHourType(typeId: string): Promise<void> {
    const types = await getUnproductiveHourTypes();
    const dailyLabor = await getDailyLabor();
    
    const isTypeInUse = Object.values(dailyLabor).flat().some(entry =>
      'unproductiveHours' in entry && entry.unproductiveHours && Object.keys(entry.unproductiveHours).includes(typeId)
    );

    if (isTypeInUse) {
        throw new Error('No se puede eliminar el tipo de hora improductiva porque está en uso en partes diarios.');
    }

    const updatedTypes = types.filter(t => t.id !== typeId);
    
    if (updatedTypes.length === types.length) {
        throw new Error('El tipo de hora improductiva a eliminar no fue encontrado.');
    }

    await writeData(unproductiveHourTypesFilePath, updatedTypes);
}


export async function addSpecialHourType(newType: Omit<SpecialHourType, 'id'>): Promise<SpecialHourType> {
    const types = await getSpecialHourTypes();
    if (types.some(t => t.code.toLowerCase() === newType.code.toLowerCase())) {
        throw new Error('Ya existe un tipo de hora especial con el mismo código.');
    }
    const typeWithId = { ...newType, id: crypto.randomUUID() };
    const updatedTypes = [...types, typeWithId];
    await writeData(specialHourTypesFilePath, updatedTypes);
    return typeWithId;
}

export async function deleteSpecialHourType(typeId: string): Promise<void> {
    const types = await getSpecialHourTypes();
    const dailyLabor = await getDailyLabor();
    
    const isTypeInUse = Object.values(dailyLabor).flat().some(entry => 
        entry.specialHours && Object.keys(entry.specialHours).includes(typeId)
    );

    if (isTypeInUse) {
        throw new Error('No se puede eliminar el tipo de hora especial porque está en uso en partes diarios.');
    }

    const updatedTypes = types.filter(t => t.id !== typeId);
    
    if (updatedTypes.length === types.length) {
        throw new Error('El tipo de hora especial a eliminar no fue encontrado.');
    }

    await writeData(specialHourTypesFilePath, updatedTypes);
}

export async function addPhase(newPhase: Omit<Phase, 'id'>): Promise<Phase> {
    const phases = await getPhases();
    if (phases.some(ph => ph.name.toLowerCase() === newPhase.name.toLowerCase() || ph.pepElement.toLowerCase() === newPhase.pepElement.toLowerCase())) {
        throw new Error('Ya existe una fase con el mismo nombre o elemento PEP.');
    }
    const phaseWithId = { ...newPhase, id: crypto.randomUUID() };
    const updatedPhases = [...phases, phaseWithId];
    await writeData(phasesFilePath, updatedPhases);
    return phaseWithId;
}

export async function deletePhase(phaseId: string): Promise<void> {
    const phases = await getPhases();
    const crews = await getCrews();

    const isPhaseInUse = crews.some(crew => crew.assignedPhases?.some(ap => ap.phaseId === phaseId));
    if (isPhaseInUse) {
        throw new Error('No se puede eliminar la fase porque está asignada a una o más cuadrillas.');
    }

    const updatedPhases = phases.filter(p => p.id !== phaseId);
    
    if (updatedPhases.length === phases.length) {
        throw new Error('La fase a eliminar no fue encontrada.');
    }

    await writeData(phasesFilePath, updatedPhases);
}


export async function addAbsenceType(newAbsenceType: Omit<AbsenceType, 'id'>): Promise<AbsenceType> {
    const absenceTypes = await getAbsenceTypes();
    if (absenceTypes.some(at => at.code.toLowerCase() === newAbsenceType.code.toLowerCase())) {
        throw new Error('Ya existe un tipo de ausencia con el mismo código.');
    }
    const absenceTypeWithId = { ...newAbsenceType, id: crypto.randomUUID() };
    const updatedAbsenceTypes = [...absenceTypes, absenceTypeWithId];
    await writeData(absenceTypesFilePath, updatedAbsenceTypes);
    return absenceTypeWithId;
}

export async function deleteAbsenceType(absenceTypeId: string): Promise<void> {
    const absenceTypes = await getAbsenceTypes();
    const dailyLabor = await getDailyLabor();
    const isAbsenceTypeInUse = Object.values(dailyLabor).flat().some(entry => entry.absenceReason === absenceTypeId);

    if (isAbsenceTypeInUse) {
        throw new Error('No se puede eliminar el tipo de ausencia porque está en uso en partes diarios.');
    }

    const updatedAbsenceTypes = absenceTypes.filter(at => at.id !== absenceTypeId);
    
    if (updatedAbsenceTypes.length === absenceTypes.length) {
        throw new Error('El tipo de ausencia a eliminar no fue encontrado.');
    }

    await writeData(absenceTypesFilePath, updatedAbsenceTypes);
}

export async function moveEmployeeBetweenCrews(
  dateKey: string,
  employeeId: string,
  sourceCrewId: string,
  destinationCrewId: string
): Promise<void> {
  const dailyLabor = await getDailyLabor();
  const notifications = await getDailyLaborNotifications();

  const sourceNotified = notifications[dateKey]?.[sourceCrewId]?.notified;
  if (sourceNotified) {
    throw new Error('El parte de origen ya ha sido notificado y no se puede modificar.');
  }
  const destinationNotified = notifications[dateKey]?.[destinationCrewId]?.notified;
  if (destinationNotified) {
    throw new Error('El parte de destino ya ha sido notificado y no puede recibir empleados.');
  }

  const dailyEntries = dailyLabor[dateKey] || [];
  
  const isEmployeeInDestination = dailyEntries.some(e => e.crewId === destinationCrewId && e.employeeId === employeeId);
  if (isEmployeeInDestination) {
    throw new Error('El empleado ya tiene un parte cargado en la cuadrilla de destino para este día.');
  }
  
  const updatedDailyEntriesWithoutSource = dailyEntries.filter(e => !(e.crewId === sourceCrewId && e.employeeId === employeeId));

  const newDestinationEntry: DailyLaborEntry = {
    id: crypto.randomUUID(),
    employeeId: employeeId,
    crewId: destinationCrewId,
    productiveHours: {},
    unproductiveHours: {},
    specialHours: {},
    absenceReason: null,
    manual: true,
  };
  
  const finalDailyEntries = [...updatedDailyEntriesWithoutSource, newDestinationEntry];

  const newDailyLaborData = {
    ...dailyLabor,
    [dateKey]: finalDailyEntries,
  };

  await writeData(dailyLaborFilePath, newDailyLaborData);
}

export async function notifyDailyLabor(dateKey: string, crewId: string): Promise<void> {
  const notifications = await getDailyLaborNotifications();
  
  const updatedNotifications: DailyLaborNotificationData = {
    ...notifications,
    [dateKey]: {
      ...(notifications[dateKey] || {}),
      [crewId]: {
        notified: true,
        notifiedAt: new Date().toISOString(),
      },
    },
  };

  await writeData(dailyLaborNotificationsFilePath, updatedNotifications);
}

export async function saveDailyLabor(
  dateKey: string,
  crewId: string,
  laborData: Omit<DailyLaborEntry, 'id' | 'crewId'>[]
): Promise<void> {
  const dailyLabor = await getDailyLabor();
  const dailyEntries = dailyLabor[dateKey] || [];

  const otherCrewEntries = dailyEntries.filter(entry => entry.crewId !== crewId);

  const newCrewEntries: DailyLaborEntry[] = laborData
    .map(data => ({
      id: crypto.randomUUID(),
      crewId,
      ...data
    }));

  const updatedDailyEntries = [...otherCrewEntries, ...newCrewEntries];

  const newDailyLaborData = {
    ...dailyLabor,
    [dateKey]: updatedDailyEntries,
  };

  await writeData(dailyLaborFilePath, newDailyLaborData);
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

export async function updateEmployee(employeeId: string, updatedData: Partial<Omit<Employee, 'id'>>): Promise<Employee> {
    const employees = await getEmployees();
    const employeeIndex = employees.findIndex(e => e.id === employeeId);

    if (employeeIndex === -1) {
        throw new Error('El empleado a actualizar no fue encontrado.');
    }

    if (updatedData.legajo && updatedData.legajo !== employees[employeeIndex].legajo) {
        if (employees.some(emp => emp.legajo === updatedData.legajo && emp.id !== employeeId)) {
            throw new Error('Ya existe otro empleado con el mismo legajo.');
        }
    }

    const updatedEmployee = { ...employees[employeeIndex], ...updatedData };
    const updatedEmployees = [...employees];
    updatedEmployees[employeeIndex] = updatedEmployee;

    await writeData(employeesFilePath, updatedEmployees);
    return updatedEmployee;
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
    if (obras.some(obra => obra.identifier.toLowerCase() === newObra.identifier.toLowerCase())) {
        throw new Error('Ya existe una obra con el mismo identificador.');
    }
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

export async function addPermission(newPermission: Omit<Permission, 'id'>): Promise<Permission> {
    const permissions = await getPermissions();
    const permissionWithId = { ...newPermission, id: crypto.randomUUID() };
    const updatedPermissions = [...permissions, permissionWithId];
    await writeData(permissionsFilePath, updatedPermissions);
    return permissionWithId;
}
