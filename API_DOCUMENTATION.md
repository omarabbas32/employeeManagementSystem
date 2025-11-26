# Employee Management System - API Documentation

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Employees](#employees-endpoints)
  - [Tasks](#tasks-endpoints)
  - [Responsibilities](#responsibilities-endpoints)
  - [Attendance](#attendance-endpoints)
  - [Salary](#salary-endpoints)
  - [Notes](#notes-endpoints)
  - [Settings](#settings-endpoints)
  - [Types](#types-endpoints)
  - [Deductions](#deductions-endpoints)

---

## Overview

The Employee Management System API is a RESTful API built with Node.js, Express, and SQLite. It provides comprehensive employee management capabilities including attendance tracking, task assignment, responsibility management, salary calculation, and more.

**Version:** 1.0.0  
**Technology Stack:** Node.js, Express, SQLite  
**Response Format:** JSON

---

## Base URL

```
http://localhost:3000
```

> **Note:** The port can be configured via the `PORT` environment variable in your `.env` file.

---

## Authentication

The API supports three authentication methods:

### 1. JWT Token (Recommended)

After logging in via `/auth/login`, include the JWT token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

### 2. Admin Secret

For initial setup or administrative tasks, use the admin secret from your `.env` file:

```http
x-admin-secret: <your_admin_secret>
```

### 3. Legacy User ID (Development Only)

For testing purposes only (not recommended for production):

```http
x-user-id: <employee_id>
```

### Role-Based Access Control

The API enforces role-based access control based on `employeeType`:

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all endpoints |
| **Managerial** | Can manage tasks, view responsibilities, notes, attendance, and salary for team members |
| **Financial/Assistant** | Limited to self-service endpoints (own attendance, salary, tasks) |

---

## Error Handling

All errors follow a consistent JSON format:

```json
{
  "message": "Error description"
}
```

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `201` | Resource created successfully |
| `400` | Bad request (invalid input) |
| `401` | Unauthorized (invalid credentials) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `500` | Internal server error |

---

## API Endpoints

## Authentication Endpoints

### Login

Authenticate a user and receive a JWT token.

**Endpoint:** `POST /auth/login`

**Authentication Required:** No

**Request Body:**

```json
{
  "username": "admin",
  "password": "StrongPassword123"
}
```

Or use email instead of username:

```json
{
  "email": "admin@example.com",
  "password": "StrongPassword123"
}
```

**Response:** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employee": {
    "id": 1,
    "name": "System Admin",
    "employeeType": "Admin",
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

**Error Response:** `401 Unauthorized`

```json
{
  "message": "Invalid credentials"
}
```

---

## Employees Endpoints

### List All Employees

Retrieve a list of all employees with their complete details.

**Endpoint:** `GET /employees`

**Authentication Required:** Yes (Admin only)

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "employeeType": "Admin",
    "baseSalary": 5000,
    "monthlyFactor": 1,
    "overtimeFactor": 1.5,
    "notes": "Senior developer",
    "assignedTasks": [...],
    "assignedResponsibilities": [...],
    "attendanceRecords": [...],
    "notes": [...]
  }
]
```

---

### Get Employee Details

Retrieve detailed information about a specific employee.

**Endpoint:** `GET /employees/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Employee ID

**Response:** `200 OK`

```json
{
  "id": 1,
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "employeeType": "Admin",
  "baseSalary": 5000,
  "monthlyFactor": 1,
  "overtimeFactor": 1.5,
  "notes": "Senior developer",
  "assignedTasks": [
    {
      "id": 1,
      "title": "Complete project documentation",
      "description": "Write comprehensive API docs",
      "assignedEmployeeId": 1,
      "price": 500,
      "factor": 1,
      "status": "In Progress",
      "createdAt": "2025-11-26T10:00:00Z"
    }
  ],
  "assignedResponsibilities": [
    {
      "id": 1,
      "title": "Team Lead",
      "description": "Lead the development team",
      "assignedEmployeeId": 1,
      "monthlyPrice": 1000,
      "factor": 1,
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "attendanceRecords": [
    {
      "id": 1,
      "employeeId": 1,
      "date": "2025-11-26",
      "checkIn": "09:00:00",
      "checkOut": "17:30:00",
      "totalHours": 8.5
    }
  ],
  "notes": [
    {
      "id": 1,
      "employeeId": 1,
      "content": "Excellent performance this month",
      "createdAt": "2025-11-25T14:30:00Z"
    }
  ]
}
```

**Error Response:** `404 Not Found`

```json
{
  "message": "Employee not found"
}
```

---

### Create Employee

Create a new employee account.

**Endpoint:** `POST /employees`

**Authentication Required:** Yes (Admin only or Admin Secret)

**Request Body:**

```json
{
  "name": "Jane Smith",
  "username": "janesmith",
  "email": "jane@example.com",
  "password": "SecurePass123",
  "employeeType": "Financial",
  "baseSalary": 4000,
  "monthlyFactor": 1,
  "overtimeFactor": 1.5,
  "notes": "New hire - Finance department"
}
```

**Required Fields:**
- `name` (string)
- `employeeType` (string)
- `username` or `email` (at least one required)
- `password` (string)

**Optional Fields:**
- `baseSalary` (number, default: 0)
- `monthlyFactor` (number, default: 1)
- `overtimeFactor` (number, default: 1)
- `notes` (string, default: "")

**Response:** `201 Created`

```json
{
  "id": 2,
  "name": "Jane Smith",
  "username": "janesmith",
  "email": "jane@example.com",
  "employeeType": "Financial",
  "baseSalary": 4000,
  "monthlyFactor": 1,
  "overtimeFactor": 1.5,
  "notes": "New hire - Finance department",
  "assignedTasks": [],
  "assignedResponsibilities": [],
  "attendanceRecords": [],
  "notes": []
}
```

---

### Update Employee

Update an existing employee's information.

**Endpoint:** `PUT /employees/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Employee ID

**Request Body:**

```json
{
  "name": "Jane Smith Updated",
  "baseSalary": 4500,
  "password": "NewPassword123"
}
```

> **Note:** All fields are optional. Only include fields you want to update.

**Response:** `200 OK`

```json
{
  "id": 2,
  "name": "Jane Smith Updated",
  "username": "janesmith",
  "email": "jane@example.com",
  "employeeType": "Financial",
  "baseSalary": 4500,
  "monthlyFactor": 1,
  "overtimeFactor": 1.5,
  "notes": "New hire - Finance department",
  "assignedTasks": [],
  "assignedResponsibilities": [],
  "attendanceRecords": [],
  "notes": []
}
```

---

### Delete Employee

Delete an employee and all associated records (tasks, responsibilities, attendance, notes).

**Endpoint:** `DELETE /employees/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Employee ID

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

## Tasks Endpoints

### List Tasks

Retrieve tasks based on filters and user permissions.

**Endpoint:** `GET /tasks`

**Authentication Required:** Yes

**Query Parameters:**
- `status` (string, optional) - Filter by task status (e.g., "Pending", "In Progress", "Done")
- `employeeId` (integer, optional) - Filter by assigned employee ID

**Permission Rules:**
- **Admin/Managerial:** Can view all tasks or filter by `employeeId`
- **Other roles:** Can only view their own tasks

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "title": "Complete project documentation",
    "description": "Write comprehensive API docs",
    "assignedEmployeeId": 1,
    "price": 500,
    "factor": 1,
    "status": "In Progress",
    "createdAt": "2025-11-26T10:00:00Z"
  },
  {
    "id": 2,
    "title": "Code review",
    "description": "Review pull requests",
    "assignedEmployeeId": 1,
    "price": 200,
    "factor": 1,
    "status": "Done",
    "createdAt": "2025-11-25T14:00:00Z"
  }
]
```

---

### Create Task

Create a new task and assign it to an employee.

**Endpoint:** `POST /tasks`

**Authentication Required:** Yes (Admin or Managerial only)

**Request Body:**

```json
{
  "title": "Bug fix - Login issue",
  "description": "Fix the authentication bug in login flow",
  "assignedEmployeeId": 2,
  "price": 300,
  "factor": 1,
  "status": "Pending"
}
```

**Response:** `201 Created`

```json
{
  "id": 3,
  "title": "Bug fix - Login issue",
  "description": "Fix the authentication bug in login flow",
  "assignedEmployeeId": 2,
  "price": 300,
  "factor": 1,
  "status": "Pending",
  "createdAt": "2025-11-26T15:00:00Z"
}
```

---

### Update Task

Update an existing task.

**Endpoint:** `PUT /tasks/:id`

**Authentication Required:** Yes (Admin or Managerial only)

**URL Parameters:**
- `id` (integer) - Task ID

**Request Body:**

```json
{
  "status": "Done",
  "description": "Fixed authentication bug and added tests"
}
```

**Response:** `200 OK`

```json
{
  "id": 3,
  "title": "Bug fix - Login issue",
  "description": "Fixed authentication bug and added tests",
  "assignedEmployeeId": 2,
  "price": 300,
  "factor": 1,
  "status": "Done",
  "createdAt": "2025-11-26T15:00:00Z"
}
```

---

### Delete Task

Delete a task.

**Endpoint:** `DELETE /tasks/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Task ID

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

## Responsibilities Endpoints

### List Responsibilities

Retrieve responsibilities based on filters and user permissions.

**Endpoint:** `GET /responsibilities`

**Authentication Required:** Yes

**Query Parameters:**
- `employeeId` (integer, optional) - Filter by assigned employee ID

**Permission Rules:**
- **Admin/Managerial:** Can view all responsibilities or filter by `employeeId`
- **Other roles:** Can only view their own responsibilities

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "title": "Team Lead",
    "description": "Lead the development team",
    "assignedEmployeeId": 1,
    "monthlyPrice": 1000,
    "factor": 1,
    "createdAt": "2025-11-01T10:00:00Z"
  }
]
```

---

### Create Responsibility

Create a new responsibility and assign it to an employee.

**Endpoint:** `POST /responsibilities`

**Authentication Required:** Yes (Admin only)

**Request Body:**

```json
{
  "title": "Code Reviewer",
  "description": "Review all code submissions",
  "assignedEmployeeId": 2,
  "monthlyPrice": 500,
  "factor": 1
}
```

**Response:** `201 Created`

```json
{
  "id": 2,
  "title": "Code Reviewer",
  "description": "Review all code submissions",
  "assignedEmployeeId": 2,
  "monthlyPrice": 500,
  "factor": 1,
  "createdAt": "2025-11-26T15:00:00Z"
}
```

---

### Update Responsibility

Update an existing responsibility.

**Endpoint:** `PUT /responsibilities/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Responsibility ID

**Request Body:**

```json
{
  "monthlyPrice": 600,
  "description": "Review all code submissions and mentor juniors"
}
```

**Response:** `200 OK`

```json
{
  "id": 2,
  "title": "Code Reviewer",
  "description": "Review all code submissions and mentor juniors",
  "assignedEmployeeId": 2,
  "monthlyPrice": 600,
  "factor": 1,
  "createdAt": "2025-11-26T15:00:00Z"
}
```

---

### Delete Responsibility

Delete a responsibility.

**Endpoint:** `DELETE /responsibilities/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Responsibility ID

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

## Attendance Endpoints

### Check In

Record an employee's check-in time.

**Endpoint:** `POST /attendance/checkin`

**Authentication Required:** Yes

**Permission Rules:**
- Employees can only check in for themselves
- Admins can check in for any employee

**Request Body:**

```json
{
  "employeeId": 1
}
```

**Response:** `201 Created`

```json
{
  "id": 1,
  "employeeId": 1,
  "date": "2025-11-26",
  "checkIn": "09:00:00",
  "checkOut": null,
  "totalHours": null
}
```

---

### Check Out

Record an employee's check-out time.

**Endpoint:** `POST /attendance/checkout`

**Authentication Required:** Yes

**Permission Rules:**
- Employees can only check out for themselves
- Admins can check out for any employee

**Request Body:**

```json
{
  "employeeId": 1
}
```

**Response:** `200 OK`

```json
{
  "id": 1,
  "employeeId": 1,
  "date": "2025-11-26",
  "checkIn": "09:00:00",
  "checkOut": "17:30:00",
  "totalHours": 8.5
}
```

---

### Get Attendance Records

Retrieve attendance records for a specific employee.

**Endpoint:** `GET /attendance/:employeeId`

**Authentication Required:** Yes

**URL Parameters:**
- `employeeId` (integer) - Employee ID

**Query Parameters:**
- `month` (string, optional) - Filter by month in `YYYY-MM` format (e.g., "2025-11")

**Permission Rules:**
- Employees can only view their own attendance
- Admin/Managerial can view any employee's attendance

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "employeeId": 1,
    "date": "2025-11-26",
    "checkIn": "09:00:00",
    "checkOut": "17:30:00",
    "totalHours": 8.5
  },
  {
    "id": 2,
    "employeeId": 1,
    "date": "2025-11-25",
    "checkIn": "08:45:00",
    "checkOut": "17:00:00",
    "totalHours": 8.25
  }
]
```

---

## Salary Endpoints

### Calculate Employee Salary

Calculate salary for a specific employee for a given month.

**Endpoint:** `GET /salary/:employeeId`

**Authentication Required:** Yes

**URL Parameters:**
- `employeeId` (integer) - Employee ID

**Query Parameters:**
- `month` (string, optional) - Month in `YYYY-MM` format (defaults to current month)

**Permission Rules:**
- Employees can only view their own salary
- Admins can view any employee's salary

**Response:** `200 OK`

```json
{
  "employeeId": 1,
  "employeeName": "John Doe",
  "month": "2025-11",
  "baseSalary": 5000,
  "attendance": {
    "totalHours": 176,
    "normalHours": 160,
    "overtimeHours": 16
  },
  "tasks": {
    "completed": 5,
    "totalEarnings": 2500
  },
  "responsibilities": {
    "count": 2,
    "totalEarnings": 2000
  },
  "deductions": {
    "items": [
      {
        "name": "Tax",
        "type": "percentage",
        "value": 10,
        "amount": 950
      }
    ],
    "total": 950
  },
  "grossSalary": 9500,
  "netSalary": 8550
}
```

---

### Calculate All Salaries

Calculate salaries for all employees for a given month.

**Endpoint:** `POST /salary/calculate`

**Authentication Required:** Yes (Admin only)

**Request Body:**

```json
{
  "month": "2025-11"
}
```

**Response:** `200 OK`

```json
[
  {
    "employeeId": 1,
    "employeeName": "John Doe",
    "month": "2025-11",
    "baseSalary": 5000,
    "grossSalary": 9500,
    "netSalary": 8550
  },
  {
    "employeeId": 2,
    "employeeName": "Jane Smith",
    "month": "2025-11",
    "baseSalary": 4000,
    "grossSalary": 7200,
    "netSalary": 6480
  }
]
```

---

## Notes Endpoints

### Add Note

Add a note to an employee's record.

**Endpoint:** `POST /notes`

**Authentication Required:** Yes (Admin only)

**Request Body:**

```json
{
  "employeeId": 1,
  "content": "Excellent performance this quarter. Recommended for promotion."
}
```

**Response:** `201 Created`

```json
{
  "id": 1,
  "employeeId": 1,
  "content": "Excellent performance this quarter. Recommended for promotion.",
  "createdAt": "2025-11-26T15:30:00Z"
}
```

---

### List Employee Notes

Retrieve all notes for a specific employee.

**Endpoint:** `GET /notes/:employeeId`

**Authentication Required:** Yes (Admin or Managerial only)

**URL Parameters:**
- `employeeId` (integer) - Employee ID

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "employeeId": 1,
    "content": "Excellent performance this quarter. Recommended for promotion.",
    "createdAt": "2025-11-26T15:30:00Z"
  },
  {
    "id": 2,
    "employeeId": 1,
    "content": "Completed advanced training course.",
    "createdAt": "2025-11-20T10:00:00Z"
  }
]
```

---

### Delete Note

Delete a note from an employee's record.

**Endpoint:** `DELETE /notes/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Note ID

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

## Settings Endpoints

### Get Settings

Retrieve system settings.

**Endpoint:** `GET /settings`

**Authentication Required:** Yes (Admin only)

**Response:** `200 OK`

```json
{
  "id": 1,
  "normalHoursThreshold": 160,
  "allowTaskOvertimeFactor": true,
  "allowResponsibilityDeduction": true,
  "attendanceCode": "ABC123",
  "updatedAt": "2025-11-26T15:00:00Z"
}
```

**Settings Fields:**
- `normalHoursThreshold` - Hours threshold for overtime calculation
- `allowTaskOvertimeFactor` - Whether to apply overtime factor to task payments
- `allowResponsibilityDeduction` - Whether to allow deductions from responsibility payments
- `attendanceCode` - Code required for attendance check-in (if enabled)

---

### Update Settings

Update system settings.

**Endpoint:** `PUT /settings`

**Authentication Required:** Yes (Admin only)

**Request Body:**

```json
{
  "normalHoursThreshold": 168,
  "allowTaskOvertimeFactor": false
}
```

**Response:** `200 OK`

```json
{
  "id": 1,
  "normalHoursThreshold": 168,
  "allowTaskOvertimeFactor": false,
  "allowResponsibilityDeduction": true,
  "attendanceCode": "ABC123",
  "updatedAt": "2025-11-26T16:00:00Z"
}
```

---

### Update Attendance Code

Update the attendance check-in code.

**Endpoint:** `POST /settings/attendance-code`

**Authentication Required:** Yes (Admin only)

**Request Body:**

```json
{
  "code": "XYZ789"
}
```

**Response:** `200 OK`

```json
{
  "id": 1,
  "normalHoursThreshold": 160,
  "allowTaskOvertimeFactor": true,
  "allowResponsibilityDeduction": true,
  "attendanceCode": "XYZ789",
  "updatedAt": "2025-11-26T16:15:00Z"
}
```

---

## Types Endpoints

### List Employee Types

Retrieve all employee types.

**Endpoint:** `GET /types`

**Authentication Required:** Yes (Admin only)

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Admin",
    "createdAt": "2025-11-01T10:00:00Z"
  },
  {
    "id": 2,
    "name": "Managerial",
    "createdAt": "2025-11-01T10:00:00Z"
  },
  {
    "id": 3,
    "name": "Financial",
    "createdAt": "2025-11-01T10:00:00Z"
  }
]
```

---

### Create Employee Type

Create a new employee type.

**Endpoint:** `POST /types`

**Authentication Required:** Yes (Admin only)

**Request Body:**

```json
{
  "name": "Developer"
}
```

**Response:** `201 Created`

```json
{
  "id": 4,
  "name": "Developer",
  "createdAt": "2025-11-26T16:30:00Z"
}
```

---

### Delete Employee Type

Delete an employee type.

**Endpoint:** `DELETE /types/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Type ID

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

