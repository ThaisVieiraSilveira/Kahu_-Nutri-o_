
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import React, { useState, useMemo, useEffect } from 'react';
import { Pet, ChecklistEntry, FECAL_SCORE_LABELS } from '../types';
import { calculateStatus } from '../utils/status';
import { isPetOnDay } from '../utils/date';
import { getGeneratedMessage } from '../utils/messages';

interface PetChecklistProps {
  pets: Pet[];
  onSave: (entry: ChecklistEntry) => void;
  checklists: ChecklistEntry[];
  onUpdatePet: (pet: Pet) => void;
  zApiConfig?: {
    instanceId: string;
    token: string;
    clientToken: string;
  };
}

const PetChecklist: React.FC<PetChecklistProps> = ({ 
  pets, onSave, checklists, onUpdatePet, zApiConfig 
}) => {
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
  
  const [activeTab, setActiveTab] = useState<'master' | 'history' | 'messages'>('messages');
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

  const [form, setForm] = useState<Partial<ChecklistEntry>>({});

  useEffect(() => {
    if (existingEntry) {
      setForm({ ...existingEntry });
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
  }, [existingEntry, petId, date]);

  const handleSave = (mode: 'exit' | 'next' | 'stay', entryUpdate?: Partial<ChecklistEntry>) => {
    if (!pet) return;
    
    // Garantir que estamos usando os dados mais recentes para o status
    const updatedForm = { ...form, ...(entryUpdate || {}) };
    const entry = { 
      ...updatedForm,
      petId: pet.id, 
      date, 
      status: calculateStatus(updatedForm) 
    } as ChecklistEntry;
    
    onSave(entry);

    if (mode === 'next' && nextPet) {
      navigate(`/pet/${nextPet.id}?date=${date}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (mode === 'exit') {
      navigate('/');
    } else if (mode === 'stay' && !entryUpdate) {
      alert('Progresso salvo com sucesso! 💾');
    }
  };

  const getGeneratedMessageLocal = (entry: Partial<ChecklistEntry>) => {
    if (!pet) return '';
    return getGeneratedMessage(pet, entry);
  };

  const handleWhatsAppNotify = async (entry: ChecklistEntry) => {
    if (!pet) return;
    const text = getGeneratedMessageLocal(entry);
    
    // Atualizar que a mensagem foi enviada
    onSave({ ...entry, lastMessageSentAt: new Date().toISOString() });
    
    // Clean phone number
    const phone = pet.telefone?.replace(/\D/g, '') || '';
    
    if (!phone) {
      navigator.clipboard.writeText(text);
      alert('Pet sem telefone cadastrado. Mensagem copiada para o clipboard! ✅');
      return;
    }

    if (zApiConfig?.instanceId && zApiConfig?.token) {
      try {
        const response = await fetch(`https://api.z-api.io/instances/${zApiConfig.instanceId}/token/${zApiConfig.token}/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Client-Token': zApiConfig.clientToken || ''
          },
          body: JSON.stringify({
            phone: `55${phone}`,
            message: text
          })
        });

        if (!response.ok) throw new Error('Z-API error');
        alert('Mensagem enviada automaticamente via WhatsApp! ✅');
      } catch (e) {
        console.error("Z-API error:", e);
        const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      }
    } else {
      const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  if (!pet) return <div className="p-20 text-center font-black uppercase tracking-widest">Pet não encontrado 🚫</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-32">
      <div className="bg-white rounded-[35px] p-6 shadow-xl border border-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-[22px] flex items-center justify-center text-3xl shadow-inner border border-white shrink-0 overflow-hidden">
            {pet.foto ? (
              <img src={pet.foto} alt={pet.pet_nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              "🐶"
            )}
          </div>
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
        <button onClick={() => setActiveTab('messages')} className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'messages' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>Mensagens</button>
        <button onClick={() => setActiveTab('master')} className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'master' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400'}`}>Ficha Mestre</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400'}`}>Histórico</button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'messages' && (
          <div className="bg-white rounded-[40px] p-8 shadow-2xl border border-emerald-50 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <label className="text-sm font-black text-slate-800 uppercase tracking-widest">NOTIFICAR TUTOR</label>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-[30px] border-2 border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Prévia da Mensagem:</p>
                  <button 
                    onClick={() => {
                      if (confirm('Deseja limpar as observações de hoje?')) {
                        setForm({...form, observacoes: ''});
                        handleSave('stay', { observacoes: '' });
                      }
                    }}
                    className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
                  >
                    🗑️ Limpar Obs
                  </button>
                </div>
                <div className="whitespace-pre-wrap text-sm font-bold text-slate-700 leading-relaxed italic mb-6">
                  {getGeneratedMessageLocal(form)}
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Adicionar/Editar Observação:</label>
                  <textarea 
                    value={form.observacoes} 
                    onChange={e => {
                      const newObs = e.target.value;
                      setForm({...form, observacoes: newObs});
                      // Auto-save when editing in messages tab
                      handleSave('stay', { observacoes: newObs });
                    }}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-emerald-300 shadow-inner min-h-[80px]"
                    placeholder="Algo mais para contar ao tutor?"
                  />
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
