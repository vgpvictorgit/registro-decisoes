import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Download, AlertCircle, CheckCircle2, 
  Info, Clock, Save, BookOpen, ChevronDown, 
  ChevronUp, Sparkles, Loader2, BarChart3, HelpCircle, X
} from 'lucide-react';

const App = () => {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  
  const [formData, setFormData] = useState({
    situacao: '',
    criticidade: 'Urgente e importante',
    acao: '',
    resultado: ''
  });

  const apiKey = "AIzaSyCd6QwE1hLwvf_ZV-E0UZQDaNUWvq9N-hY"; // A chave é fornecida pelo ambiente de execução

  const criticidadeOptions = [
    { label: 'Urgente e importante', color: 'bg-red-100 text-red-700 border-red-200', desc: 'Crises imediatas e prazos fatais.' },
    { label: 'Urgente e não importante', color: 'bg-orange-100 text-orange-700 border-orange-200', desc: 'Interrupções, algumas chamadas e reuniões.' },
    { label: 'Não urgente e importante', color: 'bg-blue-100 text-blue-700 border-blue-200', desc: 'Planejamento, prevenção e construção de relacionamentos.' },
    { label: 'Não importante e nao importante', color: 'bg-slate-100 text-slate-700 border-slate-200', desc: 'Atividades triviais e distrações.' }
  ];

  // Função para chamadas ao Gemini com lógica de Retry e Backoff
  const callGemini = async (prompt, systemInstruction = "") => {
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
          })
        });

        if (!response.ok) throw new Error('Falha na API');
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (error) {
        if (i === 4) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  // Sugestão de IA para o formulário
  const handleAISuggestion = async () => {
    if (!formData.situacao) return;
    setLoading(true);
    try {
      const systemPrompt = "Você é um mentor de carreira e gestão de processos experiente.";
      const userPrompt = `Com base na situação: "${formData.situacao}" e criticidade: "${formData.criticidade}", sugira uma 'ação tomada' (máx 240 caracteres) e um 'resultado' (focado em impacto no negócio). Responda estritamente em formato JSON: {"acao": "...", "resultado": "..."}`;
      
      const resultText = await callGemini(userPrompt, systemPrompt);
      const cleanJson = resultText.replace(/```json|```/g, "").trim();
      const suggestion = JSON.parse(cleanJson);
      
      setFormData(prev => ({
        ...prev,
        acao: suggestion.acao.substring(0, 240),
        resultado: suggestion.resultado
      }));
    } catch (error) {
      console.error("Erro na sugestão de IA:", error);
    } finally {
      setLoading(false);
    }
  };

  // Análise de padrões com IA
  const handleAnalyzePatterns = async () => {
    if (entries.length === 0) return;
    setLoading(true);
    try {
      const dataStr = JSON.stringify(entries);
      const prompt = `Analise estes registros de decisões e forneça 3 insights estratégicos curtos sobre a performance ou processos. Seja direto e executivo. Dados: ${dataStr}`;
      const analysis = await callGemini(prompt, "Você é um consultor de operações sênior.");
      setInsights(analysis);
    } catch (error) {
      console.error("Erro na análise de padrões:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEntry = {
      ...formData,
      id: Date.now(),
      data: new Date().toLocaleDateString('pt-BR')
    };
    setEntries([newEntry, ...entries]);
    setFormData({ situacao: '', criticidade: 'Urgente e importante', acao: '', resultado: '' });
    setShowForm(false);
  };

  const deleteEntry = (id) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Situação', 'Criticidade', 'Ação Tomada', 'Resultado'];
    const rows = entries.map(e => [
      e.data,
      `"${e.situacao}"`,
      `"${e.criticidade}"`,
      `"${e.acao}"`,
      `"${e.resultado}"`
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registro_decisoes_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto pb-20">
        
        {/* Cabeçalho */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Registro de Decisões</h1>
            <p className="text-slate-500 mt-1 uppercase text-xs font-bold tracking-widest">Documentação de Performance e Impacto</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleAnalyzePatterns}
              disabled={entries.length === 0 || loading}
              className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              ✨ Analisar Padrões
            </button>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm"
            >
              {showForm ? 'Cancelar' : <><Plus size={20} /> Novo Registro</>}
            </button>
          </div>
        </header>

        {/* Card de Insights da IA */}
        {insights && (
          <div className="mb-8 bg-gradient-to-r from-indigo-600 to-violet-700 rounded-xl p-6 text-white shadow-lg animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-lg">
                <BarChart3 size={24} />
                Insights Estratégicos ✨
              </div>
              <button onClick={() => setInsights(null)} className="text-white/60 hover:text-white">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-indigo-50">
              {insights}
            </div>
          </div>
        )}

        {/* Guia de Uso Inicial */}
        <section className="mb-8 overflow-hidden bg-white border border-indigo-100 rounded-xl shadow-sm">
            <button 
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between p-4 bg-indigo-50/50 hover:bg-indigo-50 transition-colors"
            >
                <div className="flex items-center gap-3 text-indigo-700 font-semibold text-sm">
                    <BookOpen size={20} />
                    COMO USAR ESTA FERRAMENTA
                </div>
                {showInstructions ? <ChevronUp size={20} className="text-indigo-400" /> : <ChevronDown size={20} className="text-indigo-400" />}
            </button>
            
            {showInstructions && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500 text-slate-600 border-t border-indigo-50">
                    <div className="space-y-2 border-l-2 border-indigo-100 pl-4">
                        <h4 className="font-bold text-slate-800 text-sm">1. Situação</h4>
                        <p className="text-xs leading-relaxed">Descreva brevemente o evento ou desafio enfrentado (máx. 100 caracteres).</p>
                    </div>
                    <div className="space-y-2 border-l-2 border-indigo-100 pl-4">
                        <h4 className="font-bold text-slate-800 text-sm">2. Criticidade</h4>
                        <p className="text-xs leading-relaxed">Classifique o impacto segundo a Matriz de Eisenhower (Urgência x Importância).</p>
                    </div>
                    <div className="space-y-2 border-l-2 border-indigo-100 pl-4">
                        <h4 className="font-bold text-slate-800 text-sm">3. Ação Tomada</h4>
                        <p className="text-xs leading-relaxed">O que foi feito? Descreva em até 240 caracteres ou use a ✨ IA para ajudar.</p>
                    </div>
                    <div className="space-y-2 border-l-2 border-indigo-100 pl-4">
                        <h4 className="font-bold text-slate-800 text-sm">4. Resultado</h4>
                        <p className="text-xs leading-relaxed">Qual o efeito no negócio, time ou cliente? Foque em métricas ou feedbacks.</p>
                    </div>
                </div>
            )}
        </section>

        {/* Seção do Formulário */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800">
                <Plus className="text-indigo-600" size={24} /> 
                Novo Registro
              </h2>
              {formData.situacao && (
                <button 
                  type="button"
                  onClick={handleAISuggestion}
                  disabled={loading}
                  className="flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  ✨ Sugerir com IA
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Situação Vivida</label>
                <input
                  required
                  maxLength={100}
                  name="situacao"
                  value={formData.situacao}
                  onChange={handleInputChange}
                  placeholder="Ex: Instabilidade no servidor de produção..."
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <div className="flex justify-end">
                  <span className={`text-[10px] font-mono ${formData.situacao.length >= 90 ? 'text-orange-500' : 'text-slate-400'}`}>
                    {formData.situacao.length}/100
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Criticidade</label>
                <select
                  name="criticidade"
                  value={formData.criticidade}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                >
                  {criticidadeOptions.map(opt => (
                    <option key={opt.label} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ação Tomada</label>
                <textarea
                  required
                  maxLength={240}
                  name="acao"
                  rows={3}
                  value={formData.acao}
                  onChange={handleInputChange}
                  placeholder="Descreva a ação em detalhes..."
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                />
                <div className="flex justify-end">
                  <span className={`text-[10px] font-mono ${formData.acao.length >= 220 ? 'text-orange-500' : 'text-slate-400'}`}>
                    {formData.acao.length}/240
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultado da Decisão</label>
                <textarea
                  required
                  name="resultado"
                  rows={3}
                  value={formData.resultado}
                  onChange={handleInputChange}
                  placeholder="Qual foi o efeito observado?"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="md:col-span-2 flex justify-end pt-2 border-t border-slate-50 mt-2">
                <button 
                  type="submit"
                  className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-lg font-bold transition-all shadow-md active:scale-95"
                >
                  <Save size={20} /> Salvar Registro
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabela de Registros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-bottom border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-1/4">Situação</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Criticidade</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-1/4">Ação</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-1/4">Resultado</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">
                      Nenhum registro encontrado. Comece clicando em "Novo Registro".
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const style = criticidadeOptions.find(o => o.label === entry.criticidade)?.color || '';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">{entry.data}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-slate-800 leading-relaxed">{entry.situacao}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap ${style}`}>
                            {entry.criticidade}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{entry.acao}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600 line-clamp-3 italic leading-relaxed">"{entry.resultado}"</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteEntry(entry.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-full transition-all hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé e Ações Finais */}
        <div className="flex flex-col items-center gap-6 mt-12 border-t border-slate-200 pt-8">
            <div className="flex gap-4">
                {entries.length > 0 && (
                    <button 
                        onClick={exportToCSV} 
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors"
                    >
                        <Download size={18} /> Exportar Relatório
                    </button>
                )}
                <button 
                    onClick={() => setShowHowItWorks(true)}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors"
                >
                    <HelpCircle size={18} /> How it works?
                </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-semibold opacity-60">
                Performance & Decisions Tracker • Gemini AI Driven
            </p>
        </div>

        {/* Modal: How It Works? */}
        {showHowItWorks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <HelpCircle size={24} />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight uppercase italic">How It Works?</h3>
                </div>
                <button 
                    onClick={() => setShowHowItWorks(false)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-8">
                <section>
                    <h4 className="text-indigo-600 font-bold uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                        O Objetivo da Ferramenta
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 font-medium">
                        Esta plataforma foi criada para documentar marcos de performance, permitindo que o profissional tenha clareza sobre o valor que entrega e como gere o seu tempo.
                    </p>
                </section>

                <section>
                    <h4 className="text-indigo-600 font-bold uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                        Integração Gemini AI ✨
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-700 mb-1 flex items-center gap-2">
                                <Sparkles size={14} /> Sugestão de IA
                            </p>
                            <p className="text-[11px] text-slate-600 leading-tight">Analisa a sua situação e propõe redações executivas para ações e resultados.</p>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-700 mb-1 flex items-center gap-2">
                                <BarChart3 size={14} /> Análise de Padrões
                            </p>
                            <p className="text-[11px] text-slate-600 leading-tight">Examina o conjunto de registos para identificar tendências de gestão e gargalos.</p>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-slate-800 font-bold uppercase text-xs tracking-widest mb-3">Valor para o Profissional</h4>
                    <ul className="text-xs text-slate-600 space-y-3">
                        <li className="flex gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span><strong>Visibilidade:</strong> Histórico concreto para conversas de 1:1 e promoções.</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span><strong>Alocação de energia:</strong> Identifique se o seu tempo está a ser gasto em "apagamento de incêndios" ou em temas estratégicos.</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span><strong>Aprendizagem:</strong> Análise crítica sobre as decisões tomadas e seus efeitos reais.</span>
                        </li>
                    </ul>
                </section>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 text-right">
                <button 
                  onClick={() => setShowHowItWorks(false)}
                  className="bg-slate-900 text-white px-8 py-2.5 rounded-lg font-bold text-sm hover:bg-black transition-all shadow-sm"
                >
                  Continuar Registros
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;