
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Board, BoardViewType, Task, TaskGroup, TaskStatus, TaskPriority, User } from './types';
import { Icons } from './components/Icons';
import { geminiService } from './services/geminiService';
import { supabaseService } from './services/supabaseService';

const GoldGradientText = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <span className={`gold-text-gradient font-black uppercase tracking-tighter-neural ${className}`}>
    {children}
  </span>
);

const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const style = status === TaskStatus.DONE ? 'status-glow-done' : 
                status === TaskStatus.WORKING ? 'status-glow-working' : 
                'status-glow-stopped';
  
  return (
    <div className={`w-40 text-[9px] font-black px-4 py-2.5 rounded-full border uppercase text-center transition-all duration-700 ${style} tracking-neural`}>
      {status}
    </div>
  );
};

export default function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [viewType, setViewType] = useState<BoardViewType>(BoardViewType.LIST);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isNewTask, setIsNewTask] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [rlsError, setRlsError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeGroupMenuId, setActiveGroupMenuId] = useState<string | null>(null);
  const [activeBoardMenuId, setActiveBoardMenuId] = useState<string | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [tempBoardName, setTempBoardName] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const boardsData = await supabaseService.fetchBoards();
    const userData = await supabaseService.fetchUserProfile();
    setBoards(boardsData);
    setCurrentUser(userData);
    if (boardsData.length > 0) {
      const lastActive = localStorage.getItem('last_active_board');
      setActiveBoardId(lastActive && boardsData.find(b => b.id === lastActive) ? lastActive : boardsData[0].id);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
      setIsLoading(false);
    };
    init();

    const handleRLSError = (e: any) => {
      setRlsError(e.detail.message);
    };

    window.addEventListener('supabase-rls-error', handleRLSError);
    const handleClickOutside = () => {
      setActiveMenuId(null);
      setActiveGroupMenuId(null);
      setActiveBoardMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('supabase-rls-error', handleRLSError);
    };
  }, []);

  const handleRetryConnection = async () => {
    setIsValidating(true);
    // Pequeno delay para efeito visual de "escaneamento neural"
    await new Promise(r => setTimeout(r, 1500));
    
    try {
      // Tenta buscar os dados novamente. Se falhar, o handleRLSError será disparado de novo.
      const boardsData = await supabaseService.fetchBoards();
      if (boardsData && !boardsData.some(b => false)) { // Verificação simples
        setRlsError(null);
        setBoards(boardsData);
        if (boardsData.length > 0 && !activeBoardId) {
          setActiveBoardId(boardsData[0].id);
        }
      }
    } catch (e) {
      console.error("Re-tentativa falhou");
    } finally {
      setIsValidating(false);
    }
  };

  const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);
  const allTasks = useMemo(() => activeBoard?.groups.flatMap(g => g.tasks) || [], [activeBoard]);

  const insightsMetrics = useMemo(() => {
    const totalCapital = allTasks.reduce((acc, t) => acc + (t.value || 0), 0);
    const activeContracts = allTasks.filter(t => t.status === TaskStatus.WORKING).length;
    const avgTicket = allTasks.length > 0 ? totalCapital / allTasks.length : 0;
    const monthlyForecast = allTasks
      .filter(t => t.status === TaskStatus.WORKING)
      .reduce((acc, t) => acc + (t.value || 0), 0);

    return { totalCapital, activeContracts, avgTicket, monthlyForecast };
  }, [allTasks]);

  const persist = (newBoards: Board[]) => {
    setBoards(newBoards);
    supabaseService.saveBoardsLocally(newBoards);
  };

  const handleStartCreateBoard = () => {
    setTempBoardName('');
    setIsCreatingBoard(true);
    setRenamingBoardId(null);
  };

  const handleFinishCreateBoard = async () => {
    if (!tempBoardName.trim()) {
      setIsCreatingBoard(false);
      return;
    }
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      name: tempBoardName.trim(),
      description: 'Gestão de alta performance Expandix.',
      members: [currentUser?.id || '1'],
      automations: [],
      groups: [{ id: `g-${Date.now()}`, name: 'Operações Ativas', color: '#D4AF37', tasks: [] }]
    };

    const updated = [...boards, newBoard];
    persist(updated);
    setActiveBoardId(newBoard.id);
    setIsCreatingBoard(false);

    await supabaseService.saveBoard(newBoard);
    for (const g of newBoard.groups) {
      await supabaseService.saveGroup(g.id, newBoard.id, g);
    }
  };

  const handleStartRename = (board: Board) => {
    setRenamingBoardId(board.id);
    setTempBoardName(board.name);
    setActiveBoardMenuId(null);
    setIsCreatingBoard(false);
  };

  const handleFinishRename = async (boardId: string) => {
    if (!tempBoardName.trim()) {
      setRenamingBoardId(null);
      return;
    }
    const board = boards.find(b => b.id === boardId);
    if (board) {
      const updatedBoard = { ...board, name: tempBoardName.trim() };
      const updated = boards.map(b => b.id === boardId ? updatedBoard : b);
      persist(updated);
      await supabaseService.saveBoard(updatedBoard);
    }
    setRenamingBoardId(null);
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!window.confirm("Deseja realmente excluir este Hub Estratégico?")) return;
    const updated = boards.filter(b => b.id !== boardId);
    persist(updated);
    if (activeBoardId === boardId) {
      setActiveBoardId(updated[0]?.id || '');
    }
    setActiveBoardMenuId(null);
    await supabaseService.deleteBoard(boardId);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta fase e todos os seus trabalhos? Esta ação não pode ser desfeita.")) return;
    const updated = boards.map(b => b.id === activeBoardId ? {
      ...b,
      groups: b.groups.filter(g => g.id !== groupId)
    } : b);
    persist(updated);
    setActiveGroupMenuId(null);
    await supabaseService.deleteGroup(groupId);
  };

  const handleAddTask = (groupId?: string, status?: TaskStatus) => {
    const targetGroupId = groupId || activeBoard?.groups[0]?.id || `g-${Date.now()}`;
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: '',
      description: '',
      clientName: '',
      clientPhone: '',
      clientAvatar: '',
      status: status || TaskStatus.STOPPED,
      priority: TaskPriority.MEDIUM,
      ownerId: currentUser?.id || '1',
      groupId: targetGroupId,
      comments: [],
      value: 0
    };

    setIsNewTask(true);
    setEditingTask(newTask);
  };

  const handleSaveTask = async (task: Task) => {
    if (!task.title.trim() || !task.clientName.trim()) {
      alert("Por favor, preencha pelo menos o Identificador da Op e o Titular.");
      return;
    }

    let updatedBoards: Board[];
    if (isNewTask) {
      updatedBoards = boards.map(b => b.id === activeBoardId ? {
        ...b,
        groups: b.groups.map(g => g.id === task.groupId ? { ...g, tasks: [task, ...g.tasks] } : g)
      } : b);
    } else {
      updatedBoards = boards.map(b => b.id === activeBoardId ? {
        ...b,
        groups: b.groups.map(g => ({
          ...g,
          tasks: g.tasks.map(t => t.id === task.id ? task : t)
        }))
      } : b);
    }

    persist(updatedBoards);
    setEditingTask(null);
    setIsNewTask(false);
    await supabaseService.saveTask(task);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId') || draggedTaskId;
    setDropTargetStatus(null);
    setDraggedTaskId(null);

    if (!taskId) return;

    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = { ...task, status: newStatus };
      const updated = boards.map(b => b.id === activeBoardId ? {
        ...b,
        groups: b.groups.map(g => ({
          ...g,
          tasks: g.tasks.map(t => t.id === taskId ? updatedTask : t)
        }))
      } : b);
      persist(updated);
      await supabaseService.saveTask(updatedTask);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDropTargetStatus(status);
  };

  const handleDragLeave = () => {
    setDropTargetStatus(null);
  };

  const handleWhatsapp = (phone?: string) => {
    if (!phone) return alert("WhatsApp não definido nesta ficha.");
    const cleanNumber = phone.replace(/\D/g, '');
    if (!cleanNumber) return alert("O número de telefone informado é inválido.");
    let finalNumber = cleanNumber;
    if (cleanNumber.length === 10 || cleanNumber.length === 11) {
      finalNumber = `55${cleanNumber}`;
    }
    window.open(`https://api.whatsapp.com/send?phone=${finalNumber}`, '_blank');
  };

  const handleExportPdf = (task: Task) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Ficha Técnica - ${task.clientName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&display=swap');
            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 60px; color: #111; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 3px solid #D4AF37; padding-bottom: 30px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center; }
            .brand { font-weight: 800; font-size: 32px; color: #D4AF37; text-transform: uppercase; letter-spacing: 3px; }
            .main-content { display: flex; gap: 40px; margin-bottom: 40px; }
            .avatar-container { width: 180px; height: 180px; border-radius: 20px; border: 2px solid #D4AF37; overflow: hidden; background: #f8f8f8; flex-shrink: 0; }
            .avatar-img { width: 100%; height: 100%; object-fit: cover; }
            .info-container { flex-grow: 1; }
            .section { margin-bottom: 25px; }
            .label { font-weight: 800; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 5px; }
            .value { font-weight: 700; font-size: 18px; color: #111; }
            .status { display: inline-block; padding: 6px 18px; border-radius: 6px; background: #000; color: #D4AF37; font-weight: 800; text-transform: uppercase; font-size: 11px; }
            .signatures { margin-top: 80px; display: flex; justify-content: space-between; gap: 50px; }
            .sig-box { flex: 1; text-align: center; }
            .sig-line { border-top: 1px solid #111; margin-bottom: 10px; }
            .sig-label { font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; }
            @media print { body { padding: 40px; } }
          </style>
        </head>
        <body>
          <div class="header"><div class="brand">GRUPO EXPANDIX</div><div style="font-size: 11px; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 2px;">Documento Técnico Neural</div></div>
          <div class="main-content">
            <div class="avatar-container">${task.clientAvatar ? `<img src="${task.clientAvatar}" class="avatar-img" />` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ccc;font-weight:800;">SEM BIOMETRIA</div>'}</div>
            <div class="info-container">
              <div class="section"><span class="label">Operação</span><span class="value">${task.title}</span></div>
              <div class="section"><span class="label">Titular / Cliente</span><span class="value">${task.clientName || 'N/A'}</span></div>
              <div class="section"><span class="label">Canal Neural (WhatsApp)</span><span class="value">${task.clientPhone || 'N/A'}</span></div>
            </div>
          </div>
          <div class="section"><span class="label">Status Operacional</span><div class="status">${task.status}</div></div>
          <div class="section"><span class="label">Capital Alocado / Budget</span><span class="value" style="color: #D4AF37; font-size: 24px;">R$ ${task.value?.toLocaleString() || '0,00'}</span></div>
          <div class="signatures"><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Assinatura do Cliente</div></div><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Assinatura Grupo Expandix</div></div></div>
          <div style="margin-top: 60px; text-align: center; color: #aaa; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Este documento é de caráter sigiloso e exclusivo do ecossistema Expandix Neural.</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.onafterprint = () => window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTask) return;
    const reader = new FileReader();
    reader.onloadend = () => setEditingTask({ ...editingTask, clientAvatar: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleProfileAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const reader = new FileReader();
    reader.onloadend = () => setCurrentUser({ ...currentUser, avatar: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    await supabaseService.updateUserProfile(currentUser);
    setShowProfileModal(false);
  };

  const handleAIAssistant = async () => {
    if (!activeBoard) return;
    const activityList = activeBoard.groups.flatMap(g => g.tasks.map(t => `${t.title} em fase ${g.name} com status ${t.status}`));
    if (activityList.length === 0) return alert("Sem dados suficientes para análise neural.");
    
    alert("Iniciando Análise Neural Expandix...");
    const summary = await geminiService.summarizeActivity(activityList);
    alert(summary);
  };

  if (isLoading) return null;

  return (
    <div className="flex h-screen w-screen bg-[#000000] text-white overflow-hidden selection:bg-amber-500/30">
      <aside className="w-80 h-full bg-[#050505] border-r border-white/5 flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-50">
        <div className="p-12 mb-4">
          <GoldGradientText className="text-3xl">Expandix</GoldGradientText>
          <div className="text-[8px] text-slate-500 font-black tracking-[0.6em] mt-2 uppercase">Neural Core OS</div>
        </div>

        <nav className="flex-1 px-6 space-y-6 overflow-y-auto scrollbar-hide">
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] px-4 mb-4">Strategic Hubs</div>
          
          <div className="space-y-4">
            {boards.map(b => (
              <div key={b.id} className="relative group">
                {renamingBoardId === b.id ? (
                  <div className="px-2">
                    <input 
                      autoFocus
                      type="text"
                      value={tempBoardName}
                      onChange={(e) => setTempBoardName(e.target.value)}
                      onBlur={() => handleFinishRename(b.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFinishRename(b.id)}
                      className="w-full bg-[#111] border border-amber-500/50 p-5 rounded-2xl text-[11px] font-bold uppercase text-amber-500 outline-none shadow-[0_0_20px_rgba(212,175,55,0.05)]"
                    />
                  </div>
                ) : (
                  <div className="px-2">
                    <button 
                      onClick={() => setActiveBoardId(b.id)}
                      className={`w-full text-left p-6 rounded-[32px] transition-all duration-500 flex items-center justify-between border ${activeBoardId === b.id ? 'bg-[#0f0e0a] border-amber-500/40 text-amber-400 sidebar-active-glow' : 'border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-300'}`}
                    >
                      <span className="text-[11px] font-black uppercase truncate pr-8 tracking-wider">{b.name}</span>
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={(e) => { e.stopPropagation(); setActiveBoardMenuId(activeBoardMenuId === b.id ? null : b.id); }}
                          className={`p-2 transition-all cursor-pointer ${activeBoardId === b.id || activeBoardMenuId === b.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          <Icons.More />
                        </div>
                        {activeBoardId === b.id && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_15px_#D4AF37]" />}
                      </div>
                    </button>

                    {activeBoardMenuId === b.id && (
                      <div className="absolute right-4 top-full mt-2 w-52 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] py-4 z-[100] animate-neural-entry" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleStartRename(b)} className="w-full text-left px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all">Renomear Hub</button>
                        <button onClick={() => handleDeleteBoard(b.id)} className="w-full text-left px-8 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all">Excluir Hub</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isCreatingBoard && (
              <div className="px-2 py-2 animate-neural-entry">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Nome do Hub..."
                  value={tempBoardName}
                  onChange={(e) => setTempBoardName(e.target.value)}
                  onBlur={handleFinishCreateBoard}
                  onKeyDown={(e) => e.key === 'Enter' && handleFinishCreateBoard()}
                  className="w-full bg-[#111] border border-amber-500/50 p-5 rounded-3xl text-[11px] font-bold uppercase text-amber-500 outline-none shadow-[0_0_20px_rgba(212,175,55,0.05)] placeholder:text-amber-500/20"
                />
              </div>
            )}
          </div>

          {!isCreatingBoard && (
            <button onClick={handleStartCreateBoard} className="mx-2 flex items-center justify-center gap-4 p-6 text-[9px] font-black text-slate-600 hover:text-amber-500 transition-all uppercase tracking-[0.4em] mt-8 border border-dashed border-white/10 rounded-[32px] hover:border-amber-500/30 hover:bg-amber-500/5">
              <Icons.Plus /> Novo Hub
            </button>
          )}
        </nav>

        <div className="p-10 border-t border-white/5 bg-black/40 group/profile relative">
          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-5 w-full text-left hover:bg-white/[0.02] p-2 rounded-2xl transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600/30 to-black border border-amber-500/30 flex items-center justify-center text-[12px] font-black text-amber-500 shadow-[0_0_20px_rgba(212,175,55,0.1)] overflow-hidden">
              {currentUser?.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" /> : 'EX'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-white truncate">{currentUser?.name || 'Diretor'}</div>
              <div className="text-[8px] text-slate-600 font-bold uppercase mt-1 tracking-widest">Neural Link Active</div>
            </div>
            <div className="text-slate-600 opacity-0 group-hover/profile:opacity-100 transition-opacity">
              <Icons.Settings />
            </div>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[#000000] relative">
        {activeBoard ? (
          <>
            <header className="h-32 border-b border-white/5 px-20 flex items-center justify-between bg-black/40 backdrop-blur-3xl z-20">
              <div className="animate-neural-entry">
                <h1 className="text-4xl font-black uppercase tracking-tighter-neural leading-none">{activeBoard.name}</h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">{activeBoard.description}</p>
              </div>
              <div className="flex gap-6">
                <button onClick={() => handleAddTask()} className="bg-white text-black min-w-[180px] px-12 py-6 rounded-[40px] hover:bg-amber-500 hover:text-white transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center gap-4 animate-neural-entry">
                  <span className="text-2xl leading-none -mt-1">+</span>
                  <span className="text-[11px] font-black uppercase tracking-widest">Nova Operação</span>
                </button>
              </div>
            </header>

            <div className="px-20 border-b border-white/5 flex gap-16 bg-black/10">
              {Object.values(BoardViewType).map(v => (
                <button 
                  key={v} 
                  onClick={() => setViewType(v)} 
                  className={`py-10 text-[11px] font-black uppercase tracking-[0.3em] border-b-2 transition-all relative ${viewType === v ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-600 hover:text-slate-400'}`}
                >
                  {v}
                  {viewType === v && <div className="absolute inset-x-0 bottom-0 h-12 bg-amber-500/5 blur-3xl" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-20 scrollbar-hide">
              <div className="max-w-[1600px] mx-auto h-full">
                
                {viewType === BoardViewType.LIST && (
                  <div className="space-y-12">
                    {activeBoard.groups.map((group, gIdx) => (
                      <div key={group.id} className="animate-neural-entry" style={{ animationDelay: `${gIdx * 150}ms` }}>
                        <div className="mb-8 flex items-center justify-between px-6">
                          <div className="flex items-center gap-6">
                            <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: group.color, color: group.color }} />
                            <h3 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-500">{group.name}</h3>
                            <div className="h-4 w-px bg-white/10 mx-2" />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{group.tasks.length} Entradas Registradas</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => handleDeleteGroup(group.id)} 
                              title="Excluir Fase"
                              className="p-3 text-slate-700 hover:text-rose-500 transition-all"
                            >
                              <Icons.Trash />
                            </button>
                            <div className="relative">
                              <button onClick={(e) => { e.stopPropagation(); setActiveGroupMenuId(activeGroupMenuId === group.id ? null : group.id); }} className="p-3 hover:bg-white/5 text-slate-600 hover:text-white rounded-2xl transition-all"><Icons.More /></button>
                              {activeGroupMenuId === group.id && (
                                <div className="absolute right-0 top-full mt-3 w-60 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] py-5 z-[60] animate-neural-entry" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => handleDeleteGroup(group.id)} className="w-full text-left px-8 py-4 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all">Excluir Fase Completa</button>
                                  <button onClick={() => handleAddTask(group.id)} className="w-full text-left px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all">Adicionar Trabalho</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-5">
                          {group.tasks.map((task, tIdx) => (
                            <div 
                              key={task.id} 
                              onClick={() => { setEditingTask(task); setIsNewTask(false); }}
                              className={`flex items-center px-12 py-8 glass-card rounded-[40px] transition-all group cursor-pointer animate-neural-entry ${activeMenuId === task.id ? 'z-[70] relative' : 'relative'}`}
                              style={{ animationDelay: `${(gIdx * 150) + (tIdx * 80)}ms` }}
                            >
                              <div className="flex items-center gap-10 flex-1">
                                <div className="w-16 h-16 rounded-[24px] bg-black border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-2xl">
                                  {task.clientAvatar ? <img src={task.clientAvatar} className="w-full h-full object-cover" /> : <div className="text-[14px] font-black text-slate-700 uppercase">{task.clientName?.slice(0, 2)}</div>}
                                </div>
                                <div>
                                  <div className="text-[16px] font-black uppercase tracking-tight group-hover:text-amber-400 transition-colors">{task.title}</div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase mt-2 tracking-[0.3em]">{task.clientName}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-16">
                                <StatusBadge status={task.status} />
                                <div className="w-36 text-[18px] font-black text-slate-400 text-right font-mono">R$ {task.value?.toLocaleString() || '0,00'}</div>
                                <div className="flex gap-5 items-center">
                                  <button onClick={(e) => { e.stopPropagation(); handleWhatsapp(task.clientPhone); }} className="p-4 whatsapp-btn-vibrant rounded-2xl shadow-xl"><Icons.Whatsapp /></button>
                                  <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id); }} className="p-4 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl transition-all"><Icons.More /></button>
                                    {activeMenuId === task.id && (
                                      <div className="absolute right-0 top-full mt-3 w-60 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] py-5 z-[80] animate-neural-entry" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={(e) => { e.stopPropagation(); handleExportPdf(task); setActiveMenuId(null); }} className="w-full text-left px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all">Exportar PDF</button>
                                        <button onClick={() => { setEditingTask(task); setIsNewTask(false); setActiveMenuId(null); }} className="w-full text-left px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all">Editar Ficha</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => handleAddTask(group.id)} 
                            className="w-full py-4 border border-dashed border-white/5 rounded-[32px] text-[10px] font-black uppercase tracking-widest text-slate-800 hover:text-amber-500 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all"
                          >
                            + Adicionar Trabalho à Fase
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {viewType === BoardViewType.KANBAN && (
                  <div className="grid grid-cols-3 gap-12 h-full">
                    {Object.values(TaskStatus).map((status, sIdx) => {
                      const tasksInStatus = allTasks.filter(t => t.status === status);
                      const isOver = dropTargetStatus === status;
                      
                      return (
                        <div 
                          key={status} 
                          className={`flex flex-col transition-all duration-700 rounded-[60px] p-6 ${isOver ? 'bg-amber-500/[0.03] ring-1 ring-amber-500/20' : 'bg-transparent'}`}
                          onDragOver={(e) => handleDragOver(e, status)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, status)}
                        >
                          <div className="mb-10 flex items-center justify-between px-6">
                             <div className="flex items-center gap-4">
                               <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] ${status === TaskStatus.DONE ? 'bg-emerald-500 text-emerald-500' : status === TaskStatus.WORKING ? 'bg-amber-500 text-amber-500' : 'bg-rose-500 text-rose-500'}`} />
                               <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500">{status}</h3>
                               <span className="text-[10px] font-mono text-slate-800 font-black">{tasksInStatus.length}</span>
                             </div>
                             <button onClick={() => handleAddTask(undefined, status)} className="p-3 hover:bg-white/5 text-slate-700 rounded-xl transition-all"><Icons.Plus /></button>
                          </div>
                          
                          <div className="flex-1 space-y-6 overflow-y-auto pr-3 scrollbar-hide min-h-[400px]">
                            {tasksInStatus.map((task, tIdx) => (
                              <div 
                                key={task.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onClick={() => { setEditingTask(task); setIsNewTask(false); }}
                                className={`p-8 glass-card rounded-[40px] border-white/[0.04] cursor-grab active:cursor-grabbing group animate-neural-entry ${draggedTaskId === task.id ? 'opacity-30 scale-95 blur-md' : ''}`}
                                style={{ animationDelay: `${(sIdx * 200) + (tIdx * 80)}ms` }}
                              >
                                <div className="flex items-center gap-5 mb-6">
                                  <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 overflow-hidden flex-shrink-0 shadow-xl">
                                    {task.clientAvatar ? <img src={task.clientAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[12px] font-black text-slate-700">{task.clientName?.slice(0, 2)}</div>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[14px] font-black uppercase truncate tracking-tight group-hover:text-amber-400 transition-colors">{task.title}</div>
                                    <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest truncate mt-1">{task.clientName}</div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.03]">
                                   <div className="text-[13px] font-black font-mono text-amber-500/80">R$ {task.value?.toLocaleString()}</div>
                                   <button onClick={(e) => { e.stopPropagation(); handleWhatsapp(task.clientPhone); }} className="p-4 whatsapp-btn-vibrant rounded-2xl shadow-md"><Icons.Whatsapp /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {viewType === BoardViewType.INSIGHTS && (
                  <div className="flex flex-col items-center justify-start h-full pt-12 animate-neural-entry">
                    <div className="grid grid-cols-4 gap-12 w-full">
                      {[
                        { label: 'Capital Sob Gestão', value: `R$ ${insightsMetrics.totalCapital.toLocaleString()}`, trend: 'Fluxo Acumulado Alpha', icon: <Icons.BarChart /> },
                        { label: 'Previsão de Receita', value: `R$ ${insightsMetrics.monthlyForecast.toLocaleString()}`, trend: 'Performance Projetada', icon: <Icons.Clock /> },
                        { label: 'Contratos Ativos', value: insightsMetrics.activeContracts, trend: 'Monitoramento Neural', icon: <Icons.Zap /> },
                        { label: 'Ticket Médio', value: `R$ ${insightsMetrics.avgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, trend: 'Valor por Operação', icon: <Icons.CheckCircle /> },
                      ].map((m, i) => (
                        <div key={i} className="bg-gradient-to-br from-[#0a0a0a] to-black p-14 rounded-[60px] border border-white/[0.03] group hover:border-amber-500/40 transition-all duration-700 shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                            <div className="scale-[3]">{m.icon}</div>
                          </div>
                          <div className="flex items-center justify-between mb-12 relative z-10">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">{m.label}</span>
                            <div className="text-amber-500/30 group-hover:text-amber-500 transition-all duration-700 scale-125">{m.icon}</div>
                          </div>
                          <div className="text-6xl font-black mb-6 tracking-tighter-neural text-white group-hover:gold-text-gradient transition-all">{m.value}</div>
                          <div className="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] group-hover:text-slate-500 transition-colors">{m.trend}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-32 text-center animate-neural-entry">
             <GoldGradientText className="text-[180px] opacity-10 blur-md absolute select-none tracking-[0.5em]">EXPANDIX</GoldGradientText>
             <h2 className="text-7xl font-black uppercase tracking-[0.3em] z-10 mb-12">
               <GoldGradientText className="drop-shadow-[0_0_35px_rgba(212,175,55,0.5)]">Grupo Expandix</GoldGradientText>
             </h2>
             <button onClick={handleStartCreateBoard} className="bg-white text-black px-24 py-8 rounded-[50px] font-black uppercase tracking-[0.6em] hover:bg-amber-500 hover:text-white transition-all shadow-[0_30px_60px_rgba(212,175,55,0.2)] z-10 active:scale-95">
               Inicializar Novo Hub
             </button>
          </div>
        )}
      </main>

      {/* AI ASSISTANT FAB */}
      <div className="fixed bottom-12 right-12 z-[150] animate-neural-entry">
        <button 
          onClick={handleAIAssistant}
          className="w-20 h-20 rounded-full gemini-glow-btn flex items-center justify-center group"
          title="Assistente Neural Gemini"
        >
          <div className="scale-125 group-hover:gold-text-gradient transition-all text-amber-500/80">
            <Icons.Bot />
          </div>
        </button>
      </div>

      {/* MODAL CONFIGURAÇÃO DE PERFIL */}
      {showProfileModal && currentUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-10 animate-in fade-in duration-700">
          <div className="modal-dynamic-bg border border-white/10 w-full max-w-xl rounded-[60px] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden flex flex-col relative">
            <div className="p-16 border-b border-white/5 flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter-neural">Configuração de Perfil</h3>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">Identidade Neural do Agente</p>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="p-5 hover:bg-white/10 rounded-full transition-all group">
                <Icons.Plus className="rotate-45 scale-150 group-hover:text-amber-500 transition-colors" />
              </button>
            </div>

            <div className="flex-1 p-16 space-y-12 relative z-10">
              <div className="flex flex-col items-center gap-8">
                <div 
                  className="relative group cursor-pointer" 
                  onClick={() => profileFileInputRef.current?.click()}
                >
                  <div className="w-40 h-40 rounded-[48px] bg-black border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                    {currentUser.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" /> : <div className="scale-[2] opacity-20"><Icons.Bot /></div>}
                  </div>
                  <div className="absolute inset-0 bg-amber-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-[48px] transition-all backdrop-blur-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Mudar Avatar</span>
                  </div>
                  <input type="file" ref={profileFileInputRef} hidden onChange={handleProfileAvatarUpload} />
                </div>
                
                <div className="w-full space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">Nome de Identificação</label>
                    <input 
                      type="text" 
                      value={currentUser.name} 
                      onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 p-7 rounded-[32px] font-black text-xl tracking-tight focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">E-mail Corporativo</label>
                    <input 
                      type="email" 
                      disabled
                      value={currentUser.email} 
                      className="w-full bg-black/40 border border-white/5 p-7 rounded-[32px] font-black text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-16 bg-black/40 border-t border-white/5 relative z-10">
              <button 
                onClick={handleSaveProfile}
                className="w-full py-7 bg-white text-black rounded-[40px] font-black uppercase tracking-[0.6em] hover:bg-amber-500 hover:text-white transition-all duration-700 shadow-2xl"
              >
                Salvar Credenciais
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ERRO RLS (DATABASE SYNC) */}
      {rlsError && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-10 animate-neural-entry">
          <div className="bg-[#0a0a0a] border border-rose-500/30 w-full max-w-2xl rounded-[60px] shadow-[0_0_100px_rgba(244,63,94,0.1)] overflow-hidden flex flex-col p-16">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mb-8">
                {isValidating ? (
                   <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                   <Icons.Zap className="text-rose-500 scale-150" />
                )}
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tighter-neural text-rose-500">Falha na Conexão Cloud Neural</h3>
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">Sua instância do Supabase foi removida ou requer autorização (RLS).</p>
            </div>
            
            <div className="bg-black/50 border border-white/5 p-8 rounded-[32px] mb-10 overflow-y-auto max-h-40 scrollbar-hide">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Instruções de Restauração Total:</p>
              <ol className="text-[11px] text-slate-500 space-y-4 font-bold">
                <li>1. Acesse seu painel no <strong className="text-white">Supabase.com</strong></li>
                <li>2. Clique em <strong className="text-white">SQL Editor</strong> no menu lateral.</li>
                <li>3. Cole o código SQL completo de restauração (copie abaixo).</li>
                <li>4. Clique em <strong className="text-white">Run</strong> e retorne aqui.</li>
              </ol>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleRetryConnection}
                disabled={isValidating}
                className="w-full py-8 bg-amber-500 text-white rounded-[40px] font-black uppercase tracking-[0.6em] hover:bg-amber-400 transition-all duration-700 shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {isValidating ? "Validando Core..." : "Validar e Sincronizar Agora"}
              </button>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(supabaseService.RLS_FIX_SQL);
                  alert("Script de restauração copiado!");
                }}
                className="w-full py-6 bg-white/5 text-white border border-white/10 rounded-[40px] font-black uppercase tracking-[0.6em] hover:bg-white/10 transition-all duration-700"
              >
                Copiar Script SQL
              </button>
            </div>

            <button 
              onClick={() => setRlsError(null)}
              className="w-full py-4 text-[9px] font-black uppercase tracking-[0.4em] text-slate-700 hover:text-slate-400 transition-all mt-4"
            >
              Continuar em Modo Local (Cache)
            </button>
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO/CRIAÇÃO - INICIALIZAR OPERAÇÃO */}
      {editingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-10 animate-in fade-in duration-700">
          <div className="modal-dynamic-bg border border-white/10 w-full max-w-3xl rounded-[60px] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[95vh] relative">
            <div className="p-16 border-b border-white/5 flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter-neural">
                  {isNewTask ? "Nova Ficha de Operação" : "Ficha Técnica Neural"}
                </h3>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-3">Parâmetros de Operação Crítica</p>
              </div>
              <button onClick={() => { setEditingTask(null); setIsNewTask(false); }} className="p-5 hover:bg-white/10 rounded-full transition-all group">
                <Icons.Plus className="rotate-45 scale-150 group-hover:text-amber-500 transition-colors" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-16 space-y-14 scrollbar-hide relative z-10">
              <div className="flex items-center gap-14">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                   <div className="w-44 h-44 rounded-[48px] bg-black border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                     {editingTask.clientAvatar ? <img src={editingTask.clientAvatar} className="w-full h-full object-cover" /> : <div className="scale-[2.5] opacity-20"><Icons.Bot /></div>}
                   </div>
                   <div className="absolute inset-0 bg-amber-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-[48px] transition-all backdrop-blur-sm">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white">Atualizar Biometria</span>
                   </div>
                   <input type="file" ref={fileInputRef} hidden onChange={handleAvatarUpload} />
                </div>
                <div className="flex-1 space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">Titular Responsável (Cliente)</label>
                    <input 
                      type="text" 
                      placeholder="Nome do Cliente"
                      value={editingTask.clientName} 
                      onChange={(e) => setEditingTask({ ...editingTask, clientName: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 p-7 rounded-[32px] font-black text-xl tracking-tight focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-800"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">WhatsApp Neural Link</label>
                    <input 
                      type="tel" 
                      value={editingTask.clientPhone} 
                      onChange={(e) => setEditingTask({ ...editingTask, clientPhone: e.target.value })}
                      placeholder="+55 11 9...."
                      className="w-full bg-black/60 border border-white/10 p-7 rounded-[32px] font-black tracking-widest focus:border-amber-500 outline-none transition-all placeholder:text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">Identificador da Op (Projeto)</label>
                    <input 
                      type="text" 
                      placeholder="Nome da Operação"
                      value={editingTask.title} 
                      onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 p-7 rounded-[32px] font-black outline-none focus:border-amber-500 transition-all placeholder:text-slate-800"
                    />
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">Vetor de Status</label>
                    <select 
                      value={editingTask.status} 
                      onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                      className="w-full bg-black/60 border border-white/10 p-7 rounded-[32px] font-black outline-none appearance-none cursor-pointer focus:border-amber-500 transition-all"
                    >
                      {Object.values(TaskStatus).map(s => <option key={s} value={s} className="bg-black py-4">{s}</option>)}
                    </select>
                 </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">Budget Alocado em Contrato (R$)</label>
                <div className="relative">
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-700 font-black">R$</div>
                  <input 
                    type="number" 
                    value={editingTask.value} 
                    onChange={(e) => setEditingTask({ ...editingTask, value: Number(e.target.value) })}
                    className="w-full bg-black/60 border border-white/10 pl-16 p-7 rounded-[32px] font-black text-2xl tracking-tighter focus:border-amber-500 outline-none transition-all text-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-16 bg-black/40 border-t border-white/5 flex gap-8 relative z-10">
              <button 
                onClick={() => handleSaveTask(editingTask)}
                className="flex-1 py-10 bg-white text-black rounded-[60px] font-black uppercase tracking-[0.8em] hover:bg-amber-500 hover:text-white transition-all duration-700 shadow-2xl active:scale-95 flex items-center justify-center text-center"
              >
                {isNewTask ? "Inicializar Operação" : "Efetivar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
