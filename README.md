# KB Platform — Plazas Comerciales

Plataforma inteligente de gestión de conocimiento para plazas comerciales. Permite subir documentos, compilarlos con IA (GPT-4o-mini) y consultarlos mediante un chat conversacional.

## Stack

- **Frontend / Backend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Base de datos / Storage:** Supabase (PostgreSQL + Storage)
- **IA:** OpenAI gpt-4o-mini (server-side únicamente)
- **Ingesta externa:** Google Drive API (service account) + Microsoft Graph API (client credentials)
- **Deploy:** Vercel

---

## Variables de entorno

Copia `.env.local` y rellena los valores. **Nunca commitees `.env.local`** — está en `.gitignore`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=

# Google Drive
GOOGLE_SERVICE_ACCOUNT_JSON=

# OneDrive / Microsoft Graph
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

---

## Google Drive — Credenciales

### 1. Crear un proyecto en Google Cloud

1. Ve a [console.cloud.google.com](https://console.cloud.google.com/)
2. Crea un nuevo proyecto (p. ej. `kb-platform`)
3. En el menú lateral → **APIs y servicios** → **Biblioteca**
4. Busca y habilita: **Google Drive API**

### 2. Crear una Service Account

1. **APIs y servicios** → **Credenciales** → **+ Crear credenciales** → **Cuenta de servicio**
2. Nombre: `kb-sync` (o el que prefieras)
3. Rol: no es necesario asignar roles de proyecto (el acceso se da a nivel de carpeta en Drive)
4. Clic en **Listo**

### 3. Generar la clave JSON

1. En la lista de cuentas de servicio, haz clic en la que creaste
2. Pestaña **Claves** → **Agregar clave** → **Crear nueva clave** → **JSON**
3. Se descargará un archivo `.json` con este formato:
   ```json
   {
     "type": "service_account",
     "project_id": "...",
     "private_key_id": "...",
     "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
     "client_email": "kb-sync@tu-proyecto.iam.gserviceaccount.com",
     ...
   }
   ```

### 4. Configurar la variable de entorno

El JSON debe ir en **una sola línea** en `.env.local`:

```bash
# En tu terminal, convierte el JSON a una línea:
cat tu-service-account.json | tr -d '\n' | sed 's/"/\\"/g'

# Luego copia el resultado en .env.local:
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

> **Truco:** En macOS/Linux también puedes hacer `cat tu-service-account.json | jq -c .` y pegar el output.

### 5. Compartir la carpeta de Drive con el service account

1. En Google Drive, abre la carpeta que quieres sincronizar
2. Haz clic en **Compartir**
3. Agrega el email del service account: `kb-sync@tu-proyecto.iam.gserviceaccount.com`
4. Permiso: **Lector** (no necesita más)
5. Copia el link de la carpeta: `https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing`
6. Pega el link en el panel Admin → Fuentes externas → Google Drive

### Archivos soportados en Google Drive

| Extensión | Comportamiento |
|-----------|---------------|
| `.md` | Descarga directa → raw/ |
| `.txt` | Descarga directa → raw/ como `.txt` |
| `.pdf` | Extrae texto → guarda como `.md` |

---

## OneDrive — Credenciales

### 1. Registrar una aplicación en Azure

1. Ve a [portal.azure.com](https://portal.azure.com/) → **Azure Active Directory** → **Registros de aplicaciones**
2. Clic en **+ Nuevo registro**
   - Nombre: `KB Platform Sync`
   - Tipo de cuenta: **Solo esta organización** (o "Cualquier directorio de Azure AD")
   - URI de redirección: dejar vacío (no se usa OAuth del usuario)
3. Clic en **Registrar**

### 2. Copiar los IDs

En la página de la app recién creada anota:
- **ID de aplicación (cliente)** → `MICROSOFT_CLIENT_ID`
- **ID de directorio (inquilino)** → `MICROSOFT_TENANT_ID`

### 3. Crear un secreto de cliente

1. En el menú lateral → **Certificados y secretos** → **+ Nuevo secreto de cliente**
2. Descripción: `kb-sync`; Expira: 24 meses
3. Copia el **Valor** inmediatamente (no se muestra de nuevo) → `MICROSOFT_CLIENT_SECRET`

### 4. Asignar permisos de API

1. **Permisos de API** → **+ Agregar un permiso** → **Microsoft Graph** → **Permisos de aplicación**
2. Busca y agrega:
   - `Files.Read.All`
3. Clic en **Conceder consentimiento de administrador para [tu organización]**

### 5. Compartir la carpeta de OneDrive

1. En OneDrive, abre la carpeta
2. Clic en **Compartir** → **Cualquier persona con el vínculo puede ver**
3. Copia el link (ejemplo: `https://1drv.ms/f/...` o `https://onedrive.live.com/...`)
4. Pega el link en el panel Admin → Fuentes externas → OneDrive

> **Nota:** Con cuentas personales de OneDrive (onedrive.live.com), los permisos de aplicación pueden estar limitados. OneDrive for Business / SharePoint Online tiene mejor soporte para client credentials.

### Archivos soportados en OneDrive

| Extensión | Comportamiento |
|-----------|---------------|
| `.md` | Descarga directa → raw/ |
| `.txt` | Descarga directa → raw/ |
| `.pdf` | Extrae texto → guarda como `.md` |

---

## Setup inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Migración en Supabase

Las migraciones corren automáticamente en CI/CD al hacer push a `main` (ver sección **CI/CD — Migraciones automáticas**).

Para correrlas manualmente desde tu máquina, necesitas dos variables de entorno:

```bash
export SUPABASE_ACCESS_TOKEN=<tu_token>   # obtenido en supabase.com/dashboard/account/tokens
export SUPABASE_DB_PASSWORD=<tu_password>  # contraseña del proyecto en Settings → Database
```

Luego:

```bash
# Ver qué migraciones se aplicarían (sin ejecutar)
npm run migrate:dry

# Aplicar migraciones pendientes
npm run migrate
```

El CLI trackea las migraciones aplicadas en `supabase_migrations.schema_migrations`, por lo que es **idempotente** — ya no tienes que copiar SQL manualmente en el editor.

### 3. Poblar KB demo (Plaza Centro Norte)

```bash
npm run seed
```

### 4. Correr localmente

```bash
npm run dev
```

Abre `http://localhost:3000`

### 5. Compilar la KB con IA

En `http://localhost:3000/admin` → **Compilar KB con IA**

### 6. Deploy en Vercel

```bash
git push origin main
```

En el dashboard de Vercel → **Settings** → **Environment Variables**, agrega todas las variables de `.env.local`.

> `OPENAI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `MICROSOFT_*` **nunca** deben tener prefijo `NEXT_PUBLIC_`.

---

## CI/CD — Migraciones automáticas

El workflow `.github/workflows/migrate.yml` corre `supabase db push` automáticamente en cada push a `main` que incluya cambios en `supabase/migrations/*.sql`.

### Secrets y variables requeridos en GitHub

Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions**.

#### Secrets (valores sensibles — nunca visibles tras guardarlos)

| Secret | Valor | Dónde obtenerlo |
|--------|-------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | Token personal de API de Supabase | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token** |
| `SUPABASE_DB_PASSWORD` | Contraseña de la base de datos del proyecto | [supabase.com/dashboard/project/amtypuoaucrgtlfjcvyv/settings/database](https://supabase.com/dashboard/project/amtypuoaucrgtlfjcvyv/settings/database) → **Database password** (la que pusiste al crear el proyecto, o haz reset ahí mismo) |

#### Variables (valores no sensibles — visibles en los logs)

| Variable | Valor |
|----------|-------|
| `SUPABASE_PROJECT_REF` | `amtypuoaucrgtlfjcvyv` |

Ve a **Settings** → **Secrets and variables** → **Actions** → pestaña **Variables** → **New repository variable**.

### Cómo agregar los secrets paso a paso

1. Abre tu repositorio en GitHub
2. Clic en **Settings** (pestaña superior derecha)
3. En el menú lateral: **Secrets and variables** → **Actions**
4. Clic en **New repository secret**
5. Nombre: `SUPABASE_ACCESS_TOKEN` → pega el token → **Add secret**
6. Repite para `SUPABASE_DB_PASSWORD`
7. Pestaña **Variables** → **New repository variable**
8. Nombre: `SUPABASE_PROJECT_REF`, Valor: `amtypuoaucrgtlfjcvyv` → **Add variable**

### Cómo funciona el workflow

```
push a main (con cambios en supabase/migrations/)
        │
        ▼
GitHub Actions: ubuntu-latest
        │
        ├── checkout del repo
        ├── instala Supabase CLI oficial (supabase/setup-cli@v1)
        ├── supabase link --project-ref amtypuoaucrgtlfjcvyv
        │       └── autentica con SUPABASE_ACCESS_TOKEN
        └── supabase db push
                ├── conecta con SUPABASE_DB_PASSWORD
                ├── lee supabase/migrations/*.sql en orden numérico
                ├── compara con supabase_migrations.schema_migrations
                └── solo aplica las migraciones nuevas (idempotente)
```

### Correr el workflow manualmente

1. Ve a la pestaña **Actions** del repositorio
2. Selecciona **Supabase Migrations**
3. Clic en **Run workflow** → **Run workflow**

### Agregar una nueva migración

```bash
# 1. Crea el archivo con numeración secuencial
touch supabase/migrations/004_nueva_tabla.sql

# 2. Escribe el SQL
# 3. Commit y push
git add supabase/migrations/004_nueva_tabla.sql
git commit -m "feat: add tabla X"
git push origin main

# El workflow corre automáticamente y aplica solo la migración nueva.
```

---

## Estructura del proyecto

```
app/
├── api/
│   ├── chat/          — OpenAI server-side (OPENAI_API_KEY)
│   ├── compile/       — Compila raw/ → wiki/ con GPT-4o-mini
│   ├── upload/        — Subida manual de archivos
│   ├── clients/       — CRUD clientes
│   ├── documents/     — Lista documentos raw + wiki
│   └── sync/
│       ├── sources/   — CRUD fuentes de sincronización
│       ├── gdrive/    — Sync desde Google Drive
│       └── onedrive/  — Sync desde OneDrive
├── dashboard/         — Métricas de la plaza
├── chat/              — Chat conversacional con la KB
└── admin/             — Panel: upload, sync, compilación
lib/
├── supabase.ts        — Cliente Supabase
├── openai.ts          — Cliente OpenAI (solo server-side)
├── kb.ts              — Leer/escribir/listar en Storage
├── gdrive.ts          — Google Drive API (server-side)
├── onedrive.ts        — Microsoft Graph API (server-side)
└── pdf.ts             — Extracción de texto de PDFs
```

---

## Flujo de sincronización externa

```
Admin pega link de carpeta
        │
        ▼
POST /api/sync/gdrive (o /onedrive)
        │
        ├── Autentica con service account / client credentials
        ├── Lista archivos .md / .txt / .pdf en la carpeta
        ├── Para cada archivo:
        │       ├── Descarga el binario
        │       ├── Si es PDF: extrae texto con pdf-parse → convierte a .md
        │       └── Sube a Supabase Storage → clients/{id}/raw/
        ├── Registra en tabla documents (compiled: false)
        └── Actualiza sync_sources (last_sync_at, last_sync_count)
        
Admin hace clic en "Compilar KB con IA"
        │
        ▼
POST /api/compile → GPT-4o-mini transforma raw/ → wiki/

Chat lee wiki/ y responde preguntas
```
