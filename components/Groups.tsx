
import React, { useState } from 'react';
import { Pet, PetGroup } from '../types';

interface GroupsProps {
  pets: Pet[];
  groups: PetGroup[];
  onSaveGroups: (groups: PetGroup[]) => void;
}

const Groups: React.FC<GroupsProps> = ({ pets, groups, onSaveGroups }) => {
  const [editingGroup, setEditingGroup] = useState<Partial<PetGroup> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const colors = [
    'bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 
    'bg-purple-500', 'bg-orange-500', 'bg-indigo-500', 'bg-pink-500'
  ];

  const handleCreateGroup = () => {
    setEditingGroup({
      id: Date.now().toString(),
      name: '',
      petIds: [],
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  };

  const togglePetInGroup = (petId: string) => {
    if (!editingGroup) return;
    const currentIds = editingGroup.petIds || [];
    const newIds = currentIds.includes(petId)
      ? currentIds.filter(id => id !== petId)
      : [...currentIds, petId];
    setEditingGroup({ ...editingGroup, petIds: newIds });
  };

  const saveGroup = () => {
    if (!editingGroup?.name) return alert('Dê um nome ao grupo!');
    const newGroups = groups.filter(g => g.id !== editingGroup.id);
    onSaveGroups([...newGroups, editingGroup as PetGroup]);
    setEditingGroup(null);
  };

  const deleteGroup = (id: string) => {
    if (confirm('Deseja excluir este grupo?')) {
      onSaveGroups(groups.filter(g => g.id !== id));
    }
  };

  const filteredPets = pets.filter(p => 
    p.pet_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-sky-900 mb-1">Meus Grupos</h2>
          <p className="text-sky-700/70 font-medium">Organize a matilha por comportamento ou dieta 📂</p>
        </div>
        <button 
          onClick={handleCreateGroup}
          className="bg-sky-500 text-white px-6 py-3 rounded-full font-black shadow-lg shadow-sky-200 hover:scale-105 active:scale-95 transition-all"
        >
          + CRIAR GRUPO
        </button>
      </div>

      {!editingGroup ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-4 border-dashed border-sky-100">
              <span className="text-6xl mb-4 block">📁</span>
              <p className="font-bold text-sky-300">Nenhum grupo criado ainda.</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.id} className="bg-white p-6 rounded-[32px] border border-sky-50 shadow-sm flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${group.color}`}></div>
                    <h3 className="text-xl font-black text-slate-800">{group.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingGroup(group)}
                      className="p-2 text-sky-400 hover:bg-sky-50 rounded-full transition-colors"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => deleteGroup(group.id)}
                      className="p-2 text-rose-400 hover:bg-rose-50 rounded-full transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pets no Grupo ({group.petIds.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {group.petIds.slice(0, 5).map(id => (
                      <span key={id} className="bg-white px-2 py-0.5 rounded-full text-[10px] font-black text-sky-600 border border-sky-100">
                        {pets.find(p => p.id === id)?.pet_nome || id}
                      </span>
                    ))}
                    {group.petIds.length > 5 && (
                      <span className="text-[10px] font-black text-slate-300 ml-1">
                        + {group.petIds.length - 5} outros
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-sky-50 space-y-8 animate-in slide-in-from-bottom-4">
          <div className="space-y-4">
            <label className="block text-sm font-black text-sky-900 uppercase tracking-widest">Nome do Grupo</label>
            <input 
              autoFocus
              value={editingGroup.name}
              onChange={e => setEditingGroup({...editingGroup, name: e.target.value})}
              placeholder="Ex: Cães que comem sozinhos"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-slate-700 focus:border-sky-400 transition-colors"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-black text-sky-900 uppercase tracking-widest">Selecionar Pets ({editingGroup.petIds?.length || 0})</label>
              <input 
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-100 px-4 py-1 rounded-full text-xs font-bold outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 border-2 border-slate-50 rounded-3xl scrollbar-hide">
              {filteredPets.map(pet => {
                const isSelected = editingGroup.petIds?.includes(pet.id);
                return (
                  <button
                    key={pet.id}
                    onClick={() => togglePetInGroup(pet.id)}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center group ${
                      isSelected 
                        ? 'bg-sky-500 border-sky-600 text-white shadow-md' 
                        : 'bg-white border-slate-50 text-slate-400 hover:border-sky-100'
                    }`}
                  >
                    <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🐶</span>
                    <span className="text-[10px] font-black leading-tight uppercase">{pet.pet_nome}</span>
                    <span className={`text-[8px] font-bold ${isSelected ? 'text-sky-200' : 'text-slate-300'}`}>{pet.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setEditingGroup(null)}
              className="flex-1 py-4 rounded-2xl font-black text-slate-400 border-2 border-slate-50 hover:bg-slate-50 transition-colors"
            >
              CANCELAR
            </button>
            <button 
              onClick={saveGroup}
              className="flex-[2] py-4 bg-sky-500 text-white rounded-2xl font-black shadow-lg shadow-sky-200 hover:bg-sky-600 transition-colors"
            >
              SALVAR GRUPO ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
