const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// ── POSTGRESQL ───────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outfits (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      prompt    TEXT DEFAULT '',
      settings  JSONB NOT NULL,
      tipo      TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ PostgreSQL listo');
}

// ── GROQ ─────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── AI SUGGEST (Groq) ────────────────────────────────────
app.post('/api/ai-suggest', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'GROQ_API_KEY no configurada en variables de entorno' });
  }

  try {
    const chat = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `Eres un experto en diseño de ropa para Roblox. Analiza la descripción y responde SOLO con JSON válido, sin markdown ni texto extra.

Formato exacto:
{
  "c1": "#hexcolor",
  "c2": "#hexcolor",
  "c3": "#hexcolor",
  "patron": "solid|stripes|camo|checks|geo|scales|fire|circuit|pixel|grunge",
  "logo": "dragon|skull|star|lightning|cross|diamond|eye|sword|shield|fire|wings|moon|",
  "texto": "max 4 chars o vacío",
  "cuello": "none|collar|v|hood|high",
  "borde": "none|thin|thick|dashed|glow",
  "nombre": "nombre creativo max 3 palabras en español"
}`
        },
        {
          role: 'user',
          content: `Descripción del outfit: ${prompt}`
        }
      ]
    });

    const raw = chat.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'IA no retornó JSON válido', raw });

    const settings = JSON.parse(jsonMatch[0]);
    res.json({ settings, model: 'llama3-70b-8192' });

  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GUARDAR outfit ───────────────────────────────────────
app.post('/api/outfits', async (req, res) => {
  const { name, prompt, settings, tipo } = req.body;
  if (!name || !settings || !tipo) return res.status(400).json({ error: 'Faltan campos' });

  try {
    const result = await pool.query(
      'INSERT INTO outfits (name, prompt, settings, tipo) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, prompt || '', settings, tipo]
    );
    res.json({ id: result.rows[0].id, message: 'Guardado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LISTAR outfits ───────────────────────────────────────
app.get('/api/outfits', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM outfits ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── OBTENER por ID ───────────────────────────────────────
app.get('/api/outfits/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM outfits WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ELIMINAR ─────────────────────────────────────────────
app.delete('/api/outfits/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM outfits WHERE id = $1', [req.params.id]);
    res.json({ message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HEALTH CHECK (Render lo necesita) ───────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── INIT ─────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🎮 Roblox Outfit Creator en puerto ${PORT}`);
      console.log(`🤖 Groq AI: ${process.env.GROQ_API_KEY ? '✅ configurado' : '❌ falta GROQ_API_KEY'}`);
      console.log(`🗄️  PostgreSQL: ${process.env.DATABASE_URL ? '✅ conectado' : '❌ falta DATABASE_URL'}`);
    });
  })
  .catch(err => {
    console.error('Error iniciando DB:', err.message);
    // Arrancar igual aunque falle la DB (para ver logs en Render)
    app.listen(PORT, () => console.log(`⚠️ Servidor en ${PORT} sin DB`));
  });
