
import { createClient } from '@supabase/supabase-js';
import { Board, Task, User, TaskGroup } from '../types';

// Credenciais integradas do projeto njmozedupegrmnxmjvlg
const supabaseUrl = 'https://njmozedupegrmnxmjvlg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbW96ZWR1cGVncm1ueG1qdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTQ4ODgsImV4cCI6MjA4Njc5MDg4OH0.aGqxUwZ5Siy72-KPVneFP3w59MkbFDlPhvkhEeqIY9U';

export const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_KEY = 'expandix_persistence_v1';
const USER_STORAGE_KEY = 'expandix_user_profile_v1';

export const supabaseService = {
  // Script de inicialização do banco de dados para o usuário rodar no Supabase
  RLS_FIX_SQL: `
-- EXPANDIX NEURAL DATABASE INITIALIZATION --
-- Execute este script no SQL Editor do Supabase --

-- 1. Criação da Tabela de Hubs (Boards)
CREATE TABLE IF NOT EXISTS public.boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    members JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criação da Tabela de Grupos/Fases
CREATE TABLE IF NOT EXISTS public.task_groups (
    id TEXT PRIMARY KEY,
    board_id TEXT REFERENCES public.boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criação da Tabela de Tarefas/Operações
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

-- 4. Habilitar Segurança (RLS)
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Acesso Público para agilizar a operação (ajustar conforme necessidade de segurança)
CREATE POLICY "Acesso Total Boards" ON public.boards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Total Groups" ON public.task_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Total Tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
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
        // Se a tabela não existir (42P01), notificamos a interface para oferecer a restauração
        if (error.code === '42P01') {
            this.handleRLSError(error, "Database Not Initialized");
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
      console.warn("Utilizando redundância local (Cache) devido a erro de conexão:", e.message);
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
    const { error } = await supabase.from('boards').delete().eq('id', boardId);
    if (error) this.handleRLSError(error, "deleteBoard");
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
    const { error } = await supabase.from('task_groups').delete().eq('id', groupId);
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
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) this.handleRLSError(error, "deleteTask");
  },

  handleRLSError(error: any, context: string) {
    console.error(`Supabase Alert [${context}]:`, error.message);
    // Dispara evento para o App.tsx exibir as instruções de recuperação
    if (error.code === '42P01' || error.message?.includes("security policy") || error.status === 401) {
      window.dispatchEvent(new CustomEvent('supabase-rls-error', { 
        detail: { message: `Erro de sincronização na instância njmozedupegrmnxmjvlg: ${error.message}` } 
      }));
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
