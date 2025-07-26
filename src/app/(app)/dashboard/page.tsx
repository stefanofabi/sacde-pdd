
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, ClipboardList, Users, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { format, isWithinInterval, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, AttendanceData, AttendanceEntry, DailyLaborData, DailyLaborEntry, LegacyDailyLaborEntry, DailyLaborNotificationData, PermissionKey, Permission as GlobalPermission, PermissionStatus } from '@/types';

type MetricCard = {
  title: string;
  icon: React.ElementType;
  value: number;
  description: string;
  permissionKey: PermissionKey;
};

// Local type for this component to handle optional status
type Permission = Omit<GlobalPermission, 'status'> & {
    status?: PermissionStatus;
};


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState({
    partesPendientesRealizar: 0,
    partesPendientesNotificar: 0,
    personalTotalActivo: 0,
    personalConPermisoHoy: 0,
  });
  
  const today = startOfToday();
  const todayKey = format(today, "yyyy-MM-dd");

  React.useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      setLoading(true);
      try {
        const [
          attendanceSnapshot,
          dailyLaborSnapshot,
          notificationSnapshot,
          employeesSnapshot,
          permissionsSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, 'attendance')),
          getDocs(collection(db, 'daily-labor')),
          getDocs(collection(db, 'daily-labor-notifications')),
          getDocs(collection(db, 'employees')),
          getDocs(collection(db, 'permissions')),
        ]);

        const attendanceData: AttendanceData = {};
        attendanceSnapshot.forEach(docSnap => {
          const entry = { id: docSnap.id, ...docSnap.data() } as {id: string, date: string} & Omit<AttendanceEntry, 'id'>;
          const { date, ...rest } = entry;
          if (!attendanceData[date]) {
              attendanceData[date] = [];
          }
          // @ts-ignore
          attendanceData[date].push(rest);
        });

        const laborData: DailyLaborData = {};
        dailyLaborSnapshot.docs.forEach(doc => {
            const entry = { id: doc.id, ...doc.data() } as { date: string } & (DailyLaborEntry | LegacyDailyLaborEntry);
            const { date, ...rest } = entry;
            if (!laborData[date]) {
                laborData[date] = [];
            }
            laborData[date].push(rest);
        });

        const notificationData: DailyLaborNotificationData = {};
        notificationSnapshot.forEach(docSnap => {
            const entry = docSnap.data() as { date: string; crewId: string; notified: boolean; notifiedAt: string };
            const { date, crewId, notified, notifiedAt } = entry;
            if (!notificationData[date]) {
                notificationData[date] = {};
            }
            notificationData[date][crewId] = { notified, notifiedAt };
        });

        const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
        const permissions = permissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Permission[];


        // Metric 1: Partes pendientes de realizar (Asistencia)
        const attendanceToday = attendanceData[todayKey] || [];
        const partesPendientesRealizar = attendanceToday.filter(a => !a.sent).length;

        // Metric 2: Partes pendientes de notificar (Mano de Obra)
        const laborToday = laborData[todayKey] || [];
        const notifiedToday = notificationData[todayKey] || {};
        const crewsWithLaborToday = new Set(laborToday.map(l => l.crewId));
        let partesPendientesNotificar = 0;
        crewsWithLaborToday.forEach(crewId => {
          if (!notifiedToday[crewId]?.notified) {
            partesPendientesNotificar++;
          }
        });

        // Metric 3: Personal total activo
        const personalTotalActivo = employees.filter(e => e.estado === 'activo').length;

        // Metric 4: Personal con permiso hoy
        const personalConPermisoHoy = permissions.filter(p => {
            const isApproved = !!p.approvedByJefeDeObraId || !!p.approvedByRecursosHumanosId;
            if (!isApproved) return false;
  
            const startDate = new Date(`${p.startDate}T00:00:00`);
            const endDate = new Date(`${p.endDate}T23:59:59`);
            
            return isWithinInterval(today, { start: startDate, end: endDate });
        }).length;

        setMetrics({
          partesPendientesRealizar,
          partesPendientesNotificar,
          personalTotalActivo,
          personalConPermisoHoy,
        });

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user && !authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading, todayKey]);

  const allMetricCards: MetricCard[] = [
    {
      title: "Partes de Asistencia Pendientes",
      icon: AlertCircle,
      value: metrics.partesPendientesRealizar,
      description: "Solicitudes de asistencia sin enviar para hoy.",
      permissionKey: "attendance",
    },
    {
      title: "Partes Diarios sin Notificar",
      icon: ClipboardList,
      value: metrics.partesPendientesNotificar,
      description: "Partes diarios con horas cargadas pendientes de notificación.",
      permissionKey: "dailyReports",
    },
    {
      title: "Personal Total Activo",
      icon: Users,
      value: metrics.personalTotalActivo,
      description: 'Total de empleados con estado "activo".',
      permissionKey: "employees",
    },
    {
      title: "Personal con Permiso Hoy",
      icon: UserCheck,
      value: metrics.personalConPermisoHoy,
      description: "Empleados con ausentismo justificado por permiso aprobado.",
      permissionKey: "permissions",
    },
  ];

  const visibleMetricCards = React.useMemo(() => {
    if (!user) return [];
    if (user.is_superuser) return allMetricCards;
    
    const userPermissions = user.role?.permissions || [];
    // The metric card permission key needs to be a top-level key like 'attendance', not 'attendance.view'
    // This logic checks if the user has *any* permission that starts with the card's base permission key.
    return allMetricCards.filter(card => 
      userPermissions.some(p => p.startsWith(card.permissionKey))
    );
  }, [user, metrics, allMetricCards]);


  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary font-headline flex items-center gap-3">
            <LayoutDashboard className="h-10 w-10" />
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Resumen del estado actual de la operación al día {format(today, "PPP", { locale: es })}.
          </p>
        </header>

        {loading || authLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {visibleMetricCards.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {visibleMetricCards.map((card) => (
                    <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <card.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <p className="text-xs text-muted-foreground">{card.description}</p>
                    </CardContent>
                    </Card>
                ))}
                </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
