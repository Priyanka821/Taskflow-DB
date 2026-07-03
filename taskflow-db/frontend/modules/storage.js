// modules/storage.js
// Thin abstraction over localStorage & API communication.
// Attaches to single global namespace object window.TaskFlow.

window.TaskFlow = window.TaskFlow || {};

(function () {
  const STORAGE_KEY = 'taskflow-lite:tasks';
  const THEME_KEY = 'taskflow-lite:theme';

  const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5000' : '';
  const API_URL = `${API_BASE}/api/tasks`;

  let useFallback = false;

  // Local storage helpers
  function saveTasksToLocalStorage(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('TaskFlow: could not save tasks to localStorage', err);
    }
  }

  function loadTasksFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('TaskFlow: could not parse stored tasks from localStorage', err);
      return [];
    }
  }

  /**
   * Load tasks from backend, fallback to localStorage if server is unreachable.
   */
  async function loadTasks() {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      useFallback = false;
      return data;
    } catch (err) {
      console.warn('TaskFlow API unreachable, falling back to local storage:', err.message);
      useFallback = true;
      return loadTasksFromLocalStorage();
    }
  }

  /**
   * Create a new task.
   */
  async function createTask(text) {
    if (useFallback) {
      const newTask = {
        id: Date.now().toString(),
        text,
        completed: false,
        createdAt: new Date().toISOString()
      };
      const tasks = loadTasksFromLocalStorage();
      tasks.push(newTask);
      saveTasksToLocalStorage(tasks);
      return newTask;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }
      return await response.json();
    } catch (err) {
      console.error('TaskFlow API Error (Create):', err.message);
      useFallback = true;
      return await createTask(text); // Retry in fallback mode
    }
  }

  /**
   * Update a task.
   */
  async function updateTask(id, updates) {
    if (useFallback) {
      const tasks = loadTasksFromLocalStorage();
      const index = tasks.findIndex(t => t.id === id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updates, lastModified: new Date().toISOString() };
        saveTasksToLocalStorage(tasks);
        return tasks[index];
      }
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }
      return await response.json();
    } catch (err) {
      console.error('TaskFlow API Error (Update):', err.message);
      useFallback = true;
      return await updateTask(id, updates); // Retry in fallback mode
    }
  }

  /**
   * Delete a task.
   */
  async function deleteTask(id) {
    if (useFallback) {
      const tasks = loadTasksFromLocalStorage();
      const filtered = tasks.filter(t => t.id === id);
      if (filtered.length > 0) {
        const remaining = tasks.filter(t => t.id !== id);
        saveTasksToLocalStorage(remaining);
        return true;
      }
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      return true;
    } catch (err) {
      console.error('TaskFlow API Error (Delete):', err.message);
      useFallback = true;
      return await deleteTask(id); // Retry in fallback mode
    }
  }

  /** Persist the chosen color theme ('light' | 'dark'). */
  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      console.error('TaskFlow: could not save theme', err);
    }
  }

  /** Load the stored theme, or null if none has been chosen yet. */
  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (err) {
      return null;
    }
  }

  window.TaskFlow.storage = {
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    saveTheme,
    loadTheme,
    isFallbackMode: () => useFallback
  };
})();