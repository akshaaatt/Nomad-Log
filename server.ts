import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Directory and files for persistent standard JSON database
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LOCATIONS_FILE = path.join(DATA_DIR, "locations.json");
const ROUTES_FILE = path.join(DATA_DIR, "routes.json");

// Ensure data files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(LOCATIONS_FILE)) {
  fs.writeFileSync(LOCATIONS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(ROUTES_FILE)) {
  fs.writeFileSync(ROUTES_FILE, JSON.stringify([], null, 2));
}

// In-memory active session store (token -> userId)
const activeSessions: Record<string, { userId: string; username: string }> = {};

app.use(express.json());

// Logger middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Helper: load users
function loadUsers(): any[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch (e) {
    return [];
  }
}

// Helper: save users
function saveUsers(users: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Helper: load locations
function loadLocations(): any[] {
  try {
    return JSON.parse(fs.readFileSync(LOCATIONS_FILE, "utf-8"));
  } catch (e) {
    return [];
  }
}

// Helper: save locations
function saveLocations(locations: any[]) {
  fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(locations, null, 2));
}

// Helper: load routes
function loadRoutes(): any[] {
  try {
    return JSON.parse(fs.readFileSync(ROUTES_FILE, "utf-8"));
  } catch (e) {
    return [];
  }
}

// Helper: save routes
function saveRoutes(routes: any[]) {
  fs.writeFileSync(ROUTES_FILE, JSON.stringify(routes, null, 2));
}

// Hash password with salt
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

// Authentication Middleware
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  let token = "";
  
  // Try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  
  // Try custom header
  if (!token && req.headers["x-session-token"]) {
    token = req.headers["x-session-token"] as string;
  }

  if (!token) {
    res.status(401).json({ error: "Authentication token required. Please login again." });
    return;
  }

  const session = activeSessions[token];
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid. Please login again." });
    return;
  }

  // Attach session details to requests
  req.userId = session.userId;
  req.username = session.username;
  (req as any).sessionToken = token;
  next();
}

// Extend Request types for Express in this file
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      username?: string;
    }
  }
}

// Default travel landmarks to seed a new account (Kyoto, Paris, etc.)
const SEED_LOCATIONS_TEMPLATE = [
  {
    placeName: 'Kyoto, Japan',
    cityName: 'Kyoto',
    countryName: 'Japan',
    lat: 35.0116,
    lng: 135.7681,
    category: 'visited',
    visitDate: '2025-04-12',
    rating: 5,
    review: 'Kyoto was absolutely magical. The contrast between ancient temples like Kinkaku-ji and modern streets was breathtaking. Cherry blossoms were in full bloom. Highly recommend Renting a Kimono and walking through Gion at night!',
    companions: 'Partner',
    tags: ['Culture', 'Temples', 'Nature', 'Foodie']
  },
  {
    placeName: 'Paris, France',
    cityName: 'Paris',
    countryName: 'France',
    lat: 48.8566,
    lng: 2.3522,
    category: 'visited',
    visitDate: '2024-09-18',
    rating: 4,
    review: 'A classic that lived up to the hype! Visiting the Louvre at night and eating freshly baked croissants from local boulangeries made it unforgettable. Beware of pickpockets around Sacré-Cœur, but otherwise spectacular visual layouts.',
    companions: 'Solo',
    tags: ['Museums', 'Romantic', 'Architecture', 'Foodie']
  },
  {
    placeName: 'Reykjavik, Iceland',
    cityName: 'Reykjavik',
    countryName: 'Iceland',
    lat: 64.1466,
    lng: -21.9426,
    category: 'wishlist',
    visitDate: '2027-02-15',
    rating: 0,
    review: 'Dreaming of seeing the Northern Lights and soaking in the Blue Lagoon. Planning a full road trip around the Ring Road to witness the black sand beaches, colossal waterfalls, and majestic glaciers.',
    companions: 'Friends',
    estimatedBudget: 3500,
    priority: 'High',
    tags: ['Nature', 'Northern Lights', 'Adventure', 'Roadtrip']
  }
];

