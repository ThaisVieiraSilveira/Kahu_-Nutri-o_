
import React, { useState, useMemo } from 'react';
import { Pet, ChecklistEntry } from '../types';
import { getStatusEmoji, getStatusColor } from '../utils/status';

interface ReportsProps {
  pets: Pet[];
  checklists: ChecklistEntry[];
}

const Reports: React.FC<ReportsProps> = ({ pets, checklists }) => {
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const filteredChecklists = useMemo(() => {
    return checklists.filter(c => {
      const isSamePet = selectedPetId ? c.petId === selectedPetId : true;
      const isSameMonth = c.date.startsWith(selectedMonth);
      return isSamePet && isSameMonth;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [checklists, selectedPetId, selectedMonth]);

  const stats = useMemo(() => {
    const counts = { 'OK': 0, 'Atenção': 0, 'Alerta': 0 };
    filteredChecklists.forEach(c => {
      if (c.status in counts) counts[c.status as keyof typeof counts]++;
    });
    return counts;
  }, [filteredChecklists]);

  const generateTutorMessage = (petName: string, entry: ChecklistEntry) => {
    const messages = {
      'OK': `Olá! Passando para dizer que o ${petName} teve um dia maravilhoso hoje! 🐶✨ Comeu tudo, se hidratou super bem e está muito feliz. Um ótimo descanso para vocês! ❤️`,
      'Atenção': `Olá! O ${petName} passou o dia conosco hoje. 🐾 Ele comeu apenas uma parte da refeição ou demonstrou um comportamento um pouco diferente do habitual, mas está bem! Fiquem de olho em casa qualquer coisa. 😊`,
      'Alerta': `Olá. Gostaríamos de informar que o ${petName} hoje não quis comer ou beber água como de costume. 🔴 Recomendamos uma atenção especial à saúde dele hoje à noite. Qualquer dúvida estamos à disposição.`
    };

    const text = messages[entry.status as keyof typeof messages] || messages['Atenção'];
    navigator.clipboard.writeText(text);
    alert('Mensagem copiada para o WhatsApp! ✅');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-800">Relatórios Mensais</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Mês</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full p-3 border border-emerald-100 rounded-2xl bg-white text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Filtrar Pet</label>
          <select
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            className="w-full p-3 border border-emerald-100 rounded-2xl bg-white text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-bold appearance-none"
          >
            <option value="">Todos os Pets</option>
            {pets.map(p => (
              <option key={p.id} value={p.id}>{p.pet_nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 text-center">
          <span className="text-3xl block mb-1">🟢</span>
          <span className="text-2xl font-black text-emerald-700">{stats.OK}</span>
          <p className="text-xs font-bold text-emerald-600">DIAS OK</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 text-center">
          <span className="text-3xl block mb-1">🟡</span>
          <span className="text-2xl font-black text-amber-700">{stats.Atenção}</span>
          <p className="text-xs font-bold text-amber-600">ATENÇÃO</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100 text-center">
          <span className="text-3xl block mb-1">🔴</span>
          <span className="text-2xl font-black text-rose-700">{stats.Alerta}</span>
          <p className="text-xs font-bold text-rose-600">ALERTA</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-700">Histórico de Atividades</h3>
        {filteredChecklists.length === 0 ? (
          <p className="text-slate-400 text-center py-8 bg-slate-50 rounded-2xl">Sem registros neste período.</p>
        ) : (
          <div className="space-y-3">
            {filteredChecklists.map((c, i) => {
              const pet = pets.find(p => p.id === c.petId);
              return (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${getStatusColor(c.status)}`}></span>
                    <div>
                      <p className="font-bold text-slate-800">{pet?.pet_nome || 'Pet Removido'} • {new Date(c.date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-slate-500 italic">"{c.observacoes || 'Sem observações'}"</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => generateTutorMessage(pet?.pet_nome || 'amigão', c)}
                    className="w-full md:w-auto px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full font-bold text-xs hover:bg-emerald-100 transition-colors"
                  >
                    💬 Copiar Mensagem Tutor
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
