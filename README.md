# Slowgres — PostgreSQL EXPLAIN Diagnostic Engine

> **Find out why it's slow.** A modern, responsive diagnostic tool for analyzing PostgreSQL execution plans, uncovering costly operations, detecting planner antipatterns, and inspecting hierarchical node bottlenecks.

---

## Features

- **Automated Antipattern Detection**: Detects sequential scans on large tables, severe row estimation misestimates, disk-spilling hash/sort operations, and costly nested loops.
- **Hierarchical Plan Tree**: Interactive visual tree representation with color-coded execution cost indicators, timing percentages, and one-click node inspection.
- **Node Detail Inspector**: Responsive modal and mobile bottom sheet displaying actual vs. estimated row counts, planner accuracy ratio, buffer usage, and raw node JSON.
- **Cross-Link Navigation**: Click directly on any diagnostic finding path to locate and inspect the exact node in the execution tree.
- **Export Capabilities**:
  - **Markdown Report**: One-click copy formatted diagnostic report ready to paste into GitHub issues, Slack, or Jira.
  - **JSON Export**: Download full analysis dataset for archival or automated processing.
- **Account & Quotas**: Sign in with Gmail to save analysis history across sessions and unlock higher daily query analysis limits (25 runs/day).
- **Responsive & Modern UI**: Built with Google Sans typography, full dark/light theme support, and responsive layouts for mobile and desktop screens.

---

## Quickstart (Running Locally)

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **npm** or **pnpm** / **yarn**

### 1. Clone or Download the Repository

```bash
git clone https://github.com/<your-username>/slowgres.git
cd slowgres
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite development server at `http://localhost:3000` |
| `npm run build` | Compiles TypeScript and builds optimized production assets in `dist/` |
| `npm run preview` | Locally previews the production build |
| `npm run lint` | Runs TypeScript type checker (`tsc --noEmit`) |
| `npm run clean` | Cleans previous build artifacts |

---

## Pushing this Project to GitHub

### Option A: Direct Export from Google AI Studio (Easiest)

1. Open the project in **Google AI Studio**.
2. Click the top-right **Settings / More Options** menu (three dots or gear icon).
3. Select **Export to GitHub** (or **Download as ZIP**).
4. If choosing Export to GitHub, authorize your GitHub account and choose a new repository name.

### Option B: Manual Git Push

If you downloaded the code as a ZIP archive:

```bash
# 1. Unzip and navigate into the folder
cd slowgres

# 2. Initialize git repository
git init

# 3. Add all files
git add .

# 4. Commit changes
git commit -m "Initial commit: Slowgres PostgreSQL plan analyzer"

# 5. Set default branch to main
git branch -M main

# 6. Add your remote GitHub repository
git remote add origin https://github.com/<your-username>/slowgres.git

# 7. Push to GitHub
git push -u origin main
```

---

## Generating PostgreSQL EXPLAIN Plans

To get the full diagnostic benefit (actual runtimes, row counts, and buffer cache hits), generate your query plan using:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM your_table
WHERE created_at >= NOW() - INTERVAL '7 days';
```

Paste the resulting JSON array into Slowgres to view the diagnostic report and tree visualization.

---

## Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)
- **Typography**: Google Sans, Google Sans Text, Google Sans Code

---

## License

MIT
