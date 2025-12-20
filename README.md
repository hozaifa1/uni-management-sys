# IGMIS LMS

Integrated General Management & Information System (IGMIS) is a full-stack learning management platform that blends a Django REST backend with a modern Vite + React frontend to streamline academic operations for universities that run multiple programs under the National University curriculum.

> “Seed once, stay consistent” – official syllabus data and grading workflows stay in sync across programs, semesters, and major tracks.

## 📌 At a Glance

- **Multi-course coverage** – ship BBA, MBA, CSE, THM, EEE, and LLB curricula with consistent metadata, fees, and durations ready to seed into the system.@backend/accounts/management/commands/seed_data.py#37-82
- **Official syllabi ingestion** – import National University syllabi (2015–2018) for every semester and major, ensuring subjects, credits, and marks align perfectly with the source PDFs.@backend/academics/management/commands/seed_syllabus.py#52-350
- **Exam + result automation** – generate three canonical exams per subject plus representative sample results so QA teams can test flows without manual data entry.@backend/academics/management/commands/seed_exams.py#15-366
- **Major-aware result entry** – the React modal matches students with exams/subjects filtered by course, semester, and major to prevent mismatched grades.@frontend/src/components/academics/AddResultModal.jsx#131-251

## 🔄 Recent Highlights from Git History

1. **Major-aware filtering for result entry** – subject lists now adapt to the selected student’s course, semester, and major so staff cannot accidentally grade for the wrong track.@frontend/src/components/academics/AddResultModal.jsx#147-178
2. **Duplicate-proof syllabus seeding** – seeding logic now checks for existing subject codes/names before creation to avoid prefixed duplicates when ingesting official NU data.@backend/academics/management/commands/seed_exams.py#232-269
3. **Expanded major taxonomy** – BBA and MBA major codes (AIS, Management, Marketing, Finance & Banking) are seeded once and reused throughout grading and enrollment flows.@backend/academics/management/commands/seed_syllabus.py#52-84

## 🧱 Architecture

| Layer | Stack | Responsibilities |
| --- | --- | --- |
| Backend | Django REST Framework + PostgreSQL | Course catalogs, majors, syllabus metadata, exams, and grading APIs |
| Frontend | React 18 + Vite + Tailwind CSS | Dashboards, student management, grading UX, analytics |
| Tooling | Netlify (manual deploy) + Vercel (manual backend deploy) | Lightweight hosting with opt-in deployments |

## 🚀 Getting Started

### Backend
1. `cd backend`
2. Create and activate a virtual environment.
3. `pip install -r requirements.txt`
4. Copy `.env.example` → `.env` and set database/API secrets.
5. `python manage.py migrate`
6. (Optional) `python manage.py seed_syllabus --clear` and `python manage.py seed_exams --clear` to load NU data.
7. `python manage.py runserver`

### Frontend
1. `cd frontend`
2. `npm install`
3. Copy `.env.example` → `.env` and set `VITE_API_URL` (e.g., `http://localhost:8000/api`).
4. `npm run dev` and open `http://localhost:5173`.
5. `npm run build` when you’re ready to ship.

## 🧭 Project Structure

```
IGMIS LMS
├── backend/        # Django project (academics, accounts, students, exams)
├── frontend/       # Vite + React SPA
├── images/         # Screenshots used in documentation
├── config/         # Deployment/runtime configuration
└── README.md       # You are here
```

## 📸 Visual Tour

| Dashboard | Student Directory | Attendance Insights |
| --- | --- | --- |
| ![Home dashboard](./images/home.jpg) | ![Students](./images/students.jpg) | ![Attendance](./images/attendance.jpg) |

| Report Cards | Results Management |
| --- | --- |
| ![Report card preview](./images/reportcard.jpg) | ![Results console](./images/results.jpg) |

## 🤝 Contribution Workflow

1. Fork the repo and create a feature branch from `main`.
2. Keep course PDFs/ZIPs local only—they’re intentionally gitignored to keep the repo lean.
3. Run linting/tests (`npm run lint`, Django unit tests) before opening a PR.
4. Reference seed commands when adding new programs to guarantee parity with NU documents.

## 📮 Support

Have ideas for new majors, intake automation, or analytics modules? Open an issue or start a discussion in the repo so we can keep modernizing the LMS together.