// Seed standard location entries for newly registered account
function seedUserLocations(userId: string) {
  const currentLocs = loadLocations();
  const alreadyHas = currentLocs.some(l => l.userId === userId);
  if (alreadyHas) return;

  const newLocs = SEED_LOCATIONS_TEMPLATE.map((tpl, i) => ({
    id: `seed-${userId}-${i}-${Date.now()}`,
    userId,
    ...tpl
  }));

  saveLocations([...currentLocs, ...newLocs]);
}

// ---------------- AUTH API ROUTES ----------------

// Register a new user
app.post("/api/auth/signup", (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password || typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Username and password are required and must be strings." });
    return;
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters long." });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters long." });
    return;
  }

  const users = loadUsers();
  const exists = users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
  if (exists) {
    res.status(400).json({ error: "Username is already taken by another traveller." });
    return;
  }

  // Generate PBKDF2 hash
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const userId = `user-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  const newUser = {
    id: userId,
    username: trimmedUsername,
    passwordHash,
    salt,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  // Auto seed travel examples for a beautiful initial experience
  seedUserLocations(userId);

  // Establish standard session
  const token = crypto.randomBytes(32).toString("hex");
  activeSessions[token] = { userId: newUser.id, username: newUser.username };

  res.json({
    message: "Registration successful. Welcome to The Nomad Log!",
    token,
    user: {
      id: newUser.id,
      username: newUser.username
    }
  });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  const users = loadUsers();
  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

  if (!user) {
    res.status(400).json({ error: "Invalid username or password." });
    return;
  }

  const incomingHash = hashPassword(password, user.salt);
  if (incomingHash !== user.passwordHash) {
    res.status(400).json({ error: "Invalid username or password." });
    return;
  }

  // Create session
  const token = crypto.randomBytes(32).toString("hex");
  activeSessions[token] = { userId: user.id, username: user.username };

  res.json({
    message: `Welcome back, ${user.username}!`,
    token,
    user: {
      id: user.id,
      username: user.username
    }
  });
});

// Logout
app.post("/api/auth/logout", authenticate, (req, res) => {
  const token = (req as any).sessionToken;
  if (token && activeSessions[token]) {
    delete activeSessions[token];
  }
  res.json({ message: "Successfully logged out of your map logbook." });
});

// Check auth status / get profile
app.get("/api/auth/me", (req, res) => {
  let token = "";
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  if (!token && req.headers["x-session-token"]) {
    token = req.headers["x-session-token"] as string;
  }

  if (!token) {
    res.json({ user: null });
    return;
  }

  const session = activeSessions[token];
  if (!session) {
    res.json({ user: null });
    return;
  }

  res.json({
    user: {
      id: session.userId,
      username: session.username
    }
  });
});


// ---------------- LOCATIONS API ROUTES ----------------

// Fetch all saved locations for the logged-in user
app.get("/api/locations", authenticate, (req, res) => {
  const locations = loadLocations();
  const userLocations = locations.filter(l => l.userId === req.userId);
  res.json(userLocations);
});

// Add a location entry associated with user
app.post("/api/locations", authenticate, (req, res) => {
  const locations = loadLocations();
  const newLoc = req.body;

  if (!newLoc.cityName || !newLoc.countryName || newLoc.lat === undefined || newLoc.lng === undefined) {
    res.status(400).json({ error: "Missing required coordinate or geographic parameters." });
    return;
  }

  // Compile coordinates and sanitize content
  const locationWithUser = {
    ...newLoc,
    id: newLoc.id || `loc-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    userId: req.userId,
  };

  locations.push(locationWithUser);
  saveLocations(locations);

  res.status(201).json(locationWithUser);
});

// Update a location entry
app.put("/api/locations/:id", authenticate, (req, res) => {
  const locations = loadLocations();
  const { id } = req.params;
  const index = locations.findIndex(l => l.id === id && l.userId === req.userId);

  if (index === -1) {
    res.status(404).json({ error: "Destination record not found or access unauthorized." });
    return;
  }

  const updatedLoc = {
    ...locations[index], // preserve original fields
    ...req.body,
    id, // lock ID
    userId: req.userId // lock owner
  };

  locations[index] = updatedLoc;
  saveLocations(locations);

  res.json(updatedLoc);
});

