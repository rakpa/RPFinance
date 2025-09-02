# Deployment Guides for Mintary

## Option 1: Cloudflare D1 Database + Vercel Frontend

### Prerequisites
- Cloudflare account
- Vercel account
- Wrangler CLI installed: `npm install -g wrangler`

### Step 1: Setup Cloudflare D1 Database

```bash
# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create mintary-db
```

Copy the database ID from output and update `wrangler.jsonc`:

```json
{
  "name": "mintary-api",
  "main": "dist/worker/index.js",
  "compatibility_date": "2024-09-01",
  "node_compat": true,
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mintary-db",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

### Step 2: Run Database Migrations

```bash
# Create migration files
mkdir -p migrations

# Create initial migration
cat > migrations/0001_initial.sql << 'EOF'
-- Create expenses table
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create income table
CREATE TABLE income (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  user_id TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default expense categories
INSERT INTO categories (name, icon, type, user_id, is_default) VALUES
('Food & Dining', 'UtensilsCrossed', 'expense', 'default', TRUE),
('Transportation', 'Car', 'expense', 'default', TRUE),
('Shopping', 'ShoppingBag', 'expense', 'default', TRUE),
('Entertainment', 'Film', 'expense', 'default', TRUE),
('Bills & Utilities', 'Receipt', 'expense', 'default', TRUE),
('Healthcare', 'Heart', 'expense', 'default', TRUE),
('Travel', 'Plane', 'expense', 'default', TRUE),
('Education', 'GraduationCap', 'expense', 'default', TRUE),
('Personal Care', 'Sparkles', 'expense', 'default', TRUE),
('Other', 'MoreHorizontal', 'expense', 'default', TRUE);

-- Insert default income categories
INSERT INTO categories (name, icon, type, user_id, is_default) VALUES
('Salary', 'Briefcase', 'income', 'default', TRUE),
('Freelance', 'Laptop', 'income', 'default', TRUE),
('Investment', 'TrendingUp', 'income', 'default', TRUE),
('Business', 'Building', 'income', 'default', TRUE),
('Gift', 'Gift', 'income', 'default', TRUE),
('Other Income', 'DollarSign', 'income', 'default', TRUE);
EOF

# Apply migration to local DB for development
wrangler d1 execute mintary-db --local --file=migrations/0001_initial.sql

# Apply migration to production DB
wrangler d1 execute mintary-db --file=migrations/0001_initial.sql
```

### Step 3: Deploy Cloudflare Worker

```bash
# Set secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put MOCHA_USERS_SERVICE_API_KEY
wrangler secret put MOCHA_USERS_SERVICE_API_URL

# Deploy worker
npm run build
wrangler deploy
```

### Step 4: Update Frontend for Vercel

Create `vercel.json`:

```json
{
  "functions": {
    "src/react-app/**": {
      "runtime": "@vercel/static"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 5: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

---

## Option 2: Supabase Database + Vercel

### Prerequisites
- Supabase account
- Vercel account

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database to be ready
4. Go to Settings → Database → Connection string
5. Copy the connection string

### Step 2: File Changes Required

#### Update `package.json` dependencies:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "postgres": "^3.4.0"
  }
}
```

#### Create new database client `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### Update `worker-configuration.d.ts`:

```typescript
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  OPENAI_API_KEY: string;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
}
```

### Step 3: Create Supabase Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Enable Row Level Security
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS income ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;

-- Create expenses table
CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create income table
CREATE TABLE income (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  user_id TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, icon, type, user_id, is_default) VALUES
('Food & Dining', 'UtensilsCrossed', 'expense', 'default', TRUE),
('Transportation', 'Car', 'expense', 'default', TRUE),
('Shopping', 'ShoppingBag', 'expense', 'default', TRUE),
('Entertainment', 'Film', 'expense', 'default', TRUE),
('Bills & Utilities', 'Receipt', 'expense', 'default', TRUE),
('Healthcare', 'Heart', 'expense', 'default', TRUE),
('Travel', 'Plane', 'expense', 'default', TRUE),
('Education', 'GraduationCap', 'expense', 'default', TRUE),
('Personal Care', 'Sparkles', 'expense', 'default', TRUE),
('Other', 'MoreHorizontal', 'expense', 'default', TRUE),
('Salary', 'Briefcase', 'income', 'default', TRUE),
('Freelance', 'Laptop', 'income', 'default', TRUE),
('Investment', 'TrendingUp', 'income', 'default', TRUE),
('Business', 'Building', 'income', 'default', TRUE),
('Gift', 'Gift', 'income', 'default', TRUE),
('Other Income', 'DollarSign', 'income', 'default', TRUE);

-- Create indexes
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_income_user_id ON income(user_id);
CREATE INDEX idx_income_date ON income(date);
CREATE INDEX idx_categories_user_type ON categories(user_id, type);

-- Row Level Security Policies
CREATE POLICY "Users can view their own expenses" ON expenses
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own expenses" ON expenses
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own expenses" ON expenses
  FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- Similar policies for income
CREATE POLICY "Users can view their own income" ON income
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own income" ON income
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own income" ON income
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own income" ON income
  FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- Categories policies
CREATE POLICY "Users can view categories" ON categories
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub' OR is_default = TRUE);

CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub' AND is_default = FALSE);

CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (user_id = auth.jwt() ->> 'sub' AND is_default = FALSE);
```

### Step 4: Update Worker Code

You'll need to replace the current `src/worker/index.ts` with Supabase queries. Here's an example for the expenses endpoint:

```typescript
// Example of updated expense endpoint
app.get("/api/expenses", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const url = new URL(c.req.url);
    const filter = url.searchParams.get('filter');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const limit = url.searchParams.get('limit');
    
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (filter) {
      const now = new Date();
      switch (filter) {
        case 'this_month':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          query = query.gte('date', startOfMonth.toISOString().split('T')[0]);
          break;
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          query = query
            .gte('date', lastMonth.toISOString().split('T')[0])
            .lte('date', endOfLastMonth.toISOString().split('T')[0]);
          break;
        case 'this_year':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          query = query.gte('date', startOfYear.toISOString().split('T')[0]);
          break;
      }
    }
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const { data: expenses, error } = await query;
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to fetch expenses" }, 500);
    }
    
    return c.json({ expenses: expenses || [] });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return c.json({ error: "Failed to fetch expenses" }, 500);
  }
});
```

### Step 5: Environment Variables

Set these in both Cloudflare Worker and Vercel:

```bash
# Cloudflare Worker secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put OPENAI_API_KEY

# Vercel environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
```

### Step 6: Deploy

```bash
# Deploy worker
wrangler deploy

# Deploy frontend
vercel --prod
```

---

## Recommended Approach

**For simplicity and current setup**: Use **Cloudflare D1** option as it requires minimal code changes.

**For scalability and features**: Use **Supabase** for real-time features, better tooling, and PostgreSQL capabilities.

Would you like me to help you implement either approach or create the specific file changes for Supabase?
