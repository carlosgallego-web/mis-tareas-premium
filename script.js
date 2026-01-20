const SUPABASE_URL = 'https://liubjyhmzolscspmnhqc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DD319R1bIG0NXFf53SwMfw_rCi6yFLP';
// Cambiamos el nombre a supabaseClient para evitar conflicto con la librería
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const taskInput = document.getElementById('task-input');
const categorySelect = document.getElementById('category-select');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const pendingCount = document.getElementById('pending-count');
const dateDisplay = document.getElementById('date-display');
const filterBtns = document.querySelectorAll('.filter-btn');

let tasks = [];
let currentFilter = 'all';

// Inicialización inmediata
init();

async function init() {
    // Mostrar fecha actual
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (dateDisplay) {
        dateDisplay.textContent = new Date().toLocaleDateString('es-ES', options);
    }

    // Cargar tareas iniciales desde Supabase
    await fetchTasks();

    // Configurar escuchadores de eventos
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', addTask);
    }

    if (taskInput) {
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
}

async function fetchTasks() {
    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            console.error('Error al obtener tareas (Supabase):', error.message, error.details);
            // No alertamos en el fetch inicial para no molestar si solo es el RLS
        } else {
            tasks = data || [];
        }
    } catch (err) {
        console.error('Error inesperado al obtener tareas:', err);
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

    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .insert([newTask])
            .select();

        if (error) {
            console.error('Error al añadir tarea (Supabase):', error.message, error.details);
            alert('No se pudo guardar la tarea en la nube. Verifica tu conexión o permisos (RLS).');
        } else if (data && data.length > 0) {
            tasks.unshift(data[0]);
            taskInput.value = '';
            renderTasks();
        } else {
            console.warn('Supabase no devolvió datos tras la inserción.');
            await fetchTasks(); // Reintentar cargar por si acaso
        }
    } catch (err) {
        console.error('Error inesperado al añadir tarea:', err);
        alert('Ocurrió un error inesperado al intentar guardar la tarea.');
    }
}

async function toggleTask(id, currentStatus) {
    try {
        const { error } = await supabaseClient
            .from('tasks')
            .update({ completed: !currentStatus })
            .eq('id', id);

        if (error) {
            console.error('Error al cambiar estado (Supabase):', error.message, error.details);
            alert('No se pudo actualizar la tarea en la nube.');
        } else {
            tasks = tasks.map(task =>
                task.id === id ? { ...task, completed: !task.completed } : task
            );
            renderTasks();
        }
    } catch (err) {
        console.error('Error inesperado al cambiar estado:', err);
    }
}

async function deleteTask(id, element) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

    element.classList.add('removing');
    setTimeout(async () => {
        try {
            const { error } = await supabaseClient
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error al eliminar tarea (Supabase):', error.message, error.details);
                alert('No se pudo eliminar la tarea de la nube.');
                element.classList.remove('removing'); // Revertir visualmente
            } else {
                tasks = tasks.filter(task => task.id !== id);
                renderTasks();
            }
        } catch (err) {
            console.error('Error inesperado al eliminar tarea:', err);
        }
    }, 300);
}

function renderTasks() {
    if (!taskList) return;
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
    if (pendingCount) {
        pendingCount.textContent = `${pending} ${pending === 1 ? 'tarea pendiente' : 'tareas pendientes'}`;
    }
}
