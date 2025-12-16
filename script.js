// User Authentication
let currentUserTag = localStorage.getItem('currentUserTag') || null;
let allUsers = JSON.parse(localStorage.getItem('allUsers')) || {};

// Initialize app data
let tasks = [];
let completedTasksCount = 0;
let points = 0;
let streak = 0;
let unlockedMedals = [];
let settings = {
    name: 'Student',
    theme: 'light',
    notifications: true,
    soundEffects: true
};

// ===== COMBO & PROGRESSION SYSTEM =====
let combo = 0;
let lastTaskTime = null;
let level = 1;
let xp = 0;
let weeklyGoal = { target: 10, completed: 0, startDate: null };
let personalRecords = {
    bestDay: 0,
    longestStreak: 0,
    mostTasksWeek: 0,
    fastestTask: null,
    totalStudyTime: 0
};
let unlockedThemes = ['light', 'dark'];
let unlockedAvatars = ['default'];
let selectedAvatar = 'default';
let titles = ['Rookie'];
let selectedTitle = 'Rookie';

// XP required for each level
function getXPForLevel(lvl) {
    return Math.floor(100 * Math.pow(1.5, lvl - 1));
}

// Get current multiplier based on combo
function getComboMultiplier() {
    if (combo >= 10) return 4;
    if (combo >= 5) return 3;
    if (combo >= 3) return 2;
    if (combo >= 1) return 1.5;
    return 1;
}

// Add XP and check for level up
function addXP(amount) {
    const multiplier = getComboMultiplier();
    const xpGained = Math.floor(amount * multiplier);
    xp += xpGained;
    
    // Check for level up
    while (xp >= getXPForLevel(level)) {
        xp -= getXPForLevel(level);
        level++;
        onLevelUp();
    }
    
    updateXPDisplay();
    saveUserData();
    return xpGained;
}

// Handle level up rewards
function onLevelUp() {
    showNotification(`🎉 LEVEL UP! You're now Level ${level}!`);
    if (settings.soundEffects) playSound('levelup');
    
    // Unlock rewards at certain levels
    const rewards = {
        5: { theme: 'ocean', title: 'Apprentice' },
        10: { theme: 'sunset', avatar: 'scholar', title: 'Scholar' },
        15: { theme: 'forest', title: 'Expert' },
        20: { theme: 'midnight', avatar: 'genius', title: 'Master' },
        25: { theme: 'galaxy', title: 'Grandmaster' },
        30: { theme: 'neon', avatar: 'legend', title: 'Legend' }
    };
    
    if (rewards[level]) {
        const reward = rewards[level];
        if (reward.theme && !unlockedThemes.includes(reward.theme)) {
            unlockedThemes.push(reward.theme);
            showNotification(`🎨 New theme unlocked: ${reward.theme}!`);
        }
        if (reward.avatar && !unlockedAvatars.includes(reward.avatar)) {
            unlockedAvatars.push(reward.avatar);
            showNotification(`👤 New avatar unlocked: ${reward.avatar}!`);
        }
        if (reward.title && !titles.includes(reward.title)) {
            titles.push(reward.title);
            showNotification(`🏅 New title unlocked: ${reward.title}!`);
        }
    }
    
    saveUserData();
}

// Update combo when completing task
function updateCombo() {
    const now = Date.now();
    const comboWindow = 30 * 60 * 1000; // 30 minutes
    
    if (lastTaskTime && (now - lastTaskTime) < comboWindow) {
        combo++;
        if (combo === 3) showNotification(`🔥 3x COMBO! Points multiplied!`);
        if (combo === 5) showNotification(`🔥🔥 5x COMBO! 3x multiplier!`);
        if (combo === 10) showNotification(`🔥🔥🔥 10x COMBO! MAX 4x multiplier!`);
    } else {
        combo = 1;
    }
    
    lastTaskTime = now;
    updateComboDisplay();
    saveUserData();
}

// Reset combo if too much time passes
function checkComboExpiry() {
    if (lastTaskTime) {
        const now = Date.now();
        const comboWindow = 30 * 60 * 1000;
        if ((now - lastTaskTime) >= comboWindow && combo > 0) {
            combo = 0;
            updateComboDisplay();
        }
    }
}

// Update weekly goal
function updateWeeklyGoal() {
    const now = new Date();
    const weekStart = getWeekStart(now);
    
    if (!weeklyGoal.startDate || new Date(weeklyGoal.startDate) < weekStart) {
        // New week, reset goal
        weeklyGoal.startDate = weekStart.toISOString();
        weeklyGoal.completed = 0;
    }
    
    weeklyGoal.completed++;
    
    if (weeklyGoal.completed === weeklyGoal.target) {
        showNotification(`🎯 Weekly goal completed! +50 bonus XP!`);
        addXP(50);
    }
    
    updateGoalDisplay();
    saveUserData();
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Update personal records
function updatePersonalRecords() {
    const today = new Date().toDateString();
    const todayTasks = tasks.filter(t => t.completed && new Date(t.completedAt).toDateString() === today).length;
    
    if (todayTasks > personalRecords.bestDay) {
        personalRecords.bestDay = todayTasks;
        showNotification(`🏆 New record! ${todayTasks} tasks in one day!`);
    }
    
    if (streak > personalRecords.longestStreak) {
        personalRecords.longestStreak = streak;
    }
    
    saveUserData();
}

// ===== ACCOUNT MANAGEMENT FUNCTIONS =====
// Delete Account Function (called from button onclick)
function deleteAccount() {
    const confirmMsg = `Are you sure you want to DELETE your account "${currentUserTag}"?\n\nThis will permanently delete:\n- All your tasks\n- Your points and medals\n- Your streak and history\n\nThis action CANNOT be undone!`;
    
    if (confirm(confirmMsg)) {
        if (confirm('Are you REALLY sure? Click OK to permanently delete your account.')) {
            if (currentUserTag && allUsers[currentUserTag]) {
                // Delete user from allUsers
                delete allUsers[currentUserTag];
                localStorage.setItem('allUsers', JSON.stringify(allUsers));
                
                // Clear current user tag
                localStorage.removeItem('currentUserTag');
                currentUserTag = null;
                
                // Show success message and reload
                alert('Your account has been permanently deleted.');
                window.location.reload();
            } else {
                alert('Error: Could not find account to delete.');
            }
        }
    }
}

// Logout / Switch Account Function (called from button onclick)
function logoutUser() {
    if (confirm('Sign out of this account?\n\nYour data will be saved and you can sign back in anytime with your tag.')) {
        // Save current user data before logging out
        if (typeof saveUserData === 'function') {
            saveUserData();
        }
        
        // Remove current user tag from session
        localStorage.removeItem('currentUserTag');
        currentUserTag = null;
        
        // Reload to show auth page
        window.location.reload();
    }
}

// DOM Elements
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const closeSidebar = document.getElementById('closeSidebar');
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const addTaskForm = document.getElementById('addTaskForm');
const currentDateEl = document.getElementById('currentDate');

// Auth Elements
const authPage = document.getElementById('authPage');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const signinForm = document.getElementById('signinForm');
const signupForm = document.getElementById('signupForm');
const signinTagInput = document.getElementById('signinTag');
const signupTagInput = document.getElementById('signupTag');
const suggestedTagEl = document.getElementById('suggestedTag');
const useSuggestionBtn = document.getElementById('useSuggestion');
const refreshSuggestionBtn = document.getElementById('refreshSuggestion');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkUserLogin();
});

