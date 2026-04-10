---
fecha: 2026-04-10
tipo: notas-producto
estado: borrador
---

# KB Platform — Features del MVP (notas crudas)

## 1. Metadata por documento

Cada documento raw tiene campos editables en el panel Admin:
- `display_name` — nombre legible para mostrar en UI
- `description` — descripción corta del contenido
- `category` — categoría fija (Contratos, Pagos, Reglamentos, Tarifas, Permisos, Operaciones, Otro)
- `tags` — etiquetas libres separadas por coma

Migración: `supabase/migrations/003_document_metadata.sql`
Tabla: `documents` (Supabase/PostgreSQL)
Restricción UNIQUE: `(client_id, filename)` para garantizar upsert correcto.

Uso previsto: filtros en el panel Admin, contexto adicional para el LLM al compilar, trazabilidad de documentos por tipo.

---

## 2. index.md auto-actualizado

Al compilar la KB (`POST /api/compile`), el sistema genera un `wiki/index.md` automático que lista todos los documentos compilados con:
- Nombre del documento
- Categoría
- Ruta al archivo wiki correspondiente

El índice se regenera en cada compilación, garantizando que siempre refleje el estado actual de la KB.

Propósito: el chat usa `wiki/index.md` como punto de entrada para saber qué documentos existen antes de leer el contenido completo.

---

## 3. Fuentes de ingesta

### 3a. Upload manual
- Panel Admin → sección "Subir documento"
- Acepta: `.md`, `.txt`, `.pdf`
- PDF: extrae texto con `pdf-parse`, guarda como `.md`
- Destino: Supabase Storage → `clients/{id}/raw/`
- Registra en tabla `documents` (compiled: false)

### 3b. Google Drive (implementado)
- Autenticación: Service Account (JSON en env var)
- Admin pega link de carpeta de Drive
- Sync lista archivos `.md/.txt/.pdf` y los descarga
- `lib/gdrive.ts` + `app/api/sync/gdrive/`
- Tabla `sync_sources` registra cada fuente con `last_sync_at` y `last_sync_count`

### 3c. OneDrive / Microsoft 365 (implementado)
- Autenticación: Client Credentials (Azure App Registration)
- Permisos: `Files.Read.All` (application permissions)
- Admin pega link de carpeta OneDrive
- `lib/onedrive.ts` + `app/api/sync/onedrive/`
- Mejor soporte con OneDrive for Business / SharePoint Online

### Fuentes futuras (pendiente)
- Notion (API oficial)
- SharePoint directo
- Dropbox
- URL scraping / sitemap

---

## 4. Arquitectura plug and play por cliente

Cada cliente (plaza comercial) tiene:
- Registro en tabla `clients` (id, name, slug)
- Bucket aislado en Supabase Storage: `clients/{client_id}/raw/` y `clients/{client_id}/wiki/`
- Documentos propios en tabla `documents` (filtrado por `client_id`)
- Historial de chat independiente en `chat_messages`
- Fuentes de sincronización propias en `sync_sources`

Para agregar un nuevo cliente: solo se crea el registro en la tabla `clients`. Sin cambios de código.

El modelo LLM (GPT-4o-mini) recibe solo el contexto del cliente activo — sin contaminación cruzada entre clientes.

Escalabilidad: los buckets de Storage y las tablas están diseñados para multi-tenant desde el inicio.

---

## Flujo completo resumido

```
Fuente (upload / Drive / OneDrive)
        │
        ▼
    raw/ (Storage)  ←  documents (compiled: false, + metadata)
        │
        ▼
  POST /api/compile  →  GPT-4o-mini
        │
        ▼
    wiki/ (Storage)  +  wiki/index.md (auto-generado)
        │
        ▼
  Chat lee wiki/ y responde con contexto del cliente
```
