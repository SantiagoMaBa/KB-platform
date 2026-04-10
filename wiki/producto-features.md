# KB Platform — Features del MVP

> Compilado: 2026-04-10 | Fuente: `raw/producto-kb-features.md`

---

## 1. Metadata por documento

Cada documento raw expone cuatro campos editables desde el panel Admin:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `display_name` | texto libre | Nombre legible en la UI |
| `description` | texto libre | Resumen del contenido |
| `category` | enum | Contratos · Pagos · Reglamentos · Tarifas · Permisos · Operaciones · Otro |
| `tags` | texto (CSV) | Etiquetas libres separadas por coma |

La metadata se almacena en la tabla `documents` (Supabase/PostgreSQL) junto al path de Storage. Se puede editar en cualquier momento sin necesidad de re-compilar.

**Usos:** filtros en el panel Admin, contexto adicional al LLM durante la compilación, trazabilidad por tipo de documento.

---

## 2. index.md auto-actualizado

Cada vez que se ejecuta `POST /api/compile`, el sistema regenera automáticamente `wiki/index.md` con:

- Lista de todos los documentos compilados
- Categoría y nombre de cada uno
- Ruta al archivo wiki correspondiente

El índice siempre refleja el estado real de la KB. El chat lo usa como punto de entrada para descubrir qué documentos existen antes de leer el contenido completo.

---

## 3. Fuentes de ingesta

### Upload manual

Disponible en Admin → "Subir documento". Formatos aceptados: `.md`, `.txt`, `.pdf`. Los PDFs se procesan con `pdf-parse` y se convierten a `.md` antes de guardarse.

Destino: `clients/{id}/raw/` en Supabase Storage.

### Google Drive

- Autenticación via Service Account (JSON en variable de entorno)
- El admin pega el link de una carpeta de Drive compartida con el service account
- Sincroniza archivos `.md`, `.txt` y `.pdf` (los PDFs se convierten en el servidor)
- Código: `lib/gdrive.ts` + `app/api/sync/gdrive/`

### OneDrive / Microsoft 365

- Autenticación via Client Credentials (Azure App Registration)
- Permiso requerido: `Files.Read.All` (application permission, con consentimiento de administrador)
- El admin pega el link de una carpeta OneDrive
- Código: `lib/onedrive.ts` + `app/api/sync/onedrive/`

> Cada fuente queda registrada en la tabla `sync_sources` con timestamp y conteo del último sync.

### Fuentes planificadas

Notion · SharePoint directo · Dropbox · URL scraping

---

## 4. Arquitectura plug and play por cliente

Cada plaza comercial (cliente) es un tenant completamente aislado:

- **Registro único:** crear un registro en la tabla `clients` es suficiente para activar un nuevo cliente. Sin cambios de código.
- **Storage aislado:** `clients/{client_id}/raw/` y `clients/{client_id}/wiki/` en Supabase Storage.
- **Datos propios:** tablas `documents`, `chat_messages` y `sync_sources` filtradas por `client_id`.
- **Contexto LLM limpio:** el modelo solo recibe documentos del cliente activo — sin contaminación entre clientes.
- **Multi-tenant desde el origen:** esquema de base de datos y buckets diseñados para crecer sin refactors.

---

## Flujo de extremo a extremo

```
Fuente (upload manual / Google Drive / OneDrive)
        │
        ▼
Supabase Storage → clients/{id}/raw/
documents (compiled: false, metadata opcional)
        │
        ▼
Admin: "Compilar KB con IA"
POST /api/compile → GPT-4o-mini
        │
        ▼
Supabase Storage → clients/{id}/wiki/
wiki/index.md  (auto-generado, lista completa)
        │
        ▼
Chat lee wiki/ y responde preguntas con contexto del cliente
```
