import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container">
      <div className="card empty">
        <span className="empty-glyph">♔</span>
        <h1>Такой страницы нет</h1>
        <p>Похоже, этот ход невозможен. <Link to="/">Вернуться на главную</Link></p>
      </div>
    </div>
  );
}