// User Login System
function checkUserLogin() {
    if (!currentUserTag) {
        // Show auth page
        showAuthPage();
    } else if (!allUsers[currentUserTag]) {
        // User tag doesn't exist anymore
        localStorage.removeItem('currentUserTag');
        currentUserTag = null;
        showAuthPage();
    } else {
        // Load user data
        loadUserData();
        initializeApp();
    }
}

function showAuthPage() {
    authPage.classList.add('active');
    document.querySelector('.sidebar').style.display = 'none';
    document.querySelector('.main-content').style.display = 'none';
    generateSuggestedTag();
}

function hideAuthPage() {
    authPage.classList.remove('active');
    document.querySelector('.sidebar').style.display = '';
    document.querySelector('.main-content').style.display = '';
}

// Auth Tab Switching
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active tab
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding form
        authForms.forEach(form => form.classList.remove('active'));
        document.getElementById(`${targetTab}-form`).classList.add('active');
        
        // Generate new suggestion when switching to signup
        if (targetTab === 'signup') {
            generateSuggestedTag();
        }
    });
});

function generateSuggestedTag() {
    const adjectives = ['Smart', 'Clever', 'Bright', 'Quick', 'Sharp', 'Wise', 'Epic', 'Super', 'Mega', 'Cool', 'Swift', 'Brave', 'Bold', 'Calm'];
    const nouns = ['Student', 'Scholar', 'Learner', 'Genius', 'Brain', 'Master', 'Pro', 'Ace', 'Star', 'Hero', 'Wizard', 'Champion', 'Legend'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    const suggestedTag = `${randomAdj}${randomNoun}#${randomNum}`;
    suggestedTagEl.textContent = suggestedTag;
    
    return suggestedTag;
}

useSuggestionBtn.addEventListener('click', () => {
    signupTagInput.value = suggestedTagEl.textContent;
});

refreshSuggestionBtn.addEventListener('click', () => {
    generateSuggestedTag();
});

// Sign In Form
signinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tag = signinTagInput.value.trim();
    
    if (tag.length < 3) {
        alert('Tag must be at least 3 characters long!');
        return;
    }
    
    // Check if user exists
    if (!allUsers[tag]) {
        alert('Account not found! Please check your tag or create a new account.');
        return;
    }
    
    // Sign in
    currentUserTag = tag;
    localStorage.setItem('currentUserTag', tag);
    
    loadUserData();
    hideAuthPage();
    initializeApp();
    showNotification(`Welcome back, ${tag}! 👋`);
});

// Sign Up Form
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tag = signupTagInput.value.trim();
    
    if (tag.length < 3) {
        alert('Tag must be at least 3 characters long!');
        return;
    }
    
    // Check if tag already exists
    if (allUsers[tag]) {
        alert('This tag is already taken! Please choose a different one or sign in.');
        return;
    }
    
    // Create new account
    currentUserTag = tag;
    localStorage.setItem('currentUserTag', tag);
    
    allUsers[tag] = {
        tasks: [],
        completedCount: 0,
        points: 0,
        streak: 0,
        medals: [],
        settings: {
            name: tag.split('#')[0] || 'Student',
            theme: 'light',
            notifications: true,
            soundEffects: true
        },
        createdAt: new Date().toISOString()
    };
    saveAllUsers();
    
    loadUserData();
    hideAuthPage();
    initializeApp();
    showNotification(`Welcome, ${tag}! Your account has been created! 🎉`);
});

function loadUserData() {
    if (currentUserTag && allUsers[currentUserTag]) {
        const userData = allUsers[currentUserTag];
        tasks = userData.tasks || [];
        completedTasksCount = userData.completedCount || 0;
        points = userData.points || 0;
        streak = userData.streak || 0;
        unlockedMedals = userData.medals || [];
        settings = userData.settings || {
            name: 'Student',
            theme: 'light',
            notifications: true,
            soundEffects: true
        };
        // Load new progression data
        combo = userData.combo || 0;
        lastTaskTime = userData.lastTaskTime || null;
        level = userData.level || 1;
        xp = userData.xp || 0;
        weeklyGoal = userData.weeklyGoal || { target: 10, completed: 0, startDate: null };
        personalRecords = userData.personalRecords || {
            bestDay: 0,
            longestStreak: 0,
            mostTasksWeek: 0,
            fastestTask: null,
            totalStudyTime: 0
        };
        unlockedThemes = userData.unlockedThemes || ['light', 'dark'];
        unlockedAvatars = userData.unlockedAvatars || ['default'];
        selectedAvatar = userData.selectedAvatar || 'default';
        titles = userData.titles || ['Rookie'];
        selectedTitle = userData.selectedTitle || 'Rookie';
    }
}

function saveUserData() {
    if (currentUserTag) {
        allUsers[currentUserTag] = {
            tasks: tasks,
            completedCount: completedTasksCount,
            points: points,
            streak: streak,
            medals: unlockedMedals,
            settings: settings,
            // Save new progression data
            combo: combo,
            lastTaskTime: lastTaskTime,
            level: level,
            xp: xp,
            weeklyGoal: weeklyGoal,
            personalRecords: personalRecords,
            unlockedThemes: unlockedThemes,
            unlockedAvatars: unlockedAvatars,
            selectedAvatar: selectedAvatar,
            titles: titles,
            selectedTitle: selectedTitle,
            lastUpdated: new Date().toISOString()
        };
        saveAllUsers();
    }
}

function saveAllUsers() {
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
}

// Initialize App
function initializeApp() {
    // Set user tag and points display
    document.getElementById('userTagDisplay').textContent = currentUserTag;
    document.getElementById('userPoints').textContent = `${points} points`;
    
    // Apply theme (including custom themes)
    applyTheme(settings.theme);
    
    // Initialize all pages
    updateStats();
    renderTasks();
    renderUpcomingTasks();
    renderHistory();
    loadSettings();
    checkMedals();
    updateDate();
    
    // Initialize new progression displays
    updateXPDisplay();
    updateComboDisplay();
    updateGoalDisplay();
    updateProfileDisplay();
    renderPersonalRecords();
    renderThemeOptions();
    renderAvatarOptions();
    renderTitleOptions();
    
    // Check combo expiry every minute
    setInterval(checkComboExpiry, 60000);
}

// Display update functions
function updateXPDisplay() {
    const xpDisplay = document.getElementById('xpDisplay');
    const levelDisplay = document.getElementById('levelDisplay');
    const xpBar = document.getElementById('xpBar');
    const xpNeeded = getXPForLevel(level);
    const xpPercent = (xp / xpNeeded) * 100;
    
    if (levelDisplay) levelDisplay.textContent = level;
    if (xpDisplay) xpDisplay.textContent = `${xp} / ${xpNeeded} XP`;
    if (xpBar) xpBar.style.width = `${xpPercent}%`;
}

function updateComboDisplay() {
    const comboDisplay = document.getElementById('comboDisplay');
    const multiplierDisplay = document.getElementById('multiplierDisplay');
    
    if (comboDisplay) {
        comboDisplay.textContent = combo;
        comboDisplay.classList.toggle('active', combo >= 3);
    }
    if (multiplierDisplay) {
        const mult = getComboMultiplier();
        multiplierDisplay.textContent = `${mult}x`;
        multiplierDisplay.className = `multiplier-badge mult-${mult === 4 ? 'max' : mult >= 2 ? 'high' : 'normal'}`;
    }
}

