# Intranet · Eco Motors

Intranet del Semillero Eco Motors (FIM UNI) hecha con **Next.js 16**, **Tailwind CSS 4**, **Lucide React** y **Supabase** (login, base de datos y archivos). Lista para desplegar en **Vercel**.

## Funcionalidades

- 🔐 **Login y registro** con email y contraseña (Supabase Auth). Todas las páginas requieren sesión.
- 🏠 **Inicio**: saludo, contadores y últimas noticias.
- 📣 **Noticias**: los administradores publican y borran comunicados; el resto los lee.
- ✅ **Tareas** jerárquicas (tarea madre → subtareas) por unidad, con responsable, prioridad, fecha límite, avance, entrega, evidencias, revisión del encargado y comentarios.
- 👥 **Directorio** con fotos, roles y ficha de cada integrante, agrupado por área.
- 📅 **Calendario** editable por supervisores y encargados.
- 🚀 **Proyectos** con imagen y tareas enlazadas.
- 🛡️ **Administración** (coordinación): unidades, roles, correos de los integrantes y botón de **importar desde Notion** (respaldo).

### Permisos
| Rol | Puede |
|---|---|
| Coordinador general (o admin) | Todo |
| Supervisor/a · Encargado/a | Crear, asignar, editar y validar tareas de su unidad y las que cuelgan de ella; publicar noticias y actividades |
| Integrante | Ver las tareas de su subárea, actualizar avance/entrega/evidencias de sus tareas y crear tareas propias |

La cuenta de cada persona se vincula a su ficha cuando coordinación escribe su correo en Administración.
- 📁 **Documentos**: subir, descargar y borrar archivos (Supabase Storage, bucket privado).
- 👤 **Mi perfil**: cada empleado edita su nombre, cargo, departamento y teléfono.
- 📱 Diseño responsive con menú lateral que se pliega en el móvil.

## Puesta en marcha

### 1. Crear el proyecto en Supabase
1. Crea una cuenta gratuita en https://supabase.com y un proyecto nuevo.
2. Ve a **SQL Editor** y ejecuta, en este orden, `supabase/schema.sql`, `supabase/02_tareas_y_miembros.sql` y `supabase/03_avisos_horas_documentos.sql`.
   Esto crea las tablas, el bucket `documentos` y las reglas de seguridad (RLS).
3. En **Project Settings → API** copia la *Project URL* y la clave *anon / publishable*.
4. (Opcional) En **Authentication → Sign In / Providers** puedes desactivar "Confirm email" para pruebas, o desactivar el registro público si solo vas a dar de alta usuarios tú.

### 2. Conectar Notion
1. En https://www.notion.so/profile/integrations crea una integración **interna** (p. ej. "Intranet web") y copia su token.
2. En Notion abre las bases **Miembros por subárea** y **📅 Calendario general · Eco Motors** → ••• → **Conexiones** → añade la integración.
   La integración solo necesita estas dos bases (lectura). No compartas el Padrón general.

### 3. Ejecutar en local
```bash
npm install
cp .env.example .env.local   # y rellena las dos variables
npm run dev
```
Abre http://localhost:3000, regístrate y después hazte administrador ejecutando en el SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'tu@empresa.com';
```

### 4. Publicar en Vercel
1. Sube este proyecto a un repositorio de GitHub.
2. En https://vercel.com → **Add New → Project** → importa el repositorio.
3. Añade las variables de entorno `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NOTION_TOKEN`.
4. Pulsa **Deploy**.
5. En Supabase → **Authentication → URL Configuration**, pon como *Site URL* la dirección que te dé Vercel.

## Estructura

```
src/
  proxy.ts                    # Protege las rutas: sin sesión → /login
  lib/supabase/               # Clientes de Supabase (servidor y navegador)
  components/                 # Sidebar y cabeceras
  app/
    login/                    # Pantalla de acceso y registro
    auth/signout/             # Cerrar sesión
    (intranet)/               # Zona privada con menú lateral
      page.tsx                # Inicio
      noticias/ directorio/ calendario/ documentos/ perfil/
  lib/notion.ts               # Lectura de las bases de Notion
  data/eco-motors.ts          # Proyectos, enlaces rápidos y colores (editable)
supabase/schema.sql           # Tablas, storage y permisos
```
