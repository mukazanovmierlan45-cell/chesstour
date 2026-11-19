import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { mountTraining } from '../lib/training.js';

// Доску, движок и тренера ведёт модуль training.js; React отвечает за маршрут, доступ и пользователя
export default function TrainingPage() {
  const { user } = useAuth();
  const ref = useRef(null);
  useEffect(() => { mountTraining(ref.current, user); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container">
      <div className="page-head">
        <div><h1 data-type="h">Тренировка с роботом</h1><p data-type="p">Сыграйте партию, а тренер Гамбит разберёт каждый ваш ход — как в разборе партий на шахматных сайтах.</p></div>
      </div>
      <div ref={ref} />
    </div>
  );
}
