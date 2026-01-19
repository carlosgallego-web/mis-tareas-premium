const SUPABASE_URL = 'https://liubjyhmzolscspmnhqc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DD319R1bIG0NXFf53SwMfw_rCi6yFLP';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const categorySelect = document.getElementById('category-select');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const pendingCount = document.getElementById('pending-count');
    const dateDisplay = document.getElementById('date-display');
    const filterBtns = document.querySelectorAll('.filter-btn');

    let tasks = [];
    let currentFilter = 'all';

    // Display Current Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString('es-ES', options);

    // Initial load from Supabase
    fetchTasks();

    // Event Listeners
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    async function fetchTasks() {
        const { data, error } = await supabase
            .from('tasks')
            .select('*');

        if (error) {
            console.error('Error fetching tasks:', error);
            // Fallback to local storage if DB is not ready
            tasks = JSON.parse(localStorage.getItem('premium-tasks')) || [];
        } else {
            tasks = data;
        }
        renderTasks();
    }

    async function addTask() {
        const text = taskInput.value.trim();
        const category = categorySelect.value;
        if (text === '') return;

        const newTask = {
            text: text,
            category: category,
            completed: false
        };

        const { data, error } = await supabase
            .from('tasks')
            .insert([newTask])
            .select();

        if (error) {
            console.error('Error adding task:', error);
            // Fallback for local testing
            const localTask = { ...newTask, id: Date.now() };
            tasks.unshift(localTask);
        } else {
            tasks.unshift(data[0]);
        }

        renderTasks();
        taskInput.value = '';
    }

    async function toggleTask(id, currentStatus) {
        const { error } = await supabase
            .from('tasks')
            .update({ completed: !currentStatus })
            .eq('id', id);

        if (error) {
            console.error('Error toggling task:', error);
        } else {
            tasks = tasks.map(task =>
                task.id === id ? { ...task, completed: !task.completed } : task
            );
            renderTasks();
        }
    }

    async function deleteTask(id, element) {
        element.classList.add('removing');
        setTimeout(async () => {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting task:', error);
            } else {
                tasks = tasks.filter(task => task.id !== id);
                renderTasks();
            }
        }, 300);
    }

    function renderTasks() {
        taskList.innerHTML = '';

        const filteredTasks = tasks.filter(task => {
            if (currentFilter === 'all') return true;
            return task.category === currentFilter;
        });

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;

            li.innerHTML = `
                <div class="task-checkbox" onclick="event.stopPropagation()">
                    ${task.completed ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
                </div>
                <div class="task-content">
                    <span class="task-text">${task.text}</span>
                    <span class="task-badge badge-${task.category}">${task.category}</span>
                </div>
                <button class="delete-btn" aria-label="Eliminar tarea">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            `;

            li.addEventListener('click', () => toggleTask(task.id, task.completed));

            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(task.id, li);
            });

            taskList.appendChild(li);
        });

        const pending = tasks.filter(t => !t.completed).length;
        pendingCount.textContent = `${pending} ${pending === 1 ? 'tarea pendiente' : 'tareas pendientes'}`;
    }
});
