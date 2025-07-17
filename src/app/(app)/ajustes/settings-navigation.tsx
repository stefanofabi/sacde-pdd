
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { PermissionKey } from '@/types';
import { useEffect, useMemo } from 'react';

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

    const visibleTabs = useMemo(() => {
        if (!user) return [];
        return allTabs.filter(tab => {
            if (user.is_superuser) return true;
            if (userPermissions.includes('settings')) return true;
            return userPermissions.includes(tab.permission);
        });
    }, [user, userPermissions]);

    const currentTab = pathname.split('/').pop() || 'proyectos';

    useEffect(() => {
        if (visibleTabs.length > 0 && !visibleTabs.some(tab => tab.value === currentTab)) {
            router.replace(`/ajustes/${visibleTabs[0].value}`);
        }
    }, [visibleTabs, currentTab, router]);

    if (visibleTabs.length === 0) {
        return null;
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
