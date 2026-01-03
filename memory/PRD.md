# ReWear POS - Ankaufs-App für Kleidungsgeschäft

## Original Problem Statement
Eine App für den Ankauf von Kleidung bauen, basierend auf einer Excel-Vorlage. Im Laden soll schnell pro Kleidungsstück vermerkt werden können: Kategorie, Preisniveau, Zustand, Relevanz - und dann der Preis. Das wird zusammengerechnet und als Quittung ausdruckbar.

## User Personas
- **Ladenmitarbeiter**: Hauptnutzer, verwendet Tablet/Smartphone im Laden für schnelle Artikelerfassung
- **Ladeninhaber**: Verwaltet Fixpreise, überprüft Statistiken und Historie

## Core Requirements (Static)
1. Schnelle Artikelerfassung mit Kategorien-Grid
2. Mehrschritt-Dialog: Kategorie → Preisniveau → Zustand → Relevanz → Preis
3. Warenkorb mit Gesamtsummenberechnung
4. Ankauf abschließen mit Quittung
5. Historie mit Tages-/Monatsübersicht
6. Preismatrix-System für Fixpreise (Excel Download/Upload)

## What's Been Implemented

### Phase 1 - MVP (02.01.2026)
- ✅ 17 Kleidungskategorien (Kleider, Jeans, Hoodie, etc.)
- ✅ 4 Preisniveaus (Luxus, Teuer, Mittel, Günstig)
- ✅ 4 Zustände (Neu, Kaum benutzt, Gebraucht/Gut, Abgenutzt)
- ✅ Warenkorb mit Gesamtsumme
- ✅ Ankauf abschließen & Quittung generieren
- ✅ Historie-Seite mit Statistiken

### Phase 2 - Relevanz & Preismatrix (03.01.2026)
- ✅ 3 Relevanz-Stufen (Stark relevant, Wichtig, Nicht beliebt)
- ✅ Preismatrix-Download (Excel mit 816 Kombinationen)
- ✅ Preismatrix-Upload (Fixpreise importieren)
- ✅ Automatische Fixpreis-Übernahme beim Hinzufügen
- ✅ Quick-Add bei vorhandenem Fixpreis

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Excel**: pandas + openpyxl

## API Endpoints
- `GET /api/categories` - Alle Kategorien, Preisniveaus, Zustände, Relevanzen
- `POST /api/purchases` - Neuen Ankauf erstellen
- `GET /api/purchases` - Alle Ankäufe abrufen
- `GET /api/purchases/{id}` - Einzelnen Ankauf abrufen
- `DELETE /api/purchases/{id}` - Ankauf löschen
- `GET /api/stats/daily` - Tagesstatistiken
- `GET /api/stats/monthly` - Monatsstatistiken
- `GET /api/stats/today` - Heutige Zusammenfassung
- `GET /api/price-matrix/lookup` - Fixpreis nachschlagen
- `GET /api/price-matrix/download` - Excel herunterladen
- `POST /api/price-matrix/upload` - Excel hochladen
- `DELETE /api/price-matrix` - Alle Fixpreise löschen

## Prioritized Backlog

### P0 - Kritisch
- (Alle P0 implementiert)

### P1 - Wichtig
- [ ] Drucker-Integration (physischer Bon-Drucker)
- [ ] Offline-Modus für schlechte Netzverbindung
- [ ] Benutzer-Authentifizierung

### P2 - Nice-to-have
- [ ] Barcode/QR-Code Scanner für schnellere Erfassung
- [ ] Mehrere Mitarbeiter-Accounts
- [ ] Export der Statistiken als PDF
- [ ] Dashboard mit Grafiken
- [ ] Backup-Funktion für Datenbank

## Next Tasks
1. **Drucker-Integration**: window.print() Styling optimieren oder direkte Kassendrucker-Anbindung
2. **Benutzer-Authentifizierung**: Login für Mitarbeiter hinzufügen
3. **Grafische Statistiken**: Charts für Umsatz-Übersicht
