# Deployment Guide - ReWear POS

## Option 1: Railway (Empfohlen)

### Schritt 1: MongoDB Atlas einrichten
1. Gehe zu [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Erstelle einen kostenlosen Cluster
3. Kopiere den Connection String (z.B. `mongodb+srv://user:pass@cluster.mongodb.net/rewear`)

### Schritt 2: Backend auf Railway deployen
1. Gehe zu [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub"
3. Wähle dein Repository
4. **Root Directory**: `backend`
5. Setze Umgebungsvariablen:
   ```
   MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/rewear
   DB_NAME=rewear_db
   CORS_ORIGINS=https://dein-frontend.railway.app
   ADMIN_PASSWORD=dein_sicheres_passwort
   SMILLA_PASSWORD=dein_sicheres_passwort
   ```
6. Deploy!
7. Kopiere die Backend-URL (z.B. `https://rewear-backend.railway.app`)

### Schritt 3: Frontend auf Railway deployen
1. Neues Projekt oder Service hinzufügen
2. **Root Directory**: `frontend`
3. Setze Umgebungsvariablen:
   ```
   REACT_APP_BACKEND_URL=https://rewear-backend.railway.app
   ```
4. Deploy!

---

## Option 2: Heroku

### Backend deployen
```bash
cd backend
heroku create rewear-backend
heroku config:set MONGO_URL="mongodb+srv://..." DB_NAME="rewear_db" CORS_ORIGINS="*"
heroku config:set ADMIN_PASSWORD="xxx" SMILLA_PASSWORD="xxx"
git push heroku main
```

### Frontend deployen
```bash
cd frontend
heroku create rewear-frontend
heroku config:set REACT_APP_BACKEND_URL="https://rewear-backend.herokuapp.com"
heroku buildpacks:set mars/create-react-app
git push heroku main
```

---

## Option 3: Render.com

Ähnlich wie Railway - Backend als "Web Service", Frontend als "Static Site".

---

## Wichtige Umgebungsvariablen

### Backend (.env)
| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| MONGO_URL | MongoDB Connection String | `mongodb+srv://...` |
| DB_NAME | Datenbankname | `rewear_db` |
| CORS_ORIGINS | Erlaubte Origins | `https://frontend.app` |
| ADMIN_PASSWORD | Admin Passwort | `sicheres_passwort` |
| SMILLA_PASSWORD | Mitarbeiter Passwort | `sicheres_passwort` |

### Frontend (.env)
| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| REACT_APP_BACKEND_URL | Backend API URL | `https://backend.app` |

---

## Tipps

1. **MongoDB Atlas** ist kostenlos für kleine Projekte (512MB)
2. **Railway** gibt $5 kostenloses Guthaben pro Monat
3. **Heroku** hat keinen kostenlosen Tier mehr (ab $5/Monat)
4. **Render.com** hat einen kostenlosen Tier für statische Sites
