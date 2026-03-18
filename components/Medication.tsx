
import React, { useState, useMemo } from 'react';
import { Pet, Medication as MedicationType, MedicationLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface MedicationProps {
  pets: Pet[];
  medications: MedicationType[];
  medicationLogs: MedicationLog[];
  onSaveMedication: (medication: MedicationType) => void;
  onDeleteMedication: (id: string) => void;
  onSaveLog: (log: MedicationLog) => void;
}

const Medication: React.FC<MedicationProps> = ({ 
  pets, 
  medications, 
  medicationLogs, 
  onSaveMedication, 
  onDeleteMedication, 
  onSaveLog 
}) => {
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [newMed, setNewMed] = useState<Partial<MedicationType>>({
    name: '',
    dosage: '',
    time: '',
    frequency: '24h',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    instructions: '',
    active: true
  });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredMedications = useMemo(() => {
    if (!selectedPetId) return [];
    return medications.filter(m => m.petId === selectedPetId);
  }, [medications, selectedPetId]);

  const handleAddMedication = () => {
    if (!selectedPetId) return;
    if (!newMed.name || !newMed.time) {
      alert('Por favor, preencha o nome e o horário do remédio.');
      return;
    }

    const medication: MedicationType = {
      id: Date.now().toString(),
      petId: selectedPetId,
      name: newMed.name || '',
      dosage: newMed.dosage || '',
      time: newMed.time || '',
      frequency: newMed.frequency || '24h',
      startDate: newMed.startDate || '',
      endDate: newMed.endDate || '',
      instructions: newMed.instructions || '',
      active: true
    };

    onSaveMedication(medication);
    setNewMed({ 
      name: '', 
      dosage: '', 
      time: '', 
      frequency: '24h', 
      startDate: new Date().toISOString().split('T')[0], 
      endDate: '', 
      instructions: '', 
      active: true 
    });
    setIsAddingMed(false);
  };

  const toggleOffered = (medicationId: string) => {
    const existingLog = medicationLogs.find(l => l.medicationId === medicationId && l.date === selectedDate);
    
    const log: MedicationLog = {
      id: existingLog?.id || Date.now().toString(),
      medicationId,
      petId: selectedPetId,
      date: selectedDate,
      offered: !existingLog?.offered,
    };

    onSaveLog(log);
  };

  const getLogStatus = (medicationId: string) => {
    return medicationLogs.find(l => l.medicationId === medicationId && l.date === selectedDate)?.offered || false;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-emerald-900 mb-1 tracking-tighter">Medicação</h2>
          <p className="text-emerald-700/60 font-bold text-sm uppercase tracking-widest">Controle de remédios da matilha 💊</p>
        </div>

        <div className="bg-white px-6 py-3 rounded-[28px] border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">DATA DO CONTROLE</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-emerald-800 font-black outline-none text-base cursor-pointer"
            />
          </div>
          <div className="text-2xl">📅</div>
        </div>
      </div>

      {/* PET SELECTOR */}
      <div className="bg-white p-6 rounded-[40px] border border-emerald-50 shadow-sm">
        <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3 ml-2">SELECIONE O PET</label>
        <select 
          value={selectedPetId}
          onChange={(e) => setSelectedPetId(e.target.value)}
          className="w-full p-4 bg-emerald-50/50 border-2 border-emerald-100 rounded-[24px] font-black text-emerald-900 outline-none focus:border-emerald-400 transition-all appearance-none cursor-pointer"
        >
          <option value="">Escolha um pet...</option>
          {pets.map(pet => (
            <option key={pet.id} value={pet.id}>{pet.pet_nome} ({pet.id})</option>
          ))}
        </select>
      </div>

      {selectedPetId && (
        <div className="space-y-6">
          {/* ADD MEDICATION BUTTON */}
          <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-black text-emerald-900">Remédios de {pets.find(p => p.id === selectedPetId)?.pet_nome}</h3>
            <button 
              onClick={() => setIsAddingMed(true)}
              className="bg-emerald-500 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all"
            >
              + NOVO REMÉDIO
            </button>
          </div>

          {/* ADD MEDICATION FORM */}
          <AnimatePresence>
            {isAddingMed && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white p-8 rounded-[40px] border-2 border-emerald-100 shadow-xl space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-2">NOME DO REMÉDIO</label>
                    <input 
                      type="text"
                      value={newMed.name}
                      onChange={(e) => setNewMed({...newMed, name: e.target.value})}
                      placeholder="Ex: Apoquel"
                      className="w-full p-4 bg-emerald-50/30 border-2 border-emerald-50 rounded-2xl font-bold outline-none focus:border-emerald-300 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-2">FREQUÊNCIA</label>
                    <select 
                      value={newMed.frequency}
                      onChange={(e) => setNewMed({...newMed, frequency: e.target.value as any})}
                      className="w-full p-4 bg-emerald-50/30 border-2 border-emerald-50 rounded-2xl font-bold outline-none focus:border-emerald-300 transition-all"
                    >
                      <option value="24h">Uma vez ao dia (24h)</option>
                      <option value="12h">A cada 12 horas</option>
                      <option value="outra">Outra</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-2">HORÁRIO</label>
                    <input 
                      type="time"
                      value={newMed.time}
                      onChange={(e) => setNewMed({...newMed, time: e.target.value})}
                      className="w-full p-4 bg-emerald-50/30 border-2 border-emerald-50 rounded-2xl font-bold outline-none focus:border-emerald-300 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-2">DOSAGEM</label>
                    <input 
                      type="text"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({...newMed, dosage: e.target.value})}
                      placeholder="Ex: 1 comprimido"
                      className="w-full p-4 bg-emerald-50/30 border-2 border-emerald-50 rounded-2xl font-bold outline-none focus:border-emerald-300 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-2">DATA DE INÍCIO</label>
                    <input 
                      type="date"
                      value={newMed.startDate}
                      onChange={(e) => setNewMed({...newMed, startDate: e.target.value})}
                      className="w-full p-4 bg-emerald-50/30 border-2 border-emerald-50 rounded-2xl font-bold outline-none focus:border-emerald-300 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-2">DATA DE TÉRMINO (OPCIONAL)</label>
                    <input 
                      type="date"
                      value={newMed.endDate}
                      onChange={(e) => setNewMed({...newMed, endDate: e.target.value})}
                      className="w-full p-4 bg-emerald-50/30 border-2 border-emerald-50 rounded-2xl font-bold outline-none focus:border-emerald-300 transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-2">INSTRUÇÕES</label>
                    <input 
                      type="text"
                      value={newMed.instructions}
                      onChange={(e) => setNewMed({...newMed, instructions: e.target.value})}
                      placeholder="Ex: Dar após a refeição"
                      className="w-full p-4 bg-emerald-50/30 border-2 border-emerald-50 rounded-2xl font-bold outline-none focus:border-emerald-300 transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsAddingMed(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={handleAddMedication}
                    className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all"
                  >
                    SALVAR REMÉDIO ✨
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MEDICATION LIST / LOG */}
          <div className="grid grid-cols-1 gap-4">
            {filteredMedications.length === 0 ? (
              <div className="py-20 bg-white rounded-[40px] border-4 border-dashed border-emerald-50 flex flex-col items-center justify-center opacity-30">
                <span className="text-6xl mb-4">💊</span>
                <p className="font-black uppercase tracking-widest text-sm">Nenhum remédio cadastrado para este pet.</p>
              </div>
            ) : (
              filteredMedications.map(med => {
                const isOffered = getLogStatus(med.id);
                return (
                  <div 
                    key={med.id}
                    className={`bg-white p-6 rounded-[35px] border-2 transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${isOffered ? 'border-emerald-500 shadow-lg shadow-emerald-100' : 'border-emerald-50 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-6 flex-1 w-full">
                      <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-3xl shadow-inner border-2 ${isOffered ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-emerald-50 text-emerald-400 border-white'}`}>
                        {isOffered ? '✅' : '💊'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="bg-emerald-100 text-emerald-600 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">{med.time}</span>
                          <span className="bg-emerald-50 text-emerald-500 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">{med.frequency === '12h' ? '12h' : med.frequency === '24h' ? '24h' : 'Outra'}</span>
                          <h4 className="font-black text-xl text-slate-800">{med.name}</h4>
                        </div>
                        <p className="text-sm font-bold text-slate-400 mt-1">
                          {med.dosage} • {med.instructions || 'Sem instruções'}
                          {med.startDate && ` • Início: ${new Date(med.startDate).toLocaleDateString()}`}
                          {med.endDate && ` • Término: ${new Date(med.endDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <button 
                        onClick={() => toggleOffered(med.id)}
                        className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-b-4 ${
                          isOffered 
                            ? 'bg-emerald-600 border-emerald-800 text-white shadow-inner translate-y-1' 
                            : 'bg-emerald-500 border-emerald-700 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
                        }`}
                      >
                        {isOffered ? 'OFERECIDO' : 'MARCAR COMO OFERECIDO'}
                      </button>
                      
                      <button 
                        onClick={() => {
                          if (confirm('Deseja excluir este remédio?')) {
                            onDeleteMedication(med.id);
                          }
                        }}
                        className="w-14 h-14 bg-rose-50 text-rose-400 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {!selectedPetId && (
        <div className="py-32 text-center opacity-20 flex flex-col items-center">
          <span className="text-8xl mb-6">🔍</span>
          <p className="font-black text-slate-800 uppercase tracking-[0.4em] text-sm">Selecione um pet para ver a medicação</p>
        </div>
      )}
    </div>
  );
};

export default Medication;
