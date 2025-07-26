# Parte Digital Sacde - Gestor de Asistencias y Productividad

## 1. Introducción

**Parte Digital Sacde** es una aplicación web integral diseñada para la gestión moderna y eficiente de equipos de trabajo en el sector de la construcción. La plataforma digitaliza y centraliza el seguimiento de asistencias, la carga de horas de mano de obra, la gestión de ausentismo y el análisis de productividad, reemplazando los procesos manuales por un flujo de trabajo digital, seguro y en tiempo real.

Construida con un stack tecnológico moderno, la aplicación ofrece una interfaz de usuario intuitiva y reactiva, con un sistema de roles y permisos robusto que garantiza que cada usuario acceda únicamente a la información y funcionalidades pertinentes a su perfil.

## 2. Características Principales

La aplicación se estructura en varios módulos clave:

- **Autenticación Segura:** Sistema de inicio de sesión y registro basado en Firebase Authentication. Los nuevos usuarios se registran sin un rol, y un administrador debe asignarles permisos para acceder al sistema.
- **Dashboard Principal:** Ofrece una vista rápida de las métricas más importantes y del estado operativo del día, como partes de asistencia pendientes, partes diarios sin notificar, y personal activo. Las tarjetas de métricas son visibles según los permisos del usuario.
- **Gestión de Cuadrillas:** Permite crear, editar y visualizar cuadrillas. Asigna personal clave (Capataz, Apuntador, etc.), personal de obra (jornales) y fases del proyecto con rangos de fechas. Incluye advertencias visuales para evitar la doble asignación de personal.
- **Gestión de Empleados:** Módulo para administrar el alta, baja y modificación de los datos de los empleados, incluyendo información personal, laboral y de contacto. Permite exportar el listado completo a Excel.
- **Gestión de Usuarios y Roles:** Un potente sistema para crear roles personalizados (ej. "Jefe de Obra", "RRHH") y asignarles permisos granulares sobre cada sección y acción de la aplicación. Los administradores pueden luego asignar estos roles a los usuarios.
- **Parte de Asistencia:** Interfaz para registrar la asistencia diaria de cada cuadrilla. Los responsables marcan si el parte fue enviado, y se puede clonar la configuración del día anterior para agilizar la carga.
- **Parte Diario de Mano de Obra:** El núcleo operativo de la aplicación. Permite cargar horas productivas (asociadas a fases del proyecto), horas improductivas y horas especiales para cada empleado de una cuadrilla.
- **Flujo de Aprobación Flexible:** Los partes diarios pueden requerir aprobación por parte de "Control y Gestión" y/o "Jefe de Obra", una configuración que se puede habilitar o deshabilitar por proyecto.
- **Gestión de Ausentismos:** Permite registrar y gestionar las ausencias justificadas de los empleados (vacaciones, licencias, etc.), que se reflejan automáticamente en los partes diarios.
- **Estadísticas y Análisis:** Un dashboard de estadísticas con filtros por fecha, proyecto y cuadrilla para visualizar datos clave como la distribución de horas (productivas vs. improductivas), tipos de ausentismo y presentismo.
- **Configuración Centralizada:** Un apartado de "Ajustes" para gestionar de forma centralizada los datos maestros de la aplicación: Proyectos, Fases, Tipos de Ausentismo, y más.

## 3. Stack Tecnológico

