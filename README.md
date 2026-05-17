# PICABOL — Sitio Público de Reservas

Portal público para reservar canchas de pickleball en Cancún.

## Stack
- React 18 + Vite
- Supabase (PostgreSQL + Realtime)
- Netlify (deploy automático desde GitHub)

## Imágenes requeridas en `/public/`
Antes de hacer deploy, sube estos archivos a la carpeta `public/`:
- `logo.webp` — El logo oficial de PICABOL
- `foto.jpg` — La foto de la paleta + bolas amarillas

## Variables de entorno (configurar en Netlify)
```
VITE_SUPABASE_URL=https://gxnherwmvnbhwzkxiqls.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

## Pasos para subir a producción

### 1. Crear repo en GitHub
1. Ve a https://github.com/Reservaspicabol
2. Clic en "New repository"
3. Nombre: `picabol-reservas`
4. Clic "Create repository"

### 2. Subir el código
Descarga el ZIP de este proyecto y en tu terminal:
```bash
cd picabol-publico
git init
git add .
git commit -m "PICABOL sitio publico v1"
git remote add origin https://github.com/Reservaspicabol/picabol-reservas.git
git push -u origin main
```

### 3. Conectar con Netlify
1. Ve a https://app.netlify.com
2. "Add new site" → "Import from Git"
3. Elige el repo `picabol-reservas`
4. Build command: `npm run build`
5. Publish directory: `dist`
6. En "Environment variables" agrega las 3 variables de arriba
7. Clic "Deploy site"

### 4. Subir imágenes
En el repo de GitHub, ve a la carpeta `public/` y sube:
- Tu archivo `logo.webp`
- Tu archivo de foto (renómbralo `foto.jpg`)

Netlify redesplegará automáticamente.

## PIKA — Asistente con IA
PIKA usa la API de Claude (claude-sonnet-4). Necesitas una API key de Anthropic:
1. Ve a https://console.anthropic.com
2. "API Keys" → "Create Key"
3. Pega la key en la variable `VITE_ANTHROPIC_API_KEY` de Netlify

## Cómo aparecen las reservas en el admin
Todas las reservas del sitio público aparecen en el calendario general con:
- `created_by: 'publico'`
- En las notas: `SITIO WEB PUBLICO`

El admin puede filtrar por esto para saber el origen.

## SQL adicional requerido en Supabase
Ejecuta esto en el SQL Editor de Supabase para permitir inserts desde el sitio público:

```sql
-- Permitir que usuarios anónimos puedan crear reservas públicas
CREATE POLICY "public_booking_insert" ON bookings
  FOR INSERT TO anon
  WITH CHECK (created_by = 'publico');

-- Permitir leer bookings para ver disponibilidad
CREATE POLICY "public_booking_read" ON bookings
  FOR SELECT TO anon
  USING (true);

-- Permitir leer tour_bookings para disponibilidad
CREATE POLICY "public_tour_read" ON tour_bookings
  FOR SELECT TO anon
  USING (true);

-- Permitir leer drills para disponibilidad  
CREATE POLICY "public_drills_read" ON drills
  FOR SELECT TO anon
  USING (true);

-- Permitir actualizar (para unirse a sala)
CREATE POLICY "public_booking_update" ON bookings
  FOR UPDATE TO anon
  USING (created_by = 'publico')
  WITH CHECK (created_by = 'publico');
```
