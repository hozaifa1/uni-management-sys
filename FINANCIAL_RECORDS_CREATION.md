# Creating FeeStructure, Payment, and Expense Records

This project supports creating finance-related records in three ways.

## 1) Django Admin (Recommended for admins)

1. Run the backend.
2. Open the Django admin:
   - Local: `http://localhost:8000/admin/`
   - Production: `<backend-domain>/admin/`
3. Create records:
   - `Payments > Fee structures`
   - `Payments > Payments`
   - `Payments > Expenses`

## 2) REST API (DRF ViewSets)

These endpoints are registered under `/api/payments/`:

- Fee structures:
  - `GET /api/payments/fee-structures/`
  - `POST /api/payments/fee-structures/`
- Payments:
  - `GET /api/payments/payments/`
  - `POST /api/payments/payments/`
- Expenses:
  - `GET /api/payments/expenses/`
  - `POST /api/payments/expenses/`

All endpoints require a valid JWT access token (see `/api/token/`).

## 3) Seed/test data via management command

A management command exists to generate sample data (including FeeStructure, Payment, Expense):

- Run from `django-vercel-backend/`:
  - `python manage.py create_test_data`

This is the fastest way to satisfy the `VERIFICATION_TODO.md` precondition for payments/financial stats.
