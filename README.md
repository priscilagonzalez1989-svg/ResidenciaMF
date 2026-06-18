# ResidenciaMF — Sistema de Evaluación

App web para la evaluación de residentes de Medicina Familiar con autenticación por magic link, banco de preguntas en Supabase y corrección automática por IA.

---

## Stack
- **Frontend:** React + Vite
- **Auth y base de datos:** Supabase
- **Corrección IA:** OpenRouter vía función serverless en Vercel
- **Deploy:** Vercel

---

## Cómo correr en local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de variables de entorno
cp .env.example .env
# Completar las variables del archivo .env

# 3. Correr en modo desarrollo
npm run dev
```

Abre http://localhost:5173 en el navegador.

---

## Variables de entorno necesarias

Crear un archivo `.env` en la raíz del proyecto:

```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_SITE_URL=https://www.examenmedfam.online
OPENROUTER_APP_NAME=ResidenciaMF
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Notas:

- `OPENROUTER_API_KEY` se usa solo en el backend de Vercel y no debe llevar prefijo `VITE_`.
- `VITE_SUPABASE_ANON_KEY` es el nombre recomendado para la clave pública de Supabase.
- Por compatibilidad, el cliente también acepta `VITE_SUPABASE_KEY` si todavía existe en un entorno viejo.

En Vercel, configurar estas variables en:
Settings → Environment Variables

---

## Deploy en Vercel

1. Subir este repositorio a GitHub
2. Entrar a vercel.com → "Add New Project"
3. Conectar el repositorio de GitHub
4. En "Environment Variables" agregar:
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_SITE_URL`
   - `OPENROUTER_APP_NAME`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click en "Deploy" — listo

Vercel detecta automáticamente que es un proyecto Vite y configura todo solo.

---

## Estructura del proyecto

```
residencia-mf/
├── src/
│   ├── App.jsx        ← Componente principal con toda la lógica
│   ├── main.jsx       ← Entry point
│   └── index.css      ← Estilos base
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## Notas operativas

- Los magic links de Supabase deben redirigir a `https://www.examenmedfam.online`.
- La corrección de OpenRouter se resuelve desde `/api/openrouter-grade` para no exponer la API key en el navegador.
- Los scripts de carga de banco usan `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env` solo para tareas administrativas locales.
