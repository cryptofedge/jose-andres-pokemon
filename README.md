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

## 📁 Project Structure

```
jose-andres-pokemon/
├── public/          # Frontend (friends see this)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── admin/           # Admin panel (Jose only)
│   └── index.html
├── data/
│   └── content.json # Database (JSON file)
├── uploads/         # Uploaded images (git-ignored)
├── server.js        # Express backend
└── package.json
```

---

## 🛡️ License

FEDGE 2.O / Eclat Universe — All rights reserved © 2026
