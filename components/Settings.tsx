
import React, { useState } from 'react';
import { Pet, ChecklistEntry, Medication, MedicationLog, HotelStay } from '../types';

interface SettingsProps {
  pets: Pet[];
  checklists: ChecklistEntry[];
  medications: Medication[];
  medicationLogs: MedicationLog[];
  hotelStays: HotelStay[];
  sheetsUrl: string;
  onSaveSheetsUrl: (url: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ pets, checklists, medications, medicationLogs, hotelStays, sheetsUrl, onSaveSheetsUrl }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localSheetsUrl, setLocalSheetsUrl] = useState(sheetsUrl);
  const [showScript, setShowScript] = useState(false);

  const handleSaveUrl = () => {
    onSaveSheetsUrl(localSheetsUrl);
    alert('URL do Google Sheets salva com sucesso! O sistema agora sincronizará em tempo real.');
  };

  const handleReset = () => {
    // Limpa todos os dados locais
    localStorage.removeItem('kahu_checklists');
    localStorage.removeItem('kahu_master_pets');
    localStorage.removeItem('kahu_groups');
    localStorage.removeItem('kahu_medications');
    localStorage.removeItem('kahu_medication_logs');
    localStorage.removeItem('kahu_hotel_stays');
    
    // Feedback visual e recarregamento
    alert('Sistema reiniciado com sucesso! Todos os dados locais foram apagados.');
    window.location.href = '#/';
    window.location.reload();
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    if (data.length === 0) {
      alert('Não há dados para exportar neste relatório.');
      return;
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const val = row[header] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportChecklists = () => {
    const data = checklists.map(c => {
      const pet = pets.find(p => p.id === c.petId);
      return {
        'Data': c.date,
        'Pet': pet?.pet_nome || 'Desconhecido',
        'Status': c.status,
        'Alimentação': c.comeu,
        'Oferecido': c.quantoOferecido,
        'Sobrou': c.quantoSobrou,
        'Água': c.agua,
        'Escore Fecal': c.escoreFecal,
        'Observações': c.observacoes
      };
    });
    exportToCSV(data, 'Kahu_Checklists', ['Data', 'Pet', 'Status', 'Alimentação', 'Oferecido', 'Sobrou', 'Água', 'Escore Fecal', 'Observações']);
  };

  const exportMedications = () => {
    const data = medicationLogs.map(l => {
      const pet = pets.find(p => p.id === l.petId);
      const med = medications.find(m => m.id === l.medicationId);
      return {
        'Data': l.date,
        'Pet': pet?.pet_nome || 'Desconhecido',
        'Medicação': med?.name || 'Desconhecida',
        'Dosagem': med?.dosage || '-',
        'Horário': med?.time || '-',
        'Oferecido': l.offered ? 'Sim' : 'Não',
        'Por': l.offeredBy || '-',
        'Notas': l.notes || '-'
      };
    });
    exportToCSV(data, 'Kahu_Medicacoes', ['Data', 'Pet', 'Medicação', 'Dosagem', 'Horário', 'Oferecido', 'Por', 'Notas']);
  };

  const exportHotel = () => {
    const data = hotelStays.map(s => {
      const pet = pets.find(p => p.id === s.petId);
      return {
        'Pet': pet?.pet_nome || 'Desconhecido',
        'Check-In': s.checkIn,
        'Check-Out': s.checkOut,
        'Status': s.active ? 'Ativo' : 'Finalizado',
        'Instruções': s.instructions
      };
    });
    exportToCSV(data, 'Kahu_Hotel', ['Pet', 'Check-In', 'Check-Out', 'Status', 'Instruções']);
  };

  const exportConsolidatedReport = () => {
    const data: any[] = [];

    // Add Checklists
    checklists.forEach(c => {
      const pet = pets.find(p => p.id === c.petId);
      data.push({
        'Data/Hora': c.date,
        'Pet': pet?.pet_nome || 'Desconhecido',
        'Tipo': 'CHECKLIST',
        'Evento': `Status: ${c.status} | Alimentação: ${c.comeu} | Água: ${c.agua}`,
        'Detalhes': c.observacoes || '-'
      });
    });

    // Add Medication Logs
    medicationLogs.forEach(l => {
      const pet = pets.find(p => p.id === l.petId);
      const med = medications.find(m => m.id === l.medicationId);
      data.push({
        'Data/Hora': l.date,
        'Pet': pet?.pet_nome || 'Desconhecido',
        'Tipo': 'MEDICAÇÃO',
        'Evento': `Med: ${med?.name || 'Desconhecida'} | Oferecido: ${l.offered ? 'Sim' : 'Não'}`,
        'Detalhes': l.notes || '-'
      });
    });

    // Add Hotel Stays
    hotelStays.forEach(s => {
      const pet = pets.find(p => p.id === s.petId);
      data.push({
        'Data/Hora': s.checkIn,
        'Pet': pet?.pet_nome || 'Desconhecido',
        'Tipo': 'HOTEL (Check-In)',
        'Evento': `Check-In realizado`,
        'Detalhes': s.instructions || '-'
      });
      if (!s.active) {
        data.push({
          'Data/Hora': s.checkOut,
          'Pet': pet?.pet_nome || 'Desconhecido',
          'Tipo': 'HOTEL (Check-Out)',
          'Evento': `Check-Out realizado`,
          'Detalhes': '-'
        });
      }
    });

    // Sort by date
    data.sort((a, b) => new Date(b['Data/Hora']).getTime() - new Date(a['Data/Hora']).getTime());

    exportToCSV(data, 'Kahu_Relatorio_Consolidado', ['Data/Hora', 'Pet', 'Tipo', 'Evento', 'Detalhes']);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-slate-800">Ajustes do Sistema</h2>
        <p className="text-slate-500 font-medium">Gerencie sua base de dados e preferências ⚙️</p>
      </div>

      <div className="bg-white rounded-[45px] p-8 border border-slate-100 shadow-xl space-y-8">
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Sincronização em Tempo Real (Google Sheets)</h3>
          <div className="bg-emerald-50 p-6 rounded-[35px] border border-emerald-100 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <p className="text-xs font-bold text-emerald-800">
                Configure um Webhook para enviar dados automaticamente para o Google Sheets sempre que salvar um registro.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2">URL do Web App (Google Apps Script)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={localSheetsUrl}
                  onChange={(e) => setLocalSheetsUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 p-4 bg-white border-2 border-emerald-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-300 shadow-sm"
                />
                <button 
                  onClick={handleSaveUrl}
                  className="px-6 bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95"
                >
                  SALVAR
                </button>
              </div>
              <button 
                onClick={async () => {
                  if (!localSheetsUrl) {
                    alert('Por favor, insira uma URL primeiro.');
                    return;
                  }
                  try {
                    const response = await fetch(localSheetsUrl, {
                      method: 'POST',
                      mode: 'no-cors',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'TESTE', data: { mensagem: 'Conexão bem-sucedida!' } })
                    });
                    alert('Teste enviado! Verifique se uma nova aba "Registros_TESTE" apareceu na sua planilha do Google.');
                  } catch (e) {
                    alert('Erro ao enviar teste. Verifique a URL e sua conexão.');
                  }
                }}
                className="w-full py-2 bg-white border-2 border-emerald-100 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-all text-[10px] uppercase tracking-widest"
              >
                🧪 Testar Conexão
              </button>
            </div>

            <button 
              onClick={() => setShowScript(!showScript)}
              className="text-[10px] font-black text-emerald-600 underline decoration-2 underline-offset-4 uppercase tracking-widest"
            >
              {showScript ? 'Ocultar Instruções' : 'Como configurar o Google Sheets?'}
            </button>

            {showScript && (
              <div className="bg-white p-6 rounded-[25px] border border-emerald-100 space-y-4 animate-in slide-in-from-top-2">
                <p className="text-[11px] font-bold text-slate-600">1. Crie uma nova Planilha no Google.</p>
                <p className="text-[11px] font-bold text-slate-600">2. Vá em Extensões {'>'} Apps Script.</p>
                <p className="text-[11px] font-bold text-slate-600">3. Cole o código abaixo e clique em "Implantar" {'>'} "Nova Implantação" {'>'} "App da Web".</p>
                <p className="text-[11px] font-bold text-slate-600">4. Em "Quem pode acessar", escolha "Qualquer pessoa".</p>
                <pre className="bg-slate-50 p-4 rounded-xl text-[9px] font-mono text-slate-500 overflow-x-auto border border-slate-200">
{`function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var type = data.type;
  var payload = data.data;
  var sheetName = "Registros_" + type;
  
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = ["Data Registro", "Tipo"];
    Object.keys(payload).forEach(function(key) { headers.push(key); });
    sheet.appendRow(headers);
  }
  
  var row = [new Date(), type];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 2; i < headers.length; i++) {
    row.push(payload[headers[i]] || "");
  }
  
  sheet.appendRow(row);
  return ContentService.createTextOutput("Success");
}`}
                </pre>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Relatórios para Google Sheets (Manual)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={exportChecklists}
              className="p-6 bg-emerald-50 border border-emerald-100 rounded-[30px] text-center hover:bg-emerald-100 transition-all group"
            >
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">🍱</span>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Checklists</p>
              <p className="text-[8px] font-bold text-emerald-500 mt-1">Exportar CSV</p>
            </button>
            <button 
              onClick={exportMedications}
              className="p-6 bg-sky-50 border border-sky-100 rounded-[30px] text-center hover:bg-sky-100 transition-all group"
            >
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">💊</span>
              <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest">Medicações</p>
              <p className="text-[8px] font-bold text-sky-500 mt-1">Exportar CSV</p>
            </button>
            <button 
              onClick={exportHotel}
              className="p-6 bg-amber-50 border border-amber-100 rounded-[30px] text-center hover:bg-amber-100 transition-all group"
            >
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">🏨</span>
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Hotel</p>
              <p className="text-[8px] font-bold text-amber-500 mt-1">Exportar CSV</p>
            </button>
          </div>
          <button 
            onClick={exportConsolidatedReport}
            className="w-full p-6 bg-slate-800 text-white rounded-[30px] flex items-center justify-center gap-4 hover:bg-slate-900 transition-all group shadow-xl"
          >
            <span className="text-3xl group-hover:rotate-12 transition-transform">📊</span>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Relatório Diário Consolidado</p>
              <p className="text-[10px] opacity-60 font-medium">Combina Checklist + Medicação + Hotel em um único arquivo</p>
            </div>
          </button>
          <p className="text-[9px] font-bold text-slate-400 text-center italic">
            Dica: No Google Sheets, vá em Arquivo {'>'} Importar {'>'} Fazer Upload e selecione o arquivo baixado.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Zona de Perigo</h3>
          
          <div className="bg-rose-50 p-6 rounded-[35px] border border-rose-100 space-y-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl bg-white w-14 h-14 flex items-center justify-center rounded-[20px] shadow-sm">⚠️</span>
              <div>
                <h4 className="text-lg font-black text-rose-900">Limpeza Total de Dados</h4>
                <p className="text-xs font-bold text-rose-700/60 leading-relaxed">
                  Esta ação irá apagar permanentemente todos os seus diários salvos, grupos criados e alterações que você fez nas fichas dos pets. Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            {!confirmDelete ? (
              <button 
                onClick={() => setConfirmDelete(true)}
                className="w-full py-4 bg-rose-500 text-white font-black rounded-[25px] shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all active:scale-95"
              >
                APAGAR TODO MEU CADASTRO
              </button>
            ) : (
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-400 font-black rounded-[25px] transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handleReset}
                  className="flex-2 py-4 bg-rose-600 text-white font-black rounded-[25px] shadow-xl hover:bg-rose-700 transition-all animate-pulse"
                >
                  SIM, APAGAR TUDO AGORA!
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Sobre o Kahu Care</h3>
          <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
            <p className="text-xs font-bold text-slate-500">Versão: 1.0.2-Stable</p>
            <p className="text-xs font-bold text-slate-500 mt-2 italic">Desenvolvido para gestão humanizada e profissional de creches caninas.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