// Delete a location entry
app.delete("/api/locations/:id", authenticate, (req, res) => {
  const locations = loadLocations();
  const { id } = req.params;
  const originalLength = locations.length;
  const filtered = locations.filter(l => !(l.id === id && l.userId === req.userId));

  if (filtered.length === originalLength) {
    res.status(404).json({ error: "Destination record not found or access unauthorized." });
    return;
  }

  saveLocations(filtered);
  res.json({ success: true, message: "Geographic entry successfully deleted." });
});


// ---------------- ROUTES API ENDPOINTS ----------------

// Fetch all routes for the logged-in user
app.get("/api/routes", authenticate, (req, res) => {
  const routes = loadRoutes();
  const userRoutes = routes.filter(r => r.userId === req.userId);
  res.json(userRoutes);
});

// Create a new travel route
app.post("/api/routes", authenticate, (req, res) => {
  const routes = loadRoutes();
  const newRoute = req.body;

  if (!newRoute.title || !newRoute.stops || !Array.isArray(newRoute.stops)) {
    res.status(400).json({ error: "Title and list of stops are required for travel routes." });
    return;
  }

  // Double check and ensure we have lat/lng fields correctly parsed
  const routeWithUser = {
    ...newRoute,
    id: newRoute.id || `route-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    userId: req.userId,
    costAmount: typeof newRoute.costAmount === "number" ? newRoute.costAmount : parseFloat(newRoute.costAmount) || 0,
    mediaLinks: Array.isArray(newRoute.mediaLinks) ? newRoute.mediaLinks : []
  };

  routes.push(routeWithUser);
  saveRoutes(routes);

  res.status(201).json(routeWithUser);
});

// Update an existing travel route
app.put("/api/routes/:id", authenticate, (req, res) => {
  const routes = loadRoutes();
  const { id } = req.params;
  const index = routes.findIndex(r => r.id === id && r.userId === req.userId);

  if (index === -1) {
    res.status(404).json({ error: "Travel route not found or access unauthorized." });
    return;
  }

  const updatedRoute = {
    ...routes[index],
    ...req.body,
    id,
    userId: req.userId,
    costAmount: typeof req.body.costAmount === "number" ? req.body.costAmount : parseFloat(req.body.costAmount) || 0,
    mediaLinks: Array.isArray(req.body.mediaLinks) ? req.body.mediaLinks : routes[index].mediaLinks || []
  };

  routes[index] = updatedRoute;
  saveRoutes(routes);

  res.json(updatedRoute);
});

// Delete a travel route
app.delete("/api/routes/:id", authenticate, (req, res) => {
  const routes = loadRoutes();
  const { id } = req.params;
  const originalLength = routes.length;
  const filtered = routes.filter(r => !(r.id === id && r.userId === req.userId));

  if (filtered.length === originalLength) {
    res.status(404).json({ error: "Travel route not found or access unauthorized." });
    return;
  }

  saveRoutes(filtered);
  res.json({ success: true, message: "Travel route successfully deleted." });
});


// ---------------- GOOGLE SIGN-IN INTERACTIVE ENDPOINTS ----------------

// Get Google login redirection URL (Uses real Google flow if configured, otherwise simulator)
app.get("/api/auth/google/url", (req, res) => {
  const isGoogleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  if (isGoogleConfigured) {
    const redirectUri = process.env.APP_URL 
      ? `${process.env.APP_URL.replace(/\/$/, '')}/auth/google/callback` 
      : `${req.protocol}://${req.get('host')}/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: crypto.randomBytes(16).toString("hex"),
      prompt: 'select_account'
    });

    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  } else {
    // Simulator URL (local container route)
    const baseUrl = process.env.APP_URL 
      ? process.env.APP_URL.replace(/\/$/, '') 
      : `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl}/auth/google/callback`;
    const simulatorUrl = `${baseUrl}/auth/google/simulator?redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.json({ url: simulatorUrl });
  }
});

// Google login account selection simulator (rendered when GOOGLE_CLIENT_ID is missing)
app.get("/auth/google/simulator", (req, res) => {
  const redirect_uri = req.query.redirect_uri as string || "/auth/google/callback";
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in - Google Accounts</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-[#F0F4F9] min-h-screen flex items-center justify-center font-sans antialiased text-[#1F1F1F]">
      <div class="bg-white w-full max-w-[450px] min-h-[500px] sm:min-h-0 sm:rounded-[28px] p-6 sm:p-10 flex flex-col justify-between shadow-sm border border-[#E0E2E6]">
        
        <!-- Header -->
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <!-- Google Minimalist SVG Logo -->
            <svg class="h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span class="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">Auth Simulator</span>
          </div>

          <div class="space-y-2">
            <h1 class="text-2xl font-normal text-[#1F1F1F]">Sign in to continue</h1>
            <p class="text-sm text-[#444746]">to the application <strong class="text-[#1F1F1F]">The Nomad Log</strong></p>
          </div>
        </div>

        <!-- Google-style Select Account Interface -->
        <div class="my-8 space-y-4 flex-1 flex flex-col justify-center">
          <p class="text-xs text-[#444746] font-medium uppercase tracking-[0.05em] mb-1">Choose an account</p>
          
          <!-- Primary Account User Option -->
          <button 
            onclick="selectAccount('tiwariakshat03@gmail.com', 'Akshat Tiwari')"
            class="w-full flex items-center p-3 rounded-xl border border-[#E0E2E6] hover:bg-[#F8F9FA] transition-all text-left space-x-3 group animate-pulse"
          >
            <div class="w-10 h-10 rounded-full bg-[#1A1A1A] text-[#F9F8F6] flex items-center justify-center font-bold text-sm shrink-0">
              AT
            </div>
            <div class="flex-1 overflow-hidden">
              <div class="text-sm font-semibold text-[#1F1F1F] truncate text-left">Akshat Tiwari</div>
              <div class="text-xs text-[#444746] truncate text-left">tiwariakshat03@gmail.com</div>
            </div>
            <svg class="w-5 h-5 text-[#4285F4] group-hover:scale-110 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <!-- Alternative Option -->
          <button 
            onclick="selectAccount('nomad.explorer@gmail.com', 'Nomad Explorer')"
            class="w-full flex items-center p-3 rounded-xl border border-[#E0E2E6] hover:bg-[#F8F9FA] transition-all text-left space-x-3 group"
          >
            <div class="w-10 h-10 rounded-full bg-[#B45309] text-white flex items-center justify-center font-bold text-sm shrink-0">
              NE
            </div>
            <div class="flex-1 overflow-hidden">
              <div class="text-sm font-semibold text-[#1F1F1F] truncate text-left">Nomad Explorer</div>
              <div class="text-xs text-[#444746] truncate text-left">nomad.explorer@gmail.com</div>
            </div>
            <svg class="w-5 h-5 text-[#444746]/40 group-hover:text-[#4285F4] transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <!-- Custom Account Entry Form -->
          <div class="pt-2 border-t border-[#E0E2E6] mt-2">
            <p class="text-xs text-[#444746] font-medium mb-2">Or log in with another test email:</p>
            <form onsubmit="handleCustomSubmit(event)" class="flex space-x-2">
              <input 
                id="custom_email" 
                type="email" 
                required 
                placeholder="address@example.com"
                class="flex-1 px-3 py-1.5 text-xs bg-white border border-[#C4C7C5] rounded-lg focus:outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]"
              />
              <button 
                type="submit"
                class="bg-[#4285F4] hover:bg-[#357AE8] text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer"
              >
                Sign in
              </button>
            </form>
          </div>
        </div>

        <!-- Footer Notice -->
        <div class="space-y-3">
          <p class="text-[10px] text-[#444746] leading-relaxed">
            The developer of this app has not yet registered standard Google Client Credentials. Proceeding will trigger a developer-level sandbox login using credentials simulated securely over local state callbacks.
          </p>
          <div class="flex justify-between items-center text-xs text-[#444746]">
            <span>English (United States)</span>
            <div class="space-x-3">
              <a href="#" class="hover:underline">Help</a>
              <a href="#" class="hover:underline">Privacy</a>
              <a href="#" class="hover:underline">Terms</a>
            </div>
          </div>
        </div>
        
      </div>

      <script>
        function selectAccount(email, name) {
          const redirectUri = new URL('${redirect_uri}');
          redirectUri.searchParams.set('code', 'mock_code_' + encodeURIComponent(email) + '_' + encodeURIComponent(name));
          window.location.href = redirectUri.toString();
        }

        function handleCustomSubmit(event) {
          event.preventDefault();
          const email = document.getElementById('custom_email').value;
          if (!email) return;
          const display = email.split('@')[0];
          const capitalized = display.charAt(0).toUpperCase() + display.slice(1);
          selectAccount(email, capitalized);
        }
      </script>
    </body>
    </html>
  `);
});

