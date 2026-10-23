import { FormEvent, useEffect, useState } from 'react';
import type { DashboardResponse, Project, Task, User } from './types';

const API_BASE_URL = 'http://localhost:4000/api';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TASK_STATUS_LABELS: Record<Task['status'], string> = {
  TODO: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completada',
};
const TASK_PRIORITY_LABELS: Record<Task['priority'], string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('taskflow_token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('taskflow_user');
    return savedUser ? (JSON.parse(savedUser) as User) : null;
  });
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskForm, setEditingTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Task['priority'],
    status: 'TODO' as Task['status'],
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: '',
  });

  const fetchDashboard = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar el panel.');
      }

      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar los proyectos.');
      }

      const fetchedProjects: Project[] = data.projects || [];
      setProjects(fetchedProjects);
      setSelectedProjectId((currentId) =>
        fetchedProjects.some((project) => project.id === currentId)
          ? currentId
          : fetchedProjects[0]?.id ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los proyectos.');
    }
  };

  const fetchTasks = async (projectId: string) => {
    if (!token || !projectId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/project/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar las tareas.');
      }

      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las tareas.');
    }
  };

  useEffect(() => {
    if (!token) {
      setDashboard(null);
      setProjects([]);
      setTasks([]);
      setSelectedProjectId(null);
      return;
    }

    void fetchDashboard();
    void fetchProjects();
  }, [token]);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
      return;
    }

    if (selectedProjectId) {
      void fetchTasks(selectedProjectId);
    } else {
      setTasks([]);
    }
  }, [selectedProjectId, projects, token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('taskflow_token', token);
    } else {
      localStorage.removeItem('taskflow_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('taskflow_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('taskflow_user');
    }
  }, [user]);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, string> = {
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
    };

    if (!EMAIL_PATTERN.test(payload.email)) {
      setError('Introduce un correo electrónico válido.');
      return;
    }

    if (mode === 'register') {
      payload.name = String(formData.get('name') || '');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo completar la autenticación.');
      }

      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la autenticación.');
    }
  };

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects${editingProjectId ? `/${editingProjectId}` : ''}`,
        {
        method: editingProjectId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectForm),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo guardar el proyecto.');
      }

      setProjectForm({ name: '', description: '' });
      setEditingProjectId(null);
      if (!editingProjectId) setSelectedProjectId(data.project.id);
      await fetchProjects();
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proyecto.');
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectForm({ name: project.name, description: project.description || '' });
  };

  const handleDeleteProject = async (project: Project) => {
    if (!token || !window.confirm(`¿Eliminar "${project.name}" y todas sus tareas?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'No se pudo eliminar el proyecto.');

      if (editingProjectId === project.id) {
        setEditingProjectId(null);
        setProjectForm({ name: '', description: '' });
      }
      await fetchProjects();
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el proyecto.');
    }
  };

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedProjectId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/project/${selectedProjectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo crear la tarea.');
      }

      setTaskForm({ title: '', description: '', priority: 'MEDIUM', status: 'TODO', dueDate: '' });
      await fetchTasks(selectedProjectId);
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la tarea.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar la tarea.');
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? data.task : task)),
      );
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la tarea.');
    }
  };

  const beginTaskEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate?.slice(0, 10) || '',
    });
  };

  const handleSaveTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !editingTaskId || !selectedProjectId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${editingTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingTaskForm),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'No se pudo actualizar la tarea.');

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === editingTaskId ? data.task : task)),
      );
      setEditingTaskId(null);
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la tarea.');
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!token || !window.confirm(`¿Eliminar la tarea "${task.title}"?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'No se pudo eliminar la tarea.');

      setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== task.id));
      if (editingTaskId === task.id) setEditingTaskId(null);
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la tarea.');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setDashboard(null);
    setProjects([]);
    setTasks([]);
    setSelectedProjectId(null);
  };

  return (
    <main className="app-shell">
      {!token || !user ? (
        <section className="auth-card">
          <p className="eyebrow">TaskFlow</p>
          <h1>{mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h1>
          <div className="toggle-row">
            <button
              type="button"
              className={mode === 'login' ? 'toggle active' : 'toggle'}
              onClick={() => setMode('login')}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'toggle active' : 'toggle'}
              onClick={() => setMode('register')}
            >
              Registrarse
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuth}>
            {mode === 'register' && (
              <label>
                Nombre
                <input name="name" type="text" placeholder="Tu nombre" required />
              </label>
            )}

            <label>
              Correo electrónico
              <input
                name="email"
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder="tu@ejemplo.com"
                required
              />
            </label>

            <label>
              Contraseña
              <input name="password" type="password" placeholder="••••••••" required />
            </label>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="primary-button">
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        </section>
      ) : (
        <section className="dashboard-shell">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">Panel</p>
              <h2>Bienvenido, {user.name}</h2>
            </div>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </header>

          {loading && <p className="info-message">Cargando el panel...</p>}
          {error && <p className="error-message">{error}</p>}

          {dashboard && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <span>Proyectos</span>
                  <strong>{dashboard.summary.totalProjects}</strong>
                </div>
                <div className="stat-card">
                  <span>Tareas</span>
                  <strong>{dashboard.summary.totalTasks}</strong>
                </div>
                <div className="stat-card">
                  <span>Completadas</span>
                  <strong>{dashboard.summary.completedTasks}</strong>
                </div>
                <div className="stat-card">
                  <span>En progreso</span>
                  <strong>{dashboard.summary.inProgressTasks}</strong>
                </div>
                <div className="stat-card">
                  <span>Pendientes</span>
                  <strong>{dashboard.summary.todoTasks}</strong>
                </div>
                <div className="stat-card">
                  <span>Progreso</span>
                  <strong>{dashboard.summary.completionRate}%</strong>
                </div>
              </div>

              <div className="workspace-grid">
                <div className="panel">
                  <h3>Proyectos</h3>

                  <form className="mini-form" onSubmit={handleCreateProject}>
                    {editingProjectId && <strong>Editando proyecto</strong>}
                    <input
                      type="text"
                      placeholder="Nombre del proyecto"
                      value={projectForm.name}
                      onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                    <textarea
                      placeholder="Descripción"
                      value={projectForm.description}
                      onChange={(event) =>
                        setProjectForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                    <button type="submit" className="primary-button small-button">
                      {editingProjectId ? 'Guardar cambios' : 'Crear proyecto'}
                    </button>
                    {editingProjectId && (
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => {
                          setEditingProjectId(null);
                          setProjectForm({ name: '', description: '' });
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </form>

                  <div className="project-list">
                    {projects.map((project) => (
                      <div key={project.id} className="project-row">
                        <button
                          type="button"
                          className={
                            selectedProjectId === project.id ? 'project-item active' : 'project-item'
                          }
                          onClick={() => setSelectedProjectId(project.id)}
                        >
                          <strong>{project.name}</strong>
                          <span>{project.description || 'Sin descripción'}</span>
                        </button>
                        <div className="item-actions">
                          <button type="button" className="secondary-button" onClick={() => handleEditProject(project)}>
                            Editar
                          </button>
                          <button type="button" className="danger-button" onClick={() => void handleDeleteProject(project)}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <h3>{projects.find((project) => project.id === selectedProjectId)?.name || 'Tareas'}</h3>

                  <form className="mini-form" onSubmit={handleCreateTask}>
                    <input
                      type="text"
                      placeholder="Título de la tarea"
                      value={taskForm.title}
                      onChange={(event) =>
                        setTaskForm((current) => ({ ...current, title: event.target.value }))
                      }
                      required
                    />
                    <textarea
                      placeholder="Descripción de la tarea"
                      value={taskForm.description}
                      onChange={(event) =>
                        setTaskForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />

                    <div className="form-row">
                      <select
                        value={taskForm.priority}
                        onChange={(event) =>
                          setTaskForm((current) => ({ ...current, priority: event.target.value as Task['priority'] }))
                        }
                      >
                        <option value="LOW">Baja</option>
                        <option value="MEDIUM">Media</option>
                        <option value="HIGH">Alta</option>
                      </select>

                      <select
                        value={taskForm.status}
                        onChange={(event) =>
                          setTaskForm((current) => ({ ...current, status: event.target.value as Task['status'] }))
                        }
                      >
                        <option value="TODO">Pendiente</option>
                        <option value="IN_PROGRESS">En progreso</option>
                        <option value="DONE">Completada</option>
                      </select>
                    </div>

                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(event) =>
                        setTaskForm((current) => ({ ...current, dueDate: event.target.value }))
                      }
                    />

                    <button type="submit" className="primary-button small-button">
                      Añadir tarea
                    </button>
                  </form>

                  <div className="task-list">
                    {tasks.length === 0 ? (
                      <p className="empty-state">Todavía no hay tareas en este proyecto.</p>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="task-item">
                          {editingTaskId === task.id ? (
                            <form className="mini-form task-edit-form" onSubmit={handleSaveTask}>
                              <input
                                value={editingTaskForm.title}
                                onChange={(event) => setEditingTaskForm((current) => ({ ...current, title: event.target.value }))}
                                aria-label="Título de la tarea"
                                required
                              />
                              <textarea
                                value={editingTaskForm.description}
                                onChange={(event) => setEditingTaskForm((current) => ({ ...current, description: event.target.value }))}
                                aria-label="Descripción de la tarea"
                              />
                              <div className="form-row">
                                <select
                                  value={editingTaskForm.priority}
                                  onChange={(event) => setEditingTaskForm((current) => ({ ...current, priority: event.target.value as Task['priority'] }))}
                                  aria-label="Prioridad de la tarea"
                                >
                                  <option value="LOW">Prioridad baja</option>
                                  <option value="MEDIUM">Prioridad media</option>
                                  <option value="HIGH">Prioridad alta</option>
                                </select>
                                <select
                                  value={editingTaskForm.status}
                                  onChange={(event) => setEditingTaskForm((current) => ({ ...current, status: event.target.value as Task['status'] }))}
                                  aria-label="Estado de la tarea"
                                >
                                  <option value="TODO">Pendiente</option>
                                  <option value="IN_PROGRESS">En progreso</option>
                                  <option value="DONE">Completada</option>
                                </select>
                              </div>
                              <input
                                type="date"
                                value={editingTaskForm.dueDate}
                                onChange={(event) => setEditingTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                                aria-label="Fecha límite de la tarea"
                              />
                              <div className="item-actions">
                                <button type="submit" className="primary-button small-button">Guardar</button>
                                <button type="button" className="secondary-button" onClick={() => setEditingTaskId(null)}>Cancelar</button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div>
                                <strong>{task.title}</strong>
                                {task.description && <small>{task.description}</small>}
                                <small>{TASK_PRIORITY_LABELS[task.priority]}{task.dueDate ? ` · Vence ${new Date(task.dueDate).toLocaleDateString('es-ES')}` : ''}</small>
                              </div>

                              <div className="task-actions">
                                <span className="task-status">{TASK_STATUS_LABELS[task.status]}</span>
                                <select
                                  value={task.status}
                                  onChange={(event) =>
                                    handleUpdateTaskStatus(task.id, event.target.value as Task['status'])
                                  }
                                  aria-label={`Cambiar estado de ${task.title}`}
                                >
                                  <option value="TODO">Pendiente</option>
                                  <option value="IN_PROGRESS">En progreso</option>
                                  <option value="DONE">Completada</option>
                                </select>
                                <div className="item-actions">
                                  <button type="button" className="secondary-button" onClick={() => beginTaskEdit(task)}>Editar</button>
                                  <button type="button" className="danger-button" onClick={() => void handleDeleteTask(task)}>Eliminar</button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="recent-panel">
                <h3>Tareas recientes</h3>
                {dashboard.recentTasks.length === 0 ? (
                  <p className="empty-state">Aún no hay tareas. Crea tu primer proyecto y añade una tarea.</p>
                ) : (
                  <ul>
                    {dashboard.recentTasks.map((task) => (
                      <li key={task.id}>
                        <div>
                          <strong>{task.title}</strong>
                          <small>{task.project.name}</small>
                        </div>
                        <span className="task-status">{TASK_STATUS_LABELS[task.status as Task['status']]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
