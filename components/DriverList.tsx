
import React, { memo } from 'react';
import { Trash2, Edit2, Phone, MapPin, Truck, Scale, Fingerprint } from 'lucide-react';
import { Driver } from '../types';

interface DriverRowProps {
  driver: Driver;
  onRemove: (id: string) => void;
  onEdit: (driver: Driver) => void;
}

const formatKg = (val: number) => {
  return new Intl.NumberFormat('pt-BR').format(val) + ' kg';
};

const DriverRow = memo(({ driver, onRemove, onEdit }: DriverRowProps) => {
  return (
    <tr className="hover:bg-slate-50/40 transition-colors duration-150 group">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
            {(driver.name || 'M').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight truncate">{driver.name || 'Sem Nome'}</p>
            <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
              <span className="text-[9.5px] text-slate-500 font-semibold flex items-center gap-1">
                <Phone size={9.5} className="text-slate-400 shrink-0" /> {driver.phone || 'N/A'}
              </span>
              <span className="text-slate-300 text-[9px] font-bold">|</span>
              <span className="text-[9.5px] text-slate-500 font-semibold flex items-center gap-1">
                <Fingerprint size={9.5} className="text-slate-400 shrink-0" /> {driver.cpf || 'N/A'}
              </span>
              <span className="text-slate-300 text-[9px] font-bold">|</span>
              <span className="text-[9.5px] text-red-600 font-bold uppercase flex items-center gap-0.5">
                <MapPin size={9.5} className="text-red-500 shrink-0" /> {driver.state || 'UF'}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono shrink-0 ${
            driver.truckPlate 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-slate-100 text-slate-400 border border-slate-200 font-sans text-[9px]'
          }`}>
            {driver.truckPlate || 'S/ Placa'}
          </span>
          <div className="flex gap-1 overflow-x-auto custom-scrollbar whitespace-nowrap">
            {driver.trailer1 && (
              <span className="text-[9px] font-bold text-red-600 px-1.5 py-0.2 bg-red-50/50 rounded border border-red-100">
                C1: {driver.trailer1}
              </span>
            )}
            {driver.trailer2 && (
              <span className="text-[9px] font-bold text-amber-600 px-1.5 py-0.2 bg-amber-50/50 rounded border border-amber-100">
                C2: {driver.trailer2}
              </span>
            )}
            {driver.dolly && (
              <span className="text-[9px] font-bold text-slate-600 px-1.5 py-0.2 bg-slate-50/50 rounded border border-slate-100">
                D: {driver.dolly}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-center">
        <span className="text-xs font-bold text-slate-700 bg-slate-50 w-6 h-6 rounded-full inline-flex items-center justify-center border border-slate-200">{driver.axisCount || '0'}</span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <Scale size={11} className="text-slate-300" />
          <p className="text-xs font-semibold text-slate-700">{formatKg(driver.netWeight)}</p>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <Scale size={11} className="text-red-500" />
          <p className="text-xs font-bold text-slate-900">{formatKg(driver.grossWeight)}</p>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity duration-150">
          <button 
            onClick={() => onEdit(driver)}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
            title="Editar Ficha"
          >
            <Edit2 size={13} />
          </button>
          <button 
            onClick={() => onRemove(driver.id)}
            className="p-1 text-slate-400 hover:text-red-900 hover:bg-red-50 rounded-md transition-all"
            title="Excluir"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
});

DriverRow.displayName = 'DriverRow';

interface DriverListProps {
  drivers: Driver[];
  onRemove: (id: string) => void;
  onEdit: (driver: Driver) => void;
}

const DriverList = memo(({ drivers, onRemove, onEdit }: DriverListProps) => {
  if (drivers.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center animate-in fade-in zoom-in duration-300">
        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Truck className="text-slate-200" size={32} />
        </div>
        <h3 className="text-base font-black text-slate-900 tracking-tight">Frota Vazia ou Sem Resultados</h3>
        <p className="text-slate-400 max-w-sm mx-auto mt-1.5 text-xs font-semibold">
          Ajuste os filtros de pesquisa ou inicie um novo cadastro para popular sua base de dados.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-250">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-50/60 border-b border-slate-100">
              <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Motorista / Ficha</th>
              <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Equipamento</th>
              <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Eixos</th>
              <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Peso Líquido</th>
              <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Peso Bruto (PBT)</th>
              <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-105">
            {drivers.map((driver) => (
              <DriverRow 
                key={driver.id} 
                driver={driver} 
                onRemove={onRemove} 
                onEdit={onEdit} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

DriverList.displayName = 'DriverList';

export default DriverList;
