
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pet, HotelStay, Medication, MedicationLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HotelProps {
  pets: Pet[];
  hotelStays: HotelStay[];
  medications: Medication[];
  medicationLogs: MedicationLog[];
  onSaveStay: (stay: HotelStay) => void;
  onDeleteStay: (id: string) => void;
  onSaveMedLog: (log: MedicationLog) => void;
}

const Hotel: React.FC<HotelProps> = ({
  pets,
  hotelStays,
  medications,
  medicationLogs,
  onSaveStay,
  onDeleteStay,
  onSaveMedLog
}) => {
  const navigate = useNavigate();
  const [isAddingStay, setIsAddingStay] = useState(false);
  const [newStay, setNewStay] = useState<Partial<HotelStay>>({
    petId: '',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: '',
    instructions: '',
    active: true
  });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const activeStays = useMemo(() => {
    return hotelStays.filter(s => s.active).map(stay => {
      const pet = pets.find(p => p.id === stay.petId);
      const meds = medications.filter(m => m.petId === stay.petId);
      return { ...stay, pet, meds };
    });
  }, [hotelStays, pets, medications]);

  const handleAddStay = () => {
    if (!newStay.petId || !newStay.checkIn) {
      alert('Por favor, selecione um pet e a data de entrada.');
      return;
    }

    const stay: HotelStay = {
      id: Date.now().toString(),
      petId: newStay.petId,
      checkIn: newStay.checkIn,
      checkOut: newStay.checkOut || '',
      instructions: newStay.instructions || '',
      active: true
    };

    onSaveStay(stay);
    setNewStay({
      petId: '',
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: '',
      instructions: '',
      active: true
    });
    setIsAddingStay(false);
  };

  const toggleMedication = (petId: string, medicationId: string) => {
    const existingLog = medicationLogs.find(l => l.medicationId === medicationId && l.date === selectedDate);
    
    const log: MedicationLog = {
      id: existingLog?.id || Date.now().toString(),
      medicationId,
      petId,
      date: selectedDate,
      offered: !existingLog?.offered,
    };

    onSaveMedLog(log);
  };

  const isMedOffered = (medicationId: string) => {
    return medicationLogs.find(l => l.medicationId === medicationId && l.date === selectedDate)?.offered || false;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-indigo-900 mb-1 tracking-tighter">Hotel</h2>
          <p className="text-indigo-700/60 font-bold text-sm uppercase tracking-widest">Hospedagem e cuidados 24h 🏨</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-3 rounded-[28px] border border-indigo-100 shadow-sm flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">DATA DE HOJE</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-indigo-800 font-black outline-none text-base cursor-pointer"
              />
            </div>
            <div className="text-2xl">📅</div>
          </div>
          
          <button 
            onClick={() => setIsAddingStay(true)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-[28px] font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
          >
            + HOSPEDAR PET
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAddingStay && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-8 rounded-[40px] border-2 border-indigo-100 shadow-2xl space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">PET</label>
                  <button 
                    onClick={() => navigate('/cadastro/novo?redirect=hotel')}
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    + CADASTRAR NOVO
                  </button>
                </div>
                <select 
                  value={newStay.petId}
                  onChange={(e) => setNewStay({...newStay, petId: e.target.value})}
                  className="w-full p-4 bg-indigo-50/30 border-2 border-indigo-50 rounded-2xl font-bold outline-none focus:border-indigo-300 transition-all"
                >
                  <option value="">Selecionar pet...</option>
                  {pets.map(p => (
                    <option key={p.id} value={p.id}>{p.pet_nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">CHECK-IN</label>
                <input 
                  type="date"
                  value={newStay.checkIn}
                  onChange={(e) => setNewStay({...newStay, checkIn: e.target.value})}
                  className="w-full p-4 bg-indigo-50/30 border-2 border-indigo-50 rounded-2xl font-bold outline-none focus:border-indigo-300 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">CHECK-OUT (PREVISTO)</label>
                <input 
                  type="date"
                  value={newStay.checkOut}
                  onChange={(e) => setNewStay({...newStay, checkOut: e.target.value})}
                  className="w-full p-4 bg-indigo-50/30 border-2 border-indigo-50 rounded-2xl font-bold outline-none focus:border-indigo-300 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">INSTRUÇÕES DO TUTOR</label>
              <textarea 
                value={newStay.instructions}
                onChange={(e) => setNewStay({...newStay, instructions: e.target.value})}
                placeholder="Ex: Alimentação 3x ao dia, não gosta de outros machos, etc..."
                className="w-full p-4 bg-indigo-50/30 border-2 border-indigo-50 rounded-2xl font-bold outline-none focus:border-indigo-300 transition-all h-32 resize-none"
              />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsAddingStay(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleAddStay}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                CONFIRMAR HOSPEDAGEM 🐾
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {activeStays.length === 0 ? (
          <div className="py-32 bg-white rounded-[40px] border-4 border-dashed border-indigo-50 flex flex-col items-center justify-center opacity-30">
            <span className="text-8xl mb-6">🏨</span>
            <p className="font-black uppercase tracking-[0.4em] text-sm">Nenhum pet hospedado no momento</p>
          </div>
        ) : (
          activeStays.map(stay => (
            <div key={stay.id} className="bg-white rounded-[40px] border border-indigo-50 shadow-sm overflow-hidden flex flex-col md:flex-row">
              {/* PET INFO SIDEBAR */}
              <div className="bg-indigo-50/50 p-8 md:w-72 border-r border-indigo-50 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center text-5xl shadow-sm mb-4 border-2 border-indigo-100">
                  🐶
                </div>
                <h3 className="text-2xl font-black text-indigo-900 leading-tight mb-1">{stay.pet?.pet_nome}</h3>
                <span className="bg-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">ID: {stay.petId}</span>
                
                <div className="w-full space-y-3 text-left bg-white p-4 rounded-2xl border border-indigo-100">
                  <div>
                    <span className="block text-[8px] font-black text-indigo-300 uppercase tracking-widest">ENTRADA</span>
                    <span className="text-xs font-bold text-indigo-800">{new Date(stay.checkIn).toLocaleDateString()}</span>
                  </div>
                  {stay.checkOut && (
                    <div>
                      <span className="block text-[8px] font-black text-indigo-300 uppercase tracking-widest">SAÍDA PREVISTA</span>
                      <span className="text-xs font-bold text-indigo-800">{new Date(stay.checkOut).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => {
                    if (confirm('Deseja encerrar esta hospedagem?')) {
                      onDeleteStay(stay.id);
                    }
                  }}
                  className="mt-6 w-full py-3 bg-rose-50 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                >
                  ENCERRAR ESTADIA
                </button>
              </div>

              {/* CONTENT AREA */}
              <div className="flex-1 p-8 space-y-8">
                {/* INSTRUCTIONS */}
                <div>
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                    INSTRUÇÕES DO TUTOR
                  </h4>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 italic text-slate-600 font-medium leading-relaxed">
                    {stay.instructions || 'Nenhuma instrução específica fornecida.'}
                  </div>
                </div>

                {/* MEDICATIONS */}
                <div>
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                    MEDICAÇÃO DO DIA
                  </h4>
                  
                  {stay.meds.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 italic">Sem remédios cadastrados para este pet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stay.meds.map(med => {
                        const offered = isMedOffered(med.id);
                        return (
                          <button
                            key={med.id}
                            onClick={() => toggleMedication(stay.petId, med.id)}
                            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                              offered 
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                                : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                            }`}
                          >
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black opacity-50">{med.time}</span>
                                <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">{med.frequency}</span>
                                <span className="font-black text-sm">{med.name}</span>
                              </div>
                              <div className="flex flex-col mt-0.5">
                                <span className="text-[10px] font-bold opacity-60">{med.dosage}</span>
                                {med.endDate && (
                                  <span className="text-[8px] font-black text-rose-400 uppercase">Até {new Date(med.endDate).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-xl">{offered ? '✅' : '💊'}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Hotel;
