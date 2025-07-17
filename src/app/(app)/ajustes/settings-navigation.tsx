
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { PermissionKey } from '@/types';

const allTabs: { value: string; label: string; permission: PermissionKey }[] = [
    { value: 'proyectos', label: 'Proyectos', permission: 'settings.projects' },
    { value: 'tipos-de-ausentismo', label: 'Tipos de Ausentismo', permission: 'settings.absenceTypes' },
    { value: 'fases', label: 'Fases', permission: 'settings.phases' },
    { value: 'tipos-de-horas-especiales', label: 'Tipos de Horas Especiales', permission: 'settings.specialHourTypes' },
    { value: 'tipos-de-horas-improductivas', label: 'Tipos de Horas Improductivas', permission: 'settings.unproductiveHourTypes' },
    { value: 'roles', label: 'Roles', permission: 'settings.roles' },
];

export default function SettingsNavigation() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();

    const userPermissions = user?.role?.permissions || [];

    const visibleTabs = user?.is_superuser
        ? allTabs
        : allTabs.filter(tab => userPermissions.includes('settings') || userPermissions.includes(tab.permission));

    const currentTab = pathname.split('/').pop() || 'proyectos';

    if (visibleTabs.length === 0) {
        return null; // Or some placeholder if no settings are accessible
    }

    return (
        <Tabs 
            value={currentTab}
            onValueChange={(value) => router.push(`/ajustes/${value}`)}
            className="w-full overflow-x-auto"
        >
            <TabsList>
                {visibleTabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
