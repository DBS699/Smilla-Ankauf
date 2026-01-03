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

### Phase 3 - Erweiterte Einstellungen (03.01.2026)
- ✅ Excel Download repariert (Blob-Download statt about:blank)
- ✅ Gefahrenzone Passwortschutz
- ✅ Eigene Kategorien hinzufügen
- ✅ "Unsicher? Google Bildersuche" Button bei Preisniveau
- ✅ Farben für Preisniveau-Buttons anpassbar (Design-Tab)

### Phase 4 - Login & erweiterte Anpassung (03.01.2026)
- ✅ Login-System mit 2 Rollen: Admin (Vollzugriff) und Mitarbeiter
- ✅ Benutzer: admin/1234 und smilla/1234
- ✅ Gefahrenzone nur für Admin sichtbar
- ✅ Farben für ALLE Elemente anpassbar (Preisniveau, Zustand, Relevanz)
- ✅ Icon-Auswahl für eigene Kategorien (15 Icons zur Auswahl)
- ✅ Google Lens ersetzt durch Google Bildersuche (war gesperrt)

### Phase 5 - Bilder & Export (03.01.2026)
- ✅ Bilder hochladen für eigene Kategorien (max 500KB, Base64)
- ✅ Eigene Kategorien werden in Excel-Preismatrix inkludiert
- ✅ Alle Ankauf-Daten als Excel exportieren (Historie-Seite)

### Phase 6 - Kategorien-Verwaltung & Preis-Slider (03.01.2026)
- ✅ Standard-Kategorien einzeln ausblenden (Toggle/Switch pro Kategorie)
- ✅ "Alle ausblenden" Button für alle 17 Standard-Kategorien
- ✅ "Alle wiederherstellen" Button zeigt alle wieder an
- ✅ Preis-Slider (0-100 CHF in 0.50 Schritten) statt Tippen
- ✅ +/- Buttons für Feinanpassung (±1 CHF, ±0.50 CHF)
- ✅ Mehr Schnellwahl-Buttons (1,2,3,5,8,10,15,20,25,30,40,50)

### Phase 7 - Drucker & PWA (03.01.2026)
- ✅ Quittung optimiert für Epson TM-m30II (80mm Thermobondrucker)
- ✅ CSS @media print für 80mm Papierbreite
- ✅ Monospace-Font für saubere Ausrichtung auf Bon
- ✅ PWA-Manifest für Home-Screen Installation
- ✅ iOS & Android kompatibel (kann wie App installiert werden)
- ✅ Grosser "Bon drucken" Button

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
