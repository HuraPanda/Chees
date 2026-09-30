import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import pg from 'pg';

const { DATABASE_URL, AI_API_KEY, AI_MODEL } = process.env;
if (!DATABASE_URL?.trim()) throw new Error('Укажите DATABASE_URL в .env');
const port = Number(process.env.PORT || 3000);
const origin = process.env.APP_ORIGIN || `http://localhost:${port}`;
const aiUrl = `${(process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/chat/completions`;
const timeout = Number(process.env.AI_TIMEOUT_MS || 60000);
if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120000) {
  throw new Error('AI_TIMEOUT_MS должен быть от 1 до 120000');
}

export const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });
pool.on('error', () => console.error('Ошибка соединения с PostgreSQL'));
await pool.query(`
  CREATE TABLE IF NOT EXISTS gateway_sessions (
    id UUID PRIMARY KEY,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
  );
  CREATE TABLE IF NOT EXISTS gateway_requests (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES gateway_sessions(id),
    prompt TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS gateway_history_idx
    ON gateway_requests (session_id, created_at DESC, id DESC);
`);

export const app = express();
app.disable('x-powered-by');
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'POST') {
    const requestOrigin = req.get('origin');
    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    if (requestOrigin && requestOrigin !== origin && requestOrigin !== hostOrigin) {
      return res.status(403).json({ error: 'Недопустимый источник запроса' });
    }
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Ожидается application/json' });
    }
  }
  next();
});
app.use(express.json({ limit: '64kb' }));
app.use('/api', async (req, res, next) => {
  const token = req.headers.cookie?.match(/(?:^|;\s*)ai_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (token) {
    const hash = createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      'SELECT id FROM gateway_sessions WHERE token_hash = $1 AND expires_at > now()', [hash],
    );
    req.sessionId = result.rows[0]?.id;
  }
  if (!req.sessionId && !(req.method === 'POST' && req.path === '/session')) {
    return res.status(401).json({ error: 'Сессия истекла. Обновите страницу.' });
  }
  next();
});

app.post('/api/session', async (req, res) => {
  if (!req.sessionId) {
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    req.sessionId = randomUUID();
    await pool.query(
      "INSERT INTO gateway_sessions (id, token_hash, expires_at) VALUES ($1, $2, now() + interval '30 days')",
      [req.sessionId, hash],
    );
    const flags = ['HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${30 * 86400}`];
    if (process.env.COOKIE_SECURE === 'true') flags.push('Secure');
    res.setHeader('Set-Cookie', `ai_session=${token}; ${flags.join('; ')}`);
  }
  res.json({ sessionId: req.sessionId });
});

app.get('/api/history', async (req, res) => {
  const result = await pool.query(
    `SELECT id, prompt, answer, created_at AS "createdAt" FROM gateway_requests
     WHERE session_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`, [req.sessionId],
  );
  res.json({ items: result.rows });
});

app.post('/api/requests', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt || [...prompt].length > 8000) {
    return res.status(400).json({ error: 'Введите запрос от 1 до 8000 символов' });
  }
  if (!AI_API_KEY?.trim() || !AI_MODEL?.trim()) {
    return res.status(503).json({ error: 'AI API не настроен: укажите AI_API_KEY и AI_MODEL в .env' });
  }
  let answer;
  try {
    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 2048 }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return res.status(response.status === 429 ? 429 : 502).json({ error: 'AI-провайдер недоступен. Попробуйте позже.' });
    }
    const data = await response.json();
    answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('Empty AI response');
  } catch (error) {
    const timedOut = error.name === 'TimeoutError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'Время ожидания ответа ИИ истекло' : 'Не удалось получить ответ ИИ',
    });
  }
  const result = await pool.query(
    `INSERT INTO gateway_requests (id, session_id, prompt, answer) VALUES ($1, $2, $3, $4)
     RETURNING id, prompt, answer, created_at AS "createdAt"`,
    [randomUUID(), req.sessionId, prompt, answer],
  );
  res.status(201).json({ item: result.rows[0] });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Маршрут не найден' }));
app.use(express.static(fileURLToPath(new URL('./dist/client', import.meta.url))));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 503;
  res.status(status).json({ error: status === 503 ? 'Хранилище временно недоступно' : 'Некорректный JSON или слишком большой запрос' });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = app.listen(port, '127.0.0.1', () => console.log(`AI Gateway: http://localhost:${port}`));
  const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
