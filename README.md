# Team Challenge App - Complete

Eine komplette Team Challenge App mit WebSocket-Server und Frontend in einer Datei.

## Features

- ✅ Admin Setup mit Event-Erstellung
- ✅ QR Code Generation für Team-Join
- ✅ Live Countdown mit Start/Pause/Resume/Reset
- ✅ Team Join und Antwort-System
- ✅ Beamer Ansicht für große Bildschirme
- ✅ Arena Ansicht für Team-Übersicht
- ✅ Highscore mit Ranking
- ✅ WebSocket für Echtzeit-Updates

## Deployment

### Vercel (Empfohlen)

1. Gehe zu [vercel.com](https://vercel.com)
2. "New Project" → "Import Git Repository"
3. Repository: `wavepreneur/team-challenge-complete`
4. Deploy!

### Render

1. Gehe zu [render.com](https://render.com)
2. "New +" → "Web Service"
3. Repository: `wavepreneur/team-challenge-complete`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy!

## Verwendung

1. Gehe zur Admin-Seite: `/admin`
2. Erstelle ein Event
3. Teile den Join-Link oder QR-Code
4. Teams können beitreten und antworten
5. Verwende Beamer/Arena für Live-Updates

## URLs

- `/` - Hauptseite
- `/admin` - Admin Setup
- `/join/:eventId` - Team beitreten
- `/beamer/:eventId` - Beamer Ansicht
- `/arena/:eventId` - Arena Ansicht
- `/highscore/:eventId` - Highscore
