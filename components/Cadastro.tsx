
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pet } from '../types';

interface CadastroProps {
  pets: Pet[];
  onSave: (pet: Pet) => void;
}

const Cadastro: React.FC<CadastroProps> = ({ pets, onSave }) => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const isNew = petId === 'novo';
  const [formData, setFormData] = useState<Pet | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (formData && !isNew) {
      const pet = pets.find(p => p.id === petId);
      if (pet) setFormData({ ...pet });
      return;
    }

    if (isNew && !formData) {
      // Logic for new pet: Find the highest ID number to avoid collisions
      const maxId = pets.reduce((max, p) => {
        const num = parseInt(p.id.replace(/\D/g, '')) || 0;
        return Math.max(max, num);
      }, 0);
      const nextId = maxId + 1;
      
      setFormData({
        id: `PET${String(nextId).padStart(3, '0')}`,
        pet_nome: '',
        raca: 'SRD',
        tutor_nome: '',
        telefone: '',
        dia_semana: '',
        peso_pet: '0',
        comportamento_alimentar: '-',
        precisa_estimulo: '-',
        tipo_alimentacao: 'Ração',
        quantidade_oferecida: '-',
        quantidade_aproximada: '-',
        marca_racao: '-',
        especificacao_racao: '-',
        oferece_extras: '-',
        ingestao_agua: '-',
        interesse_agua: '-',
        ajuda_beber_agua: '-',
        sede_pos_creche: 'Não',
        possui_alergia: 'Não',
        alimentos_proibidos: '-',
        possui_doenca: 'Não',
        doenca_qual: '-',
        escore_corporal: 'Ideal',
        observacoes: ''
      });
    } else if (!isNew) {
      const pet = pets.find(p => p.id === petId);
      if (pet) setFormData({ ...pet });
    }
  }, [petId, pets, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      if (!formData.pet_nome) return alert("Por favor, informe o nome do pet.");
      
      try {
        // Call backend API to save to Google Sheets
        const response = await fetch('/api/save-pet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to save to Google Sheets:', errorData.error);
          // We still proceed with local save even if Google Sheets fails, 
          // but we log the error.
        }
      } catch (error) {
        console.error('Error calling save-pet API:', error);
      }

      onSave(formData);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        if (petId === 'novo') navigate('/cadastro');
      }, 1500);
    }
  };

  if (!formData) return <div className="p-20 text-center font-black animate-pulse uppercase">Pet não encontrado...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-32 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER DE IDENTIFICAÇÃO */}
      <div className="bg-emerald-900 text-white rounded-[40px] p-8 shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <button onClick={() => navigate(-1)} className="absolute top-6 left-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-20">←</button>
        
        <div className="w-28 h-28 bg-white/10 rounded-[35px] flex items-center justify-center text-5xl shadow-inner shrink-0 z-10">🐶</div>
        <div className="flex-grow text-center md:text-left z-10">
          <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.3em] mb-1">
            {isNew ? 'NOVO REGISTRO NO SISTEMA' : 'REGISTRO MESTRE COMPLETO'}
          </p>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
             <input 
              name="pet_nome"
              placeholder="Nome do Pet..."
              value={formData.pet_nome}
              onChange={handleChange}
              className="bg-transparent text-4xl font-black tracking-tighter leading-tight border-b-2 border-white/20 outline-none focus:border-white transition-all w-full md:w-auto"
            />
          </div>
          <p className="text-emerald-200/60 font-bold uppercase text-xs tracking-widest mt-2">ID: {formData.id}</p>
        </div>
        <div className="z-10 bg-white/10 p-4 rounded-3xl border border-white/10 text-center min-w-[120px]">
          <p className="text-[8px] font-black text-emerald-300 uppercase tracking-widest mb-1">PESO ATUAL</p>
          <input type="text" name="peso_pet" value={formData.peso_pet} onChange={handleChange} className="bg-transparent text-xl font-black text-white w-full text-center outline-none focus:text-emerald-400" />
          <span className="text-[10px] font-bold">KG</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* NICHO: DADOS BÁSICOS E CONTATO */}
        <section className="bg-white rounded-[35px] p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <span className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center text-xl shadow-sm">👤</span>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">DADOS E CONTATO</h3>
          </div>
          <div className="space-y-4">
            <Field label="RAÇA" name="raca" value={formData.raca || ''} onChange={handleChange} />
            <Field label="NOME DO TUTOR" name="tutor_nome" value={formData.tutor_nome || ''} onChange={handleChange} />
            <Field label="TELEFONE" name="telefone" value={formData.telefone || ''} onChange={handleChange} />
            
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">AGENDA (DIAS NA CRECHE)</label>
              <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-[20px] border-2 border-slate-100">
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => {
                  const isSelected = (formData.dia_semana || '').includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const currentDays = (formData.dia_semana || '').split(',').map(d => d.trim()).filter(Boolean);
                        let newDays;
                        if (currentDays.includes(day)) {
                          newDays = currentDays.filter(d => d !== day);
                        } else {
                          newDays = [...currentDays, day];
                        }
                        setFormData({ ...formData, dia_semana: newDays.join(', ') });
                      }}
                      className={`py-2 rounded-xl text-[10px] font-black transition-all ${
                        isSelected 
                          ? 'bg-emerald-500 text-white shadow-md' 
                          : 'bg-white text-slate-400 hover:bg-emerald-50'
                      }`}
                    >
                      {day.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* NICHO: SAÚDE DETALHADA */}
        <section className="bg-white rounded-[35px] p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <span className="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-xl shadow-sm">🏥</span>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">SAÚDE DETALHADA</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Select label="POSSUI ALERGIA?" name="possui_alergia" value={formData.possui_alergia} onChange={handleChange} options={['Não', 'Sim']} />
              <Select label="POSSUI DOENÇA?" name="possui_doenca" value={formData.possui_doenca} onChange={handleChange} options={['Não', 'Sim']} />
            </div>
            <Field label="ALIMENTOS PROIBIDOS" name="alimentos_proibidos" value={formData.alimentos_proibidos} onChange={handleChange} />
            <Field label="HISTÓRICO DE DOENÇA" name="doenca_qual" value={formData.doenca_qual} onChange={handleChange} />
            <Select label="ESCORE CORPORAL" name="escore_corporal" value={formData.escore_corporal} onChange={handleChange} options={['Magro', 'Ideal', 'Um pouco acima', 'Acima do peso', 'Obesidade']} />
          </div>
        </section>

        {/* NICHO: HIDRATAÇÃO */}
        <section className="bg-white rounded-[35px] p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <span className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center text-xl shadow-sm">💧</span>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">HIDRATAÇÃO</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="INGESTÃO DE ÁGUA" name="ingestao_agua" value={formData.ingestao_agua} onChange={handleChange} />
              <Field label="INTERESSE EM ÁGUA" name="interesse_agua" value={formData.interesse_agua} onChange={handleChange} />
            </div>
            <Field label="PRECISA DE AJUDA PARA BEBER?" name="ajuda_beber_agua" value={formData.ajuda_beber_agua} onChange={handleChange} />
            <Select label="SEDE PÓS CRECHE?" name="sede_pos_creche" value={formData.sede_pos_creche} onChange={handleChange} options={['Não', 'Sim', 'Moderada', 'Muita']} />
          </div>
        </section>

        {/* NICHO: DIETA DETALHADA */}
        <section className="bg-white rounded-[35px] p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <span className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center text-xl shadow-sm">🍱</span>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">ALIMENTAÇÃO</h3>
          </div>
          <div className="space-y-4">
            <Select label="TIPO DE DIETA" name="tipo_alimentacao" value={formData.tipo_alimentacao} onChange={handleChange} options={['Ração', 'Alimentação Natural', 'Mista']} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="MARCA DA RAÇÃO" name="marca_racao" value={formData.marca_racao} onChange={handleChange} />
              <Field label="ESPECIFICAÇÃO" name="especificacao_racao" value={formData.especificacao_racao} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="QTD OFERECIDA" name="quantidade_oferecida" value={formData.quantidade_oferecida} onChange={handleChange} />
              <Field label="QTD APROXIMADA" name="quantidade_aproximada" value={formData.quantidade_aproximada} onChange={handleChange} />
            </div>
            <Field label="OFERECE EXTRAS/PETISCOS?" name="oferece_extras" value={formData.oferece_extras} onChange={handleChange} />
          </div>
        </section>

        {/* NICHO: COMPORTAMENTO ALIMENTAR */}
        <section className="bg-white rounded-[35px] p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <span className="w-10 h-10 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center text-xl shadow-sm">🧠</span>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">COMPORTAMENTO</h3>
          </div>
          <div className="space-y-4">
            <Field label="COMPORTAMENTO AO COMER" name="comportamento_alimentar" value={formData.comportamento_alimentar} onChange={handleChange} />
            <Field label="PRECISA DE ESTÍMULO?" name="precisa_estimulo" value={formData.precisa_estimulo} onChange={handleChange} />
          </div>
        </section>

        {/* NICHO: OBSERVAÇÕES */}
        <section className="bg-white rounded-[35px] p-8 shadow-sm border border-slate-100 space-y-4 md:col-span-2">
          <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">OBSERVAÇÕES ADICIONAIS / ANOTAÇÕES GERAIS</label>
          <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] font-bold text-slate-700 outline-none focus:border-slate-300 text-sm" placeholder="Ex: Medos, manias, amizades..." />
        </section>

        {/* BOTÃO DE SALVAR */}
        <div className="md:col-span-2 pt-4">
          <button type="submit" className={`w-full py-8 rounded-[35px] font-black text-2xl shadow-xl transition-all active:scale-95 border-b-[8px] ${isSaved ? 'bg-emerald-600 border-emerald-800 text-white' : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700 text-white'}`}>
            {isSaved ? '✨ REGISTRO SALVO COM SUCESSO!' : isNew ? '💾 CADASTRAR PET NA MATILHA' : '💾 SALVAR ALTERAÇÕES'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Field: React.FC<{ label: string; name: string; value: string; onChange: any }> = ({ label, name, value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">{label}</label>
    <input type="text" name={name} value={value} onChange={onChange} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] outline-none font-bold text-slate-700 focus:border-emerald-300 focus:bg-white transition-all text-sm" />
  </div>
);

const Select: React.FC<{ label: string; name: string; value: string; onChange: any; options: string[] }> = ({ label, name, value, onChange, options }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">{label}</label>
    <select name={name} value={value} onChange={onChange} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] outline-none font-bold text-slate-700 focus:border-emerald-300 focus:bg-white transition-all text-sm appearance-none">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default Cadastro;
