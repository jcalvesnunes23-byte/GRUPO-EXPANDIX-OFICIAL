
import { createClient } from '@supabase/supabase-js';
import { Board, Task, User, TaskStatus, TaskPriority, TaskGroup } from '../types';

/**
 * SCHEMA SQL PARA O SUPABASE (Execute no SQL Editor do seu painel):
 * 
 * -- 1. Tabela de Hubs (Boards)
 * create table public.boards (
 *   id text primary key,
 *   name text not null,
 *   description text,
 *   members text[] default '{}',
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 2. Tabela de Fases (Groups)
 * create table public.task_groups (
 *   id text primary key,
 *   board_id text references public.boards(id) on delete cascade,
 *   name text not null,
 *   color text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 3. Tabela de Operações (Tasks)
 * create table public.tasks (
 *   id text primary key,
 *   group_id text references public.task_groups(id) on delete cascade,
 *   title text not null,
 *   description text,
 *   client_name text,
 *   client_avatar text,
 *   client_phone text,
 *   value numeric default 0,
 *   status text,
 *   priority text,
 *   owner_id text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 */

const supabaseUrl = 'https://uzpbkzebwoafjviicynw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cGJremVid29hZmp2aWljeW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjAwMTIsImV4cCI6MjA4MzEzNjAxMn0.9z0i7yy89R0BL9OLa7p2GhM0svqHzv5SjdErqT38gws';

export const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_KEY = 'expandix_persistence_v1';
const USER_STORAGE_KEY = 'expandix_user_profile_v1';

export const supabaseService = {
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
      
      if (error) throw error;

      if (boards && boards.length > 0) {
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
    } catch (e) {
      console.warn("Offline ou erro de conexão. Usando cache local.");
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
    if (error) console.error("Erro ao salvar hub:", error);
  },

  async deleteBoard(boardId: string) {
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);
    if (error) console.error("Erro ao deletar hub:", error);
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
    if (error) console.error("Erro ao salvar fase:", error);
  },

  async deleteGroup(groupId: string) {
    const { error } = await supabase
      .from('task_groups')
      .delete()
      .eq('id', groupId);
    if (error) console.error("Erro ao deletar fase:", error);
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
    if (error) console.error("Erro ao salvar tarefa:", error);
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    if (error) console.error("Erro ao deletar tarefa:", error);
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
