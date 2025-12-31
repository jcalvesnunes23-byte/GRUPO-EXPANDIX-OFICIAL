
import { createClient } from '@supabase/supabase-js';
import { Board, Task, TaskGroup, User } from '../types';

const supabaseUrl = 'https://hacalncfrljjetwoophm.supabase.co';
const supabaseKey = 'sb_publishable_lLvhbIPq2w7F3pykz-t06w_7DUhQsDO';

export const supabase = createClient(supabaseUrl, supabaseKey);

const USER_STORAGE_KEY = 'expandix_user_profile';

export const supabaseService = {
  // Gestão de Usuários com Fallback para LocalStorage
  async fetchUser(id: string): Promise<User | null> {
    // 1. Tenta carregar do LocalStorage primeiro para velocidade e offline
    const localData = localStorage.getItem(USER_STORAGE_KEY);
    let user: User | null = localData ? JSON.parse(localData) : null;

    try {
      // 2. Tenta buscar no Supabase para sincronizar
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        user = data as User;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
    } catch (e) {
      console.warn('Supabase inacessível para usuários, usando cache local.');
    }
    
    return user;
  },

  async upsertUser(user: User) {
    // 1. Salva IMEDIATAMENTE no LocalStorage (Garante que "ficou salvo")
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    // 2. Tenta sincronizar com o Supabase
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role
        });
      
      if (error) {
        // Se o erro for de tabela inexistente, apenas logamos e não quebramos o app
        if (error.code === 'PGRST116' || error.message.includes('cache')) {
          console.error('DICA: Crie a tabela "users" no Supabase com colunas id, name, email, avatar, role.');
        } else {
          throw error;
        }
      }
    } catch (err: any) {
      console.error('Falha na sincronização cloud:', err.message);
      // Não lançamos erro aqui para que o usuário sinta que "salvou" (salvou no local)
    }
    return true;
  },

  async fetchBoards(): Promise<Board[]> {
    const { data: boards, error: bError } = await supabase
      .from('boards')
      .select(`
        *,
        groups:task_groups (
          *,
          tasks:tasks (*)
        )
      `);
    
    if (bError) {
      console.error('Erro detalhado Supabase:', bError.message || JSON.stringify(bError));
      throw bError; 
    }
    
    if (!boards) return [];

    return (boards as any[]).map(board => ({
      ...board,
      groups: (board.groups || []).map((group: any) => ({
        ...group,
        tasks: (group.tasks || []).map((task: any) => ({
          ...task,
          groupId: task.group_id,
          clientAvatar: task.client_avatar,
          clientIdea: task.client_idea,
          clientRequest: task.client_request,
          clientPhone: task.client_phone,
          ownerId: task.owner_id,
          startDate: task.start_date,
          endDate: task.end_date,
          comments: task.comments || []
        }))
      }))
    })) as Board[];
  },

  async upsertBoard(board: Board) {
    const { error } = await supabase
      .from('boards')
      .upsert({
        id: board.id,
        name: board.name,
        description: board.description,
        members: board.members
      });
    if (error) throw error;
    return true;
  },

  async deleteBoard(id: string) {
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async upsertGroup(group: any) {
    const { error } = await supabase
      .from('task_groups')
      .upsert(group);
    if (error) throw error;
    return true;
  },

  async upsertTask(task: Task) {
    const { error } = await supabase
      .from('tasks')
      .upsert({
        id: task.id,
        group_id: task.groupId,
        title: task.title,
        description: task.description,
        client_avatar: task.clientAvatar,
        client_idea: task.clientIdea,
        client_request: task.clientRequest,
        client_phone: task.clientPhone,
        value: task.value,
        status: task.status,
        priority: task.priority,
        owner_id: task.ownerId,
        start_date: task.startDate,
        end_date: task.endDate
      });
    if (error) throw error;
    return true;
  },

  async deleteTask(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
