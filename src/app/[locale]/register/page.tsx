
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { registerUser } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const t = useTranslations('RegisterPage');
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();

  const [formState, setFormState] = useState({
    nombre: '',
    apellido: '',
    legajo: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formState.password !== formState.confirmPassword) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.passwordMismatch'),
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      await registerUser({
        nombre: formState.nombre,
        apellido: formState.apellido,
        legajo: formState.legajo,
        email: formState.email,
        password: formState.password,
      });

      toast({
        title: t('toast.successTitle'),
        description: t('toast.successDescription'),
      });
      router.push(`/${locale}/login`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.unexpectedError');
      toast({
        title: t('toast.errorTitle'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">{t('firstNameLabel')}</Label>
                <Input id="nombre" name="nombre" required value={formState.nombre} onChange={handleInputChange} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">{t('lastNameLabel')}</Label>
                <Input id="apellido" name="apellido" required value={formState.apellido} onChange={handleInputChange} disabled={isLoading} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="legajo">{t('legajoLabel')}</Label>
              <Input id="legajo" name="legajo" required value={formState.legajo} onChange={handleInputChange} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input id="email" name="email" type="email" required value={formState.email} onChange={handleInputChange} disabled={isLoading} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('passwordLabel')}</Label>
                <Input id="password" name="password" type="password" required value={formState.password} onChange={handleInputChange} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPasswordLabel')}</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" required value={formState.confirmPassword} onChange={handleInputChange} disabled={isLoading} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('buttonText')}
            </Button>
            <Button variant="link" asChild>
                <Link href={`/${locale}/login`}>{t('backToLogin')}</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