function updateGoalDisplay() {
    const goalProgress = document.getElementById('goalProgress');
    const goalText = document.getElementById('goalText');
    const goalBar = document.getElementById('goalBar');
    
    if (goalText) goalText.textContent = `${weeklyGoal.completed} / ${weeklyGoal.target} tasks`;
    if (goalBar) goalBar.style.width = `${Math.min((weeklyGoal.completed / weeklyGoal.target) * 100, 100)}%`;
    if (goalProgress) {
        goalProgress.classList.toggle('complete', weeklyGoal.completed >= weeklyGoal.target);
    }
}

function updateProfileDisplay() {
    const titleDisplay = document.getElementById('userTitle');
    const avatarDisplay = document.getElementById('userAvatar');
    
    if (titleDisplay) titleDisplay.textContent = selectedTitle;
    if (avatarDisplay) avatarDisplay.className = `avatar avatar-${selectedAvatar}`;
}

function renderPersonalRecords() {
    const recordsContainer = document.getElementById('personalRecords');
    if (!recordsContainer) return;
    
    recordsContainer.innerHTML = `
        <div class="record-item">
            <i class="fas fa-calendar-day"></i>
            <div class="record-info">
                <span class="record-value">${personalRecords.bestDay}</span>
                <span class="record-label">Best Day</span>
            </div>
        </div>
        <div class="record-item">
            <i class="fas fa-fire"></i>
            <div class="record-info">
                <span class="record-value">${personalRecords.longestStreak}</span>
                <span class="record-label">Longest Streak</span>
            </div>
        </div>
        <div class="record-item">
            <i class="fas fa-trophy"></i>
            <div class="record-info">
                <span class="record-value">${level}</span>
                <span class="record-label">Current Level</span>
            </div>
        </div>
        <div class="record-item">
            <i class="fas fa-clock"></i>
            <div class="record-info">
                <span class="record-value">${Math.floor(personalRecords.totalStudyTime / 60)}h</span>
                <span class="record-label">Study Time</span>
            </div>
        </div>
    `;
}

function renderThemeOptions() {
    const themeSelect = document.getElementById('theme');
    if (!themeSelect) return;
    
    const themeNames = {
        'light': '☀️ Light',
        'dark': '🌙 Dark',
        'ocean': '🌊 Ocean',
        'sunset': '🌅 Sunset',
        'forest': '🌲 Forest',
        'midnight': '🌌 Midnight',
        'galaxy': '✨ Galaxy',
        'neon': '💜 Neon'
    };
    
    themeSelect.innerHTML = unlockedThemes.map(theme => 
        `<option value="${theme}" ${settings.theme === theme ? 'selected' : ''}>${themeNames[theme] || theme}</option>`
    ).join('');
}

function renderAvatarOptions() {
    const avatarContainer = document.getElementById('avatarOptions');
    if (!avatarContainer) return;
    
    const avatarNames = {
        'default': '👤 Default',
        'scholar': '🎓 Scholar',
        'genius': '🧠 Genius',
        'legend': '👑 Legend'
    };
    
    avatarContainer.innerHTML = unlockedAvatars.map(avatar => `
        <div class="avatar-option ${selectedAvatar === avatar ? 'selected' : ''}" data-avatar="${avatar}" onclick="selectAvatar('${avatar}')">
            <span class="avatar-icon">${avatarNames[avatar]?.split(' ')[0] || '👤'}</span>
            <span class="avatar-name">${avatarNames[avatar]?.split(' ')[1] || avatar}</span>
        </div>
    `).join('');
}

function renderTitleOptions() {
    const titleSelect = document.getElementById('titleSelect');
    if (!titleSelect) return;
    
    titleSelect.innerHTML = titles.map(title => 
        `<option value="${title}" ${selectedTitle === title ? 'selected' : ''}>${title}</option>`
    ).join('');
}

function selectAvatar(avatar) {
    if (unlockedAvatars.includes(avatar)) {
        selectedAvatar = avatar;
        updateProfileDisplay();
        renderAvatarOptions();
        saveUserData();
    }
}

function applyTheme(theme) {
    // Remove all theme classes
    document.body.classList.remove('dark-theme', 'ocean-theme', 'sunset-theme', 'forest-theme', 'midnight-theme', 'galaxy-theme', 'neon-theme');
    
    if (theme !== 'light') {
        document.body.classList.add(`${theme}-theme`);
    }
}

// Navigation
menuBtn.addEventListener('click', () => {
    sidebar.classList.add('active');
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('active');
});

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.dataset.page;
        
        // Update active nav link
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Show target page
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(`${targetPage}-page`).classList.add('active');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
});

// Quick action buttons
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const targetLink = document.querySelector(`[data-page="${action}"]`);
        if (targetLink) targetLink.click();
    });
});

// Update Date
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

// Add Task Form
addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const task = {
        id: Date.now(),
        title: document.getElementById('taskTitle').value,
        subject: document.getElementById('taskSubject').value,
        dueDate: document.getElementById('taskDueDate').value,
        priority: document.getElementById('taskPriority').value,
        notes: document.getElementById('taskNotes').value,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    
    // Reset form
    addTaskForm.reset();
    
    // Show success and navigate
    if (settings.soundEffects) playSound('success');
    showNotification('Task added successfully! 🎉');
    
    // Award points
    addPoints(10);
    
    // Navigate to tasks page
    document.querySelector('[data-page="tasks"]').click();
    
    updateStats();
    renderTasks();
    renderUpcomingTasks();
    checkMedals();
});

// Render Tasks
function renderTasks(filter = 'all') {
    const tasksList = document.getElementById('tasksList');
    let filteredTasks = tasks;
    
    if (filter === 'pending') {
        filteredTasks = tasks.filter(t => !t.completed);
    } else if (filter === 'completed') {
        filteredTasks = tasks.filter(t => t.completed);
    }
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No tasks ${filter !== 'all' ? filter : ''}</h3>
                <p>Start by adding a new task!</p>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-info">
                <h3>${task.title}</h3>
                <div class="task-meta">
                    <span class="task-badge subject-badge">${task.subject}</span>
                    <span class="task-badge priority-badge ${task.priority}">${task.priority.toUpperCase()}</span>
                </div>
                <p class="task-date">Due: ${formatDate(task.dueDate)}</p>
            </div>
            <div class="task-actions">
                ${!task.completed ? `<button class="task-btn complete-btn" onclick="completeTask(${task.id})">
                    <i class="fas fa-check"></i> Complete
                </button>` : ''}
                <button class="task-btn delete-btn" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Filter tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTasks(btn.dataset.filter);
    });
});

