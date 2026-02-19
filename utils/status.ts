
import { ChecklistEntry, DayStatus } from '../types';

export const calculateStatus = (data: Partial<ChecklistEntry>): DayStatus => {
  const { comeu, agua, escoreFecal } = data;

  if (!comeu || !agua || !escoreFecal) return 'Pendente';

  // Alerta: Não comeu OR Não bebeu OR escore 1 ou 5
  if (comeu === 'Não comeu' || agua === 'Não bebeu nada' || escoreFecal === 1 || escoreFecal === 5) {
    return 'Alerta';
  }

  // OK: Comeu tudo + Bebeu bastante + Escore 3
  if (comeu === 'Comeu tudo' && agua === 'Bebeu muita água' && escoreFecal === 3) {
    return 'OK';
  }

  // Atenção: Sobra de condições (ex: comeu metade, bebeu pouco, etc)
  return 'Atenção';
};

export const getStatusColor = (status: DayStatus) => {
  switch (status) {
    case 'OK': return 'bg-emerald-500';
    case 'Atenção': return 'bg-amber-400';
    case 'Alerta': return 'bg-rose-500';
    default: return 'bg-slate-300';
  }
};

export const getStatusEmoji = (status: DayStatus) => {
  switch (status) {
    case 'OK': return '🟢';
    case 'Atenção': return '🟡';
    case 'Alerta': return '🔴';
    default: return '⚪';
  }
};
