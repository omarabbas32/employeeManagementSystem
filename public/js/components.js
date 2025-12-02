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

// Create sidebar navigation with mobile menu support
function createSidebar(role, activePage = '') {
  const user = auth.getCurrentUser();

  let navItems = '';

  if (role === 'Admin') {
    navItems = `
      <a href="/public/admin/dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
        <i class="fas fa-chart-line"></i> Dashboard
      </a>
      <a href="/public/admin/employees.html" class="nav-item ${activePage === 'employees' ? 'active' : ''}">
        <i class="fas fa-users"></i> Employees
      </a>
      <a href="/public/admin/types.html" class="nav-item ${activePage === 'types' ? 'active' : ''}">
        <i class="fas fa-tag"></i> Job Titles
      </a>
      <a href="/public/admin/tasks.html" class="nav-item ${activePage === 'tasks' ? 'active' : ''}">
        <i class="fas fa-tasks"></i> Tasks
      </a>
      <a href="/public/admin/responsibilities.html" class="nav-item ${activePage === 'responsibilities' ? 'active' : ''}">
        <i class="fas fa-bullseye"></i> Responsibilities
      </a>
      <a href="/public/admin/notes.html" class="nav-item ${activePage === 'notes' ? 'active' : ''}">
        <i class="fas fa-sticky-note"></i> Notes
      </a>
      <a href="/public/admin/deductions.html" class="nav-item ${activePage === 'deductions' ? 'active' : ''}">
        <i class="fas fa-minus-circle"></i> Deductions
      </a>
      <a href="/public/admin/analytics.html" class="nav-item ${activePage === 'analytics' ? 'active' : ''}">
        <i class="fas fa-chart-bar"></i> Analytics
      </a>
      <a href="/public/admin/payroll.html" class="nav-item ${activePage === 'payroll' ? 'active' : ''}">
        <i class="fas fa-money-bill-wave"></i> Payroll
      </a>
      <a href="/public/admin/daily-report.html" class="nav-item ${activePage === 'reports' ? 'active' : ''}">
        <i class="fas fa-file-alt"></i> Daily Report
      </a>
    `;
  } else if (role === 'Managerial') {
    navItems = `
      <a href="/public/manager/dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
        <i class="fas fa-chart-line"></i> Dashboard
      </a>
      <a href="/public/manager/tasks.html" class="nav-item ${activePage === 'tasks' ? 'active' : ''}">
        <i class="fas fa-tasks"></i> Tasks
      </a>
      <a href="/public/manager/responsibilities.html" class="nav-item ${activePage === 'responsibilities' ? 'active' : ''}">
        <i class="fas fa-bullseye"></i> Responsibilities
      </a>
      <a href="/public/manager/attendance.html" class="nav-item ${activePage === 'attendance' ? 'active' : ''}">
        <i class="fas fa-clock"></i> Attendance
      </a>
      <a href="/public/manager/daily-report.html" class="nav-item ${activePage === 'reports' ? 'active' : ''}">
        <i class="fas fa-file-alt"></i> Daily Report
      </a>
    `;
  } else {
    navItems = `
      <a href="/public/employee/dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
        <i class="fas fa-chart-line"></i> Dashboard
      </a>
      <a href="/public/employee/tasks.html" class="nav-item ${activePage === 'tasks' ? 'active' : ''}">
        <i class="fas fa-tasks"></i> My Tasks
      </a>
      <a href="/public/employee/attendance.html" class="nav-item ${activePage === 'attendance' ? 'active' : ''}">
        <i class="fas fa-clock"></i> Attendance
      </a>
       <a href="/public/employee/responsibilities.html" class="nav-item ${activePage === 'responsibilities' ? 'active' : ''}">
         <i class="fas fa-user-tie"></i> Responsibilities
      </a>
    `;
  }

  return `
    <button class="mobile-menu-toggle" id="mobile-menu-toggle" onclick="toggleMobileMenu()">
      <div class="hamburger-icon">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </button>
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeMobileMenu()"></div>
    <div class="sidebar" id="sidebar">
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
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  `;
}

// Mobile menu toggle functions
function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('mobile-menu-toggle');
  const body = document.body;

  if (sidebar && overlay && toggle) {
    const isOpen = sidebar.classList.contains('mobile-open');

    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }
}

function openMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('mobile-menu-toggle');
  const body = document.body;

  if (sidebar && overlay && toggle) {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
    toggle.classList.add('active');
    body.classList.add('sidebar-open');
  }
}

function closeMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('mobile-menu-toggle');
  const body = document.body;

  if (sidebar && overlay && toggle) {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    toggle.classList.remove('active');
    body.classList.remove('sidebar-open');
  }
}

// Auto-close mobile menu when clicking nav items
document.addEventListener('DOMContentLoaded', function () {
  // Add click event to all nav items to close mobile menu
  setTimeout(() => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        closeMobileMenu();
      });
    });
  }, 100);
});

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
