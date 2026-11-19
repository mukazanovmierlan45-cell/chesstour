import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { API_HEALTH_URL } from '../config.js';
import { pieceSVG } from '../lib/pieces.js';
import { Avatar } from './ui.jsx';

const Brand = () => (
  <Link to="/" className="brand" aria-label="Гамбит, на главную">
    <span className="brand-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: pieceSVG('k', 'w') }} />
    <span><span className="brand-name">Гамбит</span><span className="brand-sub">турниры шахматного клуба</span></span>
  </Link>
);

function Header() {
  const { user, hasRole, logout } = useAuth();
  const flash = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { document.body.classList.toggle('menu-open', open); }, [open]);

  const link = (to, label, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>
  );

  const onLogout = async (event) => {
    event.preventDefault();
    await logout();
    flash('Вы вышли из системы');
    navigate('/login');
  };

  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <Brand />
      <button className="nav-toggle" aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open}
        aria-controls="nav" onClick={() => setOpen(!open)}><span /></button>
      <nav id="nav" aria-label="Основное меню">
        {link('/tournaments', 'Турниры', true)}
        {user ? (
          <>
            {link('/my', 'Мои турниры')}
            {link('/training', 'Тренировка')}
            {hasRole('organizer', 'admin') && link('/tournaments/new', 'Новый турнир')}
            {hasRole('admin') && link('/admin', 'Администрирование')}
            <span className="who"><span>{user.name}<small>{user.role_label}</small></span><Avatar name={user.name} /></span>
            <a href="#" onClick={onLogout}>Выйти</a>
          </>
        ) : (
          <>
            {link('/login', 'Вход')}
            <Link to="/register" className="btn" style={{ padding: '8px 14px' }}>Регистрация</Link>
          </>
        )}
      </nav>
    </header>
  );
}

function Footer() {
  const [api, setApi] = useState(null);
  useEffect(() => {
    fetch(API_HEALTH_URL, { headers: { Accept: 'application/json' } })
      .then((r) => setApi(r.ok))
      .catch(() => setApi(false));
  }, []);

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Brand />
          <p>Заявки, жеребьёвка, результаты и турнирные таблицы в одном месте — для игроков, судей и руководителей клуба.</p>
        </div>
        <div>
          <h3>Турниры</h3>
          <ul>
            <li><Link to="/tournaments?status=registration">Идёт регистрация</Link></li>
            <li><Link to="/tournaments?status=ongoing">Играются сейчас</Link></li>
            <li><Link to="/tournaments?status=finished">Завершённые</Link></li>
          </ul>
        </div>
        <div>
          <h3>Участникам</h3>
          <ul>
            <li><Link to="/register">Создать аккаунт</Link></li>
            <li><Link to="/training">Тренировка с роботом</Link></li>
            <li><Link to="/my">Мои турниры</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Гамбит. Курсовой проект, ВК «ASTANA POLYTECHNIC»</span>
        <span>
          <span className={`api-dot ${api === null ? '' : api ? 'on' : 'off'}`} />
          {api === null ? 'Проверяем сервер…' : api ? 'Сервер работает' : 'Сервер недоступен'}
        </span>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <Header />
      <main><Outlet /></main>
      <Footer />
    </>
  );
}
