// Authentication utilities
const auth = {
    // Check if user is logged in
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    // Get current user from localStorage
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Get user role
    getUserRole() {
        const user = this.getCurrentUser();
        return user ? user.employeeType : null;
    },

    // Save login data
    saveLoginData(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    // Logout
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../index.html';
    },

    // Redirect to appropriate dashboard based on role
    redirectToDashboard() {
        const role = this.getUserRole();

        if (!role) {
            window.location.href = '../index.html';
            return;
        }

        switch (role) {
            case 'Admin':
                window.location.href = 'admin/dashboard.html';
                break;
            case 'Managerial':
                window.location.href = 'manager/dashboard.html';
                break;
            default:
                window.location.href = 'employee/dashboard.html';
                break;
        }
    },

    // Check if user has required role
    hasRole(requiredRole) {
        const role = this.getUserRole();

        if (requiredRole === 'Admin') {
            return role === 'Admin';
        } else if (requiredRole === 'Managerial') {
            return role === 'Admin' || role === 'Managerial';
        }

        return true; // Everyone has access to employee-level features
    },

    // Protect page - redirect if not authenticated or doesn't have required role
    protectPage(requiredRole = null) {
        if (!this.isAuthenticated()) {
            window.location.href = '../index.html';
            return false;
        }

        if (requiredRole && !this.hasRole(requiredRole)) {
            showToast('You do not have permission to access this page', 'error');
            this.redirectToDashboard();
            return false;
        }

        return true;
    },

    // Initialize auth check on page load
    init(requiredRole = null) {
        return this.protectPage(requiredRole);
    }
};
