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

Ejecuta los siguientes SQL en el **SQL Editor** de tu proyecto Supabase:
- `supabase/migrations/001_initial.sql` — tablas principales + bucket
- `supabase/migrations/002_sync_sources.sql` — tabla sync_sources

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

En el dashboard de Vercel → **Settings** → **Environment Variables**, agrega todas las variables de `.env.local` (excepto las `NEXT_PUBLIC_` que ya estarán en el repo si las commiteas sin el `.local`).

> Recuerda: `OPENAI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `MICROSOFT_*` **nunca** deben tener prefijo `NEXT_PUBLIC_`.

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
