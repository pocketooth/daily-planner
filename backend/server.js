const http = require('http');
const fs = require('fs');
const path = require('path');

// Path to the file where tasks are persisted.  Each entry is a simple
// JSON object with an `id`, `date`, `startTime`, `endTime`, `category`,
// `description` and a boolean `completed` flag.  Because the app runs in
// a controlled environment without a database server, tasks are stored
// in a JSON file on disk.
const tasksFile = path.join(__dirname, 'tasks.json');

/**
 * Load tasks from the JSON file.  If the file does not exist or is
 * malformed, an empty array is returned.  This helper is called for
 * every request that needs to read the current list of tasks.
 * @returns {Array<Object>} a list of tasks
 */
function loadTasks() {
  try {
    const data = fs.readFileSync(tasksFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If the file doesn't exist or cannot be parsed, start with no tasks.
    return [];
  }
}

/**
 * Persist the given list of tasks to disk.  The file is written
 * synchronously because requests are handled sequentially and the
 * dataset is small.  Errors are not propagated; in a production
 * application you would want to handle them appropriately.
 * @param {Array<Object>} tasks
 */
function saveTasks(tasks) {
  fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
}

/**
 * Generate a simple JSON response.  All API responses use
 * application/json as the Content-Type.
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {Object} body
 */
function jsonResponse(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Serve a static file from the frontend directory.  If the file cannot
 * be found the function returns `false` so the caller can continue
 * processing (e.g. returning a 404).  Known content types are
 * returned; everything else defaults to text/plain.
 * @param {http.ServerResponse} res
 * @param {string} urlPath
 * @returns {boolean} true if the file was served, false otherwise
 */
function serveStatic(res, urlPath) {
  const frontendPath = path.join(__dirname, '../frontend');
  // Resolve the requested path relative to the frontend directory.  Using
  // path.normalize prevents directory traversal attacks.
  let requested = path.join(frontendPath, decodeURI(urlPath));
  if (urlPath === '/' || urlPath === '') {
    requested = path.join(frontendPath, 'index.html');
  }
  // Check that the path is still within the frontend directory
  if (!requested.startsWith(frontendPath)) {
    return false;
  }
  if (!fs.existsSync(requested) || fs.statSync(requested).isDirectory()) {
    return false;
  }
  // Determine content type
  const ext = path.extname(requested).toLowerCase();
  let contentType = 'text/plain';
  if (ext === '.html') contentType = 'text/html';
  else if (ext === '.js') contentType = 'application/javascript';
  else if (ext === '.css') contentType = 'text/css';
  else if (ext === '.json' || ext === '.webmanifest') contentType = 'application/json';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.svg') contentType = 'image/svg+xml';
  // Read and send the file
  try {
    const data = fs.readFileSync(requested);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
    return true;
  } catch (err) {
    return false;
  }
}

// Create the HTTP server.  It handles both API routes under /api and
// static file requests for the frontend.  CORS headers are added
// globally to allow the frontend to communicate with the API when served
// from another origin during development.
const server = http.createServer((req, res) => {
  // Basic CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Pre-flight requests return immediately
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  // Handle API routes
  if (req.url.startsWith('/api/tasks')) {
    const tasks = loadTasks();
    // GET /api/tasks -> return all tasks
    if (req.method === 'GET' && req.url === '/api/tasks') {
      return jsonResponse(res, 200, tasks);
    }
    // POST /api/tasks -> create a new task
    if (req.method === 'POST' && req.url === '/api/tasks') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const incoming = JSON.parse(body || '{}');
          // Basic validation of required fields
          const { date, startTime, endTime, category, description } = incoming;
          if (!date || !startTime || !description) {
            return jsonResponse(res, 400, { error: 'Missing required fields' });
          }
          const newTask = {
            id: Date.now().toString(),
            date,
            startTime,
            endTime: endTime || '',
            category: category || '',
            description,
            completed: false
          };
          tasks.push(newTask);
          saveTasks(tasks);
          jsonResponse(res, 201, newTask);
        } catch (err) {
          jsonResponse(res, 400, { error: 'Invalid JSON' });
        }
      });
      return;
    }
    // PUT /api/tasks/:id -> update an existing task
    if (req.method === 'PUT' && /^\/api\/tasks\/[\w-]+$/.test(req.url)) {
      const id = req.url.split('/').pop();
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const update = JSON.parse(body || '{}');
          const index = tasks.findIndex(t => t.id === id);
          if (index === -1) {
            return jsonResponse(res, 404, { error: 'Task not found' });
          }
          // Update allowed properties
          tasks[index] = { ...tasks[index], ...update, id };
          saveTasks(tasks);
          jsonResponse(res, 200, tasks[index]);
        } catch (err) {
          jsonResponse(res, 400, { error: 'Invalid JSON' });
        }
      });
      return;
    }
    // DELETE /api/tasks/:id -> remove a task
    if (req.method === 'DELETE' && /^\/api\/tasks\/[\w-]+$/.test(req.url)) {
      const id = req.url.split('/').pop();
      const index = tasks.findIndex(t => t.id === id);
      if (index === -1) {
        return jsonResponse(res, 404, { error: 'Task not found' });
      }
      const removed = tasks.splice(index, 1)[0];
      saveTasks(tasks);
      return jsonResponse(res, 200, removed);
    }
    // Unknown API route
    return jsonResponse(res, 404, { error: 'Not found' });
  }
  // Serve the frontend static files
  if (serveStatic(res, req.url)) return;
  // Fallback 404 for everything else
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// The port can be configured via the PORT environment variable, which
// makes it easy to deploy to services like Heroku.  When run locally
// the server defaults to port 3000.
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Daily Planner backend running on http://localhost:${PORT}`);
});
