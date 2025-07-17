
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import type { Role } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { registerUser } = useAuth();
  const [guestRoleId, setGuestRoleId] = useState<string | null>(null);
  const [loadingGuestRole, setLoadingGuestRole] = useState(true);

  const [formState, setFormState] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchGuestRole = async () => {
        try {
            const rolesRef = collection(db, 'roles');
            const q = query(rolesRef, where("name", "==", "Invitado"));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setGuestRoleId(querySnapshot.docs[0].id);
            } else {
                toast({
                    title: "Error de configuración",
                    description: "No se encontró el rol de 'Invitado'. Por favor, contacte al administrador.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error fetching guest role:", error);
            toast({
                title: "Error de red",
                description: "No se pudo conectar con la base de datos para obtener roles.",
                variant: "destructive"
            });
        } finally {
            setLoadingGuestRole(false);
        }
    };
    fetchGuestRole();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formState.password !== formState.confirmPassword) {
      toast({
        title: "Error de Registro",
        description: "Las contraseñas no coinciden.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!guestRoleId) {
        toast({
            title: "Error de Registro",
            description: "No se puede registrar sin un rol de invitado configurado.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }

    try {
      await registerUser({
        nombre: formState.nombre,
        apellido: formState.apellido,
        email: formState.email,
        roleId: guestRoleId,
      }, formState.password);

      toast({
        title: "¡Registro Exitoso!",
        description: "Su cuenta ha sido creada. Ahora puede iniciar sesión.",
      });
      router.push(`/login`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
      toast({
        title: "Error de Registro",
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
          <CardTitle className="text-2xl font-bold">Crear una cuenta</CardTitle>
          <CardDescription>Complete sus datos para registrarse en el sistema.</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" type="text" required value={formState.nombre} onChange={handleInputChange} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" name="apellido" type="text" required value={formState.apellido} onChange={handleInputChange} disabled={isLoading} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required value={formState.email} onChange={handleInputChange} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required value={formState.password} onChange={handleInputChange} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required value={formState.confirmPassword} onChange={handleInputChange} disabled={isLoading} />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || loadingGuestRole}>
              {(isLoading || loadingGuestRole) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrarse
            </Button>
            <Button variant="link" asChild>
                <Link href={`/login`}>Volver a Iniciar Sesión</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
