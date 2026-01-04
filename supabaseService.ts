
import { createClient } from '@supabase/supabase-js';
import { Board, Task, User, TaskStatus, TaskPriority } from '../types';

const supabaseUrl = 'https://hacalncfrljjetwoophm.supabase.co';
const supabaseKey = 'sb_publishable_lLvhbIPq2w7F3pykz-t06w_7DUhQsDO';

export const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_KEY = 'expandix_persistence_v1';
const USER_STORAGE_KEY = 'expandix_user_profile_v1';

const INITIAL_USER: User = {
  id: '1',
  name: 'Diretor Expandix',
  email: 'admin@expandix.com',
  avatar: '',
  role: 'ADMIN'
};

const INITIAL_MOCK: Board[] = [
  {
    id: 'board-alpha',
    name: 'Operação Expandix Prime',
    description: 'Gestão estratégica de ativos e expansão neural.',
    members: ['1'],
    automations: [],
    groups: [
      {
        id: 'g-main',
        name: 'Fase de Lançamento',
        color: '#D4AF37',
        tasks: [
          {
            id: 't-init-1',
            title: 'Configuração do Ecossistema',
            description: 'Definição de parâmetros de IA e integração de dados.',
            status: TaskStatus.WORKING,
            priority: TaskPriority.CRITICAL,
            ownerId: '1',
            groupId: 'g-main',
            value: 15000,
            comments: []
          }
        ]
      }
    ]
  }
];

export const supabaseService = {
  async fetchBoards(): Promise<Board[]> {
    const localData = localStorage.getItem(STORAGE_KEY);
    try {
      const { data: boards, error } = await supabase
        .from('boards')
        .select(`*, groups:task_groups (*, tasks:tasks (*))`);
      
      if (!error && boards && boards.length > 0) {
        const formatted = (boards as any[]).map(b => ({
          ...b,
          groups: (b.groups || []).map((g: any) => ({
            ...g,
            tasks: (g.tasks || []).map((t: any) => ({
              ...t,
              groupId: t.group_id,
              ownerId: t.owner_id
            }))
          }))
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
        return formatted;
      }
    } catch (e) {
      console.warn("Offline ou Erro de Conexão. Usando cache local.");
    }
    return localData ? JSON.parse(localData) : INITIAL_MOCK;
  },

  async saveBoardsLocally(boards: Board[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  },

  async fetchUserProfile(): Promise<User> {
    const localUser = localStorage.getItem(USER_STORAGE_KEY);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', '1')
        .single();

      if (!error && data) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn("Erro ao buscar perfil. Usando cache local.");
    }
    return localUser ? JSON.parse(localUser) : INITIAL_USER;
  },

  async updateUserProfile(user: User): Promise<void> {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ ...user, updated_at: new Date() });
      if (error) throw error;
    } catch (e) {
      console.warn("Erro ao sincronizar perfil com servidor.");
    }
  }
};
