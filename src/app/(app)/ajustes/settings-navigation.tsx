
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';

export default function SettingsNavigation() {
    const router = useRouter();
    const pathname = usePathname();

    const tabs = [
        { value: 'proyectos', label: 'Proyectos' },
        { value: 'tipos-de-ausentismo', label: 'Tipos de Ausentismo' },
        { value: 'fases', label: 'Fases' },
        { value: 'tipos-de-horas-especiales', label: 'Tipos de Horas Especiales' },
        { value: 'tipos-de-horas-improductivas', label: 'Tipos de Horas Improductivas' },
    ];
    
    const currentTab = pathname.split('/').pop() || 'proyectos';

    return (
        <Tabs 
            value={currentTab}
            onValueChange={(value) => router.push(`/ajustes/${value}`)}
            className="w-full overflow-x-auto"
        >
            <TabsList>
                {tabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
