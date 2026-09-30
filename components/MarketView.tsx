import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Info, MapPin, Truck, Loader2, AlertCircle, RefreshCcw, ArrowUpRight, Building2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const MarketView: React.FC = () => {
  const [origin, setOrigin] = useState('Osvaldo Cruz, SP');
  const [destination, setDestination] = useState('SP');
  const [vehicleType, setVehicleType] = useState('Bitrem');
  
  const [exactOrigin, setExactOrigin] = useState('Osvaldo Cruz, SP');
  const [exactDestination, setExactDestination] = useState('Cuiabá, MT');
  const [exactVehicle, setExactVehicle] = useState('Bitrem');
  
  const [error, setError] = useState<string | null>(null);
  
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [exactLoading, setExactLoading] = useState(false);
  const [marketOverview, setMarketOverview] = useState<any[]>([]);
  const [exactResults, setExactResults] = useState<any[]>([]);

  const brazilianStates = [
    { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' }, { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' }, { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' }, { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' }, { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
  ];

  const cargoCategories = [
    'Açúcar',
    'Granel',
    'Paletizada',
    'Big Bag'
  ];

  const fetchMarketOverview = async () => {
    setOverviewLoading(true);
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY não configurada no ambiente.');
      }
      const ai = new GoogleGenAI({ apiKey });
      const aiPrompt = `
        Aja como um analista de mercado de fretes de elite e especialista em algoritmos de logística, com foco total na plataforma FRETEBRAS. 
        Sua missão é encontrar o VALOR MÁXIMO ABSOLUTO (Teto Nacional) por tonelada para os seguintes ALGORITMOS DE PRODUTO: ${cargoCategories.join(', ')}.
        
        BASE DE DADOS OBRIGATÓRIA: Fretebras (Nível Nacional).
        
        REGRAS DE IDENTIFICAÇÃO:
        1. Utilize exclusivamente o site/plataforma Fretebras como fonte primária de dados.
        2. Realize uma varredura a nível nacional (Brasil) para identificar os fretes mais altos registrados para cada categoria no Fretebras.
        3. Embora a busca seja nacional, utilize a rota "${origin} para ${destination}" e o veículo "${vehicleType}" como contexto de referência, mas traga o maior valor encontrado na plataforma para o produto, independentemente da rota, caso seja um teto de mercado.
        
        REGRAS DE BUSCA:
        1. Procure por "frete spot", "frete urgente" e "picos de safra" dentro do Fretebras.
        2. IGNORE MÉDIAS. Eu quero o valor mais alto que um transportador ou embarcador está oferecendo agora no Fretebras para cada uma das categorias.
        
        Retorne um JSON com um array chamado "overview" contendo objetos:
        { "category": string, "topValue": number, "platform": "Fretebras", "route": string }
        
        IMPORTANTE: Retorne APENAS o JSON puro.
      `;

      const modelName = "gemini-3-flash-preview";
      const response = await ai.models.generateContent({
        model: modelName,
        contents: aiPrompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || '{"overview": []}';
      const data = JSON.parse(text);
      setMarketOverview(data.overview || []);
    } catch (err: any) {
      console.error('Erro ao buscar visão geral:', err);
      setError(err.message || 'Falha ao buscar dados de mercado. Verifique sua conexão e chave de API.');
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchExactRouteMarket = async () => {
    setExactLoading(true);
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY não configurada no ambiente.');
      }
      const ai = new GoogleGenAI({ apiKey });
      const aiPrompt = `
        Aja como um analista de mercado de fretes de elite e especialista em algoritmos de logística, com foco total na plataforma FRETEBRAS. 
        Sua missão é encontrar com EXATIDÃO os valores de frete por tonelada para a ROTA ESPECÍFICA: "${exactOrigin} para ${exactDestination}" usando o veículo "${exactVehicle}".
        
        ALGORITMOS DE PRODUTO: ${cargoCategories.join(', ')}.
        
        BASE DE DADOS OBRIGATÓRIA: Fretebras e Web (Busca em tempo real).
        
        REGRAS DE IDENTIFICAÇÃO:
        1. Busque especificamente fretes ativos no Fretebras para esta rota exata.
        2. Se não houver fretes exatos para a cidade de destino, busque na cidade mais próxima num raio de 50km.
        3. Priorize valores reais de ofertas de carga publicadas hoje ou nos últimos 2 dias.
        
        Retorne um JSON com um array chamado "results" contendo objetos:
        { "category": string, "topValue": number, "platform": "Fretebras", "route": string }
        
        IMPORTANTE: Retorne APENAS o JSON puro.
      `;

      const modelName = "gemini-3-flash-preview";
      const response = await ai.models.generateContent({
        model: modelName,
        contents: aiPrompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || '{"results": []}';
      const data = JSON.parse(text);
      setExactResults(data.results || []);
    } catch (err: any) {
      console.error('Erro ao buscar rota exata:', err);
      setError(err.message || 'Falha ao buscar dados da rota. Verifique sua conexão e chave de API.');
    } finally {
      setExactLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketOverview();
    fetchExactRouteMarket();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight uppercase">
            <TrendingUp className="text-red-600" />
            Monitoramento de Mercado
          </h2>
          <p className="text-slate-500 text-sm font-medium">Valores máximos detectados (Base Fretebras Nacional)</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchMarketOverview}
            disabled={overviewLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCcw size={14} className={overviewLoading ? 'animate-spin' : ''} />
            Sincronizar Dados
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 animate-in slide-in-from-top duration-300">
          <AlertCircle size={20} />
          <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
        </div>
      )}

      {/* Professional Filter Bar - Overview */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monitoramento Geral: Origem</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Ex: Osvaldo Cruz, SP"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-red-50 outline-none transition-all"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </div>
        </div>

        <div className="w-48 space-y-1.5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino (Estado)</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-red-50 outline-none transition-all appearance-none cursor-pointer"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              {brazilianStates.map(state => (
                <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-48 space-y-1.5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Veículo</label>
          <div className="relative">
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-red-50 outline-none transition-all appearance-none cursor-pointer"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option>Bitrem</option>
              <option>Rodotrem</option>
              <option>Vanderleia</option>
              <option>LS</option>
              <option>Truck</option>
            </select>
          </div>
        </div>

        <button 
          onClick={fetchMarketOverview}
          disabled={overviewLoading}
          className="px-8 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 h-[42px]"
        >
          {overviewLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          Geral
        </button>
      </div>

      {/* Professional Filter Bar - Exact Route */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rota Exata: Origem</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Ex: Osvaldo Cruz, SP"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-red-50 outline-none transition-all"
              value={exactOrigin}
              onChange={(e) => setExactOrigin(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino (Cidade, UF)</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Ex: Cuiabá, MT"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-red-50 outline-none transition-all"
              value={exactDestination}
              onChange={(e) => setExactDestination(e.target.value)}
            />
          </div>
        </div>

        <div className="w-48 space-y-1.5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Veículo</label>
          <div className="relative">
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-red-50 outline-none transition-all appearance-none cursor-pointer"
              value={exactVehicle}
              onChange={(e) => setExactVehicle(e.target.value)}
            >
              <option>Bitrem</option>
              <option>Rodotrem</option>
              <option>Vanderleia</option>
              <option>LS</option>
              <option>Truck</option>
            </select>
          </div>
        </div>

        <button 
          onClick={fetchExactRouteMarket}
          disabled={exactLoading}
          className="px-8 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-200 transition-all flex items-center gap-2 disabled:opacity-50 h-[42px]"
        >
          {exactLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          Rota Exata
        </button>
      </div>

      {/* Professional Large Cards Grid - Overview */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Monitoramento Geral (Teto Nacional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cargoCategories.map((cat) => {
            const item = marketOverview.find(o => o.category.toLowerCase().includes(cat.toLowerCase()));
            return (
              <div key={`overview-${cat}`} className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group relative flex flex-col justify-between min-h-[160px]">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-50 group-hover:bg-slate-900 transition-colors"></div>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0.5">{cat}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[8px] font-black text-emerald-600 uppercase">Live Spot</span>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
                    <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-900" />
                  </div>
                </div>
                
                {overviewLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-3/4 bg-slate-50 animate-pulse rounded-xl" />
                    <div className="h-3 w-1/2 bg-slate-50 animate-pulse rounded-lg" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-slate-400">R$</span>
                      <span className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">
                        {item ? item.topValue.toFixed(2) : '---'}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase">/ Ton</span>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-50 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={10} className="text-slate-400" />
                        <p className="text-[9px] font-black text-slate-900 uppercase truncate">
                          {item?.platform || 'Aguardando...'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={10} className="text-slate-300" />
                        <p className="text-[8px] font-bold text-slate-400 uppercase truncate">
                          {item?.route || 'Rota não especificada'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Professional Large Cards Grid - Exact Route */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-red-600 uppercase tracking-[0.3em] ml-2">Resultado Rota Exata (Cidade a Cidade)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cargoCategories.map((cat) => {
            const item = exactResults.find(o => o.category.toLowerCase().includes(cat.toLowerCase()));
            return (
              <div key={`exact-${cat}`} className="bg-white border border-red-50 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md hover:border-red-100 transition-all group relative flex flex-col justify-between min-h-[160px]">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-red-50 group-hover:bg-red-600 transition-colors"></div>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.1em] mb-0.5">{cat}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-[8px] font-black text-red-600 uppercase">Exato</span>
                    </div>
                  </div>
                  <div className="p-2 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
                    <ArrowUpRight size={16} className="text-red-300 group-hover:text-red-600" />
                  </div>
                </div>
                
                {exactLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-3/4 bg-red-50/30 animate-pulse rounded-xl" />
                    <div className="h-3 w-1/2 bg-red-50/30 animate-pulse rounded-lg" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-red-400">R$</span>
                      <span className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">
                        {item ? item.topValue.toFixed(2) : '---'}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase">/ Ton</span>
                    </div>
                    
                    <div className="pt-3 border-t border-red-50 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={10} className="text-red-600" />
                        <p className="text-[9px] font-black text-slate-900 uppercase truncate">
                          {item?.platform || 'Aguardando...'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={10} className="text-slate-300" />
                        <p className="text-[8px] font-bold text-slate-400 uppercase truncate">
                          {item?.route || 'Rota não encontrada'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarketView;
