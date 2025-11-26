// Reusable UI Components

// Toast notification system
let toastContainer = null;

function initToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

function showToast(message, type = 'info', duration = 3000) {
    initToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <div style="flex: 1;">${utils.escapeHtml(message)}</div>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #666;">&times;</button>
  `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Loading overlay
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Confirmation dialog
function confirm(message, onConfirm, onCancel = null) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h3 class="modal-title">Confirm Action</h3>
      </div>
      <div class="modal-body">
        <p>${utils.escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button class="btn btn-danger" id="confirm-btn">Confirm</button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    const confirmBtn = modal.querySelector('#confirm-btn');
    const cancelBtn = modal.querySelector('#cancel-btn');

    confirmBtn.onclick = () => {
        modal.remove();
        if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
        modal.remove();
        if (onCancel) onCancel();
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    };
}

// Create sidebar navigation
function createSidebar(role, activePage = '') {
    const user = auth.getCurrentUser();

    let navItems = '';

    if (role === 'Admin') {
        navItems = `
      <a href="/public/admin/dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
        <i>📊</i> Dashboard
      </a>
      <a href="/public/admin/employees.html" class="nav-item ${activePage === 'employees' ? 'active' : ''}">
        <i>👥</i> Employees
      </a>
      <a href="/public/admin/types.html" class="nav-item ${activePage === 'types' ? 'active' : ''}">
        <i>🏷️</i> Job Titles
      </a>
      <a href="/public/admin/tasks.html" class="nav-item ${activePage === 'tasks' ? 'active' : ''}">
        <i>📋</i> Tasks
      </a>
      <a href="/public/admin/responsibilities.html" class="nav-item ${activePage === 'responsibilities' ? 'active' : ''}">
        <i>⚡</i> Responsibilities
      </a>
      <a href="/public/admin/notes.html" class="nav-item ${activePage === 'notes' ? 'active' : ''}">
        <i>📝</i> Notes
      </a>
      <a href="/public/admin/deductions.html" class="nav-item ${activePage === 'deductions' ? 'active' : ''}">
        <i>💰</i> Deductions
      </a>
      <a href="/public/admin/analytics.html" class="nav-item ${activePage === 'analytics' ? 'active' : ''}">
        <i>📈</i> Analytics
      </a>
      <a href="/public/admin/payroll.html" class="nav-item ${activePage === 'payroll' ? 'active' : ''}">
        <i>💵</i> Payroll
      </a>
      <a href="/public/admin/settings.html" class="nav-item ${activePage === 'settings' ? 'active' : ''}">
        <i>⚙️</i> Settings
      </a>
    `;
    } else if (role === 'Managerial') {
        navItems = `
      <a href="/public/manager/dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
        <i>📊</i> Dashboard
      </a>
      <a href="/public/manager/tasks.html" class="nav-item ${activePage === 'tasks' ? 'active' : ''}">
        <i>📋</i> Tasks
      </a>
      <a href="/public/manager/attendance.html" class="nav-item ${activePage === 'attendance' ? 'active' : ''}">
        <i>⏰</i> Attendance
      </a>
    `;
    } else {
        navItems = `
      <a href="/public/employee/dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
        <i>📊</i> Dashboard
      </a>
      <a href="/public/employee/tasks.html" class="nav-item ${activePage === 'tasks' ? 'active' : ''}">
        <i>📋</i> My Tasks
      </a>
      <a href="/public/employee/attendance.html" class="nav-item ${activePage === 'attendance' ? 'active' : ''}">
        <i>⏰</i> Attendance
      </a>
    `;
    }

    return `
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>EMS</h2>
        <p class="user-role">${user ? user.name : ''}</p>
        <p class="user-role">${role}</p>
      </div>
      <nav class="sidebar-nav">
        ${navItems}
      </nav>
      <div class="sidebar-footer">
        <button class="btn btn-secondary" style="width: 100%;" onclick="auth.logout()">
          <i>🚪</i> Logout
        </button>
      </div>
    </div>
  `;
}

// Create page header
function createPageHeader(title, subtitle = '') {
    return `
    <div class="card">
      <h1>${title}</h1>
      ${subtitle ? `<p class="text-muted">${subtitle}</p>` : ''}
    </div>
  `;
}

// Create modal
function createModal(id, title, content, footer = '') {
    return `
    <div id="${id}" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="closeModal('${id}')">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    </div>
  `;
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Create table
function createTable(headers, rows, actions = null) {
    let headerHTML = '<tr>';
    headers.forEach(header => {
        headerHTML += `<th>${header}</th>`;
    });
    if (actions) {
        headerHTML += '<th>Actions</th>';
    }
    headerHTML += '</tr>';

    let rowsHTML = '';
    rows.forEach(row => {
        rowsHTML += '<tr>';
        row.data.forEach(cell => {
            rowsHTML += `<td>${cell}</td>`;
        });
        if (actions) {
            rowsHTML += `<td>${actions(row)}</td>`;
        }
        rowsHTML += '</tr>';
    });

    return `
    <div class="table-container">
      <table>
        <thead>${headerHTML}</thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>
  `;
}

// Create empty state
function createEmptyState(message, icon = '📭') {
    return `
    <div class="card text-center" style="padding: 3rem;">
      <div style="font-size: 4rem; margin-bottom: 1rem;">${icon}</div>
      <h3 class="text-muted">${message}</h3>
    </div>
  `;
}
