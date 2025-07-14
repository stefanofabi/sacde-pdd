
'use client';

import * as React from 'react';
import { getAttendance, getDailyLabor, getDailyLaborNotifications, getEmployees, getPermissions } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, ClipboardList, ClipboardCheck, Users, UserCheck, BarChart3, AlertCircle, Loader2 } from "lucide-react";
import { format, isWithinInterval, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/auth-context';

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
      try {
        setLoading(true);
        const [
          attendanceData,
          dailyLaborData,
          notificationData,
          employees,
          permissions,
        ] = await Promise.all([
          getAttendance(),
          getDailyLabor(),
          getDailyLaborNotifications(),
          getEmployees(),
          getPermissions(),
        ]);

        // Metric 1: Partes pendientes de realizar (Asistencia)
        const attendanceToday = attendanceData[todayKey] || [];
        const partesPendientesRealizar = attendanceToday.filter(a => !a.sent).length;

        // Metric 2: Partes pendientes de notificar (Mano de Obra)
        const laborToday = dailyLaborData[todayKey] || [];
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
          const isApproved = p.status.startsWith("APROBADO");
          if (!isApproved) return false;

          const startDate = new Date(p.startDate);
          startDate.setUTCHours(0, 0, 0, 0);
          const endDate = new Date(p.endDate);
          endDate.setUTCHours(23, 59, 59, 999);
          
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

    if (!authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading, todayKey]);

  const quickLinks = [
    { href: "/asistencias", label: "Gestionar Asistencias", icon: ClipboardCheck },
    { href: "/partes-diarios", label: "Cargar Partes Diarios", icon: ClipboardList },
    { href: "/empleados", label: "Ver Empleados", icon: Users },
    { href: "/estadisticas", label: "Ver Estadísticas", icon: BarChart3 },
  ];

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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Partes de Asistencia Pendientes</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.partesPendientesRealizar}</div>
                  <p className="text-xs text-muted-foreground">Solicitudes de asistencia sin enviar para hoy.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Partes de Labor sin Notificar</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.partesPendientesNotificar}</div>
                  <p className="text-xs text-muted-foreground">Partes diarios con horas cargadas pendientes de notificación.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Personal Total Activo</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.personalTotalActivo}</div>
                  <p className="text-xs text-muted-foreground">Total de empleados con estado "activo".</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Personal con Permiso Hoy</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.personalConPermisoHoy}</div>
                  <p className="text-xs text-muted-foreground">Empleados con ausentismo justificado por permiso aprobado.</p>
                </CardContent>
              </Card>
            </div>

            <div>
                <h2 className="text-2xl font-semibold text-primary mb-4">Accesos Rápidos</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {quickLinks.map(link => (
                        <Link key={link.href} href={link.href} passHref>
                            <Button variant="outline" className="w-full h-20 text-lg justify-start p-4">
                                <link.icon className="mr-4 h-6 w-6" />
                                {link.label}
                            </Button>
                        </Link>
                    ))}
                </div>
            </div>
          </>
        )}

      </div>
    </main>
  );
}
