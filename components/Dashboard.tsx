import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pet, ChecklistEntry, PetGroup, Medication, MedicationLog, HotelStay } from '../types';
import { useTenant } from '../src/hooks/useTenant';
import { getStatusColor, getStatusEmoji, calculateStatus } from '../utils/status';
import { isPetOnDay } from '../utils/date';
import { getGeneratedMessage } from '../utils/messages';
import { 
  Bell, Calendar, Sparkles, Plus, CheckCircle2, AlertTriangle, 
  Activity, Clock, Settings, Search, Building2, Download, 
  Upload, PlusCircle, Check, Flame, Cake, RefreshCw, 
  Users, CheckSquare, Info, X, Zap, Heart, ShieldAlert, ChevronRight, Share2, Copy
} from 'lucide-react';

interface DashboardProps {
  pets: Pet[];
  checklists: ChecklistEntry[];
  groups: PetGroup[];
  medications?: Medication[];
  medicationLogs?: MedicationLog[];
  hotelStays?: HotelStay[];
  onSaveMedicationLog?: (log: MedicationLog) => void;
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
  pets, checklists, groups, 
  medications = [], 
  medicationLogs = [], 
  hotelStays = [], 
  onSaveMedicationLog,
  onUpdatePet, onPullSync, onPushSync, 
  onSaveChecklist, lastSync, isSyncing, sheetsWebhookUrl, zApiConfig 
}) => {
  const navigate = useNavigate();
  
  const { nome: domoNome, cor: domoCor, logo: domoLogo } = useTenant();
  
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

  // Filtering views
  const [showHotelOnly, setShowHotelOnly] = useState(false);
  
  // Modals Core States
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showMedicationsModal, setShowMedicationsModal] = useState(false);
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);
  const [showHotelStaysModal, setShowHotelStaysModal] = useState(false);

  // Batch actions variables
  const [batchSelectedPets, setBatchSelectedPets] = useState<string[]>([]);
  const [batchEatenValue, setBatchEatenValue] = useState<ChecklistEntry['comeu']>('Comeu tudo');
  const [batchObservation, setBatchObservation] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);

  // Pending tutor registrations list
  const [pendentes, setPendentes] = useState<any[]>([]);

  useEffect(() => {
    const loadPendings = () => {
      const stored = localStorage.getItem('domo_cadastros_pendentes');
      if (stored) {
        try {
          setPendentes(JSON.parse(stored));
        } catch (e) {
          console.error("Erro canino ao carregar cadastros públicos:", e);
        }
      } else {
        setPendentes([]);
      }
    };
    loadPendings();
    window.addEventListener('domoPendingRegistrationsChanged', loadPendings);
    return () => window.removeEventListener('domoPendingRegistrationsChanged', loadPendings);
  }, []);

  interface LiveToast {
    id: string;
    type: 'yellow' | 'red' | 'green';
    medId: string;
    slotNum: number;
    petId: string;
    petName: string;
    medName: string;
    dosage: string;
    timeStr: string;
    text?: string;
    givenTime?: string;
    givenBy?: string;
    createdAt: number;
  }

  const [liveToasts, setLiveToasts] = useState<LiveToast[]>([]);
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>([]);
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  const getNumSlots = (freq: string) => {
    if (freq === '12h') return 2;
    if (freq === '8h') return 3;
    if (freq === '6h') return 4;
    return 1;
  };

  const handleSaveMedicationLog = (log: MedicationLog) => {
    if (onSaveMedicationLog) {
      onSaveMedicationLog(log);
    } else {
      const stored = JSON.parse(localStorage.getItem('kahu_medication_logs') || '[]');
      stored.push(log);
      localStorage.setItem('kahu_medication_logs', JSON.stringify(stored));
    }

    // Trigger green success notification immediately!
    const med = medications.find(m => m.id === log.medicationId);
    const pet = pets.find(p => p.id === log.petId);
    if (med && pet) {
      const givenTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
      const userName = log.offeredBy || 'Camila';
      const toastId = `green-${log.medicationId}-${log.slot || 0}`;
      
      setLiveToasts(prev => {
        const filtered = prev.filter(t => t.id !== toastId);
        return [...filtered, {
          id: toastId,
          type: 'green',
          medId: med.id,
          slotNum: log.slot || 0,
          petId: pet.id,
          petName: pet.pet_nome,
          medName: med.name,
          dosage: med.dosage,
          timeStr: med.time,
          givenTime,
          givenBy: userName,
          createdAt: Date.now()
        }].slice(-3); // Limit to 3 stacked max
      });
    }
  };

  const handleRegisterNow = (toast: LiveToast) => {
    const userName = prompt("Qual o nome do cuidador aplicando a medicação?", "Camila");
    if (userName === null) return;
    const finalUser = userName.trim() || 'Camila';

    const newLog: MedicationLog = {
      id: `MLOG_${Date.now()}_${Math.floor(Math.random() * 1051)}`,
      medicationId: toast.medId,
      petId: toast.petId,
      date: todayLocal(),
      offered: true,
      offeredBy: finalUser,
      slot: toast.slotNum,
      notes: 'Aplicado via banner de notificação'
    };

    handleSaveMedicationLog(newLog);
  };

  // Auto-dismiss toasts after 10 seconds if not interacted
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setLiveToasts(prev => prev.filter(toast => now - toast.createdAt < 10000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const scanMedications = () => {
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentTotal = currentH * 60 + currentM;
    const todayDate = todayLocal();

    const activeMeds = medications.filter(m => m.active);
    const newToasts: LiveToast[] = [];

    activeMeds.forEach(med => {
      const pet = pets.find(p => p.id === med.petId);
      if (!pet) return;

      const isEscalado = selectedDay === 'Todos' || isPetOnDay(pet, selectedDay);
      if (!isEscalado) return;

      const numSlots = getNumSlots(med.frequency);
      for (let i = 0; i < numSlots; i++) {
        const slotNum = numSlots > 1 ? i + 1 : 0;
        
        const log = medicationLogs.find(l => l.medicationId === med.id && l.date === todayDate && (l.slot || 0) === slotNum);
        const isRegistered = log !== undefined;

        if (!isRegistered) {
          let slotHour = 0;
          let slotMin = 0;
          const [h, m_] = med.time.split(':').map(Number);
          if (numSlots > 1) {
            const interval = med.frequency === '12h' ? 12 : med.frequency === '8h' ? 8 : 6;
            slotHour = (h + (interval * (slotNum - 1))) % 24;
            slotMin = m_;
          } else {
            slotHour = h;
            slotMin = m_;
          }
          
          const displayTime = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;
          const slotTotal = slotHour * 60 + slotMin;
          const diffMinutes = slotTotal - currentTotal;

          let type: 'yellow' | 'red' | null = null;
          let toastText = '';

          if (diffMinutes > 5 && diffMinutes <= 30) {
            type = 'yellow';
            toastText = `${med.name} do ${pet.pet_nome} em ${diffMinutes} minutos — ${displayTime}`;
          } else if (diffMinutes <= 5 && diffMinutes >= -180) { // Limit to 3 hours overdue to be considered active red on Dashboard
            type = 'red';
            toastText = `${med.name} da ${pet.pet_nome} em ${diffMinutes >= 0 ? diffMinutes : 0} minutos — AGORA!`;
          }

          if (type) {
            const toastId = `${type}-${med.id}-${slotNum}`;
            if (!dismissedToastIds.includes(toastId)) {
              newToasts.push({
                id: toastId,
                type,
                medId: med.id,
                slotNum,
                petId: pet.id,
                petName: pet.pet_nome,
                medName: med.name,
                dosage: med.dosage,
                timeStr: displayTime,
                text: toastText,
                createdAt: Date.now()
              });
            }
          }
        }
      }
    });

    setLiveToasts(prev => {
      const greenToasts = prev.filter(t => t.type === 'green' && Date.now() - t.createdAt < 10000);
      const merged = [...greenToasts];
      newToasts.forEach(nt => {
        if (!merged.some(m => m.id === nt.id)) {
          merged.push(nt);
        }
      });
      return merged.slice(-3); // limit to 3 visible at once
    });
  };

  useEffect(() => {
    scanMedications();
    const interval = setInterval(() => {
      scanMedications();
    }, 60000);
    return () => clearInterval(interval);
  }, [medications, medicationLogs, pets, selectedDay, dismissedToastIds]);

  const medsTodayList = useMemo(() => {
    const todayDate = todayLocal();
    const activeMeds = medications.filter(m => m.active);
    const list: Array<{
      id: string;
      med: Medication;
      pet?: Pet;
      slotNum: number;
      displayTime: string;
      status: 'pending' | 'given' | 'refused';
      log?: MedicationLog;
    }> = [];

    activeMeds.forEach(med => {
      const pet = pets.find(p => p.id === med.petId);
      if (!pet) return;

      const isEscalado = selectedDay === 'Todos' || isPetOnDay(pet, selectedDay);
      if (!isEscalado) return;

      const numSlots = getNumSlots(med.frequency);
      for (let i = 0; i < numSlots; i++) {
        const slotNum = numSlots > 1 ? i + 1 : 0;
        const log = medicationLogs.find(l => l.medicationId === med.id && l.date === todayDate && (l.slot || 0) === slotNum);
        
        let status: 'pending' | 'given' | 'refused' = 'pending';
        if (log) {
          status = log.offered ? 'given' : 'refused';
        }

        let slotHour = 0;
        let slotMin = 0;
        const [h, m_] = med.time.split(':').map(Number);
        if (numSlots > 1) {
          const interval = med.frequency === '12h' ? 12 : med.frequency === '8h' ? 8 : 6;
          slotHour = (h + (interval * (slotNum - 1))) % 24;
          slotMin = m_;
        } else {
          slotHour = h;
          slotMin = m_;
        }
        const displayTime = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;

        list.push({
          id: `${med.id}-${slotNum}`,
          med,
          pet,
          slotNum,
          displayTime,
          status,
          log
        });
      }
    });

    return list.sort((a, b) => a.displayTime.localeCompare(b.displayTime));
  }, [medications, medicationLogs, pets, selectedDay, searchDate]);

  const pendingAlertCount = useMemo(() => medsTodayList.filter(item => item.status === 'pending').length, [medsTodayList]);

  const NAV_DAYS = ['Todos', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    NAV_DAYS.forEach(day => {
      counts[day] = pets.filter(pet => isPetOnDay(pet, day)).length;
    });
    return counts;
  }, [pets]);

  // Check if a pet is actively staying in the hotel today
  const isPetInHotelToday = (petId: string) => {
    return (hotelStays || []).some(stay => 
      stay.petId === petId && 
      stay.active && 
      searchDate >= stay.checkIn && 
      searchDate <= stay.checkOut
    );
  };

  const filteredPets = useMemo(() => {
    return pets
      .filter(pet => {
        const matchesDay = isPetOnDay(pet, selectedDay);
        const matchesSearch = 
          pet.pet_nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
          pet.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesHotelFilter = !showHotelOnly || isPetInHotelToday(pet.id);
        return matchesDay && matchesSearch && matchesHotelFilter;
      })
      .sort((a, b) => a.pet_nome.localeCompare(b.pet_nome));
  }, [pets, selectedDay, searchTerm, showHotelOnly, hotelStays, searchDate]);

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

  // Stable deterministic birthday algorithm based on string character keys
  const getDeterministicBirthday = (pet: Pet, dateStr: string) => {
    const [,, day] = dateStr.split('-');
    const dNum = parseInt(day || '1', 10);
    let hash = 0;
    const str = pet.id + pet.pet_nome;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 25 === dNum % 25;
  };

  // Compile real-time smart notifications list from actual records
  const smartNotifications = useMemo(() => {
    const alerts: Array<{
      id: string;
      type: 'hotel' | 'feed_ok' | 'feed_alert' | 'med_pending' | 'birthday' | 'pending_register';
      title: string;
      description: string;
      emoji: string;
      colorClass: string;
      actionText?: string;
      onAction?: () => void;
    }> = [];

    // 1. Hotel departures today
    const departuresToday = (hotelStays || []).filter(stay => stay.active && stay.checkOut === searchDate);
    departuresToday.forEach(stay => {
      const p = pets.find(x => x.id === stay.petId);
      if (p) {
        alerts.push({
          id: `hotel_out_${stay.id}`,
          type: 'hotel',
          title: `🏨 Check-out no Hotel hoje`,
          description: `O cão hoteleiro ${p.pet_nome} realiza seu checkout hoje!`,
          emoji: '🏨',
          colorClass: 'from-blue-50 to-indigo-50 border-indigo-200 text-indigo-900',
          actionText: 'Ver Hotel',
          onAction: () => navigate('/hotel')
        });
      }
    });

    // 2. Latest positive eaten action
    const positiveChecklists = [...checklistsForDate]
      .filter(entry => entry.comeu === 'Comeu tudo')
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    if (positiveChecklists.length > 0) {
      const p = pets.find(x => x.id === positiveChecklists[0].petId);
      if (p) {
        alerts.push({
          id: `feed_positive_last`,
          type: 'feed_ok',
          title: `✅ Comendo Super Bem!`,
          description: `O peludo ${p.pet_nome} comeu tudo sua refeição hoje no capricho!`,
          emoji: '😋',
          colorClass: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-900',
        });
      }
    }

    // 3. Negatives / Missing registrations alert
    const presentPetsWithFeedingAlert = filteredPets.filter(p => {
      const entry = checklistsForDate.find(c => c.petId === p.id);
      return entry && entry.comeu === 'Não comeu';
    });
    presentPetsWithFeedingAlert.forEach(p => {
      alerts.push({
        id: `feed_warn_${p.id}`,
        type: 'feed_alert',
        title: `⚠️ Alerta de Alimentação`,
        description: `O fofuxo ${p.pet_nome} não comeu sua porção hoje! Verifique se precisa de amparo.`,
        emoji: '🔴',
        colorClass: 'from-orange-50 to-rose-50 border-rose-200 text-rose-950',
      });
    });

    const presentWithNoRecordCount = filteredPets.filter(p => !checklistsForDate.some(c => c.petId === p.id)).length;
    if (presentWithNoRecordCount > 0 && selectedDay !== 'Todos') {
      const firstNoRecord = filteredPets.find(p => !checklistsForDate.some(c => c.petId === p.id));
      if (firstNoRecord) {
        alerts.push({
          id: `feed_missing_record`,
          type: 'feed_alert',
          title: `🍽️ Pendências de Alimentação`,
          description: `${firstNoRecord.pet_nome} e outros ${presentWithNoRecordCount - 1} peludinhos estão sem registro hoje.`,
          emoji: '🥣',
          colorClass: 'from-amber-50 to-yellow-50 border-amber-200 text-amber-900',
          actionText: 'Registrar Lote',
          onAction: () => {
            const pendingIds = filteredPets
              .filter(p => !checklistsForDate.some(c => c.petId === p.id))
              .map(p => p.id);
            setBatchSelectedPets(pendingIds);
            setBatchEatenValue('Comeu tudo');
            setBatchObservation('');
            setShowBatchModal(true);
          }
        });
      }
    }

    // 4. Pending Medication today
    const activeMeds = (medications || []).filter(med => med.active);
    activeMeds.forEach(med => {
      const p = filteredPets.find(x => x.id === med.petId);
      if (p) {
        const wasGiven = (medicationLogs || []).some(log => log.medicationId === med.id && log.date === searchDate && log.offered);
        if (!wasGiven) {
          alerts.push({
            id: `med_pend_${med.id}`,
            type: 'med_pending',
            title: `💊 Medicação Pendente`,
            description: `${med.name} do ${p.pet_nome} (${med.dosage}) agendado para às ${med.time}`,
            emoji: '💊',
            colorClass: 'from-pink-50 to-rose-50 border-pink-200 text-rose-900',
            actionText: 'Anotar como Dado',
            onAction: () => {
              const newLog: MedicationLog = {
                id: `MLOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                medicationId: med.id,
                petId: med.petId,
                date: searchDate,
                offered: true,
                offeredBy: 'Admin',
                notes: 'Aplicado pelo painel dinâmico'
              };
              handleSaveMedicationLog(newLog);
              alert(`Sucesso! Medicação ${med.name} para ${p.pet_nome} marcada como aplicada.`);
            }
          });
        }
      }
    });



    // 6. Multi-tenant public register approvals awaiting review
    if (pendentes.length > 0) {
      alerts.push({
        id: `pending_reg_count`,
        type: 'pending_register',
        title: `🆕 Fichas de Cadastro Pendentes`,
        description: `Existem ${pendentes.length} novas fichas enviadas por tutores esperando aprovação.`,
        emoji: '🐾',
        colorClass: 'from-violet-50 to-fuchsia-50 border-violet-200 text-violet-900',
        actionText: 'Revisar Fichas',
        onAction: () => {
          setShowApprovalsModal(true);
        }
      });
    }

    return alerts;
  }, [hotelStays, searchDate, checklistsForDate, filteredPets, medications, medicationLogs, pendentes, selectedDay]);

  // Day Stats Overview variables
  const countPresent = filteredPets.length;
  
  const countCheckedFeedings = useMemo(() => {
    return filteredPets.filter(p => checklistsForDate.some(c => c.petId === p.id)).length;
  }, [filteredPets, checklistsForDate]);

  const countInHotel = useMemo(() => {
    return filteredPets.filter(p => isPetInHotelToday(p.id)).length;
  }, [filteredPets, hotelStays, searchDate]);

  // Actions trigger helpers
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

  // Direct fast save feeding
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
    
    onSaveChecklist({ ...entry, lastMessageSentAt: new Date().toISOString() });

    if (!phone) {
      navigator.clipboard.writeText(text);
      alert('Tutor sem telefone cadastrado. Mensagem copiada!');
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

        if (!response.ok) {
          throw new Error('Erro ao enviar via Z-API');
        }
        console.log(`Mensagem enviada com sucesso para ${pet.pet_nome}`);
      } catch (e) {
        console.error("Erro Z-API:", e);
        const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      }
    } else {
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

  // Execute Batch saving action 
  const handleBatchSaveExecution = async () => {
    if (batchSelectedPets.length === 0) return alert('Selecione ao menos um cachorro para registrar.');
    setSavingBatch(true);
    try {
      for (const petId of batchSelectedPets) {
        const existing = checklists.find(c => c.petId === petId && c.date === searchDate);
        const newEntry: ChecklistEntry = {
          petId,
          date: searchDate,
          comeu: batchEatenValue,
          status: calculateStatus({ comeu: batchEatenValue }),
          agua: existing?.agua || 'Pouca água',
          teveEstimuloHidratacao: existing?.teveEstimuloHidratacao || 'Não',
          comportamento: existing?.comportamento || '-',
          alertas: existing?.alertas || '-',
          observacoes: batchObservation || existing?.observacoes || '',
          escoreFecal: existing?.escoreFecal || 3,
          quantoOferecido: existing?.quantoOferecido || '-',
          quantoSobrou: existing?.quantoSobrou || '-',
          updatedAt: new Date().toISOString()
        };
        await onSaveChecklist(newEntry);
      }
      alert(`Cadastrado alimentação de ${batchSelectedPets.length} cães com sucesso!`);
      setShowBatchModal(false);
      setBatchSelectedPets([]);
      setBatchObservation('');
    } catch (e) {
      console.error(e);
      alert('Erro inesperado de processo ao registrar lote.');
    } finally {
      setSavingBatch(false);
    }
  };

  // Fast approve public forms
  const handleApproveForm = (index: number) => {
    const target = pendentes[index];
    if (!target) return;

    const newPet: Pet = {
      id: target.id || `PET_${Date.now()}`,
      pet_nome: target.pet_nome,
      raca: target.raca || 'Mestiço',
      tutor_nome: target.tutor_nome,
      telefone: target.telefone,
      dia_semana: target.dia_semana || 'Segunda',
      possui_alergia: target.possui_alergia || 'Não',
      alimentos_proibidos: target.alimentos_proibidos || '',
      possui_doenca: 'Não',
      doenca_qual: '',
      comportamento_alimentar: 'Focado',
      precisa_estimulo: 'Não',
      tipo_alimentacao: target.tipo_alimentacao || 'Padrão',
      quantidade_oferecida: target.quantidade_oferecida || '',
      quantidade_aproximada: '',
      marca_racao: '',
      especificacao_racao: '',
      oferece_extras: 'Sim',
      ingestao_agua: 'Ideal',
      interesse_agua: 'Médio',
      ajuda_beber_agua: 'Não',
      sede_pos_creche: 'Não',
      escore_corporal: 'Ideal',
      observacoes: target.observacoes || 'Importado de cadastro público.',
      peso_pet: '10kg'
    };

    onUpdatePet(newPet);

    const updated = [...pendentes];
    updated.splice(index, 1);
    setPendentes(updated);
    localStorage.setItem('domo_cadastros_pendentes', JSON.stringify(updated));
    window.dispatchEvent(new Event('domoPendingRegistrationsChanged'));
    alert(`O pet ${target.pet_nome} foi adicionado com sucesso!`);
  };

  const handleRejectForm = (index: number) => {
    if (window.confirm(`Apagar pré-cadastro de ${pendentes[index].pet_nome}?`)) {
      const updated = [...pendentes];
      updated.splice(index, 1);
      setPendentes(updated);
      localStorage.setItem('domo_cadastros_pendentes', JSON.stringify(updated));
      window.dispatchEvent(new Event('domoPendingRegistrationsChanged'));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left">
      <style>{`
        @keyframes bouncePaw {
          0%, 100% {
            transform: translateY(0) scale(1) rotate(0deg);
          }
          30% {
            transform: translateY(-12px) scale(1.1) rotate(15deg);
          }
          50% {
            transform: translateY(-15px) scale(1.1) rotate(-15deg);
          }
          70% {
            transform: translateY(-12px) scale(1.1) rotate(10deg);
          }
        }
        .animate-bounce-paw {
          animation: bouncePaw 1.4s infinite ease-in-out;
          display: inline-block;
        }
        .text-glow {
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
        }
      `}</style>

      {/* MEDICATIONS AUTO-ALERTS STACK (Max 3) */}
      {liveToasts.length > 0 && (
        <div className="space-y-3 z-50">
          {liveToasts.map((toast) => {
            const isYellow = toast.type === 'yellow';
            const isRed = toast.type === 'red';
            const isGreen = toast.type === 'green';
            
            return (
              <div
                key={toast.id}
                className={`flex items-center justify-between p-4 px-5 rounded-[24px] border shadow-md transition-all duration-300 animate-in slide-in-from-top-4 ${
                  isYellow ? 'bg-amber-50 border-amber-200 text-amber-900' :
                  isRed ? 'bg-rose-50 border-rose-200 text-rose-900 animate-pulse' :
                  'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 select-none">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner ${
                    isYellow ? 'bg-amber-100 text-amber-700' :
                    isRed ? 'bg-rose-100 text-rose-600' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {isYellow ? '⏰' : isRed ? '🚨' : '✅'}
                  </div>
                  <div>
                    <span className="text-xs font-semibold leading-relaxed">
                      {isYellow ? (
                        <>
                          <strong className="font-extrabold">{toast.medName}</strong> do <strong className="font-extrabold">{toast.petName}</strong> em 30 minutos — {toast.timeStr}
                        </>
                      ) : isRed ? (
                        <>
                          <strong className="font-extrabold">{toast.medName}</strong> da <strong className="font-extrabold">{toast.petName}</strong> em 5 minutos — AGORA!
                        </>
                      ) : (
                        <>
                          <strong className="font-extrabold">{toast.medName}</strong> do <strong className="font-extrabold">{toast.petName}</strong> foi dado às {toast.givenTime || '14h02'} por <strong className="font-extrabold">{toast.givenBy || 'Camila'}</strong>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {(isYellow || isRed) && (
                    <button
                      type="button"
                      onClick={() => handleRegisterNow(toast)}
                      className="whitespace-nowrap px-3.5 py-1.5 bg-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 text-slate-800"
                    >
                      Registrar agora
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setLiveToasts(prev => prev.filter(t => t.id !== toast.id));
                      setDismissedToastIds(prev => [...prev, toast.id]);
                    }}
                    className="p-1.5 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 cursor-pointer text-current opacity-70 hover:opacity-100" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MESSAGE STATION */}
      {pendingMessages.length > 0 && (
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-[#0a231d] rounded-[36px] p-7 border border-emerald-500/10 shadow-2xl relative overflow-hidden text-white/90">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-black tracking-wider uppercase text-emerald-400">Relatório de Envio Ativo</span>
                </div>
                <h3 className="text-2xl font-black tracking-tight mt-1 text-white">Mensagens de Rotina Pendentes</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-white/10 border border-white/15 text-white/90 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                   Pendentes: <span className="font-black text-emerald-400">{pendingMessages.length} tutores</span>
                </span>
                <button 
                  onClick={() => {
                    if (confirm('Marcar todas as mensagens de hoje como enviadas? (Não abrirá o WhatsApp)')) {
                      pendingMessages.forEach(({ entry }) => {
                        onSaveChecklist({ ...entry, lastMessageSentAt: new Date().toISOString() });
                      });
                    }
                  }}
                  className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl hover:bg-emerald-500/25 transition-all uppercase tracking-wider hover:scale-102 active:scale-95"
                >
                  Marcar todos enviados
                </button>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {pendingMessages.map(({ pet, entry }) => (
                <div key={pet.id} className="min-w-[280px] bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 hover:bg-white/[0.05] rounded-[26px] p-5 backdrop-blur-md flex flex-col justify-between gap-4 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-white/10 rounded-2xl flex items-center justify-center text-xl overflow-hidden">
                      {pet.foto ? (
                        <img src={pet.foto} alt={pet.pet_nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        "🐶"
                      )}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">{pet.pet_nome}</p>
                      <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 mt-1 rounded-md ${
                        entry.comeu === 'Comeu tudo' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : entry.comeu === 'Não comeu'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {entry.comeu}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSendWhatsApp(pet, entry)}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
                  >
                    ENVIAR PARA TUTOR
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-medium text-white/40 italic mt-2 flex items-center gap-1.5">
              <span>💡</span> Clique em "Enviar para Tutor" para abrir o WhatsApp Web ou App pré-preenchido.
            </p>
          </div>
        </div>
      )}

      {/* WEBHOOK ALERTS */}
      {!sheetsWebhookUrl && (
        <div className="bg-gradient-to-r from-[#faf7f2] via-[#f5efe4] to-[#fcfaf5] border border-amber-250/60 p-6 rounded-[28px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 animate-pulse">
              ☁️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-600/10 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-amber-500/10">AVISO DE BACKUP</span>
                <span className="text-amber-600 font-bold text-[10px]">RECOMENDADO</span>
              </div>
              <h4 className="text-slate-800 font-extrabold text-sm tracking-tight mt-1">Armazenamento em Nuvem Desativado</h4>
              <p className="text-slate-500 text-[11px] font-semibold leading-relaxed mt-0.5">Cadastre o link do seu Google Sheets nos Ajustes para fazer backup automático e garantir total segurança.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/settings')}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-102 transition-all shadow-md shadow-amber-600/10 active:scale-95 flex-shrink-0"
          >
            Configurar Backup
          </button>
        </div>
      )}

      {/* HEADER SECTION WITH INTEGRATED RECOVERY AND CONTROLS */}
      <div className="bg-white rounded-[40px] p-8 border border-emerald-100/40 shadow-xl relative overflow-visible">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-28 -mt-28 blur-3xl"></div>
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              {domoLogo ? (
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                  <img src={domoLogo} alt="Logo" className="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <span className="text-4xl animate-bounce-paw">🐾</span>
              )}
              <div>
                <h1 className="text-4xl font-black tracking-tighter" style={{ color: domoCor }}>
                  Matilha {domoNome}
                </h1>
                <p className="text-slate-400 font-extrabold text-xs uppercase tracking-widest mt-1">Painel Central de Gerenciamento e Escala canina</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">ATIVOS: {pets.length}</span>
              <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Escala hoje ({selectedDay}): {filteredPets.length} cães</span>
              {lastSync && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 cursor-pointer hover:text-emerald-600 transition-all flex items-center gap-1">
                  <span>☁️</span> Último sync: {lastSync}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Date selector button */}
            <div className="bg-emerald-50/70 py-2.5 px-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-0.5">DATA DO DIÁRIO</span>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="bg-transparent text-emerald-800 font-extrabold outline-none text-xs cursor-pointer select-none border-b border-transparent focus:border-emerald-400"
                />
              </div>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>

            {/* Bell/Sino no topbar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBellDropdown(!showBellDropdown)}
                className="w-12 h-12 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-2xl flex items-center justify-center transition-all relative active:scale-95 cursor-pointer shadow-sm shrink-0"
                title={`${pendingAlertCount} medicações pendentes`}
              >
                <span className="text-xl">🔔</span>
                {pendingAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center font-black text-[10px] border-2 border-white animate-pulse">
                    {pendingAlertCount}
                  </span>
                )}
              </button>

              {showBellDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl border border-slate-150 shadow-2xl z-50 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 select-none">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-none">Medicações ({medsTodayList.length})</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hoje • {pendingAlertCount} pendentes</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowBellDropdown(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-650 cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 text-left">
                    {medsTodayList.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 select-none">
                        <span className="text-2xl mb-1 block">💊</span>
                        <p className="text-[10px] font-black uppercase tracking-wider">Sem tarefas de medicação</p>
                        <p className="text-[9px] font-bold opacity-60">Nenhum cão necessita medicações hoje.</p>
                      </div>
                    ) : (
                      medsTodayList.map(({ id, med, pet, slotNum, displayTime, status, log }) => {
                        return (
                          <div key={id} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100/80 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center font-bold shrink-0 text-sm overflow-hidden select-none">
                                {pet?.foto ? (
                                  <img src={pet.foto} alt={pet.pet_nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  "🐶"
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-extrabold text-slate-800 leading-tight truncate">
                                  {med.name}
                                </p>
                                <p className="text-[9px] font-bold text-indigo-600 truncate uppercase mt-0.5 select-none">
                                  {pet?.pet_nome} • {displayTime} {slotNum > 0 && `(Dose ${slotNum})`}
                                </p>
                              </div>
                            </div>

                            <div className="flex-shrink-0">
                              {status === 'given' ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-black text-[9px] border border-emerald-150 uppercase select-none" title={`Dado por ${log?.offeredBy || 'Camila'}`}>
                                  Dado ✓
                                </span>
                              ) : status === 'refused' ? (
                                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-black text-[9px] border border-rose-150 uppercase select-none">
                                  Recusado ✕
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const userName = prompt("Qual o nome do cuidador aplicando a medicação?", "Camila");
                                    if (userName === null) return;
                                    const finalUser = userName.trim() || 'Camila';

                                    const newLog: MedicationLog = {
                                      id: `MLOG_${Date.now()}_${Math.floor(Math.random() * 1051)}`,
                                      medicationId: med.id,
                                      petId: med.petId,
                                      date: todayLocal(),
                                      offered: true,
                                      offeredBy: finalUser,
                                      slot: slotNum,
                                      notes: 'Aplicado via menu do sino'
                                    };
                                    handleSaveMedicationLog(newLog);
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition cursor-pointer select-none"
                                >
                                  Dar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SMART NOTIFICATIONS BOX (TOP OF PANEL) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">Notificações Inteligentes</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Alertas operacionais gerados em tempo real de acordo com as rotinas</p>
            </div>
          </div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-full">{smartNotifications.length} ativos</span>
        </div>

        {smartNotifications.length === 0 ? (
          <div className="bg-slate-50 rounded-[30px] p-6 text-center border-2 border-dashed border-slate-100 text-slate-400 flex flex-col items-center justify-center">
            <span className="text-3xl mb-1.5 opacity-55">💤</span>
            <p className="text-xs font-black uppercase tracking-wider">Tudo sob controle!</p>
            <p className="text-[10px] font-bold opacity-60">Nenhum evento ou pendência crítica detectada para hoje.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {smartNotifications.map(alert => (
              <div 
                key={alert.id}
                className={`bg-gradient-to-r ${alert.colorClass} border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-start gap-4 uppercase-none relative overflow-hidden`}
              >
                <span className="text-3xl w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                  {alert.emoji}
                </span>
                <div className="flex-1 space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-800 leading-tight flex items-center gap-1.5">
                    {alert.title}
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-600 leading-normal">
                    {alert.description}
                  </p>
                  {alert.actionText && (
                    <button
                      onClick={alert.onAction}
                      className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-white px-2 py-1 rounded-lg border border-indigo-150 hover:bg-slate-50 active:scale-95 transition-all mt-1.5 flex items-center gap-1"
                    >
                      {alert.actionText}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DASHBOARD STATISTICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#085041] to-[#043329] text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mb-10 blur-xl group-hover:bg-white/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">CÃES ESCALADOS HOJE</span>
            <Users className="w-5 h-5 text-emerald-300" />
          </div>
          <p className="text-4xl font-extrabold text-white leading-none mt-2">{countPresent}</p>
          <p className="text-[10px] font-extrabold text-[#9EE5CC] mt-2 uppercase tracking-wide">Peludinhos esperados para este dia de semana</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mb-10 blur-xl group-hover:bg-white/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#B3C8FF]">REFEIÇÕES CHECADAS</span>
            <CheckSquare className="w-5 h-5 text-[#B3C8FF]" />
          </div>
          <div className="flex items-end gap-2.5 mt-2">
            <p className="text-4xl font-extrabold text-white leading-none">{countCheckedFeedings}</p>
            <p className="text-slate-400 font-black text-sm">/ {countPresent}</p>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-indigo-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${countPresent > 0 ? (countCheckedFeedings / countPresent) * 100 : 0}%` }}
            ></div>
          </div>
          <p className="text-[10px] font-extrabold text-[#B3C8FF] mt-2 uppercase tracking-wide">Checklist de alimentação hoje ({countPresent > 0 ? Math.round((countCheckedFeedings / countPresent) * 100) : 0}% concluído)</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900 to-indigo-950 text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mb-10 blur-xl group-hover:bg-white/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-300">HÓSPEDES NO HOTEL</span>
            <Building2 className="w-5 h-5 text-pink-300" />
          </div>
          <p className="text-4xl font-extrabold text-white leading-none mt-2">{countInHotel}</p>
          <p className="text-[10px] font-extrabold text-[#FBCFE8] mt-2 uppercase tracking-wide">Cães instalados e pernoitando na creche hoje</p>
        </div>
      </div>

      {/* QUICK ACTIONS CARDS (4 ROW CARDS) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-400/10 flex items-center justify-center text-orange-500">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none font-sans">Ações de Resposta Rápida</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acione fluxos produtivos em lote ou filtre relatórios instantaneamente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Batch registry */}
          <button 
            type="button"
            onClick={() => {
              const pendingIds = filteredPets
                .filter(p => !checklistsForDate.some(c => c.petId === p.id))
                .map(p => p.id);
              setBatchSelectedPets(pendingIds);
              setBatchEatenValue('Comeu tudo');
              setBatchObservation('');
              setShowBatchModal(true);
            }}
            className="p-5 rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-slate-150 text-left shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col justify-between h-[155px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">PRODUTIVIDADE</p>
              <h4 className="font-extrabold text-sm text-slate-800 leading-tight">Registrar Lote</h4>
              <p className="text-[10px] font-bold text-slate-400 mt-1 leading-tight uppercase-none">Cadastre alimentação múltipla</p>
            </div>
          </button>

          {/* Card 2: List hotel stays now */}
          <button 
            type="button"
            onClick={() => setShowHotelOnly(prev => !prev)}
            className={`p-5 rounded-3xl text-left shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col justify-between h-[155px] ${
              showHotelOnly 
                ? 'bg-gradient-to-b from-emerald-500 to-[#10b981]/90 border-emerald-600 text-white' 
                : 'bg-gradient-to-b from-white to-slate-50 border border-slate-150'
            }`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner ${showHotelOnly ? 'bg-white/10 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${showHotelOnly ? 'text-emerald-100 animate-pulse' : 'text-indigo-600'}`}>
                {showHotelOnly ? 'FILTRO ATIVO ✅' : 'HOTELARIA'}
              </p>
              <h4 className={`font-extrabold text-sm leading-tight ${showHotelOnly ? 'text-white' : 'text-slate-800'}`}>
                Filtro Hotel
              </h4>
              <p className={`text-[10px] font-bold mt-1 leading-tight ${showHotelOnly ? 'text-emerald-100' : 'text-slate-400'}`}>
                Exibe apenas hóspedes do dia
              </p>
            </div>
          </button>

          {/* Card 3: Pending daily medications list view */}
          <button 
            type="button"
            onClick={() => setShowMedicationsModal(true)}
            className="p-5 rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-slate-150 text-left shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col justify-between h-[155px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">PROGRAMAÇÃO</p>
              <h4 className="font-extrabold text-sm text-slate-800 leading-tight">Remédios pendentes</h4>
              <p className="text-[10px] font-bold text-slate-400 mt-1 leading-tight">Lista medicações programadas</p>
            </div>
          </button>

          {/* Card 4: View tutor pending review cards */}
          <button 
            type="button"
            onClick={() => setShowApprovalsModal(true)}
            className="p-5 rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-slate-150 text-left shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col justify-between h-[155px] relative"
          >
            {pendentes.length > 0 && (
              <span className="absolute top-4 right-4 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center font-black text-[10px] scrollbar-hide">
                {pendentes.length}
              </span>
            )}
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">APROVAÇÕES</p>
              <h4 className="font-extrabold text-sm text-slate-800 leading-tight">Fichas de Clientes</h4>
              <p className="text-[10px] font-bold text-slate-400 mt-1 leading-tight">Cadastros criados por tutores</p>
            </div>
          </button>
        </div>
      </div>
      
      {/* FILTER NOTIFY BAR */}
      {showHotelOnly && (
        <div className="bg-emerald-50 border-2 border-emerald-100 px-6 py-4 rounded-2xl flex items-center justify-between text-emerald-800 animate-in slide-in-from-top-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛎️</span>
            <span className="text-xs font-black uppercase">Filtro Ativo: Exibindo apenas hóspedes hospedados no hotel hoje</span>
          </div>
          <button 
            onClick={() => setShowHotelOnly(false)}
            className="text-[10px] bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 transition"
          >
            Retirar Filtro ✕
          </button>
        </div>
      )}

      {/* EXPANDED DAYS NAVIGATOR BAR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white rounded-3xl p-6 border border-slate-150 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                Roteiro de Matilha de <span className="text-indigo-600 font-black" style={{ color: domoCor }}>{selectedDay}</span>
              </h3>
              <p className="text-xs md:text-sm font-bold text-slate-500 mt-1.5 uppercase tracking-wider">
                Filtre por dias da semana para planejar as escalas
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 p-4 rounded-[42px] border border-slate-100 shadow-inner">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1.5 items-center">
            {NAV_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                type="button"
                className={`flex-none w-[135px] h-[160px] rounded-[38px] font-black transition-all border-[4px] flex flex-col items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow-md cursor-pointer ${
                  selectedDay === day 
                    ? 'text-white border-white shadow-xl scale-[1.03] z-10' 
                    : 'bg-white text-slate-400 border-transparent hover:border-emerald-50 hover:text-slate-500'
                }`}
                style={selectedDay === day ? { backgroundColor: domoCor, borderColor: '#ffffff' } : undefined}
              >
                {/* Enquadramento do dia da semana (frame/pill) para evitar overflow e ficar super legível */}
                <div 
                  className={`px-2.5 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center w-[115px] truncate transition-all shadow-sm border ${
                    selectedDay === day 
                      ? 'bg-black/15 text-white border-white/25' 
                      : 'bg-slate-50 text-slate-700 border-slate-100'
                  }`}
                >
                  {day}
                </div>
                
                {/* Contador de Cães em tamanho ampliado para facilitar a leitura */}
                <span className={`text-5xl block font-black leading-none tracking-tight ${selectedDay === day ? 'text-white text-glow' : 'text-slate-800'}`}>
                  {dayCounts[day] || 0}
                </span>
                
                {/* Unidade/Texto auxiliar mais visível */}
                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedDay === day ? 'text-emerald-100/90' : 'text-slate-400'}`}>
                  cães
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FILTER AND SEARCH RACK */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative group flex-1">
          <div className="absolute inset-0 bg-emerald-500/5 blur-xl rounded-full group-focus-within:bg-emerald-500/10 transition-all"></div>
          <input
            type="text"
            placeholder={`Filtrar pelos ${filteredPets.length} cães ativos de ${selectedDay === 'Todos' ? 'todos os dias' : selectedDay}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="relative w-full pl-14 pr-8 py-4.5 bg-white rounded-3xl border border-slate-200 focus:border-emerald-300 outline-none transition-all font-black text-slate-700 placeholder:text-slate-300 shadow-sm text-sm"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        {selectedDay !== 'Todos' && (
          <button 
            type="button"
            onClick={() => setIsAddingToDay(true)}
            className="bg-emerald-600 text-white px-7 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-700/5 hover:scale-103 active:scale-95 transition-all flex items-center justify-center gap-2 h-13"
          >
            <Plus className="w-4 h-4 text-white" strokeWidth={3} /> Escalado +
          </button>
        )}
      </div>

      {/* MAIN PET CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {filteredPets.map((pet, index) => {
          const status = getPetStatus(pet.id);
          const isHotel = isPetInHotelToday(pet.id);
          const isBday = getDeterministicBirthday(pet, searchDate);

          return (
            <div 
              key={pet.id}
              onClick={() => navigate(`/pet/${pet.id}?date=${searchDate}`)}
              className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all cursor-pointer flex flex-col group relative overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Highlight ribbon based on events */}
              {isHotel && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-700 to-indigo-500 text-white px-3.5 py-1.5 rounded-bl-2xl font-black text-[9px] uppercase tracking-widest shadow-sm z-10 flex items-center gap-1">
                  <span>🏨 HOJE NO HOTEL</span>
                </div>
              )}
              {isBday && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-pink-500 to-rose-500 text-white px-3.5 py-1.5 rounded-bl-2xl font-black text-[9px] uppercase tracking-widest shadow-sm z-10 flex items-center gap-1">
                  <span>🎂 ANIVERSÁRIO HOJE</span>
                </div>
              )}

              <div className="absolute top-0 left-0 bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 px-4 py-2.5 rounded-br-[18px] font-black text-[10px] border-r border-b border-slate-100 z-10">
                #{index + 1}
              </div>

              <div className="flex justify-between items-start mb-5 mt-4">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-emerald-50/60 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white group-hover:scale-105 transition-transform flex-shrink-0 overflow-hidden">
                    {pet.foto ? (
                      <img src={pet.foto} alt={pet.pet_nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      "🐶"
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg text-slate-800 group-hover:text-emerald-700 leading-tight flex items-center gap-1.5 mt-0.5">
                      {pet.pet_nome}
                    </h4>
                    {pet.tutor_nome && (
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wide leading-none mt-1">
                        👤 {pet.tutor_nome}
                      </p>
                    )}
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mt-1">
                      {pet.id} • {pet.raca || 'Mestiço'}
                    </p>
                  </div>
                </div>

                <div className="relative flex items-center gap-2">
                  {selectedDay !== 'Todos' && (
                    <button 
                      type="button"
                      onClick={(e) => handleRemoveFromDay(e, pet)}
                      className="w-9 h-9 rounded-full bg-rose-50 text-rose-450 hover:bg-rose-500 hover:text-white flex items-center justify-center border border-white transition-all shadow-sm"
                      title="Excluir da escala de hoje"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div 
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm border-2 border-white transition-all ${
                      status === 'Pendente' ? 'bg-slate-50 text-slate-300' : getStatusColor(status) + ' text-white'
                    }`}
                  >
                    {getStatusEmoji(status)}
                  </div>
                </div>
              </div>

              {/* CARD ALIMENTATION CONTROLS WITH GRACEFUL GRADIENTS */}
              <div className="bg-slate-50 p-4.5 rounded-[26px] border border-slate-100 mt-auto space-y-4">
                <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Alimentação Rápida</span>
                    <button 
                      type="button"
                      onClick={(e) => handleQuickSave(e, pet.id)}
                      disabled={savingId === pet.id}
                      className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                        savingId === pet.id 
                          ? 'bg-slate-200 text-slate-400' 
                          : savedId === pet.id
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-95'
                      }`}
                    >
                      {savingId === pet.id ? '⏳' : savedId === pet.id ? 'Salvo! ✔️' : 'Salvar'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Comeu tudo', internal: 'Comeu tudo', emoji: '😋' },
                      { label: 'Comeu metade', internal: 'Comeu metade', emoji: '😐' },
                      { label: 'Menos que metade', internal: 'Comeu menos da metade', emoji: '😕' },
                      { label: 'Não comeu', internal: 'Não comeu', emoji: '🔴' }
                    ].map(opt => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setQuickEntries(prev => ({ ...prev, [pet.id]: opt.internal as any }))}
                        className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-tighter border-2 transition-all flex items-center justify-center gap-1 active:scale-95 ${
                          quickEntries[pet.id] === opt.internal 
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-[1.02]' 
                            : 'bg-white text-slate-400 border-slate-100'
                        }`}
                      >
                        <span className="text-sm">{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2.5">
                    <input 
                      type="text"
                      placeholder="Observação rápida (opcional)..."
                      value={quickEntries[`obs_${pet.id}`] || ''}
                      onChange={(e) => setQuickEntries(prev => ({ ...prev, [`obs_${pet.id}`]: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200/70 rounded-xl text-[10px] font-bold text-slate-600 outline-none focus:border-emerald-300 shadow-inner"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200/50 pt-3 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest leading-none">Dias que frequenta</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(pet.dia_semana || '-').split(',').map(d => (
                         <span key={d} className="text-emerald-700 font-extrabold text-[8px] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{d.trim()}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${pet.possui_alergia.toLowerCase() === 'sim' ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>
                      {pet.possui_alergia.toLowerCase() === 'sim' ? '⚠️ Alergia Crítica' : '✅ Saudável'}
                    </span>
                    <span className="text-indigo-650 bg-indigo-50/70 px-2.5 py-0.5 rounded-lg border border-indigo-100 font-extrabold text-[9px] uppercase">
                      {pet.tipo_alimentacao}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPets.length === 0 && (
        <div className="py-24 text-center opacity-30 flex flex-col items-center">
          <span className="text-7xl mb-4 select-none">🦴</span>
          <p className="font-black text-slate-800 uppercase tracking-[0.3em] text-sm">Nenhum pet encontrado para {selectedDay}</p>
          <p className="text-[10px] font-bold mt-1 text-slate-400 uppercase tracking-wider">Tente selecionar outro dia ou retirar os filtros de hotel!</p>
        </div>
      )}

      {/* MODAL 1: BATCH FEEDING (REGISTRAR EM LOTE) */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 text-left">
          <div className="bg-white w-full max-w-lg rounded-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 leading-none">Registrar Alimentação em Lote</h3>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Registre o almoço de múltiplos cães simultaneamente</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm hover:text-rose-500 font-bold hover:bg-rose-50 transition-all text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Passo 1: Selecione os cães</span>
                
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = filteredPets.map(p => p.id);
                      setBatchSelectedPets(allIds);
                    }}
                    className="text-[9px] font-black uppercase text-[#055140] bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchSelectedPets([])}
                    className="text-[9px] font-black uppercase text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Desmarcar Todos
                  </button>
                </div>

                <div className="border border-slate-150 rounded-2xl max-h-[160px] overflow-y-auto p-3 space-y-1.5 bg-slate-50 shadow-inner">
                  {filteredPets.map(pet => {
                    const isChecked = batchSelectedPets.includes(pet.id);
                    return (
                      <label key={pet.id} className="flex items-center gap-3 p-2 bg-white rounded-xl cursor-pointer hover:bg-emerald-50/30 transition-all text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setBatchSelectedPets(prev => prev.filter(id => id !== pet.id));
                            } else {
                              setBatchSelectedPets(prev => [...prev, pet.id]);
                            }
                          }}
                          className="w-4.5 h-4.5 accent-emerald-600 cursor-pointer rounded"
                        />
                        <span className="text-xs font-black">{pet.pet_nome}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">({pet.tipo_alimentacao})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Selection */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Passo 2: Selecione o que comeram</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Comeu tudo', val: 'Comeu tudo', emoji: '😋' },
                    { label: 'Comeu metade', val: 'Comeu metade', emoji: '😐' },
                    { label: 'Menos que metade', val: 'Comeu menos da metade', emoji: '😕' },
                    { label: 'Não comeu', val: 'Não comeu', emoji: '🔴' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setBatchEatenValue(opt.val as any)}
                      className={`p-3 rounded-2xl text-[10px] font-black uppercase border flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        batchEatenValue === opt.val 
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' 
                          : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observation text */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Passo 3: Observações de lote (Opcional)</span>
                <textarea
                  placeholder="Ex: Oferecidos extras conforme prontuário..."
                  value={batchObservation}
                  onChange={(e) => setBatchObservation(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-emerald-300 min-h-[70px]"
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-705 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBatchSaveExecution}
                disabled={savingBatch || batchSelectedPets.length === 0}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {savingBatch ? 'Gravando...' : `Registrar ${batchSelectedPets.length} cães`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MEDICATIONS PENDING (MEDICAÇÕES PROGRAMADAS DO DIA) */}
      {showMedicationsModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 text-left">
          <div className="bg-white w-full max-w-lg rounded-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-rose-950 leading-none">Controle de Medicamento Diário</h3>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Rotinas de saúde e remédios na data {searchDate}</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowMedicationsModal(false)}
                className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm hover:text-rose-500 font-bold hover:bg-rose-50 transition-all text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3.5">
              {medications.filter(m => m.active).length === 0 ? (
                <p className="text-center text-slate-450 italic font-bold py-10 uppercase text-[11px] tracking-wide">Nenhum medicamento ativo programado no sistema.</p>
              ) : (
                medications.filter(m => m.active).map(med => {
                  const p = pets.find(x => x.id === med.petId);
                  const isGivenToday = medicationLogs.some(log => log.medicationId === med.id && log.date === searchDate && log.offered);
                  
                  return (
                    <div key={med.id} className="p-4 rounded-2xl border border-slate-150 bg-slate-50/50 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-black text-[8px] uppercase">{med.time}</span>
                          <span className="text-xs font-black text-rose-950 uppercase">{med.name}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 mt-1">Dose: {med.dosage} • {med.instructions || 'Sem observações adicionais'}</p>
                        {p && <p className="text-[9px] font-black text-emerald-600 uppercase mt-0.5">Pet: {p.pet_nome}</p>}
                      </div>
                      
                      <div className="flex-shrink-0">
                        {isGivenToday ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-250 uppercase tracking-wider">
                            Dado ✅
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const newLog: MedicationLog = {
                                id: `MLOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                                medicationId: med.id,
                                petId: med.petId,
                                date: searchDate,
                                offered: true,
                                offeredBy: 'Admin',
                                notes: 'Aplicado pelo painel rápido'
                              };
                              handleSaveMedicationLog(newLog);
                              alert(`Sucesso! Medicação ${med.name} para ${p?.pet_nome || 'Pet'} marcada como aplicada.`);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm transition active:scale-95"
                          >
                            Dar Remédio
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowMedicationsModal(false);
                  navigate('/medicacao');
                }}
                className="w-full py-3 bg-white text-rose-950 font-black border border-slate-200 hover:bg-slate-55 rounded-2xl text-xs uppercase tracking-widest transition-all text-center"
              >
                Cadastrar novos planos de medicamentos ⚙️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PENDING APPROVALS FROM TUTORS (CADASTROS DA FILA DE ENTRADA) */}
      {showApprovalsModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 text-left">
          <div className="bg-white w-full max-w-xl rounded-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 leading-none">Revisão de Fichas Públicas</h3>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Enviadas pelos tutores via Link Externo White-Label</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowApprovalsModal(false)}
                className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm hover:text-rose-500 font-bold hover:bg-rose-50 transition-all text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {pendentes.length === 0 ? (
                <div className="text-center py-10 space-y-4">
                  <p className="text-slate-450 italic font-bold uppercase text-[10px] tracking-wide">Fila vazia! Nenhuma ficha pendente de aprovação.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowApprovalsModal(false);
                      navigate('/cadastro');
                    }}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-extrabold rounded-2xl text-[10px] uppercase shadow hover:bg-emerald-700"
                  >
                    Gerar link de captação de clientes
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendentes.map((ped, idx) => (
                    <div key={ped.id || idx} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-black">🐾</span>
                          <span className="font-extrabold text-sm text-slate-800">{ped.pet_nome}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-600 font-black px-1.5 py-0.5 rounded uppercase">{ped.raca}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 space-y-0.5">
                          <p>👤 <strong>Tutor:</strong> {ped.tutor_nome}</p>
                          <p>📞 <strong>WhatsApp:</strong> {ped.telefone}</p>
                          <p>📅 <strong>Dia:</strong> {ped.dia_semana}</p>
                          {ped.alimentos_proibidos && <p className="text-rose-600">⚠️ <strong>Alergias:</strong> {ped.alimentos_proibidos}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveForm(idx)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition active:scale-95"
                        >
                          Aprovar ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectForm(idx)}
                          className="bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl w-8 h-8 flex items-center justify-center font-bold border border-rose-100 transition active:scale-95"
                          title="Recusar"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowApprovalsModal(false);
                  navigate('/cadastro');
                }}
                className="w-full py-3 bg-white text-slate-800 font-black border border-slate-200 hover:bg-slate-100 rounded-2xl text-xs uppercase tracking-widest transition-all text-center"
              >
                Acessar Portal de Prontuários Principal 🧩
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECOVERY FROM AN EMPTY PETS DIRECTORY */}
      {pets.length === 0 && (
        <div className="bg-rose-50/70 border-2 border-rose-100 p-6 rounded-[35px] flex items-center gap-5 shadow-sm">
          <span className="text-4xl">🆘</span>
          <div className="text-left">
            <p className="text-rose-900 font-extrabold text-xs uppercase tracking-widest leading-none mb-1">Cães não carregados ou vazios</p>
            <p className="text-rose-700 text-[10px] font-bold leading-tight">Por termos integrado o novo sistema de nuvem, puxe seus arquivos para alimentar os registros locais cadastrados anteriormente.</p>
          </div>
          <button 
            type="button"
            onClick={handlePullSync}
            className="ml-auto bg-rose-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md active:scale-95"
          >
            RECUPERAR DADOS
          </button>
        </div>
      )}

      {/* ADD TO DAY MODAL OVERLAY */}
      {isAddingToDay && (
        <div className="fixed inset-0 bg-emerald-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-emerald-50/30">
              <div>
                <h3 className="text-2xl font-black text-emerald-950 tracking-tight">Escalar para {selectedDay}</h3>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Selecione um cão cadastrado na matilha principal</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsAddingToDay(false);
                  setModalSearchTerm('');
                }} 
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-rose-55 hover:text-rose-500 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Digitar nome do pet para busca rápida..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-emerald-400 font-bold text-sm shadow-inner"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {petsNotInDay.length === 0 ? (
                <p className="text-center py-10 text-slate-350 font-bold italic text-xs uppercase tracking-wider">Todos os cães ativos já estão agendados no dia.</p>
              ) : (
                petsNotInDay.map(pet => (
                  <button 
                    key={pet.id}
                    type="button"
                    onClick={() => handleAddToDay(pet)}
                    className="w-full p-4 hover:bg-emerald-50 bg-white rounded-2xl flex items-center gap-4 transition-all text-left group border border-slate-100 shadow-sm"
                  >
                    <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-white transition-colors flex-shrink-0 shadow-inner overflow-hidden border border-slate-100">
                      {pet.foto ? (
                        <img src={pet.foto} alt={pet.pet_nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        "🐶"
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 leading-none text-sm">{pet.pet_nome}</p>
                      {pet.tutor_nome && <p className="text-[9px] font-black text-emerald-600 uppercase mt-1 leading-none">{pet.tutor_nome}</p>}
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{pet.id} • {pet.raca || 'Mestiço'}</p>
                    </div>
                    <span className="ml-auto opacity-0 group-hover:opacity-100 bg-[#085041] text-white px-2.5 py-1.5 rounded-lg transition-opacity font-black text-[9px] uppercase tracking-wider shadow-sm">
                      ESCALAR +
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
