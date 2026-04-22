
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
  
  const todayLocal = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
  };

  const date = searchParams.get('date') || todayLocal();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'daily' | 'master' | 'history' | 'messages'>('daily');
  const pet = useMemo(() => pets.find(p => p.id === petId), [pets, petId]);
  
  const currentDayName = useMemo(() => {
    const d = new Date(date + 'T12:00:00');
    return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d.getDay()];
  }, [date]);

  const scheduledPetsForToday = useMemo(() => {
    return pets.filter(p => isPetOnDay(p, currentDayName)).sort((a, b) => a.pet_nome.localeCompare(b.pet_nome));
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
    comeu: undefined,
    agua: 'Pouca água',
    quantoOferecido: '-',
    quantoSobrou: '-',
    teveEstimuloHidratacao: 'Não',
    comportamento: '-',
    alertas: '-',
    observacoes: '',
    escoreFecal: 3,
    ...existingEntry
  });

  useEffect(() => {
    if (existingEntry) {
      setForm(existingEntry);
    } else {
      setForm({
        comeu: undefined,
        agua: 'Pouca água',
        quantoOferecido: '-',
        quantoSobrou: '-',
        teveEstimuloHidratacao: 'Não',
        comportamento: '-',
        alertas: '-',
        observacoes: '',
        escoreFecal: 3,
      });
    }
  }, [existingEntry, petId]);

  const handleWhatsAppNotify = (entry: ChecklistEntry) => {
    if (!pet) return;
    const petName = pet.pet_nome || 'amigão';
    const tutorName = pet.tutor_nome ? `${pet.tutor_nome}, ` : '';
    
    const foodStatus = entry.comeu;
    
    let messageParts = [`Olá ${tutorName}! Passando para dar notícias do ${petName} hoje.`];

    if (foodStatus) {
      const nutritionNote = (foodStatus === 'Não comeu' || foodStatus === 'Comeu metade' || foodStatus === 'Comeu menos da metade') 
        ? "\n\nCaso continue apresentando falta de apetite, uma consulta com uma nutricionista veterinária pode ser uma ótima opção para ajustar a dieta de forma personalizada."
        : "";
      
      if (foodStatus === 'Comeu tudo') {
        messageParts.push(`Sobre a alimentação: ele comeu super bem, limpou o potinho! 😋`);
      } else {
        messageParts.push(`Sobre a alimentação: ele ${foodStatus.toLowerCase()}.${nutritionNote}`);
      }
    }

    if (entry.observacoes) {
      messageParts.push(`\nObservação: ${entry.observacoes}`);
    }

    if (entry.status === 'OK' && foodStatus === 'Comeu tudo') {
      messageParts = [`Olá ${tutorName}! Passando para dizer que o ${petName} está tendo um dia maravilhoso hoje! Comeu tudo e está muito feliz. ${entry.observacoes ? `\n\nObservação: ${entry.observacoes}` : ''}`];
    }

    const text = messageParts.join('\n\n');
    
    // Clean phone number
    const phone = pet.telefone?.replace(/\D/g, '') || '';
    
    if (!phone) {
      navigator.clipboard.writeText(text);
      alert('Pet sem telefone cadastrado. Mensagem copiada para o clipboard! ✅');
      return;
    }

    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSave = (mode: 'exit' | 'next' | 'stay') => {
    if (!pet) return;
    const entry = { 
      ...form, 
      petId: pet.id, 
      date, 
      status: calculateStatus(form) 
    } as ChecklistEntry;
    
    onSave(entry);

    if (mode === 'next' && nextPet) {
      navigate(`/pet/${nextPet.id}?date=${date}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (mode === 'exit') {
      navigate('/');
    } else if (mode === 'stay') {
      alert('Progresso salvo com sucesso! 💾');
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
        <button onClick={() => setActiveTab('messages')} className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'messages' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>Mensagens</button>
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
                  { label: 'Comeu menos da metade', emoji: '😕' },
                  { label: 'Não comeu', emoji: '🚫' }
                ].map(opt => (
                  <button 
                    key={opt.label} 
                    onClick={() => setForm({...form, comeu: form.comeu === opt.label ? undefined : opt.label as any})} 
                    className={`flex-1 py-5 rounded-[25px] font-black text-[10px] uppercase border-2 transition-all flex flex-col items-center gap-1 ${
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

            <div className="flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleSave('stay')} 
                  className="py-4 bg-white border-2 border-emerald-100 text-emerald-600 font-black rounded-full shadow-sm text-sm hover:bg-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  APENAS SALVAR 💾
                </button>
                <button 
                  onClick={() => handleSave('exit')} 
                  className="py-4 bg-slate-100 text-slate-600 font-black rounded-full shadow-sm text-sm hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  SALVAR E SAIR 🏠
                </button>
              </div>

              <div className="flex gap-4 items-stretch">
                {nextPet && (
                  <button 
                    onClick={() => handleSave('next')}
                    className="flex-grow py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[35px] flex items-center justify-center shadow-lg shadow-emerald-700/20 active:scale-95 transition-all group overflow-hidden border-2 border-white gap-3"
                  >
                    <div className="text-left">
                      <p className="text-[10px] font-black opacity-50 uppercase tracking-widest leading-none">PRÓXIMO PET</p>
                      <p className="text-xl font-black">{nextPet.pet_nome}</p>
                    </div>
                    <span className="text-3xl group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-[40px] p-8 shadow-2xl border border-emerald-50 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <label className="text-sm font-black text-slate-800 uppercase tracking-widest">NOTIFICAR TUTOR</label>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-[30px] border-2 border-slate-100">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Prévia da Mensagem:</p>
                <div className="whitespace-pre-wrap text-sm font-bold text-slate-700 leading-relaxed italic">
                  {(() => {
                    const petName = pet.pet_nome || 'amigão';
                    const tutorName = pet.tutor_nome ? `${pet.tutor_nome}, ` : '';
                    const foodStatus = form.comeu;
                    let messageParts = [`Olá ${tutorName}! Passando para dar notícias do ${petName} hoje.`];
                    if (foodStatus) {
                      if (foodStatus === 'Comeu tudo') {
                        messageParts.push(`Sobre a alimentação: ele comeu super bem, limpou o potinho! 😋`);
                      } else {
                        messageParts.push(`Sobre a alimentação: ele ${foodStatus.toLowerCase()}.`);
                      }
                    }
                    if (form.observacoes) {
                      messageParts.push(`\nObservação: ${form.observacoes}`);
                    }
                    return messageParts.join('\n\n');
                  })()}
                </div>
              </div>
              
              <button 
                onClick={() => handleWhatsAppNotify({ ...form, petId: pet.id, date, status: calculateStatus(form) } as ChecklistEntry)}
                className="w-full py-6 bg-emerald-500 text-white font-black rounded-full shadow-lg shadow-emerald-500/20 text-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                ENVIAR PELO WHATSAPP 📱
              </button>
              
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                A mensagem será enviada para: <span className="text-slate-600">{pet.tutor_nome} ({pet.telefone})</span>
              </p>
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
                      {entry.comeu} {entry.observacoes ? `• ${entry.observacoes.substring(0, 30)}...` : ''}
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
