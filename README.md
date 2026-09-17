# Smiley Universal Control Panel (UCP)

Admin dashboard and personal financial operating system for José. Centralizes finances, cashflow, and business portfolio metrics across multiple storefronts and investments.

- **Production URL:** [https://smileygz.github.io/universal-control-panel/](https://smileygz.github.io/universal-control-panel/)
- **Backend:** Supabase (`finance_transactions` & `finance_portfolio`)
- **Frontend:** Vanilla JS, CSS (Glassmorphism), Chart.js

---

## Architecture & Features

### 1. 📊 Financial Dashboard
- Visualizes cashflow trends, income, expenses, and net balance by year and month.
- Key financial performance indicators (KPIs).

### 2. 💳 Transactions View
- Historical record and real-time capture of financial operations.
- Direct synchronization with the Supabase `finance_transactions` table.

### 3. 💼 Portfolio & Hub-and-Spoke Storefronts
- Central asset tracking: Savings, Investments, Liquidity, Loans, and Business ventures.
- Manages metrics for connected remote storefronts:
  - **Secretitos**
  - **Bazarito Cancún** ([Live Storefront](https://smileygz.github.io/Bazarito-cancun))
  - **Litros Express**
  - **Travel Services**
  - **Jonla Agency**

---

## Deployment Workflow

Changes pushed to `main` automatically deploy to GitHub Pages:

```bash
git add .
git commit -m "feat/fix: description of changes"
git push origin main
```