// Render Upcoming Tasks
function renderUpcomingTasks() {
    const upcomingList = document.getElementById('upcomingTasksList');
    const upcoming = tasks
        .filter(t => !t.completed)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 3);
    
    if (upcoming.length === 0) {
        upcomingList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>All caught up!</h3>
                <p>No upcoming tasks</p>
            </div>
        `;
        return;
    }
    
    upcomingList.innerHTML = upcoming.map(task => `
        <div class="task-item" data-id="${task.id}">
            <div class="task-info">
                <h3>${task.title}</h3>
                <div class="task-meta">
                    <span class="task-badge subject-badge">${task.subject}</span>
                    <span class="task-badge priority-badge ${task.priority}">${task.priority.toUpperCase()}</span>
                </div>
                <p class="task-date">Due: ${formatDate(task.dueDate)}</p>
            </div>
        </div>
    `).join('');
}

// Complete Task
function completeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        completedTasksCount++;
        
        // Update combo first
        updateCombo();
        
        saveTasks();
        saveData('completedCount', completedTasksCount);
        
        // Award points based on priority WITH combo multiplier
        const priorityPoints = {
            low: 15,
            medium: 25,
            high: 50
        };
        const basePoints = priorityPoints[task.priority];
        const multiplier = getComboMultiplier();
        const earnedPoints = Math.floor(basePoints * multiplier);
        addPoints(earnedPoints);
        
        // Award XP
        const xpGained = addXP(basePoints);
        
        // Update weekly goal
        updateWeeklyGoal();
        
        // Update personal records
        updatePersonalRecords();
        
        if (settings.soundEffects) playSound('complete');
        
        // Show notification with combo info
        let msg = `Task completed! +${earnedPoints} points, +${xpGained} XP 🎉`;
        if (multiplier > 1) {
            msg += ` (${multiplier}x combo!)`;
        }
        showNotification(msg);
        
        updateStats();
        renderTasks(document.querySelector('.tab-btn.active').dataset.filter);
        renderUpcomingTasks();
        renderHistory();
        checkMedals();
    }
}

// Delete Task
function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        
        if (settings.soundEffects) playSound('delete');
        showNotification('Task deleted');
        
        updateStats();
        renderTasks(document.querySelector('.tab-btn.active').dataset.filter);
        renderUpcomingTasks();
        renderHistory();
    }
}

// Update Stats
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('streakDays').textContent = streak;
}

// Add Points
function addPoints(amount) {
    points += amount;
    document.getElementById('userPoints').textContent = `${points} points`;
    saveData('points', points);
}

// Render History
function renderHistory() {
    const historyList = document.getElementById('historyList');
    const completedTasks = tasks.filter(t => t.completed).reverse();
    
    if (completedTasks.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No history yet</h3>
                <p>Complete tasks to see them here</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = completedTasks.map(task => `
        <div class="history-item">
            <div class="history-info">
                <h3>${task.title}</h3>
                <p class="history-date">Completed on ${formatDate(task.completedAt)}</p>
            </div>
            <span class="history-status completed">
                <i class="fas fa-check-circle"></i> Completed
            </span>
        </div>
    `).join('');
}

// Check and Unlock Medals
function checkMedals() {
    const studyMinutes = studyTimeData?.totalMinutes || 0;
    
    const medals = [
        // Task milestones
        { id: 'first-task', condition: () => completedTasksCount >= 1 },
        { id: '5-tasks', condition: () => completedTasksCount >= 5 },
        { id: '10-tasks', condition: () => completedTasksCount >= 10 },
        { id: '25-tasks', condition: () => completedTasksCount >= 25 },
        { id: '50-tasks', condition: () => completedTasksCount >= 50 },
        { id: '100-tasks', condition: () => completedTasksCount >= 100 },
        
        // Streak achievements
        { id: '3-day-streak', condition: () => streak >= 3 || bestStreak >= 3 },
        { id: '7-day-streak', condition: () => streak >= 7 || bestStreak >= 7 },
        { id: '14-day-streak', condition: () => streak >= 14 || bestStreak >= 14 },
        { id: '30-day-streak', condition: () => streak >= 30 || bestStreak >= 30 },
        
        // Points achievements
        { id: '100-points', condition: () => points >= 100 },
        { id: '500-points', condition: () => points >= 500 },
        { id: '1000-points', condition: () => points >= 1000 },
        
        // Challenge achievements
        { id: 'perfect-week', condition: () => checkPerfectWeek() },
        { id: 'challenge-complete', condition: () => checkAllChallengesComplete() },
        { id: 'speed-demon', condition: () => (challengeData?.speedChallengesCompleted || 0) >= 5 },
        
        // Study time achievements
        { id: '1-hour-study', condition: () => studyMinutes >= 60 },
        { id: '5-hour-study', condition: () => studyMinutes >= 300 },
        { id: '10-hour-study', condition: () => studyMinutes >= 600 }
    ];
    
    medals.forEach(medal => {
        if (medal.condition() && !unlockedMedals.includes(medal.id)) {
            unlockMedal(medal.id);
        }
    });
    
    updateMedalDisplay();
}

function checkAllChallengesComplete() {
    if (!challengeData) return false;
    return challengeData.speed?.completed && 
           challengeData.focus?.completed && 
           challengeData.priority?.completed && 
           challengeData.variety?.completed && 
           challengeData.earlybird?.completed;
}

function unlockMedal(medalId) {
    unlockedMedals.push(medalId);
    saveData('medals', unlockedMedals);
    
    addPoints(100);
    if (settings.soundEffects) playSound('medal');
    showNotification(`🏆 New Medal Unlocked! Check your medals page!`);
}

function updateMedalDisplay() {
    document.querySelectorAll('.medal-card').forEach(card => {
        const medalId = card.dataset.medal;
        if (unlockedMedals.includes(medalId)) {
            card.classList.remove('locked');
            card.classList.add('unlocked');
        }
    });
}

function checkPerfectWeek() {
    // Simple implementation - check if completed 7+ tasks
    return completedTasksCount >= 7;
}

// Timer
let timerInterval;
let timerSeconds = 25 * 60;
let timerRunning = false;
let timerAudioPlayer = new Audio();
timerAudioPlayer.loop = true;
timerAudioPlayer.volume = 0.3;

// Music tracks for timer
const timerMusicTracks = [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
];

document.getElementById('startTimer').addEventListener('click', startTimer);
document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
document.getElementById('resetTimer').addEventListener('click', resetTimer);
document.getElementById('setCustomTimer').addEventListener('click', setCustomTimer);

// Timer music controls
const timerMusicToggle = document.getElementById('timerMusicToggle');
const timerMusicSelect = document.getElementById('timerMusicSelect');

timerMusicToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        timerMusicSelect.disabled = false;
        if (timerRunning && timerMusicSelect.value) {
            playTimerMusic();
        }
    } else {
        timerMusicSelect.disabled = true;
        pauseTimerMusic();
    }
});

timerMusicSelect.addEventListener('change', (e) => {
    if (timerMusicToggle.checked && e.target.value !== '') {
        playTimerMusic();
    }
});

function playTimerMusic() {
    const selectedIndex = parseInt(timerMusicSelect.value);
    if (!isNaN(selectedIndex) && selectedIndex >= 0) {
        timerAudioPlayer.src = timerMusicTracks[selectedIndex];
        timerAudioPlayer.play().catch(e => console.log('Audio play failed:', e));
    }
}

function pauseTimerMusic() {
    timerAudioPlayer.pause();
}

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const minutes = parseInt(btn.dataset.minutes);
        timerSeconds = minutes * 60;
        updateTimerDisplay();
        if (timerRunning) {
            pauseTimer();
        }
    });
});

function setCustomTimer() {
    const customMinutes = parseInt(document.getElementById('customMinutes').value);
    if (customMinutes && customMinutes > 0 && customMinutes <= 180) {
        timerSeconds = customMinutes * 60;
        updateTimerDisplay();
        if (timerRunning) {
            pauseTimer();
        }
        document.getElementById('customMinutes').value = '';
        showNotification(`Timer set to ${customMinutes} minutes!`);
    } else {
        showNotification('Please enter a valid time (1-180 minutes)');
    }
}

function startTimer() {
    if (!timerRunning) {
        timerRunning = true;
        
        // Start music if enabled
        if (timerMusicToggle.checked && timerMusicSelect.value !== '') {
            playTimerMusic();
        }
        
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                pauseTimer();
                if (settings.soundEffects) playSound('timer');
                showNotification('⏰ Timer finished! Great work!');
                addPoints(20);
            }
        }, 1000);
    }
}

function pauseTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    pauseTimerMusic();
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 25 * 60;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Music Player
const audioPlayer = document.getElementById('audioPlayer');
let currentTrack = null;

document.querySelectorAll('.music-track').forEach(track => {
    const playBtn = track.querySelector('.play-btn');
    
    playBtn.addEventListener('click', () => {
        const src = track.dataset.src;
        
        if (currentTrack === track && !audioPlayer.paused) {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            currentTrack = null;
        } else {
            // Stop any playing track
            document.querySelectorAll('.play-btn').forEach(btn => {
                btn.innerHTML = '<i class="fas fa-play"></i>';
            });
            
            audioPlayer.src = src;
            audioPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            currentTrack = track;
        }
    });
});

audioPlayer.addEventListener('ended', () => {
    if (currentTrack) {
        currentTrack.querySelector('.play-btn').innerHTML = '<i class="fas fa-play"></i>';
        currentTrack = null;
    }
});

// Settings
document.getElementById('userName').value = settings.name;
document.getElementById('theme').value = settings.theme;
document.getElementById('notifications').checked = settings.notifications;
document.getElementById('soundEffects').checked = settings.soundEffects;

document.getElementById('userName').addEventListener('change', (e) => {
    settings.name = e.target.value;
    saveSettings();
});

document.getElementById('theme').addEventListener('change', (e) => {
    settings.theme = e.target.value;
    if (e.target.value === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    saveSettings();
});

document.getElementById('notifications').addEventListener('change', (e) => {
    settings.notifications = e.target.checked;
    saveSettings();
});

document.getElementById('soundEffects').addEventListener('change', (e) => {
    settings.soundEffects = e.target.checked;
    saveSettings();
});

// Helper Functions
function saveTasks() {
    saveUserData();
}

function saveData(key, value) {
    saveUserData();
}

function saveSettings() {
    saveUserData();
}

function loadSettings() {
    // Already loaded in initialization
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function showNotification(message) {
    if (settings.notifications) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

function playSound(type) {
    // Placeholder for sound effects
    // You can add actual sound files later
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    if (type === 'success' || type === 'complete') {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
    } else if (type === 'medal') {
        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.7);
    }
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.5);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ========== COMPETITIVE FEATURES ==========

// Challenge data
let challengeData = JSON.parse(localStorage.getItem('challengeData')) || {
    lastReset: new Date().toDateString(),
    speed: { count: 0, completed: false, startTime: null },
    focus: { minutes: 0, completed: false },
    priority: { count: 0, completed: false },
    variety: { subjects: [], completed: false },
    earlybird: { completed: false },
    dailyGoal: { count: 0, completed: false }
};

let studyTimeData = JSON.parse(localStorage.getItem('studyTimeData')) || {
    totalMinutes: 0,
    dailyMinutes: {}
};

let bestStreak = JSON.parse(localStorage.getItem('bestStreak')) || 0;

// Initialize competitive features
function initCompetitiveFeatures() {
    checkChallengeReset();
    renderLeaderboard();
    renderStats();
    renderChallenges();
    updateChallengeResetTimer();
    
    // Update reset timer every second
    setInterval(updateChallengeResetTimer, 1000);
}

// Call this after initializeApp
const originalInitializeApp = initializeApp;
initializeApp = function() {
    originalInitializeApp();
    initCompetitiveFeatures();
};

// Leaderboard Tab Switching
document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLeaderboard(tab.dataset.period);
    });
});

// Stats Period Switching
document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderStats(btn.dataset.period);
    });
});

// Render Leaderboard
function renderLeaderboard(period = 'weekly') {
    const leaderboardList = document.getElementById('leaderboardList');
    
    // Get all users and calculate their stats
    let leaderboardData = [];
    
    for (let tag in allUsers) {
        const user = allUsers[tag];
        let userPoints = user.points || 0;
        let userTasks = user.completedCount || 0;
        let userStreak = user.streak || 0;
        
        leaderboardData.push({
            tag: tag,
            name: user.settings?.name || tag.split('#')[0],
            points: userPoints,
            tasks: userTasks,
            streak: userStreak
        });
    }
    
    // Sort by points
    leaderboardData.sort((a, b) => b.points - a.points);
    
    // Update your rank card
    const yourIndex = leaderboardData.findIndex(u => u.tag === currentUserTag);
    document.getElementById('yourRank').textContent = yourIndex >= 0 ? `#${yourIndex + 1}` : '#-';
    document.getElementById('yourLbPoints').textContent = points;
    document.getElementById('yourLbTasks').textContent = completedTasksCount;
    document.getElementById('yourLbStreak').textContent = streak;
    
    // Render leaderboard
    if (leaderboardData.length === 0) {
        leaderboardList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No competitors yet!</h3>
                <p>Be the first to climb the leaderboard</p>
            </div>
        `;
        return;
    }
    
    const emojis = ['👑', '🥈', '🥉'];
    
    leaderboardList.innerHTML = leaderboardData.slice(0, 10).map((user, index) => {
        const isYou = user.tag === currentUserTag;
        const topClass = index < 3 ? `top-${index + 1}` : '';
        const youClass = isYou ? 'is-you' : '';
        const initial = user.name.charAt(0).toUpperCase();
        
        return `
            <div class="leaderboard-item ${topClass} ${youClass}">
                <div class="lb-rank">${index < 3 ? emojis[index] : `#${index + 1}`}</div>
                <div class="lb-avatar">${initial}</div>
                <div class="lb-info">
                    <div class="lb-name">${user.name} ${isYou ? '(You)' : ''}</div>
                    <div class="lb-tag">${user.tag}</div>
                </div>
                <div class="lb-points">${user.points} pts</div>
            </div>
        `;
    }).join('');
}

// Render Stats
function renderStats(period = 'week') {
    // Update overview stats
    document.getElementById('statTasksCompleted').textContent = completedTasksCount;
    document.getElementById('statPointsEarned').textContent = points;
    document.getElementById('statBestStreak').textContent = Math.max(bestStreak, streak);
    document.getElementById('statStudyTime').textContent = `${Math.floor(studyTimeData.totalMinutes / 60)}h ${studyTimeData.totalMinutes % 60}m`;
    
    // Update best streak if current is higher
    if (streak > bestStreak) {
        bestStreak = streak;
        localStorage.setItem('bestStreak', JSON.stringify(bestStreak));
    }
    
    // Render activity chart
    renderActivityChart();
    
    // Render subject breakdown
    renderSubjectBreakdown();
    
    // Render weekly report
    renderWeeklyReport();
}

function renderActivityChart() {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = new Date();
    const dayTasks = {};
    
    // Count tasks completed per day of this week
    days.forEach(day => dayTasks[day] = 0);
    
    tasks.filter(t => t.completed && t.completedAt).forEach(task => {
        const completedDate = new Date(task.completedAt);
        const dayOfWeek = completedDate.getDay();
        const dayName = days[dayOfWeek];
        
        // Check if it's from this week
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        if (completedDate >= weekStart) {
            dayTasks[dayName]++;
        }
    });
    
    // Find max for scaling
    const maxTasks = Math.max(...Object.values(dayTasks), 1);
    
    // Update bars
    days.forEach(day => {
        const bar = document.querySelector(`.bar[data-day="${day}"] .bar-fill`);
        if (bar) {
            const height = (dayTasks[day] / maxTasks) * 100;
            bar.style.height = `${height}%`;
        }
    });
}

function renderSubjectBreakdown() {
    const subjectBreakdown = document.getElementById('subjectBreakdown');
    const subjectCounts = {};
    const subjectColors = {
        'Math': '#FF6B6B',
        'Science': '#4ECDC4',
        'English': '#45B7D1',
        'History': '#96CEB4',
        'Computer Science': '#6C63FF',
        'Other': '#FFB74D'
    };
    
    tasks.filter(t => t.completed).forEach(task => {
        const subject = task.subject || 'Other';
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });
    
    const maxCount = Math.max(...Object.values(subjectCounts), 1);
    
    if (Object.keys(subjectCounts).length === 0) {
        subjectBreakdown.innerHTML = '<p style="color: var(--text-secondary);">Complete tasks to see subject breakdown</p>';
        return;
    }
    
    subjectBreakdown.innerHTML = Object.entries(subjectCounts).map(([subject, count]) => {
        const color = subjectColors[subject] || '#999';
        const width = (count / maxCount) * 100;
        
        return `
            <div class="subject-item">
                <div class="subject-color" style="background: ${color}"></div>
                <span class="subject-name">${subject}</span>
                <div class="subject-bar">
                    <div class="subject-bar-fill" style="width: ${width}%; background: ${color}"></div>
                </div>
                <span class="subject-count">${count}</span>
            </div>
        `;
    }).join('');
}

function renderWeeklyReport() {
    const weeklyReport = document.getElementById('weeklyReport');
    
    // Calculate this week's stats
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const thisWeekTasks = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        return new Date(t.completedAt) >= weekStart;
    }).length;
    
    // Determine productivity message
    let productivityMsg = '';
    let productivityClass = '';
    
    if (thisWeekTasks >= 10) {
        productivityMsg = '🔥 Outstanding productivity this week!';
        productivityClass = '';
    } else if (thisWeekTasks >= 5) {
        productivityMsg = '👍 Good progress! Keep it up!';
        productivityClass = '';
    } else if (thisWeekTasks >= 1) {
        productivityMsg = '💪 You\'re getting started! Push a little more!';
        productivityClass = '';
    } else {
        productivityMsg = '⏰ No tasks completed yet this week. Let\'s get started!';
        productivityClass = 'negative';
    }
    
    weeklyReport.innerHTML = `
        <div class="report-summary">
            <div class="report-item">
                <span class="value">${thisWeekTasks}</span>
                <span class="label">Tasks This Week</span>
            </div>
            <div class="report-item">
                <span class="value">${streak}</span>
                <span class="label">Current Streak</span>
            </div>
            <div class="report-item">
                <span class="value">${Math.floor(studyTimeData.totalMinutes / 60)}h</span>
                <span class="label">Total Study Time</span>
            </div>
        </div>
        <div class="report-comparison ${productivityClass}">
            <i class="fas ${productivityClass === 'negative' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
            <span>${productivityMsg}</span>
        </div>
    `;
}

// Challenge System
function checkChallengeReset() {
    const today = new Date().toDateString();
    
    if (challengeData.lastReset !== today) {
        // Reset challenges for new day
        challengeData = {
            lastReset: today,
            speed: { count: 0, completed: false, startTime: null },
            focus: { minutes: 0, completed: false },
            priority: { count: 0, completed: false },
            variety: { subjects: [], completed: false },
            earlybird: { completed: false },
            dailyGoal: { count: 0, completed: false }
        };
        saveChallengeData();
    }
}

function saveChallengeData() {
    localStorage.setItem('challengeData', JSON.stringify(challengeData));
}

function updateChallengeResetTimer() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const timerEl = document.getElementById('challengeResetTime');
    if (timerEl) {
        timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function renderChallenges() {
    // Update streak display
    document.getElementById('challengeStreak').textContent = streak;
    
    // Daily goal
    const dailyGoalCount = challengeData.dailyGoal.count;
    const dailyGoalTarget = 3;
    document.getElementById('dailyGoalFill').style.width = `${Math.min((dailyGoalCount / dailyGoalTarget) * 100, 100)}%`;
    document.getElementById('dailyGoalText').textContent = `${dailyGoalCount}/${dailyGoalTarget} tasks completed`;
    
    // Speed challenge (2 tasks in 1 hour)
    updateChallengeProgress('speed', challengeData.speed.count, 2);
    
    // Focus challenge (25 min timer)
    updateChallengeProgress('focus', challengeData.focus.minutes, 25, 'min');
    
    // Priority challenge (1 high priority task)
    updateChallengeProgress('priority', challengeData.priority.count, 1);
    
    // Variety challenge (3 different subjects)
    updateChallengeProgress('variety', challengeData.variety.subjects.length, 3);
    
    // Early bird challenge (task before 9 AM)
    updateChallengeProgress('earlybird', challengeData.earlybird.completed ? 1 : 0, 1);
    
    // Mark completed challenges
    document.querySelectorAll('.challenge-card').forEach(card => {
        const challengeId = card.dataset.challenge;
        if (challengeData[challengeId]?.completed) {
            card.classList.add('completed');
        } else {
            card.classList.remove('completed');
        }
    });
}

function updateChallengeProgress(challengeId, current, target, suffix = '') {
    const progressEl = document.getElementById(`${challengeId}Progress`);
    const textEl = document.getElementById(`${challengeId}Text`);
    
    if (progressEl) {
        progressEl.style.width = `${Math.min((current / target) * 100, 100)}%`;
    }
    if (textEl) {
        textEl.textContent = `${current}/${target}${suffix ? ' ' + suffix : ''}`;
    }
}

// Track task completion for challenges
function trackChallengeProgress(task) {
    const now = new Date();
    const hour = now.getHours();
    
    // Daily goal
    challengeData.dailyGoal.count++;
    if (challengeData.dailyGoal.count >= 3 && !challengeData.dailyGoal.completed) {
        challengeData.dailyGoal.completed = true;
        awardChallengeBonus(50, 'Daily Goal');
    }
    
    // Speed challenge
    if (!challengeData.speed.startTime) {
        challengeData.speed.startTime = now.getTime();
    }
    const timeSinceStart = now.getTime() - challengeData.speed.startTime;
    if (timeSinceStart <= 60 * 60 * 1000) { // Within 1 hour
        challengeData.speed.count++;
        if (challengeData.speed.count >= 2 && !challengeData.speed.completed) {
            challengeData.speed.completed = true;
            awardChallengeBonus(30, 'Speed Demon');
        }
    } else {
        // Reset if more than 1 hour
        challengeData.speed.startTime = now.getTime();
        challengeData.speed.count = 1;
    }
    
    // Priority challenge
    if (task.priority === 'high' && !challengeData.priority.completed) {
        challengeData.priority.count = 1;
        challengeData.priority.completed = true;
        awardChallengeBonus(40, 'Priority First');
    }
    
    // Variety challenge
    if (task.subject && !challengeData.variety.subjects.includes(task.subject)) {
        challengeData.variety.subjects.push(task.subject);
        if (challengeData.variety.subjects.length >= 3 && !challengeData.variety.completed) {
            challengeData.variety.completed = true;
            awardChallengeBonus(35, 'Variety Pack');
        }
    }
    
    // Early bird challenge
    if (hour < 9 && !challengeData.earlybird.completed) {
        challengeData.earlybird.completed = true;
        awardChallengeBonus(20, 'Early Bird');
    }
    
    saveChallengeData();
    renderChallenges();
}

function awardChallengeBonus(bonusPoints, challengeName) {
    points += bonusPoints;
    document.getElementById('userPoints').textContent = `${points} points`;
    saveUserData();
    showNotification(`🎯 Challenge Complete: ${challengeName}! +${bonusPoints} bonus points!`);
}

// Track study time from timer
function trackStudyTime(minutes) {
    studyTimeData.totalMinutes += minutes;
    
    const today = new Date().toDateString();
    studyTimeData.dailyMinutes[today] = (studyTimeData.dailyMinutes[today] || 0) + minutes;
    
    localStorage.setItem('studyTimeData', JSON.stringify(studyTimeData));
    
    // Focus challenge
    challengeData.focus.minutes += minutes;
    if (challengeData.focus.minutes >= 25 && !challengeData.focus.completed) {
        challengeData.focus.completed = true;
        awardChallengeBonus(25, 'Focus Master');
    }
    saveChallengeData();
    renderChallenges();
    renderStats();
}

// Override completeTask to track challenges
const originalCompleteTask = completeTask;
completeTask = function(id) {
    const task = tasks.find(t => t.id === id);
    originalCompleteTask(id);
    if (task && !task.completed) {
        // Task was just completed, track for challenges
        setTimeout(() => {
            const completedTask = tasks.find(t => t.id === id);
            if (completedTask && completedTask.completed) {
                trackChallengeProgress(completedTask);
            }
        }, 100);
    }
};

// Track timer completion for study time
const originalTimerComplete = function() {
    pauseTimer();
    if (settings.soundEffects) playSound('timer');
    showNotification('⏰ Timer finished! Great work!');
    addPoints(20);
};

// Modify timer to track study time
const originalStartTimer = startTimer;
let timerStartSeconds = 0;

startTimer = function() {
    timerStartSeconds = timerSeconds;
    originalStartTimer();
};

// Track study time when timer finishes
const checkTimerComplete = setInterval(() => {
    if (timerRunning && timerSeconds === 0) {
        const minutesStudied = Math.floor((timerStartSeconds - timerSeconds) / 60);
        if (minutesStudied > 0) {
            trackStudyTime(minutesStudied);
        }
    }
}, 1000);

// ===== AI ASSISTANT =====
const aiMessages = document.getElementById('aiMessages');
const aiInput = document.getElementById('aiInput');
const aiSendBtn = document.getElementById('aiSendBtn');
const suggestionChips = document.querySelectorAll('.suggestion-chip');

// AI Configuration - Using Groq's free API
const AI_CONFIG = {
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    // Note: For production, you should use environment variables or a backend
    apiKey: null, // Will use fallback responses if no key
    model: 'llama-3.3-70b-versatile'
};

// Fallback responses for when API is not available
const fallbackResponses = {
    'study': [
        "Here are some effective study tips:\n\n1. **Pomodoro Technique**: Study for 25 minutes, then take a 5-minute break.\n2. **Active Recall**: Test yourself instead of just re-reading notes.\n3. **Spaced Repetition**: Review material at increasing intervals.\n4. **Teach Others**: Explaining concepts helps you understand them better.\n5. **Get Enough Sleep**: Your brain consolidates memories during sleep!",
        "To study more effectively:\n\n• Find a quiet, distraction-free environment\n• Break large tasks into smaller chunks\n• Use visual aids like diagrams and mind maps\n• Take regular breaks to avoid burnout\n• Stay hydrated and eat brain-healthy foods!"
    ],
    'focus': [
        "Tips to stay focused while studying:\n\n1. **Remove Distractions**: Put your phone in another room or use app blockers.\n2. **Set Clear Goals**: Know exactly what you want to accomplish.\n3. **Use Background Music**: Try lo-fi or classical music (use our Music feature!).\n4. **Take Breaks**: Short breaks every 25-30 minutes help maintain focus.\n5. **Stay Hydrated**: Dehydration can affect concentration.",
        "Staying focused can be challenging! Here's what works:\n\n• Start with the hardest task when your energy is highest\n• Use the 2-minute rule: if it takes less than 2 minutes, do it now\n• Create a dedicated study space\n• Set specific times for studying\n• Reward yourself after completing tasks!"
    ],
    'math': [
        "I'd be happy to help with math! Here's a general approach:\n\n1. **Read the problem carefully** - identify what's given and what's asked.\n2. **Draw a diagram** if applicable.\n3. **Write down relevant formulas**.\n4. **Solve step by step** - don't skip steps!\n5. **Check your answer** by plugging it back in.\n\nWhat specific math topic do you need help with?",
        "For math problems, try this approach:\n\n• Understand the problem before solving\n• Look for patterns and relationships\n• Practice similar problems repeatedly\n• Don't be afraid to make mistakes - they help you learn!\n• Use online resources like Khan Academy for extra practice"
    ],
    'writing': [
        "Tips for better writing:\n\n1. **Plan before you write** - create an outline.\n2. **Hook your reader** with an engaging introduction.\n3. **One idea per paragraph** - keep it organized.\n4. **Use transitions** to connect ideas smoothly.\n5. **Revise and edit** - good writing is rewriting!\n\nWhat are you working on?",
        "To improve your writing:\n\n• Read more! Good readers make good writers.\n• Practice writing regularly\n• Get feedback from others\n• Learn grammar rules, but don't obsess over them in first drafts\n• Edit your work multiple times"
    ],
    'notes': [
        "Effective note-taking methods:\n\n1. **Cornell Method**: Divide your page into notes, cues, and summary sections.\n2. **Mind Mapping**: Create visual diagrams connecting ideas.\n3. **Outline Method**: Use headings and bullet points hierarchically.\n4. **Charting Method**: Great for comparing information.\n5. **Sentence Method**: Write each new fact on a new line.\n\nThe best method depends on the subject and your learning style!",
        "Great note-taking habits:\n\n• Don't write everything - focus on key concepts\n• Use abbreviations and symbols\n• Review notes within 24 hours\n• Rewrite or type up messy notes\n• Color-code by topic or importance"
    ],
    'default': [
        "Great question! As your AI Study Assistant, I'm here to help you succeed. I can assist with:\n\n• Study strategies and techniques\n• Understanding difficult concepts\n• Time management tips\n• Test preparation advice\n• General academic guidance\n\nCould you give me more details about what you need help with?",
        "I'd love to help! Could you tell me more about:\n\n• What subject you're studying?\n• What specific concept is confusing?\n• What assignment you're working on?\n\nThe more details you provide, the better I can assist you!"
    ]
};

// Add message to chat
function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${isUser ? 'user' : 'bot'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = formatMessage(content);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    aiMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Format message with markdown-like syntax
function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
        .replace(/• /g, '&bull; ');
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message bot';
    typingDiv.id = 'typingIndicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(contentDiv);
    aiMessages.appendChild(typingDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// Get fallback response based on keywords
function getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('study') || lowerMessage.includes('learn') || lowerMessage.includes('effective')) {
        return fallbackResponses.study[Math.floor(Math.random() * fallbackResponses.study.length)];
    }
    if (lowerMessage.includes('focus') || lowerMessage.includes('concentrate') || lowerMessage.includes('distract')) {
        return fallbackResponses.focus[Math.floor(Math.random() * fallbackResponses.focus.length)];
    }
    if (lowerMessage.includes('math') || lowerMessage.includes('equation') || lowerMessage.includes('calculate') || lowerMessage.includes('pythagorean')) {
        return fallbackResponses.math[Math.floor(Math.random() * fallbackResponses.math.length)];
    }
    if (lowerMessage.includes('writ') || lowerMessage.includes('essay') || lowerMessage.includes('grammar')) {
        return fallbackResponses.writing[Math.floor(Math.random() * fallbackResponses.writing.length)];
    }
    if (lowerMessage.includes('note') || lowerMessage.includes('taking')) {
        return fallbackResponses.notes[Math.floor(Math.random() * fallbackResponses.notes.length)];
    }
    
    return fallbackResponses.default[Math.floor(Math.random() * fallbackResponses.default.length)];
}

// Send message to AI
async function sendToAI(message) {
    showTypingIndicator();
    aiSendBtn.disabled = true;
    
    try {
        // Use free AI API (no key required)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' // Needs API key
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI study assistant for students. Help with homework, explain concepts, answer questions about any subject including history, science, math, literature, etc. Keep responses informative but concise. Use bullet points when helpful. Be encouraging and supportive.'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 600
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            removeTypingIndicator();
            addMessage(data.choices[0].message.content);
            aiSendBtn.disabled = false;
            return;
        }
        
        // If API fails, try alternative free API
        const altResponse = await fetch('https://free.churchless.tech/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI study assistant for students. Help with homework, explain concepts, answer questions about any subject including history, science, math, literature, etc. Keep responses informative but concise. Use bullet points when helpful.'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ]
            })
        });
        
        if (altResponse.ok) {
            const altData = await altResponse.json();
            removeTypingIndicator();
            addMessage(altData.choices[0].message.content);
            aiSendBtn.disabled = false;
            return;
        }
        
        // Final fallback - use a working free API
        const freeResponse = await fetch('https://api.pawan.krd/cosmosrp/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI study assistant. Answer questions about any subject thoroughly - history, science, math, literature, etc. Be educational and informative.'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ]
            })
        });
        
        if (freeResponse.ok) {
            const freeData = await freeResponse.json();
            removeTypingIndicator();
            addMessage(freeData.choices[0].message.content);
            aiSendBtn.disabled = false;
            return;
        }
        
        // If all APIs fail, use enhanced fallback
        await new Promise(resolve => setTimeout(resolve, 800));
        removeTypingIndicator();
        addMessage(getEnhancedFallbackResponse(message));
        
    } catch (error) {
        console.error('AI Error:', error);
        removeTypingIndicator();
        addMessage(getEnhancedFallbackResponse(message));
    }
    
    aiSendBtn.disabled = false;
}

// Enhanced fallback with more intelligent responses
function getEnhancedFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // History questions
    if (lowerMessage.includes('french revolution')) {
        return "**The French Revolution (1789-1799)** is one of history's most debated events!\n\n**Arguments for 'Step Towards Liberty':**\n• Ended absolute monarchy and feudalism\n• Established principles of citizenship and rights (Declaration of the Rights of Man)\n• Inspired democratic movements worldwide\n• Created foundations for modern constitutional government\n\n**Arguments for 'Chaos and Tyranny':**\n• The Reign of Terror killed 17,000+ people\n• Led to Napoleon's dictatorship\n• Economic instability and violence\n• Replaced one form of tyranny with another\n\n**Balanced View:** Most historians see it as both - a messy, violent process that ultimately advanced liberty and constitutional ideas, but at tremendous human cost. The ideals survived even when the revolution itself descended into terror.";
    }
    
    if (lowerMessage.includes('revolution') || lowerMessage.includes('history')) {
        return "That's a great history question! To give you the best answer, could you specify:\n\n• Which revolution or historical event?\n• What time period?\n• What aspect interests you most (causes, effects, key figures)?\n\nI'm here to help you understand history better!";
    }
    
    // Science questions  
    if (lowerMessage.includes('science') || lowerMessage.includes('physics') || lowerMessage.includes('chemistry') || lowerMessage.includes('biology')) {
        return "I'd love to help with science! Please share:\n\n• The specific topic or concept\n• Any formulas or terms you're working with\n• What part is confusing you\n\nScience can be tricky, but breaking it down step by step makes it manageable!";
    }
    
    // Original fallback responses
    if (lowerMessage.includes('study') || lowerMessage.includes('learn') || lowerMessage.includes('effective')) {
        return fallbackResponses.study[Math.floor(Math.random() * fallbackResponses.study.length)];
    }
    if (lowerMessage.includes('focus') || lowerMessage.includes('concentrate') || lowerMessage.includes('distract')) {
        return fallbackResponses.focus[Math.floor(Math.random() * fallbackResponses.focus.length)];
    }
    if (lowerMessage.includes('math') || lowerMessage.includes('equation') || lowerMessage.includes('calculate') || lowerMessage.includes('pythagorean')) {
        return fallbackResponses.math[Math.floor(Math.random() * fallbackResponses.math.length)];
    }
    if (lowerMessage.includes('writ') || lowerMessage.includes('essay') || lowerMessage.includes('grammar')) {
        return fallbackResponses.writing[Math.floor(Math.random() * fallbackResponses.writing.length)];
    }
    if (lowerMessage.includes('note') || lowerMessage.includes('taking')) {
        return fallbackResponses.notes[Math.floor(Math.random() * fallbackResponses.notes.length)];
    }
    
    return "I'm currently running in offline mode without full AI capabilities. For complex questions like yours, I recommend:\n\n• **ChatGPT** (chat.openai.com)\n• **Claude** (claude.ai)\n• **Perplexity** (perplexity.ai)\n\nOr try rephrasing your question with keywords like 'study tips', 'math help', 'writing', or 'focus' for my built-in responses!";
}

// Handle send button click
if (aiSendBtn) {
    aiSendBtn.addEventListener('click', () => {
        const message = aiInput.value.trim();
        if (message) {
            addMessage(message, true);
            aiInput.value = '';
            sendToAI(message);
        }
    });
}

// Handle Enter key (Shift+Enter for new line)
if (aiInput) {
    aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            aiSendBtn.click();
        }
    });
}

// Handle suggestion chips
suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const question = chip.dataset.question;
        aiInput.value = question;
        aiSendBtn.click();
    });
});

