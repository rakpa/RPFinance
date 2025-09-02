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

// Authentication endpoints
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
    
    const url = new URL(c.req.url);
    const filter = url.searchParams.get('filter');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const limit = url.searchParams.get('limit');
    
    let whereClause = "WHERE user_id = ?";
    let params = [user.id];
    
    if (startDate && endDate) {
      whereClause += " AND date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else if (filter) {
      switch (filter) {
        case 'this_month':
          whereClause += " AND date >= date('now', 'start of month')";
          break;
        case 'last_month':
          whereClause += " AND date >= date('now', 'start of month', '-1 month') AND date < date('now', 'start of month')";
          break;
        case 'this_year':
          whereClause += " AND date >= date('now', 'start of year')";
          break;
      }
    }
    
    let query = `SELECT * FROM expenses ${whereClause} ORDER BY date DESC, created_at DESC`;
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }
    
    const stmt = c.env.DB.prepare(query);
    const expenses = await stmt.bind(...params).all();
    return c.json({ expenses: expenses.results });
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
    const stmt = c.env.DB.prepare(`
      INSERT INTO expenses (amount, description, category, date, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const result = await stmt.bind(data.amount, data.description, data.category, data.date, user.id).run();
    
    if (result.success) {
      const newExpense = await c.env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(result.meta.last_row_id).first();
      return c.json({ expense: newExpense });
    } else {
      return c.json({ error: "Failed to create expense" }, 500);
    }
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
    const stmt = c.env.DB.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?");
    const result = await stmt.bind(id, user.id).run();
    
    if (result.success) {
      return c.json({ success: true });
    } else {
      return c.json({ error: "Failed to delete expense" }, 500);
    }
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
    
    const url = new URL(c.req.url);
    const filter = url.searchParams.get('filter');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const limit = url.searchParams.get('limit');
    
    let whereClause = "WHERE user_id = ?";
    let params = [user.id];
    
    if (startDate && endDate) {
      whereClause += " AND date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else if (filter) {
      switch (filter) {
        case 'this_month':
          whereClause += " AND date >= date('now', 'start of month')";
          break;
        case 'last_month':
          whereClause += " AND date >= date('now', 'start of month', '-1 month') AND date < date('now', 'start of month')";
          break;
        case 'this_year':
          whereClause += " AND date >= date('now', 'start of year')";
          break;
      }
    }
    
    let query = `SELECT * FROM income ${whereClause} ORDER BY date DESC, created_at DESC`;
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }
    
    const stmt = c.env.DB.prepare(query);
    const income = await stmt.bind(...params).all();
    return c.json({ income: income.results });
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
    const stmt = c.env.DB.prepare(`
      INSERT INTO income (amount, description, category, date, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const result = await stmt.bind(data.amount, data.description, data.category, data.date, user.id).run();
    
    if (result.success) {
      const newIncome = await c.env.DB.prepare("SELECT * FROM income WHERE id = ?").bind(result.meta.last_row_id).first();
      return c.json({ income: newIncome });
    } else {
      return c.json({ error: "Failed to create income" }, 500);
    }
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
    const stmt = c.env.DB.prepare("DELETE FROM income WHERE id = ? AND user_id = ?");
    const result = await stmt.bind(id, user.id).run();
    
    if (result.success) {
      return c.json({ success: true });
    } else {
      return c.json({ error: "Failed to delete income" }, 500);
    }
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
    
    const stmt = c.env.DB.prepare(`
      SELECT * FROM categories 
      WHERE (user_id = ? OR is_default = TRUE) AND type = ?
      ORDER BY is_default DESC, name ASC
    `);
    const categories = await stmt.bind(user.id, type).all();
    return c.json({ categories: categories.results });
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
    const stmt = c.env.DB.prepare(`
      INSERT INTO categories (name, icon, type, user_id, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, FALSE, datetime('now'), datetime('now'))
    `);
    const result = await stmt.bind(data.name, data.icon, data.type, user.id).run();
    
    if (result.success) {
      const newCategory = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(result.meta.last_row_id).first();
      return c.json({ category: newCategory });
    } else {
      return c.json({ error: "Failed to create category" }, 500);
    }
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
    
    const stmt = c.env.DB.prepare(`
      UPDATE categories 
      SET name = ?, icon = ?, type = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ? AND is_default = FALSE
    `);
    const result = await stmt.bind(data.name, data.icon, data.type, id, user.id).run();
    
    if (result.success) {
      const updatedCategory = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(id).first();
      return c.json({ category: updatedCategory });
    } else {
      return c.json({ error: "Failed to update category" }, 500);
    }
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
    const stmt = c.env.DB.prepare("DELETE FROM categories WHERE id = ? AND user_id = ? AND is_default = FALSE");
    const result = await stmt.bind(id, user.id).run();
    
    if (result.success) {
      return c.json({ success: true });
    } else {
      return c.json({ error: "Failed to delete category" }, 500);
    }
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
    
    // Get recent expenses and income (last 30 days)
    const [expensesResult, incomeResult] = await Promise.all([
      c.env.DB.prepare(`
        SELECT * FROM expenses 
        WHERE user_id = ? AND date >= date('now', '-30 days')
        ORDER BY date DESC
      `).bind(user.id).all(),
      c.env.DB.prepare(`
        SELECT * FROM income 
        WHERE user_id = ? AND date >= date('now', '-30 days')
        ORDER BY date DESC
      `).bind(user.id).all()
    ]);
    
    const expenses = expensesResult.results;
    const income = incomeResult.results;
    
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
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
      totalExpenses += expense.amount;
    });
    
    income.forEach((incomeItem: any) => {
      totalIncome += incomeItem.amount;
    });

    // Prepare data for AI analysis
    const expenseData = expenses.map((exp: any) => 
      `${exp.date}: -$${exp.amount} - ${exp.description} (${exp.category})`
    ).join('\n');
    
    const incomeData = income.map((inc: any) => 
      `${inc.date}: +$${inc.amount} - ${inc.description} (${inc.category})`
    ).join('\n');

    const financialData = [expenseData, incomeData].filter(Boolean).join('\n');
    const netIncome = totalIncome - totalExpenses;

    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'o4-mini',
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
      model: 'o4-mini',
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
