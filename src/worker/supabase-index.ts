import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { setCookie, getCookie } from "hono/cookie";
import OpenAI from "openai";
import { z } from "zod";
import { CreateExpenseSchema, CreateIncomeSchema, CreateCategorySchema } from "@/shared/types";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Supabase client helper
const getSupabaseClient = async (env: Env) => {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Authentication endpoints (same as before)
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Get all expenses
app.get("/api/expenses", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const supabase = await getSupabaseClient(c.env);
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

// Create new expense
app.post("/api/expenses", authMiddleware, zValidator("json", CreateExpenseSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const data = c.req.valid("json");
    const supabase = await getSupabaseClient(c.env);
    
    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert({
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: data.date,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to create expense" }, 500);
    }
    
    return c.json({ expense: newExpense });
  } catch (error) {
    console.error("Error creating expense:", error);
    return c.json({ error: "Failed to create expense" }, 500);
  }
});

// Delete expense
app.delete("/api/expenses/:id", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const id = c.req.param("id");
    const supabase = await getSupabaseClient(c.env);
    
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to delete expense" }, 500);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return c.json({ error: "Failed to delete expense" }, 500);
  }
});

// Get all income
app.get("/api/income", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const supabase = await getSupabaseClient(c.env);
    const url = new URL(c.req.url);
    const filter = url.searchParams.get('filter');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const limit = url.searchParams.get('limit');
    
    let query = supabase
      .from('income')
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
    
    const { data: income, error } = await query;
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to fetch income" }, 500);
    }
    
    return c.json({ income: income || [] });
  } catch (error) {
    console.error("Error fetching income:", error);
    return c.json({ error: "Failed to fetch income" }, 500);
  }
});

// Create new income
app.post("/api/income", authMiddleware, zValidator("json", CreateIncomeSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const data = c.req.valid("json");
    const supabase = await getSupabaseClient(c.env);
    
    const { data: newIncome, error } = await supabase
      .from('income')
      .insert({
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: data.date,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to create income" }, 500);
    }
    
    return c.json({ income: newIncome });
  } catch (error) {
    console.error("Error creating income:", error);
    return c.json({ error: "Failed to create income" }, 500);
  }
});

// Delete income
app.delete("/api/income/:id", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const id = c.req.param("id");
    const supabase = await getSupabaseClient(c.env);
    
    const { error } = await supabase
      .from('income')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to delete income" }, 500);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting income:", error);
    return c.json({ error: "Failed to delete income" }, 500);
  }
});

// Get categories
app.get("/api/categories", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const url = new URL(c.req.url);
    const type = url.searchParams.get('type') || 'expense';
    const supabase = await getSupabaseClient(c.env);
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .or(`user_id.eq.${user.id},is_default.eq.true`)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to fetch categories" }, 500);
    }
    
    return c.json({ categories: categories || [] });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json({ error: "Failed to fetch categories" }, 500);
  }
});

// Create new category
app.post("/api/categories", authMiddleware, zValidator("json", CreateCategorySchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const data = c.req.valid("json");
    const supabase = await getSupabaseClient(c.env);
    
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name: data.name,
        icon: data.icon,
        type: data.type,
        user_id: user.id,
        is_default: false
      })
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to create category" }, 500);
    }
    
    return c.json({ category: newCategory });
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json({ error: "Failed to create category" }, 500);
  }
});

// Update category
app.put("/api/categories/:id", authMiddleware, zValidator("json", CreateCategorySchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const supabase = await getSupabaseClient(c.env);
    
    const { data: updatedCategory, error } = await supabase
      .from('categories')
      .update({
        name: data.name,
        icon: data.icon,
        type: data.type,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_default', false)
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to update category" }, 500);
    }
    
    return c.json({ category: updatedCategory });
  } catch (error) {
    console.error("Error updating category:", error);
    return c.json({ error: "Failed to update category" }, 500);
  }
});

// Delete category
app.delete("/api/categories/:id", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const id = c.req.param("id");
    const supabase = await getSupabaseClient(c.env);
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_default', false);
    
    if (error) {
      console.error("Supabase error:", error);
      return c.json({ error: "Failed to delete category" }, 500);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return c.json({ error: "Failed to delete category" }, 500);
  }
});