- **Framework Frontend:** [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Iconos:** [Lucide React](https://lucide.dev/)
- **Backend & Base de Datos:** [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **State Management:** React Context API
- **Gráficos y Visualizaciones:** [Recharts](https://recharts.org/)
- **Manejo de Formularios:** React Hook Form
- **Manipulación de Excel:** [SheetJS (xlsx)](https://sheetjs.com/)

## 4. Estructura del Proyecto

El proyecto sigue la estructura recomendada por Next.js App Router:

```
.
├── src/
│   ├── app/
│   │   ├── (app)/                # Rutas protegidas por autenticación
│   │   │   ├── asistencias/
│   │   │   ├── cuadrillas/
│   │   │   ├── dashboard/
│   │   │   ├── empleados/
│   │   │   ├── ... (otros módulos)
│   │   │   └── layout.tsx        # Layout principal con la barra lateral
│   │   ├── login/                # Página de inicio de sesión
│   │   ├── register/             # Página de registro
│   │   ├── actions.ts            # Server Actions para operaciones de backend
│   │   ├── globals.css           # Estilos globales y variables de Tailwind
│   │   └── layout.tsx            # Layout raíz de la aplicación
│   ├── components/
│   │   ├── ui/                   # Componentes de UI (generados por ShadCN)
│   │   └── ... (componentes de la aplicación)
│   ├── context/
│   │   └── auth-context.tsx      # Contexto para manejar la autenticación
│   ├── hooks/
│   │   └── ... (hooks personalizados)
│   ├── lib/
│   │   ├── firebase.ts           # Configuración del SDK de cliente de Firebase
│   │   ├── firebase-admin.ts     # Configuración del SDK de admin de Firebase
│   │   └── utils.ts              # Utilidades generales (ej. cn)
│   └── types/
│       └── index.ts              # Definiciones de tipos de TypeScript
├── public/
└── ... (otros archivos de configuración)
```

## 5. Puesta en Marcha y Configuración

### Prerrequisitos

- Node.js (versión 18 o superior)
- Una cuenta de Firebase

### Configuración de Firebase

1.  **Crear un Proyecto en Firebase:** Ve a la [Consola de Firebase](https://console.firebase.google.com/) y crea un nuevo proyecto.
2.  **Habilitar Servicios:**
    - **Authentication:** Habilita el proveedor "Email/Password".
    - **Firestore:** Crea una base de datos de Firestore en modo de producción (con reglas de seguridad estrictas).
3.  **Obtener Credenciales del Cliente:**
    - En la configuración de tu proyecto de Firebase, crea una nueva aplicación web.
    - Copia el objeto de configuración `firebaseConfig`.
    - Pégalo en el archivo `src/lib/firebase.ts`.
4.  **Obtener Credenciales de Administrador (Service Account):**
    - Ve a "Configuración del proyecto" > "Cuentas de servicio".
    - Haz clic en "Generar nueva clave privada". Se descargará un archivo JSON.
    - **IMPORTANTE:** No guardes este archivo en el repositorio.
5.  **Variables de Entorno:**
    - Crea un archivo `.env.local` en la raíz del proyecto.
    - Abre el archivo JSON de la cuenta de servicio, copia todo su contenido y pégalo como una sola línea en la variable de entorno.

    ```bash
    # .env.local

    # Pega aquí el contenido completo del JSON de la cuenta de servicio de Firebase
    FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "...", ...}'
    ```

### Instalación y Ejecución

1.  **Instalar Dependencias:**
    ```bash
    npm install
    ```
2.  **Ejecutar el Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:9002`.

## 6. Flujo de Permisos

El sistema de permisos es un pilar fundamental de la aplicación:

1.  **Permisos (`PermissionKey`):** En `src/types/index.ts` se definen todas las acciones posibles en el sistema (ej. `crews.editInfo`, `dailyReports.notify`).
2.  **Roles:** Desde "Ajustes" > "Roles", un superusuario puede crear roles y asignarles un conjunto de `PermissionKey`.
3.  **Usuarios:** Un administrador asigna un `roleId` a cada usuario.
4.  **Aplicación de Permisos:**
    - El `AuthContext` obtiene el usuario y su rol con los permisos asociados al iniciar sesión.
    - Los componentes de la interfaz utilizan `useAuth()` para verificar si el usuario tiene permiso para ver una sección o realizar una acción.
    - La visibilidad de elementos del menú, pestañas, botones y tarjetas del dashboard se controla de forma dinámica según estos permisos.
    - Un usuario marcado como `is_superuser` tiene acceso a todas las funcionalidades, sin importar su rol.
