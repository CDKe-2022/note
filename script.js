class DailyRemindersApp {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.selectedItems = new Set();
        this.batchMode = false;
        
        this.init();
    }
    
    init() {
        this.checkAuthentication();
        this.initElements();
        this.initEventListeners();
        this.updateDateTime();
        this.generateCalendar();
        this.loadItems();
        this.updateStats();
        
        // 每秒更新时间
        setInterval(() => this.updateDateTime(), 1000);
    }
    
    checkAuthentication() {
        const savedPassword = localStorage.getItem('daily-reminders-password') || '123456';
        if (!sessionStorage.getItem('authenticated')) {
            window.location.href = 'index.html';
        }
    }
    
    initElements() {
        // 日期时间元素
        this.currentDateEl = document.getElementById('currentDate');
        this.currentTimeEl = document.getElementById('currentTime');
        
        // 日历元素
        this.calendarMonthEl = document.getElementById('calendarMonth');
        this.calendarDaysEl = document.getElementById('calendarDays');
        this.prevMonthBtn = document.getElementById('prevMonth');
        this.nextMonthBtn = document.getElementById('nextMonth');
        
        // 统计元素
        this.totalCountEl = document.getElementById('totalCount');
        this.pendingCountEl = document.getElementById('pendingCount');
        this.completedCountEl = document.getElementById('completedCount');
        
        // 按钮元素
        this.addItemBtn = document.getElementById('addItemBtn');
        this.batchManageBtn = document.getElementById('batchManageBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.changePasswordBtn = document.getElementById('changePasswordBtn');
        
        // 容器元素
        this.itemsContainer = document.getElementById('itemsContainer');
        this.emptyState = document.getElementById('emptyState');
        
        // 批量工具栏
        this.batchToolbar = document.getElementById('batchToolbar');
        this.batchDeleteBtn = document.getElementById('batchDeleteBtn');
        this.batchCompleteBtn = document.getElementById('batchCompleteBtn');
        this.cancelBatchBtn = document.getElementById('cancelBatchBtn');
        
        // 模态框
        this.modals = {
            addItem: document.getElementById('addItemModal'),
            password: document.getElementById('passwordModal'),
            clearConfirm: document.getElementById('clearConfirmModal')
        };
        
        // 表单元素
        this.itemTitleInput = document.getElementById('itemTitle');
        this.itemDateInput = document.getElementById('itemDate');
        this.itemTimeInput = document.getElementById('itemTime');
        this.itemCategorySelect = document.getElementById('itemCategory');
        
        // 设置默认日期为今天
        const today = new Date().toISOString().split('T')[0];
        this.itemDateInput.value = today;
        this.itemTimeInput.value = '';
    }
    
    initEventListeners() {
        // 日历导航
        this.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        this.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        
        // 主功能按钮
        this.addItemBtn.addEventListener('click', () => this.showModal('addItem'));
        this.batchManageBtn.addEventListener('click', () => this.toggleBatchMode());
        this.clearAllBtn.addEventListener('click', () => this.showModal('clearConfirm'));
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.changePasswordBtn.addEventListener('click', () => this.showModal('password'));
        
        // 批量管理按钮
        this.batchDeleteBtn.addEventListener('click', () => this.deleteSelectedItems());
        this.batchCompleteBtn.addEventListener('click', () => this.completeSelectedItems());
        this.cancelBatchBtn.addEventListener('click', () => this.toggleBatchMode(false));
        
        // 模态框关闭按钮
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });
        
        // 模态框外部点击关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target);
            }
        });
        
        // 添加事项表单
        document.getElementById('saveItemBtn').addEventListener('click', () => this.saveItem());
        document.getElementById('cancelAddBtn').addEventListener('click', () => this.hideModal(this.modals.addItem));
        
        // 修改密码表单
        document.getElementById('savePasswordBtn').addEventListener('click', () => this.changePassword());
        document.getElementById('cancelPasswordBtn').addClickListener(() => this.hideModal(this.modals.password));
        
        // 清空确认
        document.getElementById('confirmClearBtn').addEventListener('click', () => this.clearAllItems());
        document.getElementById('cancelClearBtn').addEventListener('click', () => this.hideModal(this.modals.clearConfirm));
        
        // 取消按钮事件监听器修复
        document.getElementById('cancelPasswordBtn').addEventListener('click', () => this.hideModal(this.modals.password));
    }
    
    updateDateTime() {
        const now = new Date();
        
        // 更新日期
        const dateStr = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        this.currentDateEl.textContent = dateStr;
        
        // 更新时间
        const timeStr = now.toLocaleTimeString('zh-CN', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.currentTimeEl.textContent = timeStr;
    }
    
    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.generateCalendar();
    }
    
    generateCalendar() {
        // 更新月份标题
        const monthStr = this.currentYear + '年' + (this.currentMonth + 1) + '月';
        this.calendarMonthEl.textContent = monthStr;
        
        // 获取当月的第一天和最后一天
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const today = new Date();
        
        // 清空日历
        this.calendarDaysEl.innerHTML = '';
        
        // 添加前面的空白
        const firstDayOfWeek = firstDay.getDay();
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDiv = document.createElement('div');
            this.calendarDaysEl.appendChild(emptyDiv);
        }
        
        // 添加日期
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayDiv = document.createElement('div');
            dayDiv.textContent = day;
            
            // 检查是否是今天
            const isToday = today.getDate() === day && 
                           today.getMonth() === this.currentMonth && 
                           today.getFullYear() === this.currentYear;
            
            if (isToday) {
                dayDiv.classList.add('today');
            }
            
            // 点击日期筛选事项
            dayDiv.addEventListener('click', () => {
                this.filterItemsByDate(day);
            });
            
            this.calendarDaysEl.appendChild(dayDiv);
        }
    }
    
    saveItem() {
        const title = this.itemTitleInput.value.trim();
        const date = this.itemDateInput.value;
        const time = this.itemTimeInput.value;
        const category = this.itemCategorySelect.value;
        
        if (!title) {
            alert('请输入事项标题');
            return;
        }
        
        if (!date) {
            alert('请选择日期');
            return;
        }
        
        const items = this.getItems();
        const newItem = {
            id: Date.now(),
            title: title,
            date: date,
            time: time,
            category: category,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        items.push(newItem);
        localStorage.setItem('daily-reminders-items', JSON.stringify(items));
        
        this.hideModal(this.modals.addItem);
        this.loadItems();
        this.updateStats();
        
        // 重置表单
        this.itemTitleInput.value = '';
        this.itemTimeInput.value = '';
    }
    
    getItems() {
        const items = localStorage.getItem('daily-reminders-items');
        return items ? JSON.parse(items) : [];
    }
    
    loadItems() {
        const items = this.getItems();
        const today = new Date().toISOString().split('T')[0];
        
        // 按日期分组
        const groupedItems = {};
        items.forEach(item => {
            if (!groupedItems[item.date]) {
                groupedItems[item.date] = [];
            }
            groupedItems[item.date].push(item);
        });
        
        // 按日期排序
        const sortedDates = Object.keys(groupedItems).sort((a, b) => new Date(b) - new Date(a));
        
        this.itemsContainer.innerHTML = '';
        
        if (sortedDates.length === 0) {
            this.itemsContainer.appendChild(this.emptyState);
            return;
        }
        
        sortedDates.forEach(date => {
            // 日期标题
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            });
            dateHeader.innerHTML = `<h3>${dateStr} ${date === today ? '(今天)' : ''}</h3>`;
            this.itemsContainer.appendChild(dateHeader);
            
            // 日期的事项列表
            const dateItems = groupedItems[date];
            dateItems.sort((a, b) => {
                if (a.time && b.time) return a.time.localeCompare(b.time);
                if (a.time) return -1;
                if (b.time) return 1;
                return a.createdAt.localeCompare(b.createdAt);
            });
            
            dateItems.forEach(item => {
                const itemEl = this.createItemElement(item);
                this.itemsContainer.appendChild(itemEl);
            });
        });
    }
    
    createItemElement(item) {
        const itemEl = document.createElement('div');
        itemEl.className = `item ${item.completed ? 'completed' : 'pending'}`;
        itemEl.dataset.id = item.id;
        
        const categoryNames = {
            work: '工作',
            life: '生活',
            study: '学习',
            health: '健康',
            other: '其他'
        };
        
        const timeStr = item.time ? ` ${item.time}` : '';
        
        itemEl.innerHTML = `
            ${this.batchMode ? `
                <div class="batch-checkbox" onclick="event.stopPropagation()">
                    <input type="checkbox" class="item-select" data-id="${item.id}" style="display: none;">
                </div>
            ` : ''}
            <div class="item-checkbox ${item.completed ? 'checked' : ''}" 
                 onclick="app.toggleItemComplete(${item.id}, event)"></div>
            <div class="item-content">
                <div class="item-title">${this.escapeHtml(item.title)}</div>
                <div class="item-details">
                    <span class="item-category ${item.category}">${categoryNames[item.category]}</span>
                    <span class="item-date">
                        <i class="far fa-clock"></i>
                        ${timeStr}
                    </span>
                </div>
            </div>
            <div class="item-actions">
                <button class="edit-btn" onclick="app.editItem(${item.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="app.deleteItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // 添加批量选择功能
        if (this.batchMode) {
            const checkbox = itemEl.querySelector('.item-select');
            const batchCheckbox = itemEl.querySelector('.batch-checkbox');
            
            itemEl.addEventListener('click', (e) => {
                if (!e.target.closest('.item-checkbox, .item-actions, .batch-checkbox')) {
                    batchCheckbox.classList.toggle('checked');
                    checkbox.checked = !checkbox.checked;
                    this.updateSelectedItems(item.id, checkbox.checked);
                }
            });
            
            batchCheckbox.addEventListener('click', () => {
                batchCheckbox.classList.toggle('checked');
                checkbox.checked = !checkbox.checked;
                this.updateSelectedItems(item.id, checkbox.checked);
            });
            
            if (this.selectedItems.has(item.id)) {
                batchCheckbox.classList.add('checked');
                checkbox.checked = true;
            }
        }
        
        return itemEl;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    toggleItemComplete(id, event) {
        if (event) event.stopPropagation();
        
        const items = this.getItems();
        const itemIndex = items.findIndex(item => item.id === id);
        
        if (itemIndex !== -1) {
            items[itemIndex].completed = !items[itemIndex].completed;
            localStorage.setItem('daily-reminders-items', JSON.stringify(items));
            this.loadItems();
            this.updateStats();
        }
    }
    
    editItem(id) {
        const items = this.getItems();
        const item = items.find(item => item.id === id);
        
        if (item) {
            this.itemTitleInput.value = item.title;
            this.itemDateInput.value = item.date;
            this.itemTimeInput.value = item.time;
            this.itemCategorySelect.value = item.category;
            
            // 标记当前编辑的项目ID
            this.editingItemId = id;
            
            this.showModal('addItem');
        }
    }
    
    deleteItem(id) {
        if (confirm('确定要删除这个事项吗？')) {
            const items = this.getItems();
            const filteredItems = items.filter(item => item.id !== id);
            localStorage.setItem('daily-reminders-items', JSON.stringify(filteredItems));
            this.loadItems();
            this.updateStats();
        }
    }
    
    updateStats() {
        const items = this.getItems();
        const total = items.length;
        const completed = items.filter(item => item.completed).length;
        const pending = total - completed;
        
        this.totalCountEl.textContent = total;
        this.completedCountEl.textContent = completed;
        this.pendingCountEl.textContent = pending;
    }
    
    toggleBatchMode(enable) {
        this.batchMode = enable !== undefined ? enable : !this.batchMode;
        
        if (this.batchMode) {
            this.batchManageBtn.classList.add('active');
            this.batchToolbar.style.display = 'block';
            this.batchToolbar.style.animation = 'slideUp 0.3s ease';
        } else {
            this.batchManageBtn.classList.remove('active');
            this.batchToolbar.style.display = 'none';
            this.selectedItems.clear();
        }
        
        this.loadItems();
    }
    
    updateSelectedItems(id, selected) {
        if (selected) {
            this.selectedItems.add(id);
        } else {
            this.selectedItems.delete(id);
        }
    }
    
    deleteSelectedItems() {
        if (this.selectedItems.size === 0) {
            alert('请先选择要删除的事项');
            return;
        }
        
        if (confirm(`确定要删除选中的 ${this.selectedItems.size} 个事项吗？`)) {
            const items = this.getItems();
            const filteredItems = items.filter(item => !this.selectedItems.has(item.id));
            localStorage.setItem('daily-reminders-items', JSON.stringify(filteredItems));
            
            this.selectedItems.clear();
            this.toggleBatchMode(false);
            this.loadItems();
            this.updateStats();
        }
    }
    
    completeSelectedItems() {
        if (this.selectedItems.size === 0) {
            alert('请先选择要完成的事项');
            return;
        }
        
        const items = this.getItems();
        items.forEach(item => {
            if (this.selectedItems.has(item.id)) {
                item.completed = true;
            }
        });
        
        localStorage.setItem('daily-reminders-items', JSON.stringify(items));
        this.selectedItems.clear();
        this.toggleBatchMode(false);
        this.loadItems();
        this.updateStats();
    }
    
    filterItemsByDate(day) {
        const date = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        this.itemDateInput.value = date;
        this.showModal('addItem');
    }
    
    clearAllItems() {
        localStorage.removeItem('daily-reminders-items');
        this.hideModal(this.modals.clearConfirm);
        this.loadItems();
        this.updateStats();
    }
    
    logout() {
        sessionStorage.removeItem('authenticated');
        window.location.href = 'index.html';
    }
    
    changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        const storedPassword = localStorage.getItem('daily-reminders-password') || '123456';
        
        if (currentPassword !== storedPassword) {
            alert('当前密码错误');
            return;
        }
        
        if (newPassword.length < 4) {
            alert('新密码至少需要4个字符');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }
        
        localStorage.setItem('daily-reminders-password', newPassword);
        alert('密码修改成功');
        
        this.hideModal(this.modals.password);
        
        // 清空表单
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    }
    
    showModal(modalName) {
        const modal = this.modals[modalName];
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// 在页面加载完成后初始化应用
let app;
document.addEventListener('DOMContentLoaded', function() {
    app = new DailyRemindersApp();
});

// 登录处理
function handleLogin() {
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('loginError');
    const DEFAULT_PASSWORD = '123456';
    
    function getStoredPassword() {
        return localStorage.getItem('daily-reminders-password') || DEFAULT_PASSWORD;
    }
    
    function login() {
        const inputPassword = passwordInput.value.trim();
        const storedPassword = getStoredPassword();
        
        if (inputPassword === storedPassword) {
            sessionStorage.setItem('authenticated', 'true');
            window.location.href = 'app.html';
        } else {
            errorMsg.textContent = '密码错误，请重试';
            passwordInput.focus();
        }
    }
    
    return { login };
}
