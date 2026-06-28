# ⚡ Jose Andres' Pokemon World

A personal Pokemon-themed website for Jose Andres — a public frontend for his friends to visit, and a private admin panel for Jose to manage his content.

---

## 🌐 Public Site (for friends)

| Section | What it shows |
|---|---|
| **Hero** | Welcome banner with live stats |
| **My Team** | Jose's Pokemon with type, level & nickname |
| **Gallery** | Photos from Pokemon adventures (click to enlarge) |
| **Updates** | Posts from Jose |

---

## 🔑 Admin Panel (for Jose only)

Visit `/admin` and enter the trainer password.

| Feature | What you can do |
|---|---|
| **My Pokemon** | Add Pokemon with name, nickname, type, level & photo · Delete any |
| **Gallery** | Upload photos with captions · Delete any |
| **Posts** | Write updates for friends · Delete any |

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start the server
npm start
```

- Public site → http://localhost:3000
- Admin panel → http://localhost:3000/admin
- Default password → `pikachu123`

### Change the password

Set the `ADMIN_PASSWORD` environment variable before starting:

```bash
# Windows PowerShell
$env:ADMIN_PASSWORD="YourSecretPassword"; npm start
```

Or create a `.env` file and load it with a package like `dotenv`.

---

## ⚡ PIKAFELLITO — AI Pokemon Agent

An AI companion built into the public site, powered by **FEDGE 2.O** and the **Claude API**.

| Feature | Detail |
|---|---|
| **Model** | Claude Haiku 4.5 (fast & kid-optimized) |
| **Personality** | Fun, energetic Pokemon expert named PIKAFELLITO |
| **Safety** | Kid-safe system prompt · grooming phrase filter · 20 msg/min rate limit |
| **Memory** | Per-session conversation history (30 min TTL) |
| **Flagging** | Unsafe messages blocked and logged to Safety dashboard |

### Setup
Set your Anthropic API key before starting:

```bash
# Windows PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-..."; npm start
```

Without the key, the agent returns a friendly "not configured" message — the rest of the site still works.

---

## 📁 Project Structure

```
jose-andres-pokemon/
├── public/           # Frontend (friends see this)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── admin/            # Admin panel (Jose only)
│   └── index.html
├── data/
│   ├── content.json  # Pokemon, gallery, posts
│   ├── users.json    # Accounts (hashed passwords)
│   ├── pending.json  # Account requests + age gate
│   ├── activity.json # Security activity log
│   └── reports.json  # Safety reports
├── uploads/          # Uploaded images (git-ignored)
├── server.js         # Express backend
├── agent.js          # PIKAFELLITO AI agent (FEDGE 2.O)
├── safety.js         # Child safety filter
└── package.json
```

---

## License & Brand

**FEDGE 2.O | Powered by Rafael Fellito Rodriguez and Eclat Universe**

© 2026 FEDGE 2.O. All rights reserved.

This project is part of the FEDGE 2.O ecosystem and is protected under full intellectual property rights reserved by Rafael Fellito Rodriguez and Eclat Universe.

### License Details
- **Type:** Proprietary - All Rights Reserved
- **Owner:** Rafael Fellito Rodriguez and Eclat Universe
- **Brand:** FEDGE 2.O
- **Status:** Protected and Confidential

### Key Rights
- All intellectual property retained
- Reproduction prohibited without permission
- Distribution rights reserved
- Derivative works not permitted
- Commercial use requires authorization

### Attribution
When referencing this software, please include:
- FEDGE 2.O
- Rafael Fellito Rodriguez
- Eclat Universe

### Inquiries
For licensing, partnerships, or usage permissions:
**Email:** cryptofedge@gmail.com
