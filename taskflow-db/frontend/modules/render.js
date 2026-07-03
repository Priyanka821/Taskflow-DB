// modules/render.js
// All DOM-writing logic lives here. The rest of the app passes in
// data; this module is the only place that touches innerHTML.
//
// Uses the shared window.TaskFlow namespace instead of ES module
// import/export — see the note at the top of modules/storage.js for why.
// Because of that, this file must be loaded AFTER modules/validation.js
// in index.html, since it reads window.TaskFlow.validation.escapeHTML.

window.TaskFlow = window.TaskFlow || {};

(function () {
  const { escapeHTML } = window.TaskFlow.validation;

  const editIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M12 20h9" stroke-linecap="round"/>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const deleteIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M3 6h18" stroke-linecap="round"/>
    <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6m2 0-1 14a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20L6 6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 10.5v6M14 10.5v6" stroke-linecap="round"/>
  </svg>`;

  /**
   * Build the markup for a single task <li>.
   * @param {{id:number, text:string, completed:boolean}} task
   */
  function taskTemplate(task) {
    return `
      <label>
        <input type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark \u201c${escapeHTML(task.text)}\u201d as ${task.completed ? 'active' : 'complete'}">
        <span class="task-text">${escapeHTML(task.text)}</span>
      </label>
      <div class="task-actions">
        <button class="edit-btn" type="button" aria-label="Edit task">${editIcon}</button>
        <button class="delete-btn" type="button" aria-label="Delete task">${deleteIcon}</button>
      </div>
    `;
  }

  /**
   * Render the full task list into the given <ul>, respecting the
   * active filter. Re-renders from scratch — simple and correct for
   * the list sizes this app targets (tens to low hundreds of tasks).
   *
   * @param {HTMLElement} taskListElement
   * @param {Array<Object>} tasks   full task array (unfiltered)
   * @param {'all'|'active'|'completed'} filter
   */
  function renderTaskList(taskListElement, tasks, filter = 'all') {
    taskListElement.innerHTML = '';

    const visible = tasks.filter((t) => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    });

    if (visible.length === 0) {
      taskListElement.innerHTML = renderEmptyState(tasks.length, filter);
      return;
    }

    const fragment = document.createDocumentFragment();
    visible.forEach((task) => {
      const li = document.createElement('li');
      li.className = `task ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;
      li.innerHTML = taskTemplate(task);
      fragment.appendChild(li);
    });
    taskListElement.appendChild(fragment);
  }

  /**
   * Empty state markup. Wording changes slightly depending on whether
   * there genuinely are zero tasks, or the active filter just hides them all.
   */
  function renderEmptyState(totalTaskCount, filter) {
    if (totalTaskCount > 0) {
      const label = filter === 'active' ? 'active' : 'completed';
      return `
        <li class="empty-state">
          <img src="images/empty-tasks.svg" alt="" />
          <p class="empty-title">No ${label} tasks</p>
          <p>Switch filters to see the rest of your list.</p>
        </li>
      `;
    }
    return `
      <li class="empty-state">
        <img src="images/empty-tasks.svg" alt="No tasks" />
        <p class="empty-title">No tasks found</p>
        <p>Add your first task above to get started!</p>
      </li>
    `;
  }

  /**
   * Update the "x of y tasks remaining" counter.
   */
  function renderCounter(counterElement, tasks) {
    const remaining = tasks.filter((t) => !t.completed).length;
    const total = tasks.length;
    counterElement.textContent = `${remaining} of ${total} task${total === 1 ? '' : 's'} remaining`;
  }

  /**
   * Reflect the active filter button in the UI.
   */
  function renderActiveFilter(filterButtons, filter) {
    filterButtons.forEach((btn) => {
      const isActive = btn.dataset.filter === filter;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  /**
   * Briefly show a toast message (e.g. "Task deleted").
   */
  let toastTimer = null;
  function showToast(toastElement, message) {
    toastElement.textContent = message;
    toastElement.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastElement.classList.remove('is-visible');
    }, 2200);
  }

  window.TaskFlow.render = { renderTaskList, renderCounter, renderActiveFilter, showToast };
})();