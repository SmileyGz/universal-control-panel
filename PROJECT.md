# Smiley Universal Control Panel - Project Guidelines

## Business Data Structure (Supabase)
The application relies on Supabase as the primary database backend, containing two main tables:

1. **`finance_transactions`**
   - **Purpose:** Stores individual financial records across all years.
   - **Columns:** `id`, `date`, `description`, `amount`, `type` ('income', 'expense', 'portfolio'), `category`, `notes`.
   - **Views:** Feeds the Dashboard KPIs/charts and the Transactions view.

2. **`finance_portfolio`**
   - **Purpose:** Stores current business assets, savings accounts, and investment values.
   - **Columns:** `id`, `name`, `category` (e.g., 'Préstamos', 'Inversiones', 'Liquidez', 'Ahorro', 'Negocios', 'Otros'), `value`, `notes`, `icon`.
   - **Views:** Feeds the Portfolio Distribution chart and the Portfolio View.

## Deployment Workflow (GitHub Pages)
- **Hosting:** The web app is a static site hosted via GitHub Pages.
- **Production URL:** `https://smileygz.github.io/universal-control-panel/`
- **Rule for Updates:** Any approved code changes must always be deployed to the live site. Once local testing is complete, changes must be committed and pushed to the `main` branch:
  ```bash
  git add .
  git commit -m "description of changes"
  git push origin main
  ```
  GitHub Pages will automatically build and deploy within 1-2 minutes.
