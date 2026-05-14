# ResidenciaMF — Sistema de Evaluación

App web para la evaluación de residentes de Medicina Familiar con corrección automática por IA.

---

## Stack
- **Frontend:** React + Vite
- **Corrección IA:** Claude API (Anthropic)
- **Deploy:** Vercel

---

## Cómo correr en local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de variables de entorno
cp .env.example .env
# Completar VITE_ANTHROPIC_API_KEY con tu API key

# 3. Correr en modo desarrollo
npm run dev
```

Abre http://localhost:5173 en el navegador.

---

## Variables de entorno necesarias

Crear un archivo `.env` en la raíz del proyecto:

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

En Vercel, configurar esta misma variable en:
Settings → Environment Variables

---

## Deploy en Vercel

1. Subir este repositorio a GitHub
2. Entrar a vercel.com → "Add New Project"
3. Conectar el repositorio de GitHub
4. En "Environment Variables" agregar `VITE_ANTHROPIC_API_KEY`
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

## Próximos pasos

- [ ] Conectar Supabase para auth y base de datos real
- [ ] Cargar banco completo de 247 preguntas
- [ ] Agregar R4 al banco
- [ ] Panel admin para cargar nuevas preguntas
- [ ] Conectar dominio personalizado
