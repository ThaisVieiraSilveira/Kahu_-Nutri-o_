
export type DayStatus = 'Pendente' | 'OK' | 'Atenção' | 'Alerta';

export interface Pet {
  id: string; // ID_PET
  pet_nome: string;
  peso_pet: string;
  dia_semana: string;
  
  // Comportamento Alimentar
  comportamento_alimentar: string;
  precisa_estimulo: string;
  
  // Alimentação Detalhada
  tipo_alimentacao: string;
  quantidade_oferecida: string;
  quantidade_aproximada: string;
  marca_racao: string;
  especificacao_racao: string;
  oferece_extras: string;
  
  // Hidratação
  ingestao_agua: string;
  interesse_agua: string;
  ajuda_beber_agua: string;
  sede_pos_creche: string;
  
  // Saúde e Restrições
  possui_alergia: string;
  alimentos_proibidos: string;
  possui_doenca: string;
  doenca_qual: string;
  escore_corporal: string;
  
  // Notas
  observacoes: string;
  
  // Campos legados (manter compatibilidade se necessário)
  raca?: string;
  tutor_nome?: string;
  telefone?: string;
}

export interface ChecklistEntry {
  petId: string;
  date: string;
  status: DayStatus;
  comeu: 'Comeu tudo' | 'Comeu metade' | 'Não comeu';
  quantoOferecido: string;
  quantoSobrou: string;
  agua: 'Bebeu muita água' | 'Pouca água' | 'Não bebeu nada';
  teveEstimuloHidratacao: 'Sim' | 'Não';
  comportamento: string;
  alertas: string;
  observacoes: string;
  escoreFecal: number;
  fotos?: string[];
}

export interface PetGroup {
  id: string;
  name: string;
  petIds: string[];
  color: string;
}

export interface Medication {
  id: string;
  petId: string;
  name: string;
  dosage: string;
  time: string;
  frequency: '6h' | '8h' | '12h' | '24h' | 'outra';
  startDate?: string;
  endDate?: string;
  instructions: string;
  active: boolean;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  petId: string;
  date: string;
  offered: boolean;
  slot?: number; // 0 for 24h, 1-2 for 12h, 1-3 for 8h, 1-4 for 6h
  offeredBy?: string;
  notes?: string;
}

export interface HotelStay {
  id: string;
  petId: string;
  checkIn: string;
  checkOut: string;
  instructions: string;
  active: boolean;
}

export const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', '-'];

export const FECAL_SCORE_LABELS: Record<number, string> = {
  1: '1 - Muito Duro',
  2: '2 - Firme',
  3: '3 - Ideal',
  4: '4 - Pastoso',
  5: '5 - Diarreia'
};