## Deductions Endpoints

### List Deductions

Retrieve all deduction rules.

**Endpoint:** `GET /deductions`

**Authentication Required:** Yes (Admin only)

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Income Tax",
    "type": "percentage",
    "value": 10,
    "employeeId": null,
    "createdAt": "2025-11-01T10:00:00Z"
  },
  {
    "id": 2,
    "name": "Health Insurance",
    "type": "fixed",
    "value": 200,
    "employeeId": null,
    "createdAt": "2025-11-01T10:00:00Z"
  },
  {
    "id": 3,
    "name": "Special Deduction",
    "type": "fixed",
    "value": 100,
    "employeeId": 2,
    "createdAt": "2025-11-15T14:00:00Z"
  }
]
```

**Deduction Types:**
- `percentage` - Deduction calculated as a percentage of gross salary
- `fixed` - Fixed amount deduction

**Employee-Specific Deductions:**
- If `employeeId` is `null`, the deduction applies to all employees
- If `employeeId` is set, the deduction applies only to that specific employee

---

### Create Deduction

Create a new deduction rule.

**Endpoint:** `POST /deductions`

**Authentication Required:** Yes (Admin only)

**Request Body:**

```json
{
  "name": "Pension Fund",
  "type": "percentage",
  "value": 5,
  "employeeId": null
}
```

**Response:** `201 Created`

```json
{
  "id": 4,
  "name": "Pension Fund",
  "type": "percentage",
  "value": 5,
  "employeeId": null,
  "createdAt": "2025-11-26T17:00:00Z"
}
```

---

### Update Deduction

Update an existing deduction rule.

**Endpoint:** `PUT /deductions/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Deduction ID

