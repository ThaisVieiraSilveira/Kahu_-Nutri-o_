
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pet, ChecklistEntry, PetGroup } from '../types';
import { getStatusColor, getStatusEmoji } from '../utils/status';
import { isPetOnDay } from '../utils/date';

interface DashboardProps {
  pets: Pet[];
  checklists: ChecklistEntry[];
  groups: PetGroup[];
  onUpdatePet: (pet: Pet) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ pets, checklists, groups, onUpdatePet }) => {
  const navigate = useNavigate();
  
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

  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingToDay, setIsAddingToDay] = useState(false);

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
      .sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
  }, [pets, selectedDay, searchTerm]);

  const checklistsForDate = useMemo(() => checklists.filter(c => c.date === searchDate), [checklists, searchDate]);
  const getPetStatus = (petId: string) => checklistsForDate.find(c => c.petId === petId)?.status || 'Pendente';

  const petsNotInDay = useMemo(() => {
    if (selectedDay === 'Todos') return [];
    return pets.filter(pet => !isPetOnDay(pet, selectedDay));
  }, [pets, selectedDay]);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-emerald-900 mb-1 tracking-tighter">Matilha Kahu</h2>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">CADASTROS: {pets.length}</span>
            <p className="text-emerald-700/40 font-bold italic text-[11px]">Escala de {selectedDay}: {filteredPets.length} pets</p>
          </div>
        </div>
        
        <div className="bg-[#EEF7F2] px-6 py-3 rounded-[28px] border border-emerald-100/50 shadow-sm flex items-center gap-4">
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
              <button onClick={() => setIsAddingToDay(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-rose-50 hover:text-rose-500 transition-colors">✕</button>
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
                      <p className="font-black text-slate-700">{pet.pet_nome}</p>
                      <p className="text-[10px] font-bold text-slate-300 uppercase">{pet.id} • {pet.raca}</p>
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
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter">{pet.id} • {pet.raca}</p>
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

              <div className="bg-[#F8FBFA] p-5 rounded-[28px] border border-emerald-50/50 mt-auto space-y-3">
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
