import z from "zod";

export const ExpenseSchema = z.object({
  id: z.number(),
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.string(),
});

export const IncomeSchema = z.object({
  id: z.number(),
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateIncomeSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.string(),
});

export const CategorySchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  icon: z.string().min(1),
  type: z.enum(['income', 'expense']),
  user_id: z.string(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  type: z.enum(['income', 'expense']),
});

export const AIInsightSchema = z.object({
  summary: z.string(),
  tips: z.array(z.string()),
  categoryBreakdown: z.record(z.string(), z.number()),
  spendingTrend: z.enum(['increasing', 'decreasing', 'stable']),
});

export type Expense = z.infer<typeof ExpenseSchema>;
export type CreateExpense = z.infer<typeof CreateExpenseSchema>;
export type Income = z.infer<typeof IncomeSchema>;
export type CreateIncome = z.infer<typeof CreateIncomeSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
export type AIInsight = z.infer<typeof AIInsightSchema>;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
  'Other'
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Business',
  'Gift',
  'Other Income'
] as const;