**Request Body:**

```json
{
  "value": 7
}
```

**Response:** `200 OK`

```json
{
  "id": 4,
  "name": "Pension Fund",
  "type": "percentage",
  "value": 7,
  "employeeId": null,
  "createdAt": "2025-11-26T17:00:00Z"
}
```

---

### Delete Deduction

Delete a deduction rule.

**Endpoint:** `DELETE /deductions/:id`

**Authentication Required:** Yes (Admin only)

**URL Parameters:**
- `id` (integer) - Deduction ID

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

## Salary Calculation Logic

The salary calculation follows this formula:

### 1. Base Salary
- Fixed monthly salary defined in employee record

### 2. Attendance-Based Earnings
- **Normal Hours:** Hours up to `normalHoursThreshold` (default: 160)
- **Overtime Hours:** Hours exceeding the threshold
- Overtime multiplier applied based on `employee.overtimeFactor`

### 3. Task Earnings
- Tasks marked as "Done" are included in salary calculation
- Formula: `task.price * (task.factor || employee.monthlyFactor)`
- If `allowTaskOvertimeFactor` is enabled, overtime multiplier may apply

### 4. Responsibility Earnings
- Monthly recurring payments for assigned responsibilities
- Formula: `responsibility.monthlyPrice * (responsibility.factor || employee.monthlyFactor)`

