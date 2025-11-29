// API Service - Centralized HTTP client for backend communication
// Use window.location to support both localhost and network access
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Get JWT token from localStorage
    getToken() {
        return localStorage.getItem('token');
    }

    // Get default headers with authentication
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    // Generic request handler
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(options.auth !== false),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);

            // Handle authentication errors
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../index.html';
            }

            throw error;
        }
    }

    // GET request
    async get(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'DELETE'
        });
    }

    // ===================================
    // Authentication Endpoints
    // ===================================

    async login(credentials) {
        return this.post('/auth/login', credentials, { auth: false });
    }

    // ===================================
    // Employee Endpoints
    // ===================================

    async getEmployees() {
        return this.get('/employees');
    }

    async getEmployee(id) {
        return this.get(`/employees/${id}`);
    }

    async createEmployee(employeeData) {
        return this.post('/employees', employeeData);
    }

    async updateEmployee(id, employeeData) {
        return this.put(`/employees/${id}`, employeeData);
    }

    async deleteEmployee(id) {
        return this.delete(`/employees/${id}`);
    }

    // ===================================
    // Task Endpoints (Legacy)
    // ===================================

    async getTasks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/tasks${queryString ? '?' + queryString : ''}`);
    }

    async createTask(taskData) {
        return this.post('/tasks', taskData);
    }

    async updateTask(id, taskData) {
        return this.put(`/tasks/${id}`, taskData);
    }

    async deleteTask(id) {
        return this.delete(`/tasks/${id}`);
    }

    // ===================================
    // Task Template Endpoints (NEW)
    // ===================================

    async getTaskTemplates(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/tasks/templates${queryString ? '?' + queryString : ''}`);
    }

    async getTaskTemplate(id) {
        return this.get(`/tasks/templates/${id}`);
    }

    async createTaskTemplate(templateData) {
        return this.post('/tasks/templates', templateData);
    }

    async updateTaskTemplate(id, templateData) {
        return this.put(`/tasks/templates/${id}`, templateData);
    }

    async deactivateTaskTemplate(id) {
        return this.delete(`/tasks/templates/${id}`);
    }

    // ===================================
    // Task Assignment Endpoints (NEW)
    // ===================================

    async getTaskAssignments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/tasks/assignments${queryString ? '?' + queryString : ''}`);
    }

    async createTaskAssignment(assignmentData) {
        return this.post('/tasks/assignments', assignmentData);
    }

    async reassignTask(assignmentId, newEmployeeId) {
        return this.put(`/tasks/assignments/${assignmentId}/reassign`, { newEmployeeId });
    }

    async updateAssignmentStatus(assignmentId, status) {
        return this.put(`/tasks/assignments/${assignmentId}/status`, { status });
    }

    async updateTaskAssignment(assignmentId, assignmentData) {
        return this.put(`/tasks/assignments/${assignmentId}`, assignmentData);
    }

    async deleteTaskAssignment(assignmentId) {
        return this.delete(`/tasks/assignments/${assignmentId}`);
    }

    // ===================================
    // Responsibility Endpoints
    // ===================================

    async getResponsibilities(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/responsibilities${queryString ? '?' + queryString : ''}`);
    }

    async createResponsibility(responsibilityData) {
        return this.post('/responsibilities', responsibilityData);
    }

    async updateResponsibility(id, responsibilityData) {
        return this.put(`/responsibilities/${id}`, responsibilityData);
    }

    async deleteResponsibility(id) {
        return this.delete(`/responsibilities/${id}`);
    }

    // ===================================
    // Attendance Endpoints
    // ===================================

    async checkIn(employeeId, code) {
        return this.post('/attendance/checkin', { employeeId, code });
    }

    async checkOut(employeeId, code) {
        return this.post('/attendance/checkout', { employeeId, code });
    }

    async getAttendance(employeeId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/attendance/${employeeId}${queryString ? '?' + queryString : ''}`);
    }

    async getTodaySessions(employeeId) {
        return this.get(`/attendance/${employeeId}/today`);
    }

    async getMonthlyTotal(employeeId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/attendance/${employeeId}/monthly-total${queryString ? '?' + queryString : ''}`);
    }

    // ===================================
    // Salary Endpoints
    // ===================================

    async getSalary(employeeId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/salary/${employeeId}${queryString ? '?' + queryString : ''}`);
    }

    async calculateAllSalaries(month) {
        return this.post('/salary/calculate', { month });
    }

    async generateInvoice(employeeId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/salary/invoice/${employeeId}${queryString ? '?' + queryString : ''}`);
    }

    // ===================================
    // Notes Endpoints
    // ===================================

    async getNotes(employeeId) {
        return this.get(`/notes/${employeeId}`);
    }

    async createNote(noteData) {
        return this.post('/notes', noteData);
    }

    async deleteNote(id) {
        return this.delete(`/notes/${id}`);
    }

    // ===================================
    // Settings Endpoints
    // ===================================

    async getSettings() {
        return this.get('/settings');
    }

    async updateSettings(settingsData) {
        return this.put('/settings', settingsData);
    }

    async updateAttendanceCode(code) {
        return this.post('/settings/attendance-code', { code });
    }

    // ===================================
    // Types Endpoints
    // ===================================

    async getTypes() {
        return this.get('/types');
    }

    // Alias for backward compatibility
    async getEmployeeTypes() {
        return this.getTypes();
    }

    async createType(typeData) {
        return this.post('/types', typeData);
    }

    async deleteType(id) {
        return this.delete(`/types/${id}`);
    }

    // ===================================
    // Deductions Endpoints
    // ===================================

    async getDeductions() {
        return this.get('/deductions');
    }

    async createDeduction(deductionData) {
        return this.post('/deductions', deductionData);
    }

    async updateDeduction(id, deductionData) {
        return this.put(`/deductions/${id}`, deductionData);
    }

    async deleteDeduction(id) {
        return this.delete(`/deductions/${id}`);
    }

    async createBulkDeduction(deductionData) {
        return this.post('/deductions/bulk', deductionData);
    }

    async getEmployeeDeductions(employeeId) {
        return this.get(`/deductions/employee/${employeeId}`);
    }
}

// Export singleton instance
const api = new APIService();
