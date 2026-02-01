// 密码登录功能
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录
    if (window.location.pathname.endsWith('index.html') && !localStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
    }
    
    // 登录表单提交处理
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            
            // 简单密码验证（实际应用中应更安全）
            if (password === 'password123') {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'index.html';
            } else {
                alert('密码错误，请重试');
            }
        });
    }
    
    // 主页面功能
    if (document.getElementById('task-list')) {
        // 初始化日期和时间
        updateTime();
        setInterval(updateTime, 1000);
        
        // 生成日历
        generateCalendar();
        
        // 加载任务
        loadTasks();
        
        // 事件监听器
        document.getElementById('add-task').addEventListener('click', addTask);
        document.getElementById('clear-btn').addEventListener('click', clearAllData);
        document.getElementById('bulk-edit').addEventListener('click', toggleBulkEdit);
    }
});

// 更新日期和时间
function updateTime() {
    const now = new Date();
    document.getElementById('date').innerText = 
        `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    document.getElementById('time').innerText = 
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
}

// 生成日历
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // 获取当月第一天是星期几
    const firstDay = new Date(year, month, 1).getDay();
    // 获取当月天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // 添加空白单元格
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day';
        calendar.appendChild(emptyCell);
    }
    
    // 添加日期单元格
    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.innerText = i;
        
        // 标记今天
        if (i === now.getDate()) {
            dayCell.classList.add('today');
        }
        
        calendar.appendChild(dayCell);
    }
}

// 任务相关功能
function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    
    tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
    });
    
    updatePendingCount();
}

function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.setAttribute('data-id', task.id);
    
    const checkbox = document.createElement('div');
    checkbox.className = 'task-checkbox' + (task.completed ? ' completed' : '');
    checkbox.addEventListener('click', () => toggleTaskStatus(task.id));
    
    const text = document.createElement('div');
    text.className = 'task-text';
    text.innerText = task.text;
    
    const date = document.createElement('div');
    date.className = 'task-date';
    date.innerText = task.date;
    
    taskElement.appendChild(checkbox);
    taskElement.appendChild(text);
    taskElement.appendChild(date);
    
    return taskElement;
}

function addTask() {
    const taskText = prompt('请输入新事项:');
    if (taskText && taskText.trim() !== '') {
        const now = new Date();
        const task = {
            id: Date.now(),
            text: taskText,
            date: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`,
            completed: false
        };
        
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        loadTasks();
    }
}

function toggleTaskStatus(id) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        loadTasks();
    }
}

function clearAllData() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复')) {
        localStorage.removeItem('tasks');
        loadTasks();
    }
}

function updatePendingCount() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const pendingCount = tasks.filter(t => !t.completed).length;
    document.getElementById('pending-count').innerText = pendingCount;
}

function toggleBulkEdit() {
    const tasks = document.querySelectorAll('.task');
    tasks.forEach(task => {
        if (task.style.display === 'none') {
            task.style.display = 'flex';
        } else {
            task.style.display = 'none';
        }
    });
}