### 5. Deductions
- **Percentage Deductions:** Calculated as `(grossSalary * value) / 100`
- **Fixed Deductions:** Flat amount subtracted
- Applied based on global rules and employee-specific deductions

### 6. Final Calculation
```
Gross Salary = Base Salary + Attendance Earnings + Task Earnings + Responsibility Earnings
Net Salary = Gross Salary - Total Deductions
```

---

## Quick Start Examples

### 1. Initial Setup

```bash
# Create first admin user
curl -X POST http://localhost:3000/employees \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System Admin",
    "username": "admin",
    "email": "admin@example.com",
    "password": "StrongPassword123",
    "employeeType": "Admin"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "StrongPassword123"
  }'
```

### 3. Create Employee

```bash
curl -X POST http://localhost:3000/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Developer",
    "username": "johnd",
    "email": "john@example.com",
    "password": "SecurePass123",
    "employeeType": "Financial",
    "baseSalary": 4000
  }'
```

### 4. Check In

```bash
curl -X POST http://localhost:3000/attendance/checkin \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2
  }'
```

### 5. Create Task

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement feature X",
    "description": "Add new authentication feature",
    "assignedEmployeeId": 2,
    "price": 500,
    "factor": 1,
    "status": "Pending"
  }'
```

### 6. Calculate Salary

```bash
curl -X GET "http://localhost:3000/salary/2?month=2025-11" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Best Practices

### Security
1. Always use JWT tokens for authentication in production
2. Store the `JWT_SECRET` and `ADMIN_SECRET` securely in environment variables
3. Use HTTPS in production environments
4. Implement rate limiting to prevent abuse
5. Regularly rotate JWT secrets

### Performance
1. Use pagination for large datasets (consider implementing in future versions)
2. Cache frequently accessed data like settings and employee types
3. Index database columns used in queries

### Data Validation
1. Validate all input data before processing
2. Use strong passwords (minimum 8 characters, mix of letters and numbers)
3. Sanitize user inputs to prevent SQL injection

### Error Handling
1. Always check response status codes
2. Implement proper error handling in client applications
3. Log errors for debugging and monitoring

---

## Support & Contributing

For issues, questions, or contributions, please refer to the project repository.

**Version:** 1.0.0  
**Last Updated:** November 26, 2025
