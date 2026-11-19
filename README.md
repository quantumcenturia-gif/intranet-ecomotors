# Intranet

Intranet corporativa hecha con **Next.js 16**, **Tailwind CSS 4**, **Lucide React** y **Supabase** (login, base de datos y archivos). Lista para desplegar en **Vercel**.

## Funcionalidades

- 🔐 **Login y registro** con email y contraseña (Supabase Auth). Todas las páginas requieren sesión.
- 🏠 **Inicio**: saludo, contadores y últimas noticias.
- 📣 **Noticias**: los administradores publican y borran comunicados; el resto los lee.
- 👥 **Directorio**: buscador de empleados por nombre, departamento o cargo.
- 📁 **Documentos**: subir, descargar y borrar archivos (Supabase Storage, bucket privado).
- 👤 **Mi perfil**: cada empleado edita su nombre, cargo, departamento y teléfono.
- 📱 Diseño responsive con menú lateral que se pliega en el móvil.

## Puesta en marcha

### 1. Crear el proyecto en Supabase
1. Crea una cuenta gratuita en https://supabase.com y un proyecto nuevo.
2. Ve a **SQL Editor**, pega el contenido de `supabase/schema.sql` y pulsa **Run**.
   Esto crea las tablas, el bucket `documentos` y las reglas de seguridad (RLS).
3. En **Project Settings → API** copia la *Project URL* y la clave *anon / publishable*.
4. (Opcional) En **Authentication → Sign In / Providers** puedes desactivar "Confirm email" para pruebas, o desactivar el registro público si solo vas a dar de alta usuarios tú.

### 2. Ejecutar en local
```bash
npm install
cp .env.example .env.local   # y rellena las dos variables
npm run dev
```
Abre http://localhost:3000, regístrate y después hazte administrador ejecutando en el SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'tu@empresa.com';
```

### 3. Publicar en Vercel
1. Sube este proyecto a un repositorio de GitHub.
2. En https://vercel.com → **Add New → Project** → importa el repositorio.
3. Añade las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
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
      noticias/ directorio/ documentos/ perfil/
supabase/schema.sql           # Tablas, storage y permisos
```
