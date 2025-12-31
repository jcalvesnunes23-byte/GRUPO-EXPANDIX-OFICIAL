
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Board, BoardViewType, Task, TaskGroup, TaskStatus, TaskPriority, User, Organization, Automation } from './types';
import { Icons } from './components/Icons';
import { geminiService } from './services/geminiService';
import { supabaseService } from './services/supabaseService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const BrandName = ({ className = "" }: { className?: string }) => (
  <span className={`gold-text-gradient font-black tracking-tighter uppercase ${className}`}>
    GRUPO EXPANDIX
  </span>
);

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3700); // 2.5s display + 1.2s anim
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center animate-splash-exit">
      <div className="text-center animate-logo-intro">
        <div className="mb-8">
          <BrandName className="text-7xl md:text-8xl logo-glow block" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.8em] text-amber-500/60 ml-4">Enterprise Intelligence</span>
        </div>
      </div>
    </div>
  );
};

const UserProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate: (updates: Partial<User>) => Promise<void>;
  theme: 'dark' | 'light';
}> = ({ isOpen, onClose, user, onUpdate, theme }) => {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setAvatar(user.avatar);
      setSaveError(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onUpdate({ name, avatar });
      onClose();
    } catch (err: any) {
      const msg = err?.message || String(err) || "Falha ao sincronizar.";
      setSaveError(msg);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-entry">
      <div className="glass-card p-12 rounded-[4rem] w-full max-w-md border-amber-500/20 shadow-[0_0_100px_rgba(212,175,55,0.2)]">
        <div className="text-center mb-10">
          <div className="relative inline-block group mb-6">
            <div 
              onClick={() => !isSaving && fileInputRef.current?.click()}
              className={`w-32 h-32 rounded-[2.5rem] overflow-hidden border-2 transition-all shadow-[0_0_30px_rgba(212,175,55,0.1)] ${isSaving ? 'opacity-50 cursor-wait' : 'border-amber-500/30 cursor-pointer hover:border-amber-500'}`}
            >
              <img src={avatar} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Avatar" />
              {!isSaving && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Icons.Plus />
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} disabled={isSaving} />
          </div>
          <h3 className="text-2xl font-black gold-text-gradient uppercase tracking-tighter">Perfil do Gestor</h3>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Personalização de Identidade</p>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] ml-2">Nome de Exibição</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className={`w-full bg-white/[0.03] border border-white/10 rounded-3xl px-8 py-5 outline-none focus:border-amber-500 transition-all font-bold text-white shadow-inner ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
              placeholder="Seu Nome"
            />
          </div>

          {saveError && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-[10px] text-rose-500 font-black uppercase tracking-widest text-center animate-pulse">
              Aviso: Salvo localmente. Verifique a tabela "users" no Supabase.
            </div>
          )}
          
          <div className="flex gap-4 pt-4">
            <button 
              onClick={onClose} 
              disabled={isSaving}
              className="flex-1 py-5 rounded-3xl font-black uppercase text-[10px] border border-white/10 text-slate-400 hover:bg-white/5 transition-all disabled:opacity-30"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 gold-gradient text-black py-5 rounded-3xl font-black uppercase text-[10px] shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 ${isSaving ? 'brightness-75' : ''}`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Perfil'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConfirmDeleteModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string;
  type?: 'task' | 'hub';
}> = ({ isOpen, onClose, onConfirm, title, type = 'task' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-entry">
      <div className="glass-card p-10 rounded-[3.5rem] w-full max-w-lg border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-8 animate-pulse">
            <Icons.Trash />
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">
            {type === 'hub' ? 'Desativar Hub Estratégico?' : 'Eliminar Registro?'}
          </h3>
          <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed">
            {type === 'hub' ? (
              <>Você está prestes a remover o Hub <span className="text-rose-500 font-black">"{title}"</span> e todos os dados de operação vinculados a ele.</>
            ) : (
              <>Você está prestes a excluir permanentemente o protocolo <span className="text-rose-500 font-black">"{title}"</span>.</>
            )}
            <br/> Esta ação não pode ser desfeita na matriz Supabase.
          </p>
          <div className="flex gap-4 w-full">
            <button onClick={onClose} className="flex-1 py-5 rounded-3xl font-black uppercase text-[10px] border border-white/10 text-slate-400 hover:bg-white/5 transition-all">Manter</button>
            <button onClick={onConfirm} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-[0_0_30px_rgba(225,29,72,0.3)] transition-all active:scale-95">Excluir Permanente</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Initial User Profile
const INITIAL_USER: User = { 
  id: '1', 
  name: 'Diretor de Operações', 
  email: 'diretoria@expandix.com', 
  avatar: 'https://picsum.photos/seed/gold1/100/100', 
  role: 'ADMIN' 
 };

const STATUS_CONFIG = {
  [TaskStatus.STOPPED]: { color: '#ef4444', label: 'PARADO' },
  [TaskStatus.WORKING]: { color: '#f59e0b', label: 'EM ANDAMENTO' },
  [TaskStatus.DONE]: { color: '#10b981', label: 'CONCLUIDO' },
};

// --- Helper for PDF Export ---
const exportTaskToPDF = (task: Task) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>Ficha do Cliente - ${task.title}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: #fff; }
          .header { border-bottom: 4px solid #D4AF37; padding-bottom: 20px; margin-bottom: 40px; display: flex; align-items: center; gap: 20px; }
          .client-img { width: 80px; height: 80px; border-radius: 20px; object-fit: cover; border: 2px solid #D4AF37; }
          .logo { font-size: 24px; font-weight: 900; color: #D4AF37; letter-spacing: -1px; }
          .title { font-size: 32px; font-weight: 900; text-transform: uppercase; margin-top: 10px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; color: #D4AF37; margin-bottom: 10px; border-left: 3px solid #D4AF37; padding-left: 10px; }
          .content { font-size: 16px; line-height: 1.6; background: #f8fafc; padding: 20px; border-radius: 10px; }
          .meta { display: grid; grid-cols: 2; gap: 20px; margin-top: 40px; font-size: 12px; font-weight: bold; color: #64748b; }
          .footer { margin-top: 60px; font-size: 10px; text-align: center; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${task.clientAvatar ? `<img src="${task.clientAvatar}" class="client-img" />` : ''}
          <div>
            <div class="logo">GRUPO EXPANDIX ENTERPRISE AI</div>
            <div class="title">${task.title}</div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Matriz Criativa (Ideia do Cliente)</div>
          <div class="content">${task.clientIdea || 'Nenhum registro criativo informado.'}</div>
        </div>
        <div class="section">
          <div class="section-title">Protocolo de Demanda (Pedido Formal)</div>
          <div class="content">${task.clientRequest || 'Nenhum pedido formal registrado.'}</div>
        </div>
        <div class="meta">
          <div>WHATSAPP: ${task.clientPhone || 'Não informado'}</div>
          <div>ESTADO: ${task.status}</div>
          <div>PRIORIDADE: ${task.priority}</div>
          <div>VALOR: R$ ${task.value?.toLocaleString() || '0'}</div>
          <div>ID DO TRABALHO: ${task.id}</div>
        </div>
        <div class="footer">
          Documento Gerado Automaticamente pelo Sistema de Gestão GRUPO EXPANDIX - ${new Date().toLocaleDateString()}
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};

const ClientTaskCard: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  theme: 'dark' | 'light';
}> = ({ isOpen, onClose, task, onUpdate, theme }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: task.title,
    clientIdea: task.clientIdea || '',
    clientRequest: task.clientRequest || '',
    priority: task.priority,
    value: task.value || 0,
    clientAvatar: task.clientAvatar || '',
    status: task.status,
    clientPhone: task.clientPhone || '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData({
      title: task.title,
      clientIdea: task.clientIdea || '',
      clientRequest: task.clientRequest || '',
      priority: task.priority,
      value: task.value || 0,
      clientAvatar: task.clientAvatar || '',
      status: task.status,
      clientPhone: task.clientPhone || '',
    });
  }, [task]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, clientAvatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openWhatsApp = () => {
    if (!formData.clientPhone) return;
    const cleanPhone = formData.clientPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-entry p-4">
      <div className="glass-card p-12 rounded-[4rem] w-full max-w-3xl border border-amber-500/30 shadow-[0_0_100px_rgba(212,175,55,0.15)] relative max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
        <div className="flex justify-between items-start mb-12">
          <div className="flex items-center gap-6">
             <div onClick={() => fileInputRef.current?.click()} className="w-20 h-20 gold-gradient rounded-3xl flex items-center justify-center text-black shadow-xl cursor-pointer overflow-hidden group relative">
                {formData.clientAvatar ? <img src={formData.clientAvatar} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <Icons.User />}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Icons.Plus /></div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
             </div>
             <div>
                <h3 className="text-3xl font-black gold-text-gradient uppercase tracking-tighter">Perfil do Cliente</h3>
                <div className="flex items-center gap-3 mt-1">
                   <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.4em]">Personalização de Identidade Visual</span>
                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-amber-500 p-3 transition-all hover:rotate-90"><Icons.X /></button>
        </div>
        <div className="grid grid-cols-1 gap-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] ml-2 block">Nome Corporativo</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className={`w-full bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-6 outline-none focus:border-amber-500 transition-all font-black text-xl tracking-tight shadow-inner ${theme === 'light' ? 'text-slate-900 border-slate-300 bg-slate-50' : 'text-white'}`} placeholder="Nome da Empresa" />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] ml-2 block">WhatsApp / Telefone</label>
              <div className="flex gap-2">
                <input type="text" value={formData.clientPhone} onChange={(e) => setFormData({...formData, clientPhone: e.target.value})} className={`flex-1 bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-6 outline-none focus:border-amber-500 transition-all font-black text-xl tracking-tight shadow-inner ${theme === 'light' ? 'text-slate-900 border-slate-300 bg-slate-50' : 'text-white'}`} placeholder="Ex: 5511999999999" />
                <button onClick={openWhatsApp} className="p-6 gold-gradient text-black rounded-3xl hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all">
                  <Icons.Zap />
                </button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] ml-2 block">Valor do Contrato (R$)</label>
              <input type="number" value={formData.value} onChange={(e) => setFormData({...formData, value: Number(e.target.value)})} className={`w-full bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-6 outline-none focus:border-amber-500 transition-all font-black text-xl tracking-tight shadow-inner ${theme === 'light' ? 'text-slate-900 border-slate-300 bg-slate-50' : 'text-white'}`} placeholder="Valor em Reais" />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] ml-2 block">Status Neural</label>
              <div className="flex gap-4">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button 
                    key={key} 
                    onClick={() => setFormData({...formData, status: key as TaskStatus})} 
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border ${formData.status === key ? 'text-black shadow-lg scale-105' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                    style={{ backgroundColor: formData.status === key ? config.color : 'transparent', borderColor: formData.status === key ? config.color : undefined }}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] ml-2 block">Matriz Criativa (Ideia)</label>
              <textarea rows={5} value={formData.clientIdea} onChange={(e) => setFormData({...formData, clientIdea: e.target.value})} className={`w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] px-8 py-6 outline-none focus:border-amber-500 transition-all font-bold resize-none text-sm leading-relaxed ${theme === 'light' ? 'text-slate-900 border-slate-300 bg-slate-50' : 'text-white'}`} />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] ml-2 block">Pedido Formal (Demanda)</label>
              <textarea rows={5} value={formData.clientRequest} onChange={(e) => setFormData({...formData, clientRequest: e.target.value})} className={`w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] px-8 py-6 outline-none focus:border-amber-500 transition-all font-bold resize-none text-sm leading-relaxed ${theme === 'light' ? 'text-slate-900 border-slate-300 bg-slate-50' : 'text-white'}`} />
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] ml-2 block">Prioridade Estratégica</label>
            <div className="flex gap-4">
              {[TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL].map(p => (
                <button key={p} onClick={() => setFormData({...formData, priority: p})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border ${formData.priority === p ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_30px_rgba(212,175,55,0.4)] scale-105' : 'bg-white/5 border-white/10 text-slate-400 hover:border-amber-500/50'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="pt-8 flex gap-6">
            <button onClick={onClose} className={`flex-1 py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] border transition-all ${theme === 'light' ? 'border-slate-300 text-slate-500 hover:bg-slate-100' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>Cancelar</button>
            <button onClick={() => { onUpdate(formData); onClose(); }} className="flex-[2] gold-gradient text-black py-5 rounded-[2rem] font-black uppercase tracking-[0.4em] text-[11px] hover:shadow-[0_0_50px_rgba(212,175,55,0.5)] transition-all active:scale-[0.98]">Sincronizar Dados Supabase</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InsightsView: React.FC<{ board: Board; theme: 'dark' | 'light' }> = ({ board, theme }) => {
  const allTasks = useMemo(() => board.groups.flatMap(g => g.tasks || []), [board]);
  
  const metrics = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === TaskStatus.DONE).length;
    const working = allTasks.filter(t => t.status === TaskStatus.WORKING).length;
    const stopped = allTasks.filter(t => t.status === TaskStatus.STOPPED).length;
    const uniqueClients = new Set(allTasks.map(t => t.title)).size;
    const totalGains = allTasks.reduce((acc, t) => acc + (t.value || 0), 0);
    const avgValue = total > 0 ? totalGains / total : 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, working, stopped, uniqueClients, totalGains, avgValue, completionRate };
  }, [allTasks]);

  const priorityData = useMemo(() => [
    { name: 'Crítica', value: allTasks.filter(t => t.priority === TaskPriority.CRITICAL).reduce((a, t) => a + (t.value || 0), 0) },
    { name: 'Alta', value: allTasks.filter(t => t.priority === TaskPriority.HIGH).reduce((a, t) => a + (t.value || 0), 0) },
    { name: 'Média', value: allTasks.filter(t => t.priority === TaskPriority.MEDIUM).reduce((a, t) => a + (t.value || 0), 0) },
    { name: 'Baixa', value: allTasks.filter(t => t.priority === TaskPriority.LOW).reduce((a, t) => a + (t.value || 0), 0) },
  ], [allTasks]);

  const statusData = useMemo(() => [
    { name: 'Concluído', value: metrics.completed, color: STATUS_CONFIG[TaskStatus.DONE].color },
    { name: 'Em Andamento', value: metrics.working, color: STATUS_CONFIG[TaskStatus.WORKING].color },
    { name: 'Parado', value: metrics.stopped, color: STATUS_CONFIG[TaskStatus.STOPPED].color },
  ].filter(d => d.value > 0), [metrics]);

  const revenueFlowData = useMemo(() => {
    return allTasks
      .slice()
      .sort((a, b) => (a.id > b.id ? 1 : -1))
      .reduce((acc: any[], task, idx) => {
        const lastVal = acc.length > 0 ? acc[acc.length - 1].value : 0;
        acc.push({
          index: idx + 1,
          value: lastVal + (task.value || 0),
          label: task.title.slice(0, 10)
        });
        return acc;
      }, []);
  }, [allTasks]);

  return (
    <div className="flex-1 overflow-auto p-10 lg:p-14 custom-scrollbar bg-transparent">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-12">
        {[
          { label: 'CLIENTES ATIVOS', value: metrics.uniqueClients, icon: <Icons.User />, sub: 'Base Grupo Expandix' },
          { label: 'VALOR EM CONTRATOS', value: `R$ ${metrics.totalGains.toLocaleString()}`, icon: <Icons.Zap />, sub: 'Total Bruto' },
          { label: 'TICKET MÉDIO', value: `R$ ${metrics.avgValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <Icons.BarChart />, sub: 'Por Protocolo' },
          { label: 'TAXA DE ENTREGA', value: `${metrics.completionRate.toFixed(1)}%`, icon: <Icons.CheckCircle />, sub: 'Eficiência Neural' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 animate-entry border-white/5 hover:border-amber-500/30">
            <div className="absolute top-6 right-8 text-amber-500/20 group-hover:text-amber-500/40 transition-colors">
              {stat.icon}
            </div>
            <div className="text-3xl font-black mb-1 tracking-tighter gold-text-gradient">{stat.value}</div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{stat.label}</div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600 bg-white/5 px-3 py-1.5 rounded-full inline-block">
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 glass-card p-10 rounded-[3.5rem] min-h-[450px] flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black tracking-tighter uppercase flex items-center gap-4">
              <div className="w-2 h-8 bg-amber-500 rounded-full"></div> 
              Fluxo de Crescimento Neural
            </h3>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Acumulado por Protocolo</div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueFlowData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.2)', fontSize: '10px', color: '#fff' }}
                  itemStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-10 rounded-[3.5rem] flex flex-col">
          <h3 className="text-xl font-black tracking-tighter uppercase mb-10 text-center">Status da Operação</h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black gold-text-gradient">{metrics.total}</span>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Protocolos</span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {statusData.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item.name}</span>
                </div>
                <span className="text-[10px] font-black text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-12 rounded-[3.5rem] min-h-[400px]">
        <div className="flex items-center justify-between mb-12">
          <h3 className="text-xl font-black tracking-tighter uppercase flex items-center gap-4">
            <div className="w-2 h-8 bg-amber-500 rounded-full"></div> 
            Distribuição por Prioridade Estratégica
          </h3>
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Volume Financeiro (R$)</div>
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#64748b" 
                fontSize={10} 
                width={80}
                axisLine={false} 
                tickLine={false} 
                tick={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}
              />
              <Tooltip cursor={{ fill: 'rgba(212,175,55,0.05)' }} />
              <Bar dataKey="value" radius={[0, 20, 20, 0]} barSize={32}>
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#D4AF37' : '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const KanbanView: React.FC<{ 
  board: Board; 
  theme: 'dark' | 'light'; 
  onEditTask: (task: Task) => void;
  onUpdateTask: (groupId: string, taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (groupId: string, taskId: string) => void;
}> = ({ board, theme, onEditTask, onUpdateTask, onDeleteTask }) => {
  const allTasks = board.groups.flatMap(g => g.tasks || []);
  const [isOver, setIsOver] = useState<string | null>(null);
  
  const tasksByStatus = useMemo(() => {
    return {
      [TaskStatus.STOPPED]: allTasks.filter(t => t.status === TaskStatus.STOPPED),
      [TaskStatus.WORKING]: allTasks.filter(t => t.status === TaskStatus.WORKING),
      [TaskStatus.DONE]: allTasks.filter(t => t.status === TaskStatus.DONE),
    };
  }, [allTasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string, groupId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('groupId', groupId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setIsOver(status);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setIsOver(null);
    const taskId = e.dataTransfer.getData('taskId');
    const groupId = e.dataTransfer.getData('groupId');
    
    if (taskId && groupId) {
      onUpdateTask(groupId, taskId, { status: targetStatus });
    }
  };

  const openWhatsApp = (e: React.MouseEvent, phone?: string) => {
    e.stopPropagation();
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <div className="flex-1 overflow-x-auto p-14 flex gap-10 custom-scrollbar">
      {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
        <div 
          key={statusKey} 
          className={`flex-shrink-0 w-96 flex flex-col rounded-[3.5rem] transition-all duration-300 p-4 ${isOver === statusKey ? 'bg-amber-500/[0.03] scale-[1.01]' : ''}`}
          onDragOver={(e) => handleDragOver(e, statusKey)}
          onDragLeave={() => setIsOver(null)}
          onDrop={(e) => handleDrop(e, statusKey as TaskStatus)}
        >
          <div className="flex items-center justify-between mb-8 px-4">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-8 rounded-full" style={{ backgroundColor: config.color }}></div>
              <h3 className="text-xl font-black tracking-tighter uppercase">{config.label}</h3>
              <span className="text-slate-500 font-black text-sm ml-2">{(tasksByStatus as any)[statusKey]?.length || 0}</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-10 min-h-[500px]">
            {(tasksByStatus as any)[statusKey]?.map((task: Task) => (
              <div 
                key={task.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, task.id, task.groupId)}
                onClick={() => onEditTask(task)}
                className={`glass-card p-8 rounded-[2.5rem] cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all border border-white/5 hover:border-amber-500/30 group animate-entry shadow-xl relative`}
              >
                <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black text-amber-500 uppercase tracking-widest">
                  Arraste para Mover
                </div>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {task.clientAvatar ? (
                      <img src={task.clientAvatar} className="w-12 h-12 rounded-2xl object-cover border border-amber-500/20 shadow-md" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-amber-500 shadow-md">
                        <Icons.User />
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-tight text-white mb-0.5">{task.title}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Protocolo: {task.id.slice(0, 8)}</div>
                        {task.clientPhone && (
                          <button onClick={(e) => openWhatsApp(e, task.clientPhone)} className="text-emerald-500 hover:scale-125 transition-transform"><Icons.MessageSquare /></button>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteTask(task.groupId, task.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-500 transition-all z-10"
                  >
                    <Icons.Trash />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 line-clamp-2 leading-relaxed italic">
                    {task.clientIdea || "Nenhuma diretriz neural registrada."}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Contratual</span>
                      <span className="text-sm font-black text-amber-500 tracking-tight">R$ {task.value?.toLocaleString() || '0'}</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-500/20 text-amber-500`}>
                      {task.priority}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const Sidebar: React.FC<{ boards: Board[]; activeBoardId: string; setActiveBoardId: (id: string) => void; onOpenNewHub: () => void; onDeleteBoard: (id: string) => void; theme: 'dark' | 'light'; toggleTheme: () => void; currentUser: User; onOpenProfile: () => void; }> = ({ boards, activeBoardId, setActiveBoardId, onOpenNewHub, onDeleteBoard, theme, toggleTheme, currentUser, onOpenProfile }) => (
  <aside className={`w-80 h-full border-r flex flex-col z-20 transition-colors duration-300 ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#050505] border-white/10'}`}>
    <div className="p-10 border-b border-white/5">
      <div className="flex items-center gap-4">
        <BrandName className="text-xl" />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
      <div>
        <div className="flex justify-between items-center mb-6 px-2">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Hubs Estratégicos</span>
          <button onClick={onOpenNewHub} className="text-amber-500 hover:scale-110 transition-transform"><Icons.Plus /></button>
        </div>
        <div className="space-y-3">
          {boards.map(b => (
            <div key={b.id} className="group relative">
              <button onClick={() => setActiveBoardId(b.id)} className={`w-full text-left px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-4 pr-12 ${activeBoardId === b.id ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${activeBoardId === b.id ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
                <span className="truncate">{b.name}</span>
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onDeleteBoard(b.id); 
                }} 
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-500 transition-all z-30"
                title="Desativar Hub"
              >
                <Icons.Trash />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="p-8 border-t border-white/5 space-y-6">
      <div 
        onClick={onOpenProfile} 
        className="flex items-center gap-5 p-4 rounded-3xl cursor-pointer hover:bg-white/5 transition-all group border border-transparent hover:border-amber-500/20 relative overflow-hidden"
      >
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Icons.Settings />
        </div>
        <img src={currentUser.avatar} className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-amber-500/10" alt="Avatar" />
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-tighter truncate text-white">{currentUser.name}</div>
          <div className="text-[8px] text-amber-500 font-black uppercase tracking-widest opacity-60">Status: Gestor Neural</div>
        </div>
      </div>
    </div>
  </aside>
);

const ListView: React.FC<{ board: Board; theme: 'dark' | 'light'; onUpdateTask: (groupId: string, taskId: string, updates: Partial<Task>) => void; onAddTask: (groupId: string) => void; onEditTask: (task: Task) => void; onDeleteTask: (groupId: string, taskId: string) => void; }> = ({ board, theme, onUpdateTask, onAddTask, onEditTask, onDeleteTask }) => {
  const handleStatusCycle = (e: React.MouseEvent, groupId: string, task: Task) => {
    e.stopPropagation();
    const statuses = [TaskStatus.STOPPED, TaskStatus.WORKING, TaskStatus.DONE];
    const currentIndex = statuses.indexOf(task.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    onUpdateTask(groupId, task.id, { status: nextStatus });
  };

  const openWhatsApp = (e: React.MouseEvent, phone?: string) => {
    e.stopPropagation();
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <div className="flex-1 overflow-auto p-14 custom-scrollbar">
      {board.groups?.map((group) => (
        <div key={group.id} className="mb-16 last:mb-0">
          <div className="flex items-center justify-between mb-8 group/header">
            <div className="flex items-center gap-6">
              <div className="w-2 h-10 rounded-full" style={{ backgroundColor: group.color }}></div>
              <h3 className="text-2xl font-black tracking-tighter uppercase">{group.name}</h3>
            </div>
            <button onClick={() => onAddTask(group.id)} className="flex items-center gap-3 text-amber-500 hover:text-amber-600 transition-all text-[10px] font-black uppercase tracking-[0.3em] opacity-0 group-hover/header:opacity-100"><Icons.Plus /> Novo Registro</button>
          </div>
          <div className={`rounded-[3rem] border transition-all ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-black/40 border-white/5'}`}>
            <div className="divide-y divide-white/5">
              {group.tasks?.map((task) => {
                const statusInfo = STATUS_CONFIG[task.status as TaskStatus] || STATUS_CONFIG[TaskStatus.STOPPED];
                return (
                  <div key={task.id} className="grid grid-cols-12 gap-8 px-10 py-8 hover:bg-amber-500/[0.02] transition-colors group/row items-center cursor-pointer" onClick={() => onEditTask(task)}>
                    <div className="col-span-6 flex items-center gap-5">
                      {task.clientAvatar ? <img src={task.clientAvatar} className="w-12 h-12 rounded-xl object-cover border border-amber-500/20" /> : <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-amber-500"><Icons.User /></div>}
                      <div>
                          <div className="font-black uppercase tracking-tight mb-1">{task.title}</div>
                          <div className="text-[10px] text-slate-500 font-bold line-clamp-1">{task.clientIdea || "Sem descrição"}</div>
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button 
                        onClick={(e) => handleStatusCycle(e, group.id, task)}
                        className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:brightness-110 active:scale-95 text-black min-w-[120px] shadow-lg"
                        style={{ backgroundColor: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </button>
                    </div>
                    <div className="col-span-2 text-right font-black text-sm tracking-tight text-white">R$ {task.value?.toLocaleString() || '0'}</div>
                    <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => openWhatsApp(e, task.clientPhone)} 
                        className={`p-2 transition-all ${task.clientPhone ? 'text-emerald-500 hover:scale-110' : 'text-slate-700 opacity-20 cursor-not-allowed'}`}
                        title={task.clientPhone ? "Enviar WhatsApp" : "Número não cadastrado"}
                      >
                        <Icons.MessageSquare />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); exportTaskToPDF(task); }} className="text-slate-500 hover:text-amber-500 p-2"><Icons.FileText /></button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteTask(group.id, task.id); }} className="text-slate-500 hover:text-rose-500 p-2"><Icons.Trash /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => onAddTask(group.id)} className="w-full py-6 flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-amber-500 transition-all border-t border-white/5"><Icons.Plus /> Adicionar Protocolo</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [viewType, setViewType] = useState<BoardViewType>(BoardViewType.LIST);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USER);

  // Estados para deleção com confirmação (Tarefa e Hub)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ groupId: string, taskId: string, title: string } | null>(null);
  const [hubToDeleteId, setHubToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Busca Usuário 1 (Gestor) no Híbrido (Cache + Supabase)
        const dbUser = await supabaseService.fetchUser('1');
        if (dbUser) setCurrentUser(dbUser);

        // Busca Quadros
        const data = await supabaseService.fetchBoards();
        setBoards(data);
        if (data.length > 0) setActiveBoardId(data[0].id);
      } catch (err: any) {
        console.error("Initialization error:", err);
        const errorMessage = err?.message || String(err) || "Falha desconhecida no carregamento.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);

  const handleUpdateUser = async (updates: Partial<User>) => {
    const newUser = { ...currentUser, ...updates };
    setCurrentUser(newUser); // Atualiza o estado local imediatamente (UI Snappy)

    try {
      await supabaseService.upsertUser(newUser);
    } catch (err: any) {
      console.warn("Sincronização Cloud falhou, mas perfil salvo localmente:", err.message);
      // Não exibimos erro fatal para o usuário pois salvou no localStorage
    }
  };

  const handleUpdateTask = async (groupId: string, taskId: string, updates: Partial<Task>) => {
    setBoards(prev => prev.map(board => ({
      ...board,
      groups: board.groups.map(g => g.id === groupId ? { ...g, tasks: g.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) } : g)
    })));
    const board = boards.find(b => b.id === activeBoardId);
    const group = board?.groups.find(g => g.id === groupId);
    const task = group?.tasks.find(t => t.id === taskId);
    if (task) {
      try {
        await supabaseService.upsertTask({ ...task, ...updates });
      } catch (err: any) {
        const errorMessage = err?.message || String(err);
        setError(errorMessage);
      }
    }
  };

  const handleAddTask = async (groupId: string) => {
    const newTask: Task = { id: crypto.randomUUID(), title: 'Novo Registro', description: '', status: TaskStatus.STOPPED, priority: TaskPriority.MEDIUM, ownerId: currentUser.id, groupId: groupId, value: 0, comments: [] };
    setBoards(prev => prev.map(board => board.id === activeBoardId ? { ...board, groups: board.groups.map(g => g.id === groupId ? { ...g, tasks: [...g.tasks, newTask] } : g) } : board));
    try {
      await supabaseService.upsertTask(newTask);
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      setError(errorMessage);
    }
  };

  // Intercepta o clique de deletar para mostrar o modal
  const triggerDeleteConfirmation = (groupId: string, taskId: string) => {
    const board = boards.find(b => b.id === activeBoardId);
    const group = board?.groups.find(g => g.id === groupId);
    const task = group?.tasks.find(t => t.id === taskId);
    if (task) {
      setTaskToDelete({ groupId, taskId, title: task.title });
      setIsDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (hubToDeleteId) {
      const id = hubToDeleteId;
      const nextBoards = boards.filter(b => b.id !== id);
      setBoards(nextBoards);
      
      // Se deletou o hub ativo, redireciona
      if (activeBoardId === id) {
        setActiveBoardId(nextBoards.length > 0 ? nextBoards[0].id : '');
      }

      try {
        await supabaseService.deleteBoard(id);
      } catch (err: any) {
        const errorMessage = err?.message || String(err);
        setError(errorMessage);
      } finally {
        setHubToDeleteId(null);
        setIsDeleteModalOpen(false);
      }
      return;
    }

    if (!taskToDelete) return;
    const { groupId, taskId } = taskToDelete;
    
    setBoards(prev => prev.map(board => ({ ...board, groups: board.groups.map(g => g.id === groupId ? { ...g, tasks: g.tasks.filter(t => t.id !== taskId) } : g) })));
    
    try {
      await supabaseService.deleteTask(taskId);
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      setError(errorMessage);
    } finally {
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleCreateHub = async (company: string, serviceName: string) => {
    const newBoardId = crypto.randomUUID();
    const defaultGroupId = crypto.randomUUID();
    const newBoard: Board = { id: newBoardId, name: `${company} | ${serviceName}`, description: `Operação estratégica para ${company}`, groups: [{ id: defaultGroupId, name: 'Ativos', color: '#D4AF37', tasks: [] }], automations: [], members: [currentUser.id] };
    setBoards(prev => [...prev, newBoard]);
    setActiveBoardId(newBoardId);
    try {
      await supabaseService.upsertBoard(newBoard);
      await supabaseService.upsertGroup({ id: defaultGroupId, board_id: newBoardId, name: 'Ativos', color: '#D4AF37' });
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      setError(errorMessage);
    }
    setIsModalOpen(false);
  };

  const triggerDeleteBoardConfirmation = (id: string) => {
    setHubToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  if (isLoading) return <div className="h-screen w-screen bg-black flex items-center justify-center font-black gold-text-gradient animate-pulse text-2xl tracking-[0.5em]">CARREGANDO GRUPO EXPANDIX...</div>;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      <Sidebar 
        boards={boards} 
        activeBoardId={activeBoardId} 
        setActiveBoardId={setActiveBoardId} 
        onOpenNewHub={() => setIsModalOpen(true)} 
        onDeleteBoard={triggerDeleteBoardConfirmation} 
        theme={theme} 
        toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
        currentUser={currentUser} 
        onOpenProfile={() => setIsProfileModalOpen(true)} 
      />
      <main className="flex-1 flex flex-col relative bg-transparent">
        {activeBoard ? (
          <>
            <header className="h-24 border-b px-14 flex items-center justify-between border-white/10">
              <div><h2 className="text-3xl font-black uppercase tracking-tighter">{activeBoard.name}</h2></div>
              <div className="flex items-center gap-3"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live Supabase Sync</span></div>
            </header>
            <div className="px-14 border-b border-white/5 flex gap-10">
              {[BoardViewType.LIST, BoardViewType.KANBAN, BoardViewType.INSIGHTS].map(v => (
                <button 
                  key={v} 
                  onClick={() => setViewType(v)} 
                  className={`py-6 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all ${viewType === v ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            {viewType === BoardViewType.LIST && (
              <ListView 
                board={activeBoard} 
                theme={theme} 
                onAddTask={handleAddTask} 
                onUpdateTask={handleUpdateTask} 
                onEditTask={(t) => { setSelectedTask(t); setIsTaskEditModalOpen(true); }} 
                onDeleteTask={triggerDeleteConfirmation} 
              />
            )}
            {viewType === BoardViewType.KANBAN && (
              <KanbanView 
                board={activeBoard} 
                theme={theme} 
                onEditTask={(t) => { setSelectedTask(t); setIsTaskEditModalOpen(true); }} 
                onUpdateTask={handleUpdateTask}
                onDeleteTask={triggerDeleteConfirmation}
              />
            )}
            {viewType === BoardViewType.INSIGHTS && <InsightsView board={activeBoard} theme={theme} />}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 font-black uppercase tracking-[0.5em]">Nenhum Hub Ativo</div>
        )}
      </main>
      
      <NewHubModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateHub} theme={theme} />
      
      {selectedTask && <ClientTaskCard isOpen={isTaskEditModalOpen} onClose={() => setIsTaskEditModalOpen(false)} task={selectedTask} onUpdate={(u) => handleUpdateTask(selectedTask.groupId, selectedTask.id, u)} theme={theme} />}
      
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        user={currentUser} 
        onUpdate={handleUpdateUser} 
        theme={theme} 
      />

      <ConfirmDeleteModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
          setHubToDeleteId(null);
        }} 
        onConfirm={handleConfirmDelete} 
        title={hubToDeleteId ? (boards.find(b => b.id === hubToDeleteId)?.name || "") : (taskToDelete?.title || "")} 
        type={hubToDeleteId ? 'hub' : 'task'}
      />
      
      {error && (
        <div className="fixed bottom-10 right-10 z-[500] bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-2xl animate-bounce flex items-center gap-4">
          <Icons.X /> {error}
          <button onClick={() => setError(null)} className="ml-4 opacity-50 hover:opacity-100">Fechar</button>
        </div>
      )}
    </div>
  );
}

const NewHubModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (c: string, s: string) => void; theme: any }> = ({ isOpen, onClose, onSubmit, theme }) => {
  const [c, setC] = useState('');
  const [s, setS] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4">
      <div className="glass-card p-12 rounded-[4rem] w-full max-w-xl">
        <h3 className="text-3xl font-black mb-10 gold-text-gradient uppercase">Ativar Novo Hub</h3>
        <input placeholder="Empresa" value={c} onChange={e => setC(e.target.value)} className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl mb-6 font-bold" />
        <input placeholder="Serviço" value={s} onChange={e => setS(e.target.value)} className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl mb-10 font-bold" />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 p-5 rounded-3xl font-black uppercase text-[10px] border border-white/10">Cancelar</button>
          <button onClick={() => onSubmit(c, s)} className="flex-1 gold-gradient p-5 rounded-3xl font-black uppercase text-[10px] text-black">Inicializar</button>
        </div>
      </div>
    </div>
  );
};
