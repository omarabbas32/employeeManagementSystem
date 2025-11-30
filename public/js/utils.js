// Utility functions for common operations

// Date formatting
const utils = {
    // Format date to YYYY-MM-DD
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    },

    // Format date to readable format (e.g., "Nov 26, 2025")
    formatDateReadable(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format time (HH:MM:SS to HH:MM AM/PM or ISO timestamp to HH:MM AM/PM)
    formatTime(time) {
        if (!time) return '';

        // If it's an ISO timestamp (contains 'T'), extract time portion
        if (time.includes('T')) {
            const date = new Date(time);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }

        // Otherwise treat as time string (HH:MM:SS) and convert to 12-hour format
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    },

    // Format datetime
    formatDateTime(datetime) {
        if (!datetime) return '';
        const d = new Date(datetime);
        return d.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Get current month in YYYY-MM format
    getCurrentMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    },

    // Format currency
    formatCurrency(amount) {
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
        return `${formatted} L.E`;
    },

    // Format number
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num || 0);
    },

    // Validate email
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate required field
    isRequired(value) {
        return value !== null && value !== undefined && value !== '';
    },

    // Get status badge class
    getStatusBadgeClass(status) {
        const statusMap = {
            'Pending': 'badge-pending',
            'In Progress': 'badge-progress',
            'Done': 'badge-done'
        };
        return statusMap[status] || 'badge-pending';
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Calculate hours between two times
    calculateHours(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 0;

        const [inHours, inMinutes] = checkIn.split(':').map(Number);
        const [outHours, outMinutes] = checkOut.split(':').map(Number);

        const inTotalMinutes = inHours * 60 + inMinutes;
        const outTotalMinutes = outHours * 60 + outMinutes;

        const diffMinutes = outTotalMinutes - inTotalMinutes;
        return (diffMinutes / 60).toFixed(2);
    }
};
