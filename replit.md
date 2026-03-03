# Painel Admin - DevQuest

## Overview

A static frontend admin panel for managing course content on a platform. Built with vanilla HTML, CSS, and JavaScript, using Firebase for authentication and Firestore as the database.

## Project Structure

```
.
├── admin.html        # Main admin panel (courses, modules, lessons management)
├── login.html        # Firebase Auth login page
├── loginadmin.html   # Alternative admin login page
├── prova.html        # Quiz/test page
├── verProva.html     # View quiz/test results
├── teste.html        # Test page
├── css/
│   ├── style.css     # Main styles
│   └── admin.css     # Admin panel styles
├── js/
│   ├── admin.js      # Admin panel logic
│   └── teste.js      # Test page logic
├── app.py            # Python utility script for downloading M3U8 videos
└── index.js          # Node.js utility script
```

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Auth & Database:** Firebase (Authentication + Firestore)
- **Server:** http-server (static file server)

## Firebase Configuration

The project uses Firebase project `finamceiro-5d9ae` for:
- Authentication (email/password)
- Firestore database (courses, modules, lessons)

Admin email: `joao@gmail.com`

## Running the Project

The app is served via `http-server` on port 5000:

```bash
http-server . -p 5000 -a 0.0.0.0 --cors
```

## Deployment

Configured as a static site deployment with the root directory as the public directory.
