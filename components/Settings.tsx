
import React, { useState } from 'react';

const Settings: React.FC = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleReset = () => {
    // Limpa todos os dados locais
    localStorage.removeItem('kahu_checklists');
    localStorage.removeItem('kahu_master_pets');
    localStorage.removeItem('kahu_groups');
    
    // Feedback visual e recarregamento
    alert('Sistema reiniciado com sucesso! Todos os dados locais foram apagados.');
    window.location.href = '#/';
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-slate-800">Ajustes do Sistema</h2>
        <p className="text-slate-500 font-medium">Gerencie sua base de dados e preferências ⚙️</p>
      </div>

      <div className="bg-white rounded-[45px] p-8 border border-slate-100 shadow-xl space-y-8">
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
