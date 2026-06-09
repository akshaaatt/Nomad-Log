# 🗺️ The Nomad Log

A premium, interactive personal cartography service and travel logbook application. **The Nomad Log** allows travelers to visually map their journeys, save detailed memoirs, curate custom wishlists, plan travel routes, and maintain a history of their global adventures.

Built as a modern Single Page Application (SPA), it syncs in real-time with **Supabase** for database persistence and authentication, and is optimized for zero-config hosting on platforms like **Vercel**.

---

## ✨ Features

- **Interactive Cartography**: High-performance mapping utilizing Leaflet.js to pinpoint visited destinations, wishlist coordinates, and sites to avoid.
- **Detailed Travel Memoirs**: Log specific details for destinations including ratings, reviews, tags, companions, trip dates, and budgets.
- **Dynamic Travel Routes**: Link multiple stops together to build travel route itineraries, track sequence steps, manage estimated costs, save media links, and write travel diaries.
- **Live Local Insights**: Live clocks ticking according to the traveler's custom timezone preferences.
- **Logbook Analytics**: Interactive dashboard compiling travel statistics, visited countries count, companion breakdowns, and budget summaries.
- **Supabase Authentication**: Secure login and signup with active session retention.
- **Self-contained Seeding**: Auto-populates example travel logs (Kyoto, Paris, Reykjavik) upon registration to provide a beautiful initial map visual.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Motion (Framer Motion)
- **Map engine**: Leaflet.js
- **Database & Auth**: Supabase (PostgreSQL & GoTrue Auth)
- **Bundler**: Vite

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Configure Supabase PostgreSQL Tables
Go to your **Supabase Dashboard** -> **SQL Editor**, and run the following script to create the necessary tables and set up secure Row Level Security (RLS) policies:

```sql
-- Create locations table
create table if not exists public.locations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  place_name text not null,
  city_name text,
  country_name text,
  lat double precision not null,
  lng double precision not null,
  category text not null check (category in ('visited', 'wishlist', 'avoid')),
  visit_date text,
  rating integer,
  review text,
  companions text,
  flagged_reason text,
  estimated_budget double precision,
  cost_amount double precision,
  priority text,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on locations
alter table public.locations enable row level security;

-- Create RLS policies for locations
create policy "Users can manage their own locations" 
  on public.locations for all 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

-- Create routes table
create table if not exists public.routes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  stops jsonb not null,
  cost_amount double precision,
  media_links text[],
  visit_date text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on routes
alter table public.routes enable row level security;

-- Create RLS policies for routes
create policy "Users can manage their own routes" 
  on public.routes for all 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);
```

### 3. Setup Local Environment
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
```

### 4. Run Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the app.

---

## 📦 Production & Deployment

### Production Build
Generate an optimized static production bundle:
```bash
npm run build
```
This outputs all compiled HTML, JS, and CSS files into the `dist/` directory.

### Deploying to Vercel
This project is fully compatible with Vercel's zero-config deployment for Vite applications.
1. Connect your GitHub repository to Vercel.
2. In the Vercel project settings, ensure you connect the **Supabase Integration** or configure these environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Push your code to your GitHub repository. Vercel will trigger a deployment build automatically!
