Daily Planner
==============

This project is a simple full‑stack daily planner.  It replaces a paper‑based planning
sheet (see the included photo) with a web application that runs anywhere your browser
does.  The application is **installable** on desktop and mobile just like any other
Progressive Web App (PWA), so you can pin it to your dock or home screen and use
it offline when your network connection is unreliable.

## Features

* **Add, edit and delete tasks** – each entry has a date, optional start and end time,
  category and description.  Tasks are listed in chronological order and can be
  edited in‑place or removed when they’re no longer needed.
* **Mark complete/incomplete** – quickly toggle the completion state of any entry.
* **Data persistence** – tasks are stored on the server in a tiny JSON database
  (`backend/tasks.json`) so they survive page reloads.  You can use this as a
  starting point for integrating a real database later.
* **Responsive layout** – the design adapts to desktop and mobile screens.
* **Offline support** – a service worker caches the application shell and static
  assets for offline use.  The API requests always go to the network to keep
  your task list up to date when you are online.
* **Installable** – because the app includes a `manifest.json` and a service
  worker, browsers such as Chrome and Edge will show an “Install” button.

## Prerequisites

* [Node.js](https://nodejs.org/) (v14 or later).  This project uses a tiny HTTP
  server without any third‑party dependencies, so no `npm install` is required.

## Running the application locally

1. Open a terminal and change into the `daily‑planner` directory.

2. Start the backend server:

    ```bash
    node backend/server.js
    ```

    The server listens on `http://localhost:3000` by default.  You can change the
    port by setting the `PORT` environment variable.

3. Open `http://localhost:3000` in your browser.  You should see the Daily Planner
    interface.  On first load it will fetch any existing tasks from
    `backend/tasks.json` and display them.

4. To **install** the app, use your browser’s install prompt (often found in the
    address bar on Chrome/Edge).  Once installed you can launch the planner
    without opening a browser tab.

## Modifying the backend

The backend lives in `backend/server.js`.  It uses Node’s built‑in `http`
module to avoid external dependencies.  API routes under `/api/tasks` support
the following operations:

| Method & Route        | Description                             |
|-------------------------|----------------------------------------------------|
| `GET /api/tasks`          | Returns an array of all tasks.         |
| `POST /api/tasks`         | Creates a new task.  Requires a `date` and `description`; optional `startTime`, `endTime`, `category`.  Returns the created task. |
| `PUT /api/tasks/:id`   | Updates an existing task.  Only the provided fields are modified. |
| `DELETE /api/tasks/:id` | Removes a task by ID and returns the deleted task. |

Tasks are persisted to disk in `backend/tasks.json`.  If the file does not
exist or is empty, the server creates it automatically on first write.

## Modifying the frontend

The frontend is a vanilla HTML/JS/CSS application found in the `frontend`
directory:

* `index.html` – the page structure and PWA metadata.
* `style.css` – responsive styling.  Feel free to customize colours and
  typography to match your taste.
* `app.js` – frontend logic for fetching tasks, rendering them, handling form
  submissions and registering the service worker.
* `manifest.json` – describes the app for installability (name, icons, theme
  colour, etc.).
* `service‑worker.js` – caches core assets to enable offline use and implements a
  simple “Cache first, network fallback” strategy for static resources.

## Deploying

Because this app is just static files plus a tiny Node backend, it can be
deployed almost anywhere: GitHub Pages (frontend only), Vercel/Netlify with an
API function, or a small VPS.  If you deploy only the frontend you will need
to point the API calls in `app.js` to your backend’s URL.

## Notes

* This project is intentionally simple to make it easy to extend.  If you want
  to model more of the structure from your paper planner (for example,
  cost centers, priorities, planned vs actual time, scoring), you can extend
  the task schema and update the form and API accordingly.
* The service worker currently caches static assets and treats API requests
  as “network only”.  If you need tasks to be available offline, consider
  adding a client‑side storage layer (e.g. IndexedDB) and syncing with the
  server when connectivity returns.
