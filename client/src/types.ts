export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSummary = {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  completionRate: number;
};

export type RecentTask = {
  id: string;
  title: string;
  status: string;
  project: {
    id: string;
    name: string;
  };
};

export type DashboardResponse = {
  summary: DashboardSummary;
  recentTasks: RecentTask[];
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
};
