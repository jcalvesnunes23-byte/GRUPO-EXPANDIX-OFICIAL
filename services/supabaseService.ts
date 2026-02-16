
import { createClient } from '@supabase/supabase-js';
import { Board, Task, User, TaskStatus, TaskPriority, TaskGroup } from '../types';

// Credenciais atualizadas conforme solicitação do usuário
const supabaseUrl = 'https://njmozedupegrmnxmjvlg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbW96ZWR1cGVncm1ueG1qdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTQ4ODgsImV4cCI6MjA4Njc5MDg4OH0.aGqxUwZ5Siy72-KPVneFP3w59MkbFDlPhvkhEeqIY9U';

export const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_KEY = 'expandix_persistence_v1';
const USER_STORAGE_KEY = 'expandix_user_profile_v1';

export const supabaseService = {
  // Script SQL Completo para Restauração Total do Sistema na nova instância
  RLS_FIX_SQL: `
-- SCRIPT DE RESTAURAÇÃO TOTAL EXPANDIX NEURAL --
-- Cole este código no SQL EDITOR do Supabase e clique em RUN --

-- 1. TABELAS
CREATE TABLE IF NOT EXISTS public.boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    members JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_groups (
    id TEXT PRIMARY KEY,
    board_id TEXT REFERENCES public.boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES public.task_groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    client_name TEXT,
    client_avatar TEXT,
    client_phone TEXT,
    value NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'PARADO',
    priority TEXT DEFAULT 'Média',
    owner_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SEGURANÇA (RLS)
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACESSO PÚBLICO (AJUSTÁVEL CONFORME NECESSIDADE)
DROP POLICY IF EXISTS "Public access to boards" ON public.boards;
CREATE POLICY "Public access to boards" ON public.boards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to task_groups" ON public.task_groups;
CREATE POLICY "Public access to task_groups" ON public.task_groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to tasks" ON public.tasks;
CREATE POLICY "Public access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
  `,

  async fetchBoards(): Promise<Board[]> {
    try {
      const { data: boards, error } = await supabase
        .from('boards')
        .select(`
          *,
          groups:task_groups (
            *,
            tasks:tasks (*)
          )
        `)
        .order('created_at', { ascending: true });
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.code === '42P01') {
            this.handleRLSError({ message: "As tabelas não existem na nova instância. É necessário rodar o script de restauração no SQL Editor." }, "fetchBoards");
        }
        throw error;
      }

      if (boards) {
        const formatted = boards.map(b => ({
          ...b,
          groups: (b.groups || []).map((g: any) => ({
            ...g,
            tasks: (g.tasks || []).sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          })).sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
        return formatted;
      }
    } catch (e: any) {
      console.warn("Utilizando cache local devido a falha no banco:", e.message);
    }
    
    const localData = localStorage.getItem(STORAGE_KEY);
    return localData ? JSON.parse(localData) : [];
  },

  async saveBoard(board: Board) {
    const { error } = await supabase
      .from('boards')
      .upsert({
        id: board.id,
        name: board.name,
        description: board.description,
        members: board.members
      });
    
    if (error) this.handleRLSError(error, "saveBoard");
  },

  async deleteBoard(boardId: string) {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId);
      
      if (error) {
        this.handleRLSError(error, "deleteBoard");
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  async saveGroup(groupId: string, boardId: string, groupData: Partial<TaskGroup>) {
    const { error } = await supabase
      .from('task_groups')
      .upsert({
        id: groupId,
        board_id: boardId,
        name: groupData.name,
        color: groupData.color
      });
    
    if (error) this.handleRLSError(error, "saveGroup");
  },

  async deleteGroup(groupId: string) {
    const { error } = await supabase
      .from('task_groups')
      .delete()
      .eq('id', groupId);
    if (error) this.handleRLSError(error, "deleteGroup");
  },

  async saveTask(task: Task) {
    const { error } = await supabase
      .from('tasks')
      .upsert({
        id: task.id,
        group_id: task.groupId,
        title: task.title,
        description: task.description,
        client_name: task.clientName,
        client_avatar: task.clientAvatar,
        client_phone: task.clientPhone,
        value: task.value,
        status: task.status,
        priority: task.priority,
        owner_id: task.ownerId
      });
    if (error) this.handleRLSError(error, "saveTask");
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    if (error) this.handleRLSError(error, "deleteTask");
  },

  handleRLSError(error: any, context: string) {
    console.error(`Database Alert (${context}):`, error.message);
    // Dispara modal de erro se as tabelas não existirem na nova instância njmozedupegrmnxmjvlg
    if (error.message?.includes("row-level security") || error.message?.includes("does not exist") || error.code === '42P01') {
      window.dispatchEvent(new CustomEvent('supabase-rls-error', { detail: { message: error.message } }));
    }
  },

  async fetchUserProfile(): Promise<User> {
    const localUser = localStorage.getItem(USER_STORAGE_KEY);
    return localUser ? JSON.parse(localUser) : {
      id: '1',
      name: 'Diretor Expandix',
      email: 'admin@expandix.com',
      avatar: '',
      role: 'ADMIN'
    };
  },

  async updateUserProfile(user: User): Promise<void> {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },

  saveBoardsLocally(boards: Board[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  }
};
