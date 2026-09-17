# Smiley Universal Control Panel - Project Guidelines

## Business Data Structure (Supabase)
The application relies on Supabase as the primary database backend, containing two main tables:

1. **`finance_transactions`**
   - **Purpose:** Stores individual financial records across all years.
   - **Columns:** `id`, `date`, `description`, `amount`, `type` ('income', 'expense', 'portfolio'), `category`, `notes`.
   - **Views:** Feeds the Dashboard KPIs/charts and the Transactions view.

2. **`finance_portfolio`**
   - **Purpose:** Stores current business assets, savings accounts, and investment values.
   - **Columns:** `id`, `name`, `category` (e.g., 'Préstamos', 'Inversiones', 'Liquidez', 'Ahorro', 'Negocios', 'Otros'), `value`, `notes`, `icon`, `ticker`, `asset_type` ('fibra', 'etf', 'stock', 'cetes', 'negocio', 'otro'), `current_price`, `target_allocation`.
   - **Views:** Feeds the Portfolio Distribution chart, the Portfolio View, and the Investments View.
   - **Hub-and-Spoke Architecture:** This table directly manages the performance metrics of the remote Storefronts (Vite + React) connected to the MAIN Personal Engine (Supabase). The Universal Control Panel acts as the central Admin Dashboard for these properties.
     - Known Storefronts (Category: `Negocios`):
       - Secretitos
       - Bazarito Cancún (Live: `https://smileygz.github.io/Bazarito-cancun`)
       - Litros Express
       - Travel Services
       - Jonla Agency
     - *Note: Additional storefronts may be provisioned into this table dynamically.*

3. **`finance_investment_lots`**
   - **Purpose:** Lot-based trading log for stocks, ETFs, FIBRAs, and fixed-income assets.
   - **Columns:** `id`, `portfolio_id` (FK to `finance_portfolio.id`), `ticker`, `transaction_type` ('buy', 'sell', 'dividend'), `buy_date`, `shares`, `purchase_price`, `fee`, `broker` (e.g. 'GBM+'), `notes`.
   - **Views:** Feeds the Investments & Stocks view, calculating Weighted Average Cost Basis, Unrealized P&L ($ and %), and historical purchase lot logs.
   - **Migration Script:** [supabase_investments_schema.sql](file:///Users/josegonzalez/Documents/Smileys%20Org/02_Businesses/UCP/supabase_investments_schema.sql).

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
