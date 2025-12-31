
export enum TaskStatus {
  STOPPED = 'PARADO',
  WORKING = 'EM ANDAMENTO',
  DONE = 'CONCLUIDO'
}

export enum TaskPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum BoardViewType {
  LIST = 'Gestão de trabalhos',
  KANBAN = 'Gestão de Status',
  INSIGHTS = 'Insights'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  clientAvatar?: string;
  clientIdea?: string;
  clientRequest?: string;
  clientPhone?: string; // Novo campo para WhatsApp
  value?: number;
  status: TaskStatus;
  priority: TaskPriority;
  ownerId: string;
  startDate?: string;
  endDate?: string;
  groupId: string;
  comments: Comment[];
}

export interface TaskGroup {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  condition?: string;
  action: string;
  isActive: boolean;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  groups: TaskGroup[];
  automations: Automation[];
  members: string[]; // IDs de Usuários
}

export interface Organization {
  id: string;
  name: string;
  boards: Board[];
  members: User[];
}
