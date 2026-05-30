# 🎮 Roblox Outfit Creator — Render + Groq + PostgreSQL

## Deploy en Render (paso a paso)

### 1. Sube el código a GitHub

```bash
# En la carpeta del proyecto:
git init
git add .
git commit -m "first commit"

# Crea un repo en github.com y luego:
git remote set-url origin https://github.com/LuxrDEV/roblox-outfit.git
git push -u origin master
```

### 2. Crea el servicio en Render

1. Ve a https://render.com y entra con tu cuenta
2. Click en **New +** → **Web Service**
3. Conecta tu repo de GitHub
4. Render detecta automáticamente el `render.yaml` — click **Apply**

### 3. Agrega tu GROQ_API_KEY

1. En tu servicio de Render → **Environment**
2. Agrega variable:
   - Key: `GROQ_API_KEY`
   - Value: `gsk_tu_api_key_aqui`
3. Click **Save Changes** → se redeploya solo

### 4. Listo 🎉

Tu app queda en: `https://roblox-outfit-creator.onrender.com`

---

## Obtener API Key de Groq (gratis)

1. Ve a https://console.groq.com
2. Sign in → API Keys → **Create API Key**
3. Copia la key (empieza con `gsk_...`)

---

## Variables de entorno necesarias

| Variable | Descripción |
|----------|-------------|
| `GROQ_API_KEY` | Tu key de Groq (la pones tú manualmente) |
| `DATABASE_URL` | Render la pone automático desde el PostgreSQL |
| `PORT` | Render la pone automático |

---

## Modelo de IA usado

`llama3-70b-8192` — LLaMA 3 70B, muy potente, gratis en Groq.
Para cambiarlo, edita `server.js` línea ~40.
Otros disponibles: `mixtral-8x7b-32768`, `llama3-8b-8192`, `gemma-7b-it`
