import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

async function api(path, body) {
  const response = await fetch(`/api/${path}`, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос');
  return data;
}

function App() {
  const [sessionId, setSessionId] = useState('');
  const [items, setItems] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  function saveHistory(id, nextItems) {
    setItems(nextItems);
    try { localStorage.setItem(`ai-gateway:${id}`, JSON.stringify(nextItems)); } catch { /* Кеш необязателен. */ }
  }

  async function loadHistory() {
    setLoading(true);
    setError('');
    setItems([]);
    setSessionId('');
    try {
      const { sessionId: id } = await api('session', {});
      setSessionId(id);
      try {
        const cached = JSON.parse(localStorage.getItem(`ai-gateway:${id}`));
        if (Array.isArray(cached) && cached.every(item => item &&
          typeof item.id === 'string' && typeof item.prompt === 'string' &&
          typeof item.answer === 'string' && typeof item.createdAt === 'string')) {
          setItems(cached.slice(0, 50));
        }
      } catch { /* Повреждённый кеш не мешает загрузить историю из БД. */ }
      const { items: history } = await api('history');
      saveHistory(id, history);
    } catch (error) {
      setError(error.message || 'Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  async function submit(event) {
    event.preventDefault();
    if (sending || !prompt.trim() || [...prompt.trim()].length > 8000) return;
    setSending(true);
    setError('');
    try {
      const { item } = await api('requests', { prompt });
      saveHistory(sessionId, [item, ...items.filter(old => old.id !== item.id)].slice(0, 50));
      setPrompt('');
    } catch (error) {
      setError(`${error.message || 'Ошибка сети'}. Обновите историю перед повторной отправкой.`);
    } finally {
      setSending(false);
    }
  }

  return <main>
    <header>
      <span className="eyebrow">ПРОСТОЙ ДОСТУП К ИИ</span>
      <h1>AI Gateway<span>.</span></h1>
      <p>Задайте вопрос. Получите ответ. Вернитесь к нему позже.</p>
    </header>
    <form onSubmit={submit}>
      <label htmlFor="prompt">Ваш запрос</label>
      <textarea id="prompt" rows={5} value={prompt} disabled={sending}
        onChange={event => setPrompt(event.target.value)} placeholder="Что вы хотите узнать?" />
      <div className="form-footer">
        <small>{[...prompt.trim()].length} / 8000</small>
        <button disabled={loading || sending || !sessionId || !prompt.trim() || [...prompt.trim()].length > 8000}>
          {sending ? 'Ожидаем ответ…' : 'Отправить →'}
        </button>
      </div>
    </form>
    <p className="privacy">Без регистрации. История сохраняется в браузере и на сервере.
      Текст запроса передаётся AI-провайдеру. Каждый вопрос отправляется отдельно.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <section aria-labelledby="history-title">
      <div className="history-heading">
        <h2 id="history-title">История <span>{items.length}</span></h2>
        <button type="button" className="secondary" disabled={loading || sending} onClick={loadHistory}>Обновить историю</button>
      </div>
      <p role="status">{loading ? 'Загружаем историю…' : sending ? 'ИИ готовит ответ…' : ''}</p>
      {!loading && items.length === 0 && <div className="empty">Здесь появятся ваши вопросы и ответы.</div>}
      {items.map(item => <article key={item.id}>
        <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('ru-RU')}</time>
        <h3>Вы</h3><p className="text">{item.prompt}</p>
        <h3 className="answer-label">ИИ</h3><p className="text">{item.answer}</p>
      </article>)}
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
