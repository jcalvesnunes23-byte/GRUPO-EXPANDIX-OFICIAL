
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Board, BoardViewType, Task, TaskGroup, TaskStatus, TaskPriority, User } from './types';
import { Icons } from './components/Icons';
import { geminiService } from './services/geminiService';
import { supabaseService } from './services/supabaseService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const BrandName = ({ className = "" }: { className?: string }) => (
  <span className={`gold-text-gradient font-black tracking-tighter uppercase ${className}`}>
    GRUPO EXPANDIX
  </span>
);

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center animate-pulse">
      <div className="text-center">
        <BrandName className="text-6xl md:text-8xl block" />
        <div className="text-[10px] font-black uppercase tracking-[1em] text-amber-500/40 mt-6">Enterprise OS</div>
      </div>
    </div>
  );
};

const INITIAL_USER: User = { 
  id: '1', 
  name: 'Diretor de Operações', 
  email: 'diretoria@expandix.com', 
  avatar: 'https://picsum.photos/seed/expandix/100/100', 
  role: 'ADMIN' 
};

export default function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [viewType, setViewType] = useState<BoardViewType>(BoardViewType.LIST);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USER);

  useEffect(() => {
    const init = async () => {
      try {
        const dbUser = await supabaseService.fetchUser('1');
        if (dbUser) setCurrentUser(dbUser);

        const data = await supabaseService.fetchBoards();
        setBoards(data || []);
        if (data && data.length > 0) setActiveBoardId(data[0].id);
      } catch (err) {
        console.error("Boot error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);

  if (isLoading) return null; // O loader do index.html cuida disso

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      {/* Sidebar Simples */}
      <aside className="w-80 h-full border-r bg-[#050505] border-white/10 flex flex-col">
        <div className="p-10 border-b border-white/5">
          <BrandName className="text-xl" />
        </div>
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">Hubs Ativos</div>
          {boards.map(b => (
            <button 
              key={b.id} 
              onClick={() => setActiveBoardId(b.id)}
              className={`w-full text-left p-4 rounded-xl text-[10px] font-black uppercase mb-2 transition-all ${activeBoardId === b.id ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {b.name}
            </button>
          ))}
        </div>
        <div className="p-8 border-t border-white/5 flex items-center gap-4">
          <img src={currentUser.avatar} className="w-10 h-10 rounded-xl object-cover border border-amber-500/20" />
          <div className="text-[10px] font-black uppercase truncate">{currentUser.name}</div>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeBoard ? (
          <>
            <header className="h-24 border-b px-14 flex items-center justify-between border-white/10">
              <h2 className="text-2xl font-black uppercase tracking-tighter">{activeBoard.name}</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Sistema Online</span>
              </div>
            </header>
            
            <div className="px-14 border-b border-white/5 flex gap-10">
              {Object.values(BoardViewType).map(v => (
                <button 
                  key={v} 
                  onClick={() => setViewType(v)}
                  className={`py-6 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all ${viewType === v ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500'}`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-14 bg-gradient-to-b from-transparent to-white/[0.02]">
              {/* O conteúdo das visualizações seria renderizado aqui */}
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                <BrandName className="text-4xl" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] mt-4">Hub de Inteligência Corporativa</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 font-black uppercase tracking-[0.5em] animate-pulse">
            Inicializando Hub...
          </div>
        )}
      </main>
    </div>
  );
}
