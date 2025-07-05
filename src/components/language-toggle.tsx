"use client";

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next-intl/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const t = useTranslations('LanguageToggle');

    const changeLocale = (nextLocale: 'en' | 'es') => {
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isPending}>
                    <Languages className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">{t('srChangeLanguage')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => changeLocale('en')} disabled={locale === 'en'}>
                    English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLocale('es')} disabled={locale === 'es'}>
                    Español
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