// Google authentication callback route
app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    res.status(400).send("No authorization code provided.");
    return;
  }

  let email = "tiwariakshat03@gmail.com";
  let name = "Akshat Tiwari";

  const isMock = code.startsWith("mock_code_") || !process.env.GOOGLE_CLIENT_ID;

  if (!isMock) {
    try {
      const redirectUri = process.env.APP_URL 
        ? `${process.env.APP_URL.replace(/\/$/, '')}/auth/google/callback` 
        : `${req.protocol}://${req.get('host')}/auth/google/callback`;

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await response.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await userInfoResponse.json();
      email = profile.email || "tiwariakshat03@gmail.com";
      name = profile.name || profile.given_name || email.split('@')[0];
    } catch (e: any) {
      console.error("Google OAuth token exchange failed:", e);
      res.send(`
        <html>
          <body class="bg-[#F9F8F6] text-[#1A1A1A] font-sans p-6 text-center">
            <h1 class="text-lg font-serif font-bold text-red-700">Google OAuth Error</h1>
            <p class="text-xs text-[#1A1A1A]/70 my-3">${e.message || "Could not successfully complete OAuth token code exchange."}</p>
            <p class="text-xs my-2">Please double-check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets in AI Studio.</p>
            <button onclick="window.close()" class="bg-[#1A1A1A] text-white px-4 py-2 text-xs uppercase font-bold mt-4 tracking-wider cursor-pointer">Close Window</button>
          </body>
        </html>
      `);
      return;
    }
  } else {
    // Simulator mock parsing
    const prefix = "mock_code_";
    if (code.startsWith(prefix)) {
      const parts = decodeURIComponent(code.substring(prefix.length)).split("_");
      email = parts[0] || "tiwariakshat03@gmail.com";
      name = parts[1] || email.split('@')[0];
    }
  }

  // Find or create user representing this Google Account
  const username = name || email.split("@")[0];
  const googleUserId = `google-${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  
  const users = loadUsers();
  let user = users.find(u => u.id === googleUserId || u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    user = {
      id: googleUserId,
      username: username,
      isGoogleUser: true,
      email: email,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    
    // Seed locations instantly
    seedUserLocations(googleUserId);
  }

  // Create active session
  const token = crypto.randomBytes(32).toString("hex");
  activeSessions[token] = { userId: user.id, username: user.username };

  // Send token to the opener window and close
  res.send(`
    <html>
      <body class="bg-[#F9F8F6] font-sans flex flex-col items-center justify-center min-h-screen text-[#1A1A1A]">
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_AUTH_SUCCESS',
              token: ${JSON.stringify(token)},
              user: {
                id: ${JSON.stringify(user.id)},
                username: ${JSON.stringify(user.username)}
              }
            }, '*');
            window.close();
          } else {
            localStorage.setItem('travel_session_token', ${JSON.stringify(token)});
            window.location.href = '/';
          }
        </script>
        <p class="text-xs font-serif font-semibold tracking-wide animate-pulse">Synchronizing Google Map Logs...</p>
        <p class="text-[10px] text-[#1A1A1A]/40 mt-1">This window should close automatically.</p>
      </body>
    </html>
  `);
});


// ---------------- CHASSIS INTEGRATION (Vite Middleware) ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on http://0.0.0.0:${PORT}`);
  });
}

startServer();
