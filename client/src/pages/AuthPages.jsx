import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { parallax } from '../lib/board3d.js';
import { FieldError, FloatingLayer } from '../components/ui.jsx';

const ART = [
  ['k', 'w', { x: 8, y: 6, size: 150, rot: -10, depth: 26 }],
  ['n', 'b', { x: 46, y: 22, size: 165, rot: 14, depth: 34, delay: 0.2 }],
  ['p', 'w', { x: 74, y: 2, size: 72, rot: 26, depth: 12, blur: 1.5, delay: 0.4 }],
];

function AuthLayout({ title, text, children }) {
  const side = useRef(null);
  useEffect(() => { parallax(side.current); }, []);
  return (
    <div className="page-full">
      <div className="auth">
        <aside className="auth-side" ref={side}>
          <h2 data-type="h">{title}</h2>
          <p data-type="p">{text}</p>
          <FloatingLayer className="auth-art" items={ART} />
        </aside>
        <div className="auth-main"><div className="auth-box">{children}</div></div>
      </div>
    </div>
  );
}

/** Общая логика формы входа и регистрации: клиентская проверка и ошибки сервера. */
function useAuthForm(initial, required, submit) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const flash = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const onChange = (event) => setValues({ ...values, [event.target.name]: event.target.value });
  const onSubmit = async (event) => {
    event.preventDefault();
    const missing = Object.fromEntries(required.filter((f) => !values[f].trim()).map((f) => [f, 'Обязательное поле']));
    if (values.password_confirmation !== undefined && values.password && values.password !== values.password_confirmation) {
      missing.password_confirmation = 'Пароли не совпадают';
    }
    setErrors(missing);
    if (Object.keys(missing).length) return;

    setBusy(true);
    try {
      const user = await submit(values);
      flash(`Добро пожаловать, ${user.name}!`);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (error) {
      if (error.status === 422) setErrors(error.errors);
      else flash(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const field = (name) => ({ id: name, name, value: values[name], onChange, className: errors[name] ? 'invalid' : '' });
  return { field, errors, busy, onSubmit };
}

export function LoginPage() {
  const { login } = useAuth();
  const { field, errors, busy, onSubmit } = useAuthForm({ email: '', password: '' }, ['email', 'password'], login);
  return (
    <AuthLayout title="С возвращением в клуб" text="Ваши заявки, пары текущего тура и результаты партий ждут в личном кабинете.">
      <h1 data-type="h">Вход</h1>
      <p className="muted">Войдите, чтобы подавать заявки и вести турниры.</p>
      <form onSubmit={onSubmit} noValidate>
        <div className="row"><label htmlFor="email">Email</label><input type="email" autoComplete="username" {...field('email')} /><FieldError errors={errors} name="email" /></div>
        <div className="row"><label htmlFor="password">Пароль</label><input type="password" autoComplete="current-password" {...field('password')} /><FieldError errors={errors} name="password" /></div>
        <button type="submit" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
      <p className="hint">Тестовые учётные записи: admin@chess.test, organizer@chess.test, player@chess.test — пароль password.</p>
      <p style={{ marginTop: 16 }}>Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link></p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const { field, errors, busy, onSubmit } = useAuthForm(
    { name: '', email: '', password: '', password_confirmation: '' },
    ['name', 'email', 'password', 'password_confirmation'], register,
  );
  return (
    <AuthLayout title="Первый ход — регистрация" text="После регистрации вы сможете подавать заявки на турниры клуба, тренироваться с роботом и следить за своими партиями.">
      <h1 data-type="h">Регистрация игрока</h1>
      <p className="muted">Это займёт меньше минуты.</p>
      <form onSubmit={onSubmit} noValidate>
        <div className="row"><label htmlFor="name">Имя и фамилия</label><input {...field('name')} /><FieldError errors={errors} name="name" /></div>
        <div className="row"><label htmlFor="email">Email</label><input type="email" {...field('email')} /><FieldError errors={errors} name="email" /></div>
        <div className="row"><label htmlFor="password">Пароль (не менее 8 символов)</label><input type="password" {...field('password')} /><FieldError errors={errors} name="password" /></div>
        <div className="row"><label htmlFor="password_confirmation">Повторите пароль</label><input type="password" {...field('password_confirmation')} /><FieldError errors={errors} name="password_confirmation" /></div>
        <button type="submit" disabled={busy}>{busy ? 'Создаём аккаунт…' : 'Зарегистрироваться'}</button>
      </form>
      <p style={{ marginTop: 16 }}>Уже есть аккаунт? <Link to="/login">Войдите</Link></p>
    </AuthLayout>
  );
}
