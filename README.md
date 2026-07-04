# BudgetApp v1

Simple sellable template version of the finance dashboard.

## Included

- Combined dashboard for income and expenses
- Historical income vs expenses chart
- Budget balance charts on the dashboard
- Filters by date, multiple main categories, multiple subcategories, and account
- Add transaction form
- Categories setup for Bills, Monthly Expenses, and Income subcategories
- Accounts setup page
- Firebase-ready config and auth gate
- LocalStorage demo datastore so the app works before Firebase is connected

## Firebase Plan

This template is prepared for Firebase Authentication and Firestore. Buyers can connect their own Firebase project in `firebase-config.js`.

For seller-controlled access, use a Firestore whitelist:

```text
allowedUsers/{email}
  active: true
  purchasedAt: timestamp
  plan: "template"
```

After login, check whether the user's email exists and is active before showing the app. This prevents shared links from giving access to non-buyers.

## Files

- `index.html` - dashboard
- `add-transaction.html` - transaction entry
- `budget.html` - categories setup
- `accounts.html` - accounts setup
- `app.js` - shared helpers, navigation, auth placeholder
- `store.js` - local datastore, later replace/sync with Firestore
- `dashboard.js` - dashboard charts and filters
- `transactions.js` - add transaction page
- `budget.js` - budget page
- `accounts.js` - accounts/setup page
- `styles.css` - shared styling and chart/layout formatting
