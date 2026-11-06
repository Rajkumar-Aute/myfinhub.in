# My Fin Hub - Personal Accounts Book 📊 💰

A simple, privacy-first personal accounts book to record daily expenses and income details (available at [myfinhub.in](https://myfinhub.in)), with **two-way seamless Google Drive synchronization** and **complete standalone / offline capabilities**.

---

## 🌟 Key Features

### 1. Two-Way Google Drive Synchronization
- **Direct Drive Storage**: Backs up and synchronizes directly to the user's private Google Drive under the folder **`Personal Khata Book`** in the portable file **`personal_khata_data.json`**.
- **No Third-Party Database Server**: Your financial data is 100% private.
- **Bi-Directional Sync**:
  - Add or update an expense on the website &rarr; automatically updates your Android app on sync.
  - Add or update on your Android phone &rarr; automatically updates the website on sync.

### 2. 100% Independent & Standalone
- Can be used **purely as a web app** without installing the Android app.
- Can be used **offline** with browser `localStorage`.
- Includes **JSON Export and Import** to move data anytime between devices.

### 3. Bank Accounts & Live Balance Tracking
- Track multiple bank accounts, UPI wallets, cash reserves, credit cards, and personal loans.
- Matches your personal passbook calculation:
  $$\text{Current Balance} = \text{Opening Balance} + \text{Incomes} - \text{Expenses}$$
- Dynamic Net Worth and liquidity summary.

### 4. Matching Categories & Custom Typing
- Exact sequence configured:
  1. **Grocery**
  2. **Fuel & Transport**
  3. **Other - all other expenses** *(opens blank box to type manually)*
  4. **Bills** *(expandable chips: Electricity, Mobile, Gas, WiFi, Water, Credit Card, Loan EMI + custom bill entry)*
  5. **Home Rent**
  6. **Medical**
  7. **Loan / EMI** *(splits payment into Capital/Principal vs Bank Interest)*
- Income tracking: Salary, Business, Rental Income, Freelance, Dividend, Gift, Other.

### 5. Loans & Udhar Management
- **Borrowed Loans (Liabilities)**: Track principal, tenure, monthly EMI, due dates, and remaining balances.
- **Money Given (Assets / Udhar)**: Track money lent to friends, relatives, or business contacts.
- Quick repayment logging with progress bars.

### 6. Reports & Financial Insights
- **Monthly & Yearly Views**: Total income, total expenses, net savings rate.
- **Category Spending Bars**: Visual percentage breakdown of spending habits.
- **Account Spending Activity**: Breakdown by account/card.
- **One-Click Share Summary**: Copies formatted WhatsApp/Email text summary to clipboard.

---

## 🚀 Getting Started

### Local Development
```bash
# Clone the repository
git clone https://github.com/Rajkumar-Aute/myfinhub.in.git
cd myfinhub.in

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build
```bash
npm run build
```

---

## 🔐 Google Drive Setup (OAuth 2.0 Web Client)

To connect the web app to your Google Drive:
1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create or select a project, then navigate to **APIs & Services &rarr; Credentials**.
3. Click **+ CREATE CREDENTIALS** &rarr; **OAuth client ID**.
4. Select Application type: **Web application**.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (for local development)
   - `https://rajkumar-aute.github.io` (for GitHub Pages)
6. Copy the generated **Client ID** and paste it into the **Settings &rarr; Google Client ID** box inside the web app.

---

## 🛠️ Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (Material 3 Emerald Theme)
- **Icons**: Lucide React
- **Authentication & Storage**: Google Identity Services (GIS) + Google Drive API v3 (Scope: `drive.file`)
- **Hosting**: GitHub Pages via GitHub Actions
