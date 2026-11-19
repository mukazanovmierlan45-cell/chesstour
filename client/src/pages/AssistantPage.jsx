import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const STORAGE = 'gambit_chat';
const SUGGESTIONS = [
  'Какой дебют выучить новичку?',
  'Объясни, что такое коэффициент Бухгольца',
  'Какие турниры сейчас открыты для заявки?',
  'Как не зевать фигуры в блице?',
];
const ROBOT = (
  <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="30" y="2" width="4" height="10" rx="2" fill="#111" /><circle cx="32" cy="4" r="4" fill="#c62828" />
    <rect x="8" y="12" width="48" height="40" rx="14" fill="#111" /><rect x="14" y="20" width="36" height="20" rx="10" fill="#2b2b2b" />
    <circle className="eye" cx="24" cy="30" r="4.5" fill="#6be3a8" /><circle className="eye" cx="40" cy="30" r="4.5" fill="#6be3a8" />
    <rect x="24" y="44" width="16" height="3" rx="1.5" fill="#6b6b67" /></svg>
);

const load = () => { try { return JSON.parse(sessionStorage.getItem(STORAGE)) ?? []; } catch { return []; } };

/** Чат с ИИ-ассистентом клуба. История хранится в браузере и отправляется на сервер целиком. */
export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(load);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE, JSON.stringify(messages)); } catch { /* приватный режим */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (content) => {
    const value = content.trim();
    if (!value || busy) return;
    if (value.length > 2000) { setError('Сообщение не должно превышать 2000 символов'); return; }
    const history = [...messages, { role: 'user', content: value }];
    setMessages(history);
    setText('');
    setError(null);
    setBusy(true);
    try {
      // на сервер уходят последние 20 сообщений диалога
      const { data } = await api('/ai/chat', { method: 'POST', body: { messages: history.slice(-20) } });
      setMessages([...history, data]);
    } catch (e) {
      setError(e.status === 429 ? 'Слишком много сообщений подряд — подождите минуту.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(text); }
  };

  return (
    <div className="container">
      <div className="page-head">
        <div><h1 data-type="h">ИИ-ассистент клуба</h1><p data-type="p">Гамбит-бот на Google Gemini: спросите про шахматы, турниры клуба или работу сайта.</p></div>
        {messages.length > 0 && <button className="secondary" onClick={() => { setMessages([]); setError(null); }}>Новый диалог</button>}
      </div>

      <div className="chat">
        <div className="chat-log" ref={listRef} aria-live="polite">
          {messages.length === 0 && (
            <div className="chat-hello">
              <div className="robot big">{ROBOT}</div>
              <h3>Привет, {user?.name?.split(' ')[0]}! Я Гамбит-бот.</h3>
              <p className="muted">Знаю правила, дебюты и турниры нашего клуба. С чего начнём?</p>
              <div className="chat-suggest">
                {SUGGESTIONS.map((s) => <button key={s} className="chip-btn" onClick={() => send(s)}>{s}</button>)}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.role === 'assistant' && <div className="robot">{ROBOT}</div>}
              <div className="msg-bubble">{m.content}</div>
            </div>
          ))}
          {busy && (
            <div className="msg assistant">
              <div className="robot thinking">{ROBOT}</div>
              <div className="msg-bubble typing"><i /><i /><i /></div>
            </div>
          )}
        </div>
        {error && <div className="chat-error" role="alert">{error}</div>}
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} rows={1}
            placeholder="Напишите вопрос… (Enter — отправить, Shift+Enter — новая строка)" aria-label="Сообщение ассистенту" maxLength={2000} />
          <button type="submit" disabled={busy || !text.trim()}>Отправить</button>
        </form>
        <p className="hint">Ответы генерирует ИИ и могут содержать ошибки. Не отправляйте личные данные: сообщения передаются в Google Gemini.</p>
      </div>
    </div>
  );
}
