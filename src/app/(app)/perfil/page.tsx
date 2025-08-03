
'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Upload } from 'lucide-react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

export default function ProfilePage() {
  const { user, loading, firebaseUser, forceUserRefresh } = useAuth();
  const { toast } = useToast();
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !firebaseUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>No se pudo cargar el perfil de usuario.</p>
      </div>
    );
  }

  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewPhoto(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!newPhoto) return;
    setUploading(true);

    const filePath = `profile-pictures/${firebaseUser.uid}/${newPhoto.name}`;
    const storageRef = ref(storage, filePath);

    try {
      const uploadTask = await uploadBytes(storageRef, newPhoto);
      const photoURL = await getDownloadURL(uploadTask.ref);

      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, { photoURL });
      
      // We need to refresh the user data in the context
      await forceUserRefresh();

      toast({
        title: 'Foto de perfil actualizada',
        description: 'Su nueva foto de perfil ha sido guardada.',
      });
      setNewPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: 'Error al subir la foto',
        description: 'No se pudo actualizar su foto de perfil.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl mx-auto">
        <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline flex items-center gap-3">
              <UserCircle className="h-10 w-10" />
              Mi Perfil
            </h1>
            <p className="text-muted-foreground mt-2">
              Vea y actualice su información personal.
            </p>
        </header>

        <Card>
            <CardHeader>
                <CardTitle>Foto de Perfil</CardTitle>
                <CardDescription>Esta foto se mostrará en la barra lateral y en otras partes del sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-primary/50">
                        <AvatarImage src={user.photoURL} alt="Foto de perfil" />
                        <AvatarFallback className="text-3xl">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="picture">Nueva foto de perfil</Label>
                        <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} disabled={uploading}/>
                        <p className="text-xs text-muted-foreground">Recomendado: imagen cuadrada (ej. 200x200px), PNG o JPG, máx 5MB.</p>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleUpload} disabled={!newPhoto || uploading}>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Subir y Guardar
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
