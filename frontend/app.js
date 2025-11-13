// Frontend logic for the Daily Planner progressive web app.
// This script handles fetching existing tasks from the backend API,
// rendering them, and providing form handlers for creating, updating
// and deleting tasks.  It also registers a service worker to enable
// offline caching and installation as a PWA.

document.addEventListener('DOMContentLoaded', () => {
  const tasksListEl = document.getElementById('tasksList');
  const form = document.getElementById('addTaskForm');
  const taskDateEl = document.getElementById('taskDate');
  const taskStartEl = document.getElementById('taskStart');
  const taskEndEl = document.getElementById('taskEnd');
  const taskCategoryEl = document.getElementById('taskCategory');
  const taskDescriptionEl = document.getElementById('taskDescription');

  // Load today's date into the date field by default
  const today = new Date().toISOString().split('T')[0];
  taskDateEl.value = today;

  /**
   * Fetch all tasks from the API and render them in the page.
   */
  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks');
      const tasks = await res.json();
      renderTasks(tasks);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  }

  /**
   * Create a new task on the server and reload the list.
   * @param {Object} taskData
   */
  async function createTask(taskData) {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    await loadTasks();
  }

  /**
   * Send an update for a task.  Only the changed fields need to be included
   * in `updates`.  After the update completes, the task list is refreshed.
   * @param {string} id
   * @param {Object} updates
   */
  async function updateTask(id, updates) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    await loadTasks();
  }

  /**
   * Delete a task by its ID and refresh the list.
   * @param {string} id
   */
  async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
  }

  /**
   * Render a list of tasks into the #tasksList element.  Each task
   * shows its description, date and times, category and provides buttons
   * to mark complete/incomplete, edit or delete.
   * @param {Array<Object>} tasks
   */
  function renderTasks(tasks) {
    tasksListEl.innerHTML = '';
    if (!tasks.length) {
      tasksListEl.textContent = 'No entries yet.';
      return;
    }
    tasks
      // Sort tasks by date then start time for readability
      .sort((a, b) => {
        if (a.date === b.date) {
          return (a.startTime || '').localeCompare(b.startTime || '');
        }
        return a.date.localeCompare(b.date);
      })
      .forEach(task => {
        const wrapper = document.createElement('div');
        wrapper.className = 'task';
        if (task.completed) wrapper.classList.add('completed');
        const info = document.createElement('div');
        info.className = 'info';
        const title = document.createElement('h3');
        title.textContent = task.description;
        const details = document.createElement('p');
        let detailParts = [];
        if (task.date) detailParts.push(task.date);
        if (task.startTime) detailParts.push(task.startTime);
        if (task.endTime) detailParts.push('– ' + task.endTime);
        if (task.category) detailParts.push('(' + task.category + ')');
        details.textContent = detailParts.join(' ');
        info.appendChild(title);
        info.appendChild(details);
        const actions = document.createElement('div');
        actions.className = 'actions';
        // Toggle complete button
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = task.completed ? 'Uncomplete' : 'Complete';
        toggleBtn.addEventListener('click', () => {
          updateTask(task.id, { completed: !task.completed });
        });
        actions.appendChild(toggleBtn);
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', async () => {
          // Prompt the user for new details.  Cancelled prompts return null.
          const newDesc = prompt('Description', task.description);
          if (newDesc === null) return;
          const newDate = prompt('Date (YYYY-MM-DD)', task.date);
          if (newDate === null) return;
          const newStart = prompt('Start time (HH:MM)', task.startTime || '');
          if (newStart === null) return;
          const newEnd = prompt('End time (HH:MM)', task.endTime || '');
          if (newEnd === null) return;
          const newCategory = prompt('Category', task.category || '');
          if (newCategory === null) return;
          await updateTask(task.id, {
            description: newDesc,
            date: newDate,
            startTime: newStart,
            endTime: newEnd,
            category: newCategory
          });
        });
        actions.appendChild(editBtn);
        // Delete button
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
          if (confirm('Delete this entry?')) {
            deleteTask(task.id);
          }
        });
        actions.appendChild(delBtn);
        wrapper.appendChild(info);
        wrapper.appendChild(actions);
        tasksListEl.appendChild(wrapper);
      });
  }

  // Handle new task form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskData = {
      date: taskDateEl.value,
      startTime: taskStartEl.value,
      endTime: taskEndEl.value,
      category: taskCategoryEl.value.trim(),
      description: taskDescriptionEl.value.trim()
    };
    await createTask(taskData);
    form.reset();
    taskDateEl.value = today;
  });

  // Initial load of tasks
  loadTasks();

  // Register the service worker for offline support and PWA installability
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch(err => console.error('Service worker registration failed', err));
  }
});
