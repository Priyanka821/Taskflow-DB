// app.js — application entry point.
// Wires together data, view (render.js), and event controllers.
//
// Refactored to operate asynchronously with a Node/Express API backend.

(function () {
  const { loadTasks, createTask, updateTask, deleteTask, loadTheme, saveTheme, isFallbackMode } = window.TaskFlow.storage;
  const { renderTaskList, renderCounter, renderActiveFilter, showToast } = window.TaskFlow.render;
  const { validateTaskInput } = window.TaskFlow.validation;

  // ---------- DOM references ----------
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const inputError = document.getElementById('input-error');
  const taskList = document.getElementById('task-list');
  const counter = document.getElementById('task-counter');
  const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
  const themeToggle = document.getElementById('theme-toggle');
  const toast = document.getElementById('toast');
  const storageNote = document.getElementById('storage-note');

  // ---------- State ----------
  let tasks = [];
  let activeFilter = 'all';

  // ---------- Render orchestration ----------
  function render() {
    renderTaskList(taskList, tasks, activeFilter);
    renderCounter(counter, tasks);
    renderActiveFilter(filterButtons, activeFilter);

    // Update footer text to reflect current persistence state
    if (storageNote) {
      if (isFallbackMode()) {
        storageNote.textContent = 'nothing leaves your device (offline fallback mode)';
      } else {
        storageNote.textContent = 'synced with cloud database (MongoDB)';
      }
    }
  }

  // ---------- Form submission (Create) ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = validateTaskInput(input.value);

    if (!result.valid) {
      inputError.textContent = result.message;
      input.classList.add('has-error');
      input.focus();
      return;
    }

    inputError.textContent = '';
    input.classList.remove('has-error');

    const taskText = result.value;
    input.value = ''; // Snappy clearing for good UX

    const newTask = await createTask(taskText);
    if (newTask) {
      tasks.push(newTask);
      render();
    } else {
      showToast(toast, 'Failed to create task');
      input.value = taskText; // Restore if failed
    }
    input.focus();
  });

  // Clear the error state as soon as the user starts fixing it.
  input.addEventListener('input', () => {
    if (input.classList.contains('has-error')) {
      inputError.textContent = '';
      input.classList.remove('has-error');
    }
  });

  // ---------- Event delegation on the list (Update / Delete / Edit) ----------
  taskList.addEventListener('click', async (e) => {
    const taskElement = e.target.closest('.task');
    if (!taskElement) return;

    // Retrieve Mongo string ID rather than parsing as Number
    const taskId = taskElement.dataset.id;
    const taskIndex = tasks.findIndex((t) => String(t.id) === taskId);
    if (taskIndex === -1) return;

    // Delete
    if (e.target.closest('.delete-btn')) {
      const taskToDelete = tasks[taskIndex];
      const success = await deleteTask(taskId);
      if (success) {
        tasks.splice(taskIndex, 1);
        taskElement.classList.add('is-removing');
        showToast(toast, `Deleted “${truncate(taskToDelete.text)}”`);
        setTimeout(render, 160);
      } else {
        showToast(toast, 'Failed to delete task');
      }
      return;
    }

    // Edit (switch row into inline edit mode)
    if (e.target.closest('.edit-btn')) {
      beginEdit(taskElement, tasks[taskIndex]);
      return;
    }
  });

  // Toggle completion — listens for the checkbox's native "change" event
  // so it also fires correctly via keyboard (space bar).
  taskList.addEventListener('change', async (e) => {
    if (e.target.type !== 'checkbox') return;
    const taskElement = e.target.closest('.task');
    const taskId = taskElement.dataset.id;
    const taskIndex = tasks.findIndex((t) => String(t.id) === taskId);
    if (taskIndex === -1) return;

    const completed = e.target.checked;
    const currentTask = tasks[taskIndex];

    const updated = await updateTask(taskId, {
      text: currentTask.text,
      completed: completed
    });

    if (updated) {
      tasks[taskIndex] = updated;
      render();
    } else {
      showToast(toast, 'Failed to update task completion');
      e.target.checked = !completed; // Revert state
    }
  });

  /**
   * Swap a task row's label for a text input so the user can edit
   * the task in place. Confirms on Enter/blur, cancels on Escape.
   */
  function beginEdit(taskElement, task) {
    if (taskElement.classList.contains('is-editing')) return;
    taskElement.classList.add('is-editing');

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'task-edit-input';
    editInput.maxLength = 120;
    editInput.value = task.text;

    const actions = taskElement.querySelector('.task-actions');
    taskElement.insertBefore(editInput, actions);
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);

    let isCommitted = false;

    const commit = async () => {
      if (isCommitted) return;
      isCommitted = true;

      const result = validateTaskInput(editInput.value);
      if (result.valid && result.value !== task.text) {
        const updated = await updateTask(task.id, {
          text: result.value,
          completed: task.completed
        });
        if (updated) {
          task.text = updated.text;
        } else {
          showToast(toast, 'Failed to update task');
        }
      }
      render();
    };

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        isCommitted = true;
        render(); // discard changes
      }
    });

    editInput.addEventListener('blur', commit);
  }

  function truncate(text, max = 28) {
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  // ---------- Filters ----------
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  // ---------- Theme toggle ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }

  function initTheme() {
    const stored = loadTheme();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (prefersDark ? 'dark' : 'light'));
  }

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
  });

  // ---------- Init ----------
  async function init() {
    initTheme();
    render(); // Render layout initially
    
    // Fetch initial task state asynchronously
    tasks = await loadTasks();
    render();
  }

  init();
})();