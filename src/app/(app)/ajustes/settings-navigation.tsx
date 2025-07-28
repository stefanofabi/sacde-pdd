
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { PermissionKey } from '@/types';
import { useEffect, useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const allTabs: { value: string; label: string; permission: PermissionKey }[] = [
    { value: 'proyectos', label: 'Proyectos', permission: 'settings.projects' },
    { value: 'fases', label: 'Fases', permission: 'settings.phases' },
    { value: 'posiciones', label: 'Posiciones', permission: 'settings.positions' },
    { value: 'tipos-de-ausentismo', label: 'Tipos de Ausentismo', permission: 'settings.absenceTypes' },
    { value: 'tipos-de-horas-especiales', label: 'Tipos de Horas Especiales', permission: 'settings.specialHourTypes' },
    { value: 'tipos-de-horas-improductivas', label: 'Tipos de Horas Improductivas', permission: 'settings.unproductiveHourTypes' },
    { value: 'roles', label: 'Roles', permission: 'settings.roles' },
];

export default function SettingsNavigation() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const isMobile = useIsMobile();

    const userPermissions = user?.role?.permissions || [];

    const visibleTabs = useMemo(() => {
        if (!user) return [];
        if (user.is_superuser) return allTabs;
        return allTabs.filter(tab => {
            return userPermissions.some(p => p.startsWith(tab.permission));
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
    
    if (isMobile) {
        return (
            <div className='w-full'>
                <Label>Sección de Ajustes</Label>
                 <Select
                    value={currentTab}
                    onValueChange={(value) => router.push(`/ajustes/${value}`)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione una sección..." />
                    </SelectTrigger>
                    <SelectContent>
                        {visibleTabs.map(tab => (
                            <SelectItem key={tab.value} value={tab.value}>
                                {tab.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )
    }

    return (
        <ScrollArea className="w-full whitespace-nowrap">
            <Tabs 
                value={currentTab}
                onValueChange={(value) => router.push(`/ajustes/${value}`)}
                className="w-full"
            >
                <TabsList className="inline-flex">
                    {visibleTabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
             <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
}
