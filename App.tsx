
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { fetchPets } from './services/api';
import { isPetOnDay } from './utils/date';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PetChecklist from './components/PetChecklist';
import Reports from './components/Reports';
import CadastroLooker from './components/CadastroLooker';
import ChecklistLooker from './components/ChecklistLooker';
import Groups from './components/Groups';
import Cadastro from './components/Cadastro';
import Medication from './components/Medication';
import Hotel from './components/Hotel';
import Settings from './components/Settings';
import Login from './components/Login';
import { Pet, ChecklistEntry, PetGroup, Medication as MedicationType, MedicationLog, HotelStay } from './types';

const App: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [checklists, setChecklists] = useState<ChecklistEntry[]>([]);
  const [groups, setGroups] = useState<PetGroup[]>([]);
  const [medications, setMedications] = useState<MedicationType[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [hotelStays, setHotelStays] = useState<HotelStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem('kahu_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }

    const init = async () => {
      try {
        const basePets = await fetchPets();
        
        const storedMaster = localStorage.getItem('kahu_master_pets');
        const storedDeleted = localStorage.getItem('kahu_deleted_pets');
        const deletedIds: string[] = storedDeleted ? JSON.parse(storedDeleted) : [];
        
        let currentPets = basePets;
        if (storedMaster) {
          const customPets: Pet[] = JSON.parse(storedMaster);
          
          // Se temos um master salvo, ele é a nossa base de verdade para os pets que já existiam
          // Mas queremos manter a capacidade de receber novos pets do "servidor" (basePets)
          // que ainda não foram vistos ou modificados.
          
          const customMap = new Map(customPets.map(p => [p.id, p]));
          const deletedSet = new Set(deletedIds);

          // Filtrar basePets: remover os que foram deletados explicitamente
          const filteredBase = basePets.filter(bp => !deletedSet.has(bp.id));

          // Mesclar: base filtrada + overrides do customMap
          const merged = filteredBase.map(bp => {
            const custom = customMap.get(bp.id);
            if (custom) customMap.delete(bp.id);
            return custom ? { ...bp, ...custom } : bp;
          });

          // Adicionar pets que só existem no customMap (novos cadastros)
          currentPets = [...merged, ...Array.from(customMap.values())];
        } else if (deletedIds.length > 0) {
          // Se não tem master mas tem deletados (caso raro mas possível)
          const deletedSet = new Set(deletedIds);
          currentPets = basePets.filter(bp => !deletedSet.has(bp.id));
        }
        setPets(currentPets);

        const storedCheck = localStorage.getItem('kahu_checklists');
        let localEntries: ChecklistEntry[] = storedCheck ? JSON.parse(storedCheck) : [];
        setChecklists(localEntries);

        const storedGroups = localStorage.getItem('kahu_groups');
        if (storedGroups) {
          setGroups(JSON.parse(storedGroups));
        } else {
          // Inicializar grupos automáticos por dia se não houver nenhum
          const initialGroups: PetGroup[] = [
            { id: 'g_seg', name: 'Matilha de Segunda', petIds: [], color: 'bg-emerald-500' },
            { id: 'g_ter', name: 'Matilha de Terça', petIds: [], color: 'bg-sky-500' },
            { id: 'g_qua', name: 'Matilha de Quarta', petIds: [], color: 'bg-amber-500' },
            { id: 'g_qui', name: 'Matilha de Quinta', petIds: [], color: 'bg-rose-500' },
            { id: 'g_sex', name: 'Matilha de Sexta', petIds: [], color: 'bg-purple-500' },
          ];
          setGroups(initialGroups);
          localStorage.setItem('kahu_groups', JSON.stringify(initialGroups));
        }

        const storedMeds = localStorage.getItem('kahu_medications');
        if (storedMeds) setMedications(JSON.parse(storedMeds));

        const storedMedLogs = localStorage.getItem('kahu_medication_logs');
        if (storedMedLogs) setMedicationLogs(JSON.parse(storedMedLogs));

        const storedHotel = localStorage.getItem('kahu_hotel_stays');
        if (storedHotel) setHotelStays(JSON.parse(storedHotel));
      } catch (e) {
        console.error("Erro ao carregar Kahu Care:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const saveChecklist = (entry: ChecklistEntry) => {
    setChecklists(prev => {
      const filtered = prev.filter(c => !(c.petId === entry.petId && c.date === entry.date));
      const updated = [...filtered, entry];
      localStorage.setItem('kahu_checklists', JSON.stringify(updated));
      return updated;
    });
  };

  const updatePetMaster = (updatedPet: Pet) => {
    setPets(prev => {
      const exists = prev.find(p => p.id === updatedPet.id);
      let newPets;
      if (exists) {
        newPets = prev.map(p => p.id === updatedPet.id ? updatedPet : p);
      } else {
        newPets = [...prev, updatedPet];
      }
      
      localStorage.setItem('kahu_master_pets', JSON.stringify(newPets));
      return newPets;
    });

    // Auto-sync with day groups (g_seg, g_ter, etc)
    setGroups(prev => {
      const dayMap: Record<string, string> = {
        'g_seg': 'Segunda',
        'g_ter': 'Terça',
        'g_qua': 'Quarta',
        'g_qui': 'Quinta',
        'g_sex': 'Sexta',
        'g_sab': 'Sábado'
      };

      const updatedGroups = prev.map(group => {
        const targetDay = dayMap[group.id];
        if (targetDay) {
          const isOnDay = isPetOnDay(updatedPet, targetDay);
          const currentIds = group.petIds || [];
          const hasPet = currentIds.includes(updatedPet.id);

          if (isOnDay && !hasPet) {
            return { ...group, petIds: [...currentIds, updatedPet.id] };
          } else if (!isOnDay && hasPet) {
            return { ...group, petIds: currentIds.filter(id => id !== updatedPet.id) };
          }
        }
        return group;
      });

      localStorage.setItem('kahu_groups', JSON.stringify(updatedGroups));
      return updatedGroups;
    });
  };

  const saveGroups = (newGroups: PetGroup[]) => {
    setGroups(newGroups);
    localStorage.setItem('kahu_groups', JSON.stringify(newGroups));
  };

  const saveMedication = (med: MedicationType) => {
    setMedications(prev => {
      const filtered = prev.filter(m => m.id !== med.id);
      const updated = [...filtered, med];
      localStorage.setItem('kahu_medications', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteMedication = (id: string) => {
    setMedications(prev => {
      const updated = prev.filter(m => m.id !== id);
      localStorage.setItem('kahu_medications', JSON.stringify(updated));
      return updated;
    });
    // Also cleanup logs
    setMedicationLogs(prev => {
      const updated = prev.filter(l => l.medicationId !== id);
      localStorage.setItem('kahu_medication_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const saveMedicationLog = (log: MedicationLog) => {
    setMedicationLogs(prev => {
      const filtered = prev.filter(l => 
        !(l.medicationId === log.medicationId && l.date === log.date && (l.slot === log.slot || (!l.slot && !log.slot)))
      );
      const updated = [...filtered, log];
      localStorage.setItem('kahu_medication_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const saveHotelStay = (stay: HotelStay) => {
    setHotelStays(prev => {
      const filtered = prev.filter(s => s.id !== stay.id);
      const updated = [...filtered, stay];
      localStorage.setItem('kahu_hotel_stays', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteHotelStay = (id: string) => {
    setHotelStays(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('kahu_hotel_stays', JSON.stringify(updated));
      return updated;
    });
  };

  const deletePet = (petId: string) => {
    // Adiciona ao registro de deletados para persistência
    const storedDeleted = localStorage.getItem('kahu_deleted_pets');
    const deletedIds: string[] = storedDeleted ? JSON.parse(storedDeleted) : [];
    if (!deletedIds.includes(petId)) {
      const newDeleted = [...deletedIds, petId];
      localStorage.setItem('kahu_deleted_pets', JSON.stringify(newDeleted));
    }

    setPets(prev => {
      const newPets = prev.filter(p => p.id !== petId);
      localStorage.setItem('kahu_master_pets', JSON.stringify(newPets));
      return newPets;
    });
    
    // Também remove o pet de todos os grupos
    setGroups(prev => {
      const newGroups = prev.map(g => ({
        ...g,
        petIds: g.petIds.filter(id => id !== petId)
      }));
      localStorage.setItem('kahu_groups', JSON.stringify(newGroups));
      return newGroups;
    });
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('kahu_authenticated', 'true');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center">
        <div className="text-7xl animate-bounce mb-6">🐾</div>
        <h1 className="text-3xl font-black text-emerald-800 tracking-tighter">Kahu Care</h1>
        <p className="text-emerald-600 font-bold animate-pulse mt-2">Sincronizando a matilha...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard pets={pets} checklists={checklists} groups={groups} onUpdatePet={updatePetMaster} />} />
          <Route path="/cadastro" element={<CadastroLooker pets={pets} onDeletePet={deletePet} />} />
          <Route path="/checklist_looker" element={<ChecklistLooker pets={pets} checklists={checklists} />} />
          <Route path="/cadastro/:petId" element={<Cadastro pets={pets} onSave={updatePetMaster} />} />
          <Route path="/grupos" element={<Groups pets={pets} groups={groups} onSaveGroups={saveGroups} />} />
          <Route path="/medicacao" element={<Medication pets={pets} medications={medications} medicationLogs={medicationLogs} onSaveMedication={saveMedication} onDeleteMedication={deleteMedication} onSaveLog={saveMedicationLog} />} />
          <Route path="/hotel" element={<Hotel pets={pets} hotelStays={hotelStays} medications={medications} medicationLogs={medicationLogs} onSaveStay={saveHotelStay} onDeleteStay={deleteHotelStay} onSaveMedLog={saveMedicationLog} onSaveMedication={saveMedication} />} />
          <Route path="/pet/:petId" element={<PetChecklist pets={pets} checklists={checklists} onSave={saveChecklist} onUpdatePet={updatePetMaster} />} />
          <Route path="/relatorios" element={<Reports pets={pets} checklists={checklists} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
