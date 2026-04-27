
import { Pet, ChecklistEntry } from '../types';
import { calculateStatus } from './status';

export const getGeneratedMessage = (pet: Pet, entry: Partial<ChecklistEntry>) => {
  if (!pet) return '';
  const petName = pet.pet_nome || 'amigão';
  const tutorName = pet.tutor_nome ? `${pet.tutor_nome}, ` : '';
  const foodStatus = entry.comeu;
  
  let foodInfo = '';

  if (foodStatus === 'Comeu tudo') {
    foodInfo = `Sobre a alimentação: ele comeu super bem e limpou o potinho! 😋 Está tendo um dia maravilhoso e está muito feliz aqui com a gente.`;
  } else if (foodStatus) {
    const isLowAppetite = foodStatus === 'Não comeu' || foodStatus === 'Comeu metade' || foodStatus === 'Comeu menos da metade';
    const nutritionNote = isLowAppetite 
      ? "\n\nCaso continue apresentando falta de apetite, uma consulta com uma nutricionista veterinária pode ser uma ótima opção para ajustar a dieta de forma personalizada."
      : "";
    
    const statusText = (foodStatus as string).toLowerCase();
    foodInfo = `Sobre a alimentação: ele ${statusText}.${nutritionNote}`;
  }

  const message = [
    `Olá ${tutorName}! Passando para dar notícias do ${petName} hoje.`,
    foodInfo,
    entry.observacoes ? `Observação: ${entry.observacoes}` : ''
  ].filter(Boolean).join('\n\n');

  return message;
};
