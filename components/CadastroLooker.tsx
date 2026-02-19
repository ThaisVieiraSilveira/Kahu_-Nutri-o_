
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pet } from '../types';

interface CadastroLookerProps {
  pets: Pet[];
  onDeletePet: (id: string) => void;
}

const CadastroLooker: React.FC<CadastroLookerProps> = ({ pets, onDeletePet }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'alergia' | 'doenca'>('all');

  const filteredPets = useMemo(() => {
    return pets.filter(pet => {
      const matchesSearch = 
        pet.pet_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.tutor_nome || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        filterType === 'all' ||
        (filterType === 'alergia' && pet.possui_alergia.toLowerCase() === 'sim') ||
        (filterType === 'doenca' && pet.possui_doenca.toLowerCase() === 'sim');

      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
        return numA - numB;
    });
  }, [pets, searchTerm, filterType]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* HEADER ADMINISTRATIVE */}
      <div className="bg-[#1a2234] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-sky-400">Cadastro Kahu</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Gestão Central de Prontuários ({pets.length} ativos)</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => navigate('/cadastro/novo')}
              className="px-6 py-3 bg-white/5 border-2 border-dashed border-sky-500/50 rounded-2xl flex flex-col items-center justify-center hover:bg-sky-500/10 hover:border-sky-500 transition-all group"
            >
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest leading-none mb-1">Adicionar</span>
              <span className="text-xs font-black text-white group-hover:scale-110 transition-transform">NOVO CADASTRO</span>
            </button>

            <div className="h-10 w-px bg-white/10 mx-2 hidden md:block"></div>

            <button 
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              TODOS
            </button>
            <button 
              onClick={() => setFilterType('alergia')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filterType === 'alergia' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              <span className={filterType === 'alergia' ? 'text-white' : 'text-amber-400'}>⚠️</span> ALERGIAS
            </button>
            <button 
              onClick={() => setFilterType('doenca')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filterType === 'doenca' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              <span className={filterType === 'doenca' ? 'text-white' : 'text-purple-400'}>📋</span> DOENÇAS
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative group">
        <div className="absolute inset-0 bg-sky-500/5 blur-xl rounded-full group-focus-within:bg-sky-500/10 transition-all"></div>
        <input
          type="text"
          placeholder="Pesquise por Nome, ID ou Tutor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="relative w-full pl-14 pr-8 py-5 bg-white rounded-[32px] border-2 border-slate-50 focus:border-sky-300 outline-none transition-all font-black text-slate-700 placeholder:text-slate-300 shadow-xl shadow-slate-200/50 text-base"
        />
        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl opacity-20">🔎</span>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-6 font-black text-[9px] uppercase tracking-[0.2em] text-slate-400">PET / ID</th>
                <th className="p-6 font-black text-[9px] uppercase tracking-[0.2em] text-slate-400">RAÇA / TUTOR</th>
                <th className="p-6 font-black text-[9px] uppercase tracking-[0.2em] text-slate-400">ESCALA</th>
                <th className="p-6 font-black text-[9px] uppercase tracking-[0.2em] text-slate-400">DIETA</th>
                <th className="p-6 font-black text-[9px] uppercase tracking-[0.2em] text-slate-400">STATUS SAÚDE</th>
                <th className="p-6 font-black text-[9px] uppercase tracking-[0.2em] text-slate-400 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPets.map((pet) => (
                <tr key={pet.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">🐶</div>
                      <div>
                        <p className="font-black text-slate-800 leading-none mb-1 group-hover:text-sky-600 transition-colors">{pet.pet_nome}</p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{pet.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <p className="text-xs font-black text-slate-700 leading-none mb-1">{pet.raca}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{pet.tutor_nome}</p>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-wrap gap-1">
                      {(pet.dia_semana || '-').split(',').map(d => (
                         <span key={d} className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/50">{d.trim()}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-sky-600 bg-sky-50 px-3 py-1 rounded-xl border border-sky-100 font-black text-[9px] uppercase">{pet.tipo_alimentacao}</span>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-2">
                      {pet.possui_alergia.toLowerCase() === 'sim' && (
                        <span className="bg-rose-50 text-rose-500 px-2 py-1 rounded-lg border border-rose-100 text-[8px] font-black uppercase tracking-widest">ALERGIA</span>
                      )}
                      {pet.possui_doenca.toLowerCase() === 'sim' && (
                        <span className="bg-amber-50 text-amber-500 px-2 py-1 rounded-lg border border-amber-100 text-[8px] font-black uppercase tracking-widest">DOENÇA</span>
                      )}
                      {pet.possui_alergia.toLowerCase() !== 'sim' && pet.possui_doenca.toLowerCase() !== 'sim' && (
                        <span className="text-slate-300 text-[8px] font-black uppercase italic tracking-widest">SAUDÁVEL</span>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/cadastro/${pet.id}`)}
                        className="flex-grow bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-sky-500/20 transition-all"
                      >
                        ABRIR FICHA
                      </button>
                      <button 
                        onClick={() => onDeletePet(pet.id)}
                        className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white rounded-xl border border-slate-100 transition-all shadow-sm group/del"
                        title="Excluir Pet"
                      >
                        <span className="group-hover/del:scale-110 transition-transform">🗑️</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPets.length === 0 && (
            <div className="p-32 text-center flex flex-col items-center justify-center opacity-20">
              <span className="text-7xl mb-4">🔦</span>
              <p className="font-black text-slate-800 uppercase tracking-[0.3em] text-sm">Nenhum pet encontrado na busca Looker.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center px-8 text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] py-4">
        <span>Kahu Care Database Management</span>
        <span>Filtered: {filteredPets.length} of {pets.length} pets</span>
      </div>
    </div>
  );
};

export default CadastroLooker;
