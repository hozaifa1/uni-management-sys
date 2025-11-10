# IGMIS LMS - Quick Start Guide

## 🚀 Quick Commands

### Start the Server
```bash
cd django-railway-backend
.\venv\Scripts\python.exe manage.py runserver
```

### Access Points
- **API Root**: http://localhost:8000/
- **Django Admin**: http://localhost:8000/admin/
- **API Documentation**: http://localhost:8000/api/

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@igmislms.com`

## 🔑 Get JWT Token

```bash
# Using curl
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"admin\", \"password\": \"admin123\"}"

# Or using PowerShell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/token/" `
  -ContentType "application/json" `
  -Body '{"username": "admin", "password": "admin123"}'
```

## 📝 Common Tasks

### Create a Student
```bash
POST /api/accounts/students/
{
  "username": "john.doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "date_of_birth": "2005-01-15",
  "guardian_name": "Jane Doe",
  "guardian_phone": "+1234567891",
  "admission_date": "2024-01-10",
  "batch": 1,
  "blood_group": "A+",
  "present_address": "123 Main St",
  "permanent_address": "123 Main St"
}
```

### Create a Course
```bash
POST /api/students/courses/
{
  "name": "Higher Secondary Certificate",
  "code": "HSC",
  "description": "Two year program",
  "duration_months": 24,
  "fee": 50000.00,
  "is_active": true
}
```

### Create a Batch
```bash
POST /api/students/batches/
{
  "name": "HSC 2024",
  "course": 1,
  "start_date": "2024-01-01",
  "end_date": "2025-12-31",
  "is_active": true
}
```

### Record a Payment
```bash
POST /api/payments/payments/
{
  "student": 1,
  "fee_structure": 1,
  "amount_paid": 5000.00,
  "payment_date": "2024-11-09",
  "payment_method": "cash",
  "discount_amount": 0.00,
  "remarks": "First installment"
}
```

### Add Result
```bash
POST /api/academics/results/
{
  "student": 1,
  "exam": 1,
  "subject": 1,
  "marks_obtained": 85.5,
  "remarks": "Good performance"
}
```

## 🧪 Test the API

Run the test script:
```bash
.\venv\Scripts\python.exe test_api.py
```

## 🛠️ Useful Management Commands

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Check for issues
python manage.py check

# Open Django shell
python manage.py shell

# Run tests
python manage.py test
```

## 📊 Database Schema

### User Roles
- `ADMIN` - Full system access
- `TEACHER` - Manage students and results
- `STUDENT` - View own data only

### Key Models
1. **User** - Base user with role
2. **Student** - Student profile (auto ID: STU2024001)
3. **Teacher** - Teacher profile (auto ID: TCH2024001)
4. **Course** - Educational courses
5. **Batch** - Student batches
6. **Enrollment** - Student-batch mapping
7. **Subject** - Course subjects
8. **Exam** - Examinations
9. **Result** - Exam results with auto-grade
10. **Payment** - Payment records
11. **FeeStructure** - Fee definitions
12. **Expense** - Expense tracking

## 🔍 Filtering & Search

Most endpoints support:
- **Filtering**: `?field=value`
- **Search**: `?search=query`
- **Ordering**: `?ordering=field` or `?ordering=-field`
- **Pagination**: `?page=1&page_size=20`

Example:
```
GET /api/accounts/students/?batch=1&search=John&ordering=-admission_date
```

## 🎯 API Response Format

### Success Response
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/students/?page=2",
  "previous": null,
  "results": [...]
}
```

### Error Response
```json
{
  "field_name": ["Error message"]
}
```

## 🔐 Authentication Header

For all protected endpoints:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 📱 Next Steps

1. ✅ Day 1: Project Setup - **COMPLETED**
2. ✅ Day 2: Django Models & API - **COMPLETED**
3. ⏭️ Day 3: React Frontend Base
4. ⏭️ Day 4: Payment System
5. ⏭️ Day 5: Expense Tracking
6. ⏭️ Day 6: Results System
7. ⏭️ Day 7: Report Cards
8. ⏭️ Day 8: Student Portal
9. ⏭️ Day 9: Polish
10. ⏭️ Day 10: Deploy & Test

---

**Project Status**: Backend API fully functional and ready for frontend integration!



