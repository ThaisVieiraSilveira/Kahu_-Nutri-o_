
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pet, ChecklistEntry, PetGroup } from '../types';
import { getStatusColor, getStatusEmoji, calculateStatus } from '../utils/status';
import { isPetOnDay } from '../utils/date';
import { getGeneratedMessage } from '../utils/messages';

interface DashboardProps {
  pets: Pet[];
  checklists: ChecklistEntry[];
  groups: PetGroup[];
  onUpdatePet: (pet: Pet) => void;
  onPullSync: () => Promise<boolean>;
  onPushSync: () => Promise<boolean>;
  onSaveChecklist: (entry: ChecklistEntry) => void;
  lastSync?: string;
  isSyncing?: boolean;
  sheetsWebhookUrl?: string;
  zApiConfig?: {
    instanceId: string;
    token: string;
    clientToken: string;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ 
  pets, checklists, groups, onUpdatePet, onPullSync, onPushSync, 
  onSaveChecklist, lastSync, isSyncing, sheetsWebhookUrl, zApiConfig 
}) => {
  const navigate = useNavigate();
  
  const [syncing, setSyncing] = useState<'none' | 'push' | 'pull'>('none');
  const [quickEntries, setQuickEntries] = useState<Record<string, ChecklistEntry['comeu']>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date().getDay();
    const dayMap: Record<number, string> = {
      1: 'Segunda',
      2: 'Terça',
      3: 'Quarta',
      4: 'Quinta',
      5: 'Sexta',
      6: 'Sábado'
    };
    return dayMap[today] || 'Segunda';
  });

  const todayLocal = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState(todayLocal());
  const [isAddingToDay, setIsAddingToDay] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  const NAV_DAYS = ['Todos', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    NAV_DAYS.forEach(day => {
      counts[day] = pets.filter(pet => isPetOnDay(pet, day)).length;
    });
    return counts;
  }, [pets]);

  const filteredPets = useMemo(() => {
    return pets
      .filter(pet => {
        const matchesDay = isPetOnDay(pet, selectedDay);
        const matchesSearch = 
          pet.pet_nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
          pet.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDay && matchesSearch;
      })
      .sort((a, b) => a.pet_nome.localeCompare(b.pet_nome));
  }, [pets, selectedDay, searchTerm]);

  const checklistsForDate = useMemo(() => checklists.filter(c => c.date === searchDate), [checklists, searchDate]);
  const getPetStatus = (petId: string) => checklistsForDate.find(c => c.petId === petId)?.status || 'Pendente';

  const petsNotInDay = useMemo(() => {
    if (selectedDay === 'Todos') return [];
    return pets
      .filter(pet => !isPetOnDay(pet, selectedDay))
      .filter(pet => 
        pet.pet_nome.toLowerCase().includes(modalSearchTerm.toLowerCase()) || 
        pet.id.toLowerCase().includes(modalSearchTerm.toLowerCase())
      )
      .sort((a, b) => a.pet_nome.localeCompare(b.pet_nome));
  }, [pets, selectedDay, modalSearchTerm]);

  const handleAddToDay = (pet: Pet) => {
    const currentDays = (pet.dia_semana || '').split(',').map(d => d.trim()).filter(Boolean);
    if (!currentDays.includes(selectedDay)) {
      const updatedPet = {
        ...pet,
        dia_semana: [...currentDays, selectedDay].join(', ')
      };
      onUpdatePet(updatedPet);
    }
    setIsAddingToDay(false);
  };

  const handleRemoveFromDay = (e: React.MouseEvent, pet: Pet) => {
    e.stopPropagation();
    if (selectedDay === 'Todos') return;
    
    const currentDays = (pet.dia_semana || '').split(',').map(d => d.trim()).filter(Boolean);
    const updatedPet = {
      ...pet,
      dia_semana: currentDays.filter(d => d !== selectedDay).join(', ')
    };
    onUpdatePet(updatedPet);
  };

  const handlePullSync = async () => {
    setSyncing('pull');
    try {
      const success = await onPullSync();
      if (success) {
        alert('Dados atualizados com sucesso!');
        window.location.reload();
      } else {
        alert('Nenhum dado novo na nuvem.');
      }
    } catch (e) {
      alert('Certifique-se que a URL da planilha está correta nos Ajustes.');
    } finally {
      setSyncing('none');
    }
  };

  const handlePushSync = async () => {
    setSyncing('push');
    try {
      await onPushSync();
      alert('Dados salvos na nuvem com sucesso!');
    } catch (e) {
      alert('Erro ao salvar na nuvem.');
    } finally {
      setSyncing('none');
    }
  };

  const handleQuickSave = async (e: React.MouseEvent, petId: string) => {
    e.stopPropagation();
    const eatVal = quickEntries[petId];
    if (!eatVal) return alert('Selecione uma opção de alimentação primeiro.');

    setSavingId(petId);
    
    const existing = checklists.find(c => c.petId === petId && c.date === searchDate);
    
    const newEntry: ChecklistEntry = {
      petId,
      date: searchDate,
      comeu: eatVal,
      status: calculateStatus({ comeu: eatVal }),
      agua: existing?.agua || 'Pouca água',
      teveEstimuloHidratacao: existing?.teveEstimuloHidratacao || 'Não',
      comportamento: existing?.comportamento || '-',
      alertas: existing?.alertas || '-',
      observacoes: Object.prototype.hasOwnProperty.call(quickEntries, `obs_${petId}`) 
        ? (quickEntries[`obs_${petId}`] as string) 
        : (existing?.observacoes || ''),
      escoreFecal: existing?.escoreFecal || 3,
      quantoOferecido: existing?.quantoOferecido || '-',
      quantoSobrou: existing?.quantoSobrou || '-',
      updatedAt: new Date().toISOString()
    };

    try {
      await onSaveChecklist(newEntry);
      setSavingId(null);
      setSavedId(petId);
      setTimeout(() => setSavedId(null), 3000);
    } catch (err) {
      setSavingId(null);
      console.error("Erro ao salvar:", err);
    }
  };

  const handleSendWhatsApp = async (pet: Pet, entry: ChecklistEntry) => {
    const text = getGeneratedMessage(pet, entry);
    const phone = pet.telefone?.replace(/\D/g, '') || '';
    
    // Marcar como enviado no local e sincronizar
    onSaveChecklist({ ...entry, lastMessageSentAt: new Date().toISOString() });

    if (!phone) {
      navigator.clipboard.writeText(text);
      alert('Tutor sem telefone. Mensagem copiada!');
      return;
    }

    // Se Z-API estiver configurada, enviar via API (fundo)
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

        if (!response.ok) {
          throw new Error('Erro ao enviar via Z-API');
        }

        // Sucesso silencioso ou um feedback simples
        console.log(`Mensagem enviada via Z-API para ${pet.pet_nome}`);
      } catch (e) {
        console.error("Erro Z-API:", e);
        // Fallback para o método tradicional se a API falhar
        const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      }
    } else {
      // Método tradicional (abrir aba)
      const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  const pendingMessages = useMemo(() => {
    return filteredPets.map(pet => {
      const entry = checklists.find(c => c.petId === pet.id && c.date === searchDate);
      if (entry && entry.comeu && !entry.lastMessageSentAt) {
        return { pet, entry };
      }
      return null;
    }).filter(Boolean) as { pet: Pet; entry: ChecklistEntry }[];
  }, [filteredPets, checklists, searchDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* MESSAGE STATION */}
      {pendingMessages.length > 0 && (
        <div className="bg-emerald-900 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter">Mensagens Pendentes</h3>
                <div className="flex items-center gap-3">
                  <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest">Aguardando envio: {pendingMessages.length} tutores</p>
                  <button 
                    onClick={() => {
                      if (confirm('Marcar todas as mensagens de hoje como enviadas? (Não abrirá o WhatsApp)')) {
                        pendingMessages.forEach(({ entry }) => {
                          onSaveChecklist({ ...entry, lastMessageSentAt: new Date().toISOString() });
                        });
                      }
                    }}
                    className="text-[9px] font-black text-emerald-500 bg-white/10 px-2 py-0.5 rounded-lg hover:bg-white/20 transition-all uppercase"
                  >
                    Marcar todos como enviados
                  </button>
                </div>
              </div>
              <span className="text-4xl animate-pulse">📱</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {pendingMessages.map(({ pet, entry }) => (
                <div key={pet.id} className="min-w-[280px] bg-white/10 border border-white/10 rounded-[30px] p-5 backdrop-blur-md flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">🐶</div>
                    <div>
                      <p className="text-white font-black text-sm leading-tight">{pet.pet_nome}</p>
                      <p className="text-emerald-300/60 font-bold text-[9px] uppercase tracking-widest">{entry.comeu}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSendWhatsApp(pet, entry)}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95"
                  >
                    ENVIAR PARA TUTOR
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[9px] font-bold text-emerald-400/50 italic mt-2">* Clique em enviar para abrir o WhatsApp de cada tutor em sequência.</p>
          </div>
        </div>
      )}

      {!sheetsWebhookUrl && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[35px] flex items-center gap-5 shadow-lg animate-in slide-in-from-top-4">
          <span className="text-4xl">⚠️</span>
          <div>
            <p className="text-amber-900 font-black text-xs uppercase tracking-widest leading-none mb-1 text-left">Sincronização Desativada</p>
            <p className="text-amber-700 text-[10px] font-bold leading-tight text-left">Configure a URL nos Ajustes para salvar seus dados com segurança no Google Sheets.</p>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="ml-auto bg-amber-200 text-amber-900 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-300 transition-all"
          >
            CONFIGURAR
          </button>
        </div>
      )}

      {pets.length <= 161 && (
        <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[35px] flex items-center gap-5 shadow-lg animate-in slide-in-from-bottom-4">
          <span className="text-4xl">🆘</span>
          <div className="text-left">
            <p className="text-rose-900 font-black text-xs uppercase tracking-widest leading-none mb-1">Seus pets sumiram?</p>
            <p className="text-rose-700 text-[10px] font-bold leading-tight">Se você já tinha cadastrado pets e eles não aparecem, tente baixar os dados da nuvem.</p>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="ml-auto bg-rose-200 text-rose-900 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-300 transition-all"
          >
            RECUPERAR
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-emerald-900 mb-1 tracking-tighter">Matilha DOMO</h2>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">CADASTROS: {pets.length}</span>
              <p className="text-emerald-700/40 font-bold italic text-[11px]">Escala de {selectedDay}: {filteredPets.length} pets</p>
            </div>
            {lastSync && (
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                ☁️ Nuvem sync: {lastSync}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={handlePullSync}
            disabled={syncing !== 'none'}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md ${
              syncing === 'pull' ? 'bg-slate-100 text-slate-400' : 'bg-white text-indigo-600 border-2 border-indigo-50 hover:bg-indigo-50 active:scale-95'
            }`}
          >
            <span>{syncing === 'pull' ? '⏳' : '📥'}</span>
            {syncing === 'pull' ? 'ATUALIZANDO...' : 'BAIXAR DADOS'}
          </button>
          <button 
            onClick={handlePushSync}
            disabled={syncing !== 'none'}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md ${
              syncing === 'push' ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-100'
            }`}
          >
            <span>{syncing === 'push' ? '⏳' : '📤'}</span>
            {syncing === 'push' ? 'SALVANDO...' : 'SALVAR NA NUVEM'}
          </button>
        </div>

        <div className="bg-[#EEF7F2] px-6 py-3 rounded-[28px] border border-emerald-100/50 shadow-sm flex items-center gap-4 relative overflow-hidden">
          {isSyncing && (
            <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sincronizando...</span>
              </div>
            </div>
          )}
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">DATA DO DIÁRIO</span>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-transparent text-emerald-800 font-black outline-none text-base cursor-pointer"
            />
          </div>
          <div className="text-2xl">🗓️</div>
        </div>
      </div>

      {/* ADD TO DAY MODAL */}
      {isAddingToDay && (
        <div className="fixed inset-0 bg-emerald-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-emerald-50/30">
              <div>
                <h3 className="text-2xl font-black text-emerald-900 tracking-tight">Adicionar à {selectedDay}</h3>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Selecione um pet da matilha</p>
              </div>
              <button 
                onClick={() => {
                  setIsAddingToDay(false);
                  setModalSearchTerm('');
                }} 
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-rose-50 hover:text-rose-500 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Pesquisar pet..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-emerald-100 rounded-2xl outline-none focus:border-emerald-400 font-bold text-sm"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors">🔍</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {petsNotInDay.length === 0 ? (
                <p className="text-center py-10 text-slate-300 font-bold italic">Todos os pets já estão escalados para este dia.</p>
              ) : (
                petsNotInDay.map(pet => (
                  <button 
                    key={pet.id}
                    onClick={() => handleAddToDay(pet)}
                    className="w-full p-4 hover:bg-emerald-50 rounded-2xl flex items-center gap-4 transition-colors text-left group"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-white transition-colors">🐶</div>
                    <div>
                      <p className="font-black text-slate-700 leading-none">{pet.pet_nome}</p>
                      {pet.tutor_nome && <p className="text-[10px] font-black text-emerald-500 uppercase mt-1 leading-none">{pet.tutor_nome}</p>}
                      <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">{pet.id} • {pet.raca}</p>
                    </div>
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 font-black text-xs">ADICIONAR +</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="flex gap-3">
        <div className="relative group flex-1">
          <div className="absolute inset-0 bg-emerald-500/5 blur-xl rounded-full group-focus-within:bg-emerald-500/10 transition-all"></div>
          <input
            type="text"
            placeholder={`Buscar entre os ${filteredPets.length} pets de ${selectedDay}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="relative w-full pl-14 pr-8 py-5 bg-white/80 backdrop-blur-md rounded-[32px] border-2 border-emerald-50 focus:border-emerald-300 outline-none transition-all font-black text-slate-700 placeholder:text-slate-200 shadow-xl shadow-emerald-900/5 text-base"
          />
          <span className="absolute left-6 top-1/2 -translate-y-1/2 opacity-30 text-xl">🔍</span>
        </div>
        {selectedDay !== 'Todos' && (
          <button 
            onClick={() => setIsAddingToDay(true)}
            className="bg-emerald-600 text-white px-8 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="text-lg">+</span> ADICIONAR PET
          </button>
        )}
      </div>

      {/* DAY SELECTOR - NICHO STYLE */}
      <div className="space-y-3">
        <div className="bg-[#E9F0EC]/60 p-5 rounded-[55px] border border-white/50 shadow-inner overflow-hidden">
          <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide px-2 items-center">
            {NAV_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-none w-[110px] h-[135px] rounded-[55px] font-black transition-all border-[4px] flex flex-col items-center justify-center gap-1.5 ${
                  selectedDay === day 
                    ? 'bg-emerald-600 text-white border-white shadow-xl scale-105 z-10' 
                    : 'bg-white text-slate-300 border-transparent hover:border-emerald-50 hover:text-slate-400'
                }`}
              >
                <span className={`block text-[9px] uppercase tracking-[0.2em] font-black ${selectedDay === day ? 'text-emerald-200' : 'text-slate-200'}`}>
                  {day === 'Todos' ? 'TODOS' : day.toUpperCase()}
                </span>
                <span className={`text-4xl block font-black leading-none ${selectedDay === day ? 'text-white' : 'text-slate-300'}`}>
                  {dayCounts[day] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-1.5 opacity-30 select-none">
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 italic">ARRASTE PARA O LADO</span>
          <span className="text-xs">🔄</span>
        </div>
      </div>

      {/* PET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        {filteredPets.map((pet, index) => {
          const status = getPetStatus(pet.id);
          return (
            <div 
              key={pet.id}
              onClick={() => navigate(`/pet/${pet.id}?date=${searchDate}`)}
              className="bg-white p-6 rounded-[40px] border border-slate-50 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 bg-emerald-500 text-white px-4 py-2 rounded-br-[20px] font-black text-xs shadow-sm z-10">
                #{index + 1}
              </div>
              <div className="flex justify-between items-start mb-5 mt-2">
                <div className="flex gap-5">
                  <div className="w-16 h-16 bg-emerald-50 rounded-[24px] flex items-center justify-center text-4xl shadow-inner border border-white group-hover:scale-110 transition-transform">🐶</div>
                  <div>
                    <h4 className="font-black text-xl text-slate-800 group-hover:text-emerald-600 leading-tight">{pet.pet_nome}</h4>
                    {pet.tutor_nome && <p className="text-[11px] font-black text-emerald-500 uppercase tracking-tight leading-none mb-1">{pet.tutor_nome}</p>}
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{pet.id} • {pet.raca}</p>
                  </div>
                </div>
                <div className="relative flex items-center gap-3">
                  {selectedDay !== 'Todos' && (
                    <button 
                      onClick={(e) => handleRemoveFromDay(e, pet)}
                      className="w-11 h-11 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center text-xl border-2 border-white shadow-sm hover:bg-rose-500 hover:text-white transition-all"
                      title="Remover deste dia"
                    >
                      ✕
                    </button>
                  )}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-2xl shadow-sm border-[3px] border-white transition-colors ${status === 'Pendente' ? 'bg-slate-50 text-slate-200' : getStatusColor(status) + ' text-white'}`}>
                    {getStatusEmoji(status)}
                  </div>
                </div>
              </div>

              <div className="bg-[#F8FBFA] p-5 rounded-[28px] border border-emerald-50/50 mt-auto space-y-4">
                {/* Quick Eating Selection */}
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Alimentação Rápida</span>
                    <button 
                      onClick={(e) => handleQuickSave(e, pet.id)}
                      disabled={savingId === pet.id}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                        savingId === pet.id 
                          ? 'bg-slate-200 text-slate-400' 
                          : savedId === pet.id
                            ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200'
                            : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {savingId === pet.id ? '⏳' : savedId === pet.id ? 'SALVO! ✅' : 'SALVAR ✔️'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Comeu tudo', internal: 'Comeu tudo', emoji: '😋' },
                      { label: 'Comeu metade', internal: 'Comeu metade', emoji: '😐' },
                      { label: 'Menos da metade', internal: 'Comeu menos da metade', emoji: '😕' },
                      { label: 'Não comeu', internal: 'Não comeu', emoji: '🔴' }
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setQuickEntries(prev => ({ ...prev, [pet.id]: opt.internal as any }))}
                        className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-tighter border-2 transition-all flex items-center justify-center gap-1 ${
                          quickEntries[pet.id] === opt.internal 
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-md transform scale-[1.02]' 
                          : 'bg-white text-slate-400 border-slate-100/50'
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2">
                    <input 
                      type="text"
                      placeholder="Observação rápida..."
                      value={quickEntries[`obs_${pet.id}`] || ''}
                      onChange={(e) => setQuickEntries(prev => ({ ...prev, [`obs_${pet.id}`]: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 outline-none focus:border-emerald-300 shadow-inner"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">AGENDA</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(pet.dia_semana || '-').split(',').map(d => (
                         <span key={d} className="text-emerald-600 font-black text-[9px] uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/50">{d.trim()}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${pet.possui_alergia.toLowerCase() === 'sim' ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>
                      {pet.possui_alergia.toLowerCase() === 'sim' ? 'ALERGIA ⚠️' : 'SAUDÁVEL'}
                    </span>
                    <span className="text-sky-600 bg-sky-50 px-3 py-1 rounded-xl border border-sky-100 font-black text-[10px] uppercase">{pet.tipo_alimentacao}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPets.length === 0 && (
        <div className="py-24 text-center opacity-20 flex flex-col items-center">
          <span className="text-8xl mb-6">🦴</span>
          <p className="font-black text-slate-800 uppercase tracking-[0.4em] text-sm">Nenhum pet encontrado para {selectedDay}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
