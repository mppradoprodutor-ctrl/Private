import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Check, X, ShieldAlert, Star, Edit3, MapPin, FileText } from 'lucide-react';
import { OperationalUnit } from '../types';

interface OperationalUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: OperationalUnit[];
  activeUnitId: string;
  onSaveUnit: (unitData: Omit<OperationalUnit, 'id' | 'createdAt'>, editId?: string) => void;
  onDeleteUnit: (id: string) => void;
  onSelectActiveUnit: (id: string) => void;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const formatCnpj = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const OperationalUnitModal: React.FC<OperationalUnitModalProps> = ({
  isOpen,
  onClose,
  units,
  activeUnitId,
  onSaveUnit,
  onDeleteUnit,
  onSelectActiveUnit
}) => {
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('PR');
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, units.length]);

  const resetForm = () => {
    setCnpj('');
    setCompanyName('');
    setStateRegistration('');
    setStreet('');
    setNumber('');
    setNeighborhood('');
    setCity('');
    setState('PR');
    setName('');
    setIsDefault(units.length === 0);
    setEditingId(null);
    setError('');
    setConfirmDeleteId(null);
  };

  if (!isOpen) return null;

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    setCnpj(formatted);
    if (error) setError('');
  };

  const handleStartEdit = (unit: OperationalUnit) => {
    setEditingId(unit.id);
    setCnpj(unit.cnpj);
    setCompanyName(unit.companyName || '');
    setStateRegistration(unit.stateRegistration || '');
    setStreet(unit.street || '');
    setNumber(unit.number || '');
    setNeighborhood(unit.neighborhood || '');
    setCity(unit.city || '');
    setState(unit.state || 'PR');
    setName(unit.name || '');
    setIsDefault(unit.id === activeUnitId || !!unit.isDefault);
    setError('');
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = cnpj.replace(/\D/g, '');
    if (cleanDigits.length < 14) {
      setError('Informe um CNPJ completo com 14 dígitos.');
      return;
    }

    if (!companyName.trim()) {
      setError('Informe o Nome da Empresa / Razão Social.');
      return;
    }

    // Check duplicate CNPJ if not editing same item
    const duplicate = units.find(u => u.cnpj.replace(/\D/g, '') === cleanDigits && u.id !== editingId);
    if (duplicate) {
      setError(`Este CNPJ já está cadastrado como "${duplicate.companyName || duplicate.name || 'Unidade'}".`);
      return;
    }

    onSaveUnit({
      cnpj: cnpj.trim(),
      companyName: companyName.trim(),
      stateRegistration: stateRegistration.trim() || undefined,
      street: street.trim() || undefined,
      number: number.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      name: name.trim() || (city.trim() ? `Filial ${city.trim()}` : undefined),
      isDefault: isDefault || units.length === 0
    }, editingId || undefined);

    resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-red-950 text-white p-5 flex items-center justify-between border-b border-red-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-800/80 border border-red-700/60 flex items-center justify-center text-white shadow-inner">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">Unidades Operacionais & CNPJs</h3>
              <p className="text-[10px] text-red-200/80 font-bold uppercase tracking-wider mt-0.5">
                Cadastre o CNPJ, Nome da Empresa, Inscrição Estadual e Endereço para as Ordens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Form to Add / Edit */}
          <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                {editingId ? <Edit3 size={14} className="text-blue-600" /> : <Plus size={14} className="text-red-600" />}
                {editingId ? 'Editar Dados da Unidade Operacional' : 'Cadastrar Nova Unidade / CNPJ'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            {/* Linha 1: CNPJ e Nome da Empresa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Número do CNPJ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black tracking-wider font-mono outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Nome da Empresa / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TRANSPANORAMA TRANSPORTES LTDA"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Linha 2: Inscrição Estadual (IE) e Identificação / Apelido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 90123456-78 ou ISENTO"
                  value={stateRegistration}
                  onChange={e => setStateRegistration(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Identificação da Unidade (Apelido)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Matriz, Filial Paranaguá, etc."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Linha 3: Endereço (Rua e Número) */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-3">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Rua / Logradouro / Rodovia
                </label>
                <input
                  type="text"
                  placeholder="Ex: Av. Colombo ou Rod. BR-376, Km 120"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 transition-all shadow-xs"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Número
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1250 ou S/N"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Linha 4: Bairro, Cidade e Estado (UF) */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  placeholder="Ex: Zona Industrial"
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 transition-all shadow-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Maringá"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 transition-all shadow-xs"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Estado (UF)
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 transition-all shadow-xs cursor-pointer"
                >
                  {BRAZILIAN_STATES.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ações e Checkbox */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-700">
                  Definir esta unidade como ativa / padrão do sistema
                </span>
              </label>

              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all cursor-pointer ml-auto"
              >
                {editingId ? <Check size={14} /> : <Plus size={14} />}
                {editingId ? 'Atualizar Unidade' : 'Cadastrar Unidade'}
              </button>
            </div>

            {error && (
              <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center gap-1.5 animate-in fade-in">
                <ShieldAlert size={14} className="shrink-0" /> {error}
              </p>
            )}
          </form>

          {/* List of Units */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Unidades e CNPJs Cadastrados ({units.length})
              </h4>
              <span className="text-[9px] font-bold text-slate-400">
                A unidade ativa estampará o cabeçalho das ordens
              </span>
            </div>

            {units.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                Nenhum CNPJ cadastrado. Adicione um formulário acima.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                {units.map((unit) => {
                  const isActive = unit.id === activeUnitId || (units.length === 1);
                  const isConfirming = confirmDeleteId === unit.id;

                  const fullAddress = [
                    unit.street ? `${unit.street}${unit.number ? `, ${unit.number}` : ''}` : '',
                    unit.neighborhood || '',
                    unit.city ? `${unit.city}${unit.state ? ` - ${unit.state}` : ''}` : unit.state || ''
                  ].filter(Boolean).join(' • ');

                  return (
                    <div 
                      key={unit.id}
                      className={`p-4 flex items-start justify-between gap-3 transition-colors ${
                        isActive ? 'bg-red-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectActiveUnit(unit.id)}
                          title={isActive ? 'Unidade Ativa do Sistema' : 'Clique para tornar a unidade ativa'}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-red-600 text-white shadow-xs' 
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                          }`}
                        >
                          <Star size={14} className={isActive ? 'fill-current' : ''} />
                        </button>
                        
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-slate-900 tracking-tight uppercase">
                              {unit.companyName || unit.name || 'EMPRESA'}
                            </span>
                            {unit.name && unit.companyName && (
                              <span className="text-[10px] font-bold text-slate-500">
                                ({unit.name})
                              </span>
                            )}
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                                Ativa
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono flex-wrap">
                            <span className="font-bold text-red-700">CNPJ: {unit.cnpj}</span>
                            {unit.stateRegistration && (
                              <span>• IE: {unit.stateRegistration}</span>
                            )}
                          </div>

                          {fullAddress && (
                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin size={10} className="shrink-0 text-slate-400" />
                              <span className="truncate">{fullAddress}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => onSelectActiveUnit(unit.id)}
                            className="text-[9px] font-bold text-slate-600 hover:text-red-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                            title="Tornar este o CNPJ principal"
                          >
                            Usar Este
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(unit)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="Editar Unidade"
                        >
                          <Edit3 size={14} />
                        </button>

                        {isConfirming ? (
                          <div className="flex items-center gap-1 bg-red-100 p-1 rounded-lg border border-red-200 animate-in fade-in">
                            <span className="text-[9px] font-black text-red-700 px-1">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteUnit(unit.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-bold hover:bg-red-700 cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-white text-slate-600 rounded text-[9px] font-bold hover:bg-slate-100 cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={units.length <= 1}
                            onClick={() => setConfirmDeleteId(unit.id)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              units.length <= 1 
                                ? 'text-slate-200 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={units.length <= 1 ? 'Mínimo de 1 CNPJ necessário' : 'Excluir Unidade'}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[10px] text-slate-500 font-medium">
            Os dados da unidade selecionada serão impressos no cabeçalho da Ordem de Carregamento.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationalUnitModal;