// Get AI insights
app.get("/api/insights", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const supabase = await getSupabaseClient(c.env);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Get recent expenses and income
    const [expensesResult, incomeResult] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateString)
        .order('date', { ascending: false }),
      supabase
        .from('income')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateString)
        .order('date', { ascending: false })
    ]);
    
    const expenses = expensesResult.data || [];
    const income = incomeResult.data || [];
    
    if (!expenses.length && !income.length) {
      return c.json({ 
        insight: {
          summary: "No financial data found in the last 30 days. Start tracking your income and expenses to get personalized insights!",
          tips: ["Begin by adding your daily transactions", "Categorize your spending and income for better analysis"],
          categoryBreakdown: {},
          spendingTrend: "stable"
        }
      });
    }

    // Calculate category breakdown for expenses
    const categoryBreakdown: Record<string, number> = {};
    let totalExpenses = 0;
    let totalIncome = 0;
    
    expenses.forEach((expense: any) => {
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + parseFloat(expense.amount);
      totalExpenses += parseFloat(expense.amount);
    });
    
    income.forEach((incomeItem: any) => {
      totalIncome += parseFloat(incomeItem.amount);
    });

    // Prepare data for AI analysis
    const expenseData = expenses.map((exp: any) => 
      `${exp.date}: -${exp.amount} zł - ${exp.description} (${exp.category})`
    ).join('\n');
    
    const incomeData = income.map((inc: any) => 
      `${inc.date}: +${inc.amount} zł - ${inc.description} (${inc.category})`
    ).join('\n');

    const financialData = [expenseData, incomeData].filter(Boolean).join('\n');
    const netIncome = totalIncome - totalExpenses;

    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a personal finance advisor. Analyze the user's financial data and provide insights. 
          Be encouraging and practical. Focus on patterns, spending habits, and actionable advice.
          Keep your response concise but helpful. 
          Total income: ${totalIncome.toFixed(2)} zł, Total expenses: ${totalExpenses.toFixed(2)} zł, Net: ${netIncome.toFixed(2)} zł`
        },
        {
          role: 'user',
          content: `Please analyze my financial data from the last 30 days and provide insights:\n\n${financialData}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'financial_insights',
          schema: {
            type: 'object',
            properties: {
              summary: { 
                type: 'string',
                description: 'A brief overview of financial patterns and performance'
              },
              tips: { 
                type: 'array',
                items: { type: 'string' },
                description: 'Practical financial tips based on income and spending'
              },
              spendingTrend: { 
                type: 'string',
                enum: ['increasing', 'decreasing', 'stable'],
                description: 'Overall trend in spending'
              }
            },
            required: ['summary', 'tips', 'spendingTrend'],
            additionalProperties: false
          },
          strict: true
        }
      }
    });

    const aiInsight = JSON.parse(completion.choices[0].message.content || '{}');
    
    return c.json({ 
      insight: {
        ...aiInsight,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error("Error generating insights:", error);
    return c.json({ error: "Failed to generate insights" }, 500);
  }
});

// Categorize transaction using AI
app.post("/api/categorize", zValidator("json", z.object({ 
  description: z.string(),
  type: z.enum(['income', 'expense']).optional()
})), async (c) => {
  try {
    const { description, type = 'expense' } = c.req.valid("json");
    
    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    const expenseCategories = "Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Travel, Education, Personal Care, Other";
    const incomeCategories = "Salary, Freelance, Investment, Business, Gift, Other Income";
    
    const categories = type === 'expense' ? expenseCategories : incomeCategories;
    const transactionType = type === 'expense' ? 'expense' : 'income';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Categorize the ${transactionType} description into one of these categories: 
          ${categories}. 
          Return only the category name.`
        },
        {
          role: 'user',
          content: `Categorize this ${transactionType}: "${description}"`
        }
      ],
      max_completion_tokens: 20
    });

    const category = completion.choices[0].message.content?.trim() || (type === 'expense' ? 'Other' : 'Other Income');
    return c.json({ category });
  } catch (error) {
    console.error("Error categorizing transaction:", error);
    const { type: transactionType = 'expense' } = c.req.valid("json");
    return c.json({ category: transactionType === 'expense' ? 'Other' : 'Other Income' });
  }
});

export default app;
