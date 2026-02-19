
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import React, { useState, useMemo, useEffect } from 'react';
import { Pet, ChecklistEntry, FECAL_SCORE_LABELS } from '../types';
import { calculateStatus } from '../utils/status';
import { isPetOnDay } from '../utils/date';

interface PetChecklistProps {
  pets: Pet[];
  onSave: (entry: ChecklistEntry) => void;
  checklists: ChecklistEntry[];
  onUpdatePet: (pet: Pet) => void;
}

const PetChecklist: React.FC<PetChecklistProps> = ({ pets, onSave, checklists, onUpdatePet }) => {
  const { petId } = useParams();
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'daily' | 'master' | 'history'>('daily');
  const pet = useMemo(() => pets.find(p => p.id === petId), [pets, petId]);
  
  const currentDayName = useMemo(() => {
    const d = new Date(date + 'T12:00:00');
    return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d.getDay()];
  }, [date]);

  const scheduledPetsForToday = useMemo(() => {
    return pets.filter(p => isPetOnDay(p, currentDayName)).sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [pets, currentDayName]);

  const nextPet = useMemo(() => {
    const currentIndex = scheduledPetsForToday.findIndex(p => p.id === petId);
    if (currentIndex !== -1 && currentIndex < scheduledPetsForToday.length - 1) {
      return scheduledPetsForToday[currentIndex + 1];
    }
    return null;
  }, [scheduledPetsForToday, petId]);

  const history = useMemo(() => checklists.filter(c => c.petId === petId).sort((a,b) => b.date.localeCompare(a.date)), [checklists, petId]);
  const existingEntry = checklists.find(c => c.petId === petId && c.date === date);

  const [form, setForm] = useState<Partial<ChecklistEntry>>({
    comeu: 'Comeu tudo',
    agua: 'Bebeu muita água',
    quantoOferecido: '',
    quantoSobrou: '',
    teveEstimuloHidratacao: 'Não',
    comportamento: '',
    alertas: '',
    observacoes: '',
    escoreFecal: 3,
    ...existingEntry
  });

  useEffect(() => {
    if (existingEntry) {
      setForm(existingEntry);
    } else {
      setForm({
        comeu: 'Comeu tudo',
        agua: 'Bebeu muita água',
        quantoOferecido: '',
        quantoSobrou: '',
        teveEstimuloHidratacao: 'Não',
        comportamento: '',
        alertas: '',
        observacoes: '',
        escoreFecal: 3,
      });
    }
  }, [existingEntry, petId]);

  const handleSave = (goToNext = false) => {
    if (!pet) return;
    const entry = { 
      ...form, 
      petId: pet.id, 
      date, 
      status: calculateStatus(form) 
    } as ChecklistEntry;
    
    onSave(entry);

    if (goToNext && nextPet) {
      navigate(`/pet/${nextPet.id}?date=${date}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  if (!pet) return <div className="p-20 text-center font-black uppercase tracking-widest">Pet não encontrado 🚫</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-32">
      <div className="bg-white rounded-[35px] p-6 shadow-xl border border-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-[22px] flex items-center justify-center text-3xl shadow-inner border border-white shrink-0">🐶</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] font-black">{pet.id}</span>
              <h2 className="text-2xl font-black tracking-tighter text-slate-800 leading-tight">{pet.pet_nome}</h2>
            </div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
              📅 AGENDA: {pet.dia_semana || 'Não Definido'}
            </p>
          </div>
        </div>
        <div className="bg-emerald-50 px-6 py-3 rounded-full border border-emerald-100 text-center">
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">{currentDayName.toUpperCase()}</p>
          <span className="text-emerald-700 text-sm font-black uppercase">
            {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-full shadow-inner">
        <button onClick={() => setActiveTab('daily')} className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'daily' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400'}`}>Checklist Diário</button>
        <button onClick={() => setActiveTab('master')} className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'master' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400'}`}>Ficha Mestre</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400'}`}>Histórico</button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'daily' && (
          <div className="bg-white rounded-[40px] p-8 shadow-2xl border border-emerald-50 space-y-8 animate-in slide-in-from-bottom-4">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🍱</span>
                <label className="text-sm font-black text-slate-800 uppercase tracking-widest">ALIMENTAÇÃO DO DIA</label>
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'Comeu tudo', emoji: '😋' },
                  { label: 'Comeu metade', emoji: '😐' },
                  { label: 'Não comeu', emoji: '🚫' }
                ].map(opt => (
                  <button 
                    key={opt.label} 
                    onClick={() => setForm({...form, comeu: opt.label as any})} 
                    className={`flex-1 py-5 rounded-[25px] font-black text-[11px] uppercase border-2 transition-all flex flex-col items-center gap-1 ${
                      form.comeu === opt.label 
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-105 z-10' 
                      : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quanto foi oferecido?</label>
                  <input 
                    type="text" 
                    value={form.quantoOferecido} 
                    onChange={e => setForm({...form, quantoOferecido: e.target.value})} 
                    placeholder="Ex: 100g"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-300 shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quanto sobrou?</label>
                  <input 
                    type="text" 
                    value={form.quantoSobrou} 
                    onChange={e => setForm({...form, quantoSobrou: e.target.value})} 
                    placeholder="Ex: 20g"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-300 shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💧</span>
                <label className="text-sm font-black text-slate-800 uppercase tracking-widest">HIDRATAÇÃO</label>
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'Bebeu muita água', emoji: '🌊' },
                  { label: 'Pouca água', emoji: '🥤' },
                  { label: 'Não bebeu nada', emoji: '❌' }
                ].map(opt => (
                  <button 
                    key={opt.label} 
                    onClick={() => setForm({...form, agua: opt.label as any})} 
                    className={`flex-1 py-5 rounded-[25px] font-black text-[11px] uppercase border-2 transition-all flex flex-col items-center gap-1 ${
                      form.agua === opt.label 
                      ? 'bg-sky-500 text-white border-sky-600 shadow-lg scale-105 z-10' 
                      : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💩</span>
                <label className="text-sm font-black text-slate-800 uppercase tracking-widest">ESCORE FECAL</label>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(score => (
                  <button 
                    key={score} 
                    onClick={() => setForm({...form, escoreFecal: score})} 
                    className={`flex flex-col items-center py-4 rounded-2xl font-black text-lg border-2 transition-all ${
                      form.escoreFecal === score 
                      ? 'bg-amber-500 text-white border-amber-600 shadow-lg scale-110 z-10' 
                      : 'bg-slate-50 text-slate-300 border-slate-100'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-center animate-in fade-in duration-300">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em]">
                  LEGENDA: {form.escoreFecal ? FECAL_SCORE_LABELS[form.escoreFecal] : 'Selecione um escore'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <label className="text-sm font-black text-slate-800 uppercase tracking-widest">OBSERVAÇÕES DO DIA</label>
              </div>
              <textarea 
                value={form.observacoes} 
                onChange={e => setForm({...form, observacoes: e.target.value})} 
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[30px] font-bold text-slate-700 outline-none focus:border-emerald-300 min-h-[120px] shadow-inner" 
                placeholder="Como foi o dia desse pet?" 
              />
            </div>

            <div className="flex gap-4 items-stretch pt-4">
              <button 
                onClick={() => handleSave(false)} 
                className="flex-grow py-6 bg-emerald-500 text-white font-black rounded-full shadow-lg shadow-emerald-500/20 text-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                SALVAR E SAIR 🏠
              </button>

              {nextPet && (
                <button 
                  onClick={() => handleSave(true)}
                  className="w-24 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[35px] flex flex-col items-center justify-center shadow-lg shadow-emerald-700/20 active:scale-95 transition-all group overflow-hidden border-2 border-white"
                >
                  <span className="text-3xl group-hover:translate-x-1 transition-transform">→</span>
                  <div className="text-[8px] font-black uppercase text-center px-1">
                    <p className="opacity-50">PRÓXIMO</p>
                    <p className="truncate w-full">{nextPet.pet_nome}</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'master' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in-95 duration-300">
            <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-sky-500 uppercase tracking-widest flex items-center gap-2">👤 DADOS DO TUTOR</h4>
              <div className="space-y-2">
                <StaticRow label="RESPONSÁVEL" value={pet.tutor_nome} />
                <StaticRow label="TELEFONE" value={pet.telefone} />
                <StaticRow label="AGENDA" value={pet.dia_semana} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">🏥 SAÚDE E RESTRIÇÃO</h4>
              <div className="space-y-2">
                <StaticRow label="ALERGIA" value={pet.possui_alergia} color={pet.possui_alergia.toLowerCase() === 'sim' ? 'text-rose-600' : ''} />
                <StaticRow label="PROIBIDOS" value={pet.alimentos_proibidos} />
                <StaticRow label="DIETA" value={pet.tipo_alimentacao} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">🍱 NUTRIÇÃO E COMPORTAMENTO</h4>
              <div className="space-y-2">
                <StaticRow label="MARCA DA RAÇÃO" value={pet.marca_racao} />
                <StaticRow label="QUANTIDADE" value={pet.quantidade_aproximada} />
                <StaticRow label="COMPORTAMENTO ALIMENTAR" value={pet.comportamento_alimentar} />
                <StaticRow label="ESTÍMULO NECESSÁRIO" value={pet.precisa_estimulo} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">💊 SAÚDE DETALHADA</h4>
              <div className="space-y-2">
                <StaticRow label="POSSUI DOENÇA?" value={pet.possui_doenca} color={pet.possui_doenca.toLowerCase() === 'sim' ? 'text-amber-600' : ''} />
                <StaticRow label="QUAIS DOENÇAS?" value={pet.doenca_qual} />
                <StaticRow label="PESO ATUAL" value={`${pet.peso_pet} KG`} />
                <StaticRow label="ESCORE CORPORAL" value={pet.escore_corporal} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2">💧 HIDRATAÇÃO</h4>
              <div className="space-y-2">
                <StaticRow label="INGESTÃO DIÁRIA" value={pet.ingestao_agua} />
                <StaticRow label="INTERESSE POR ÁGUA" value={pet.interesse_agua} />
                <StaticRow label="AJUDA / ESTÍMULO" value={pet.ajuda_beber_agua} />
                <StaticRow label="SEDE PÓS-CRECHE" value={pet.sede_pos_creche} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">📝 OBSERVAÇÕES DO PRONTUÁRIO</h4>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                  {pet.observacoes || "Nenhuma observação especial registrada na ficha mestre."}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-[40px] opacity-20 font-black uppercase">SEM HISTÓRICO</div>
            ) : (
              history.map((entry, i) => (
                <div key={i} className="bg-white p-5 rounded-[30px] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-800 text-sm">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {entry.comeu} • Oferecido: {entry.quantoOferecido || '-'} • Sobra: {entry.quantoSobrou || '-'} • Escore: {entry.escoreFecal}
                    </p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black text-white ${entry.status === 'OK' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{entry.status}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StaticRow: React.FC<{ label: string; value?: string; color?: string }> = ({ label, value, color }) => (
  <div className="flex flex-col border-b border-slate-50 pb-1.5 last:border-0">
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
    <p className={`text-[11px] font-bold leading-tight ${color || 'text-slate-700'}`}>{value || '-'}</p>
  </div>
);

export default PetChecklist;
