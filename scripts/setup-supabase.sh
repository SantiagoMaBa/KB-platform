#!/usr/bin/env bash
# Setup Supabase: aplica migración y configura el bucket.
# Prerrequisito: supabase CLI instalado y autenticado.
# Ejecutar: bash scripts/setup-supabase.sh

set -e

PROJECT_REF="amtypuoaucrgtlfjcvyv"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

echo "🚀 Aplicando migración inicial a Supabase..."

if [ -z "$DB_PASSWORD" ]; then
  echo "⚠️  SUPABASE_DB_PASSWORD no definida."
  echo "   Puedes aplicar la migración manualmente copiando el contenido de:"
  echo "   supabase/migrations/001_initial.sql"
  echo "   en el SQL Editor de tu proyecto Supabase:"
  echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
  exit 0
fi

# Push migration via supabase CLI (requires supabase login)
supabase db push --project-ref "$PROJECT_REF"

echo "✅ Migración aplicada correctamente."
