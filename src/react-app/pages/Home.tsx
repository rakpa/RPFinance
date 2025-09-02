import { useState, useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import ExpenseForm from '@/react-app/components/ExpenseForm';
import ExpenseList from '@/react-app/components/ExpenseList';
import IncomeForm from '@/react-app/components/IncomeForm';
import IncomeList from '@/react-app/components/IncomeList';
import Navigation from '@/react-app/components/Navigation';
import AuthButton from '@/react-app/components/AuthButton';
import LoginPrompt from '@/react-app/components/LoginPrompt';
import { Expense, CreateExpense, Income, CreateIncome } from '@/shared/types';

export default function Home() {
  const { user, isPending } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [submittingIncome, setSubmittingIncome] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesRes, incomeRes] = await Promise.all([
        fetch('/api/expenses?limit=10'),
        fetch('/api/income?limit=10')
      ]);
      
      const expensesData = await expensesRes.json();
      const incomeData = await incomeRes.json();
      
      setExpenses(expensesData.expenses || []);
      setIncome(incomeData.income || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Show login prompt if user is not authenticated
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 paper-texture flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-32 h-32 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPrompt />;
  }

  // Add expense
  const handleAddExpense = async (expenseData: CreateExpense) => {
    try {
      setSubmittingExpense(true);
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenses(prev => [data.expense, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Add income
  const handleAddIncome = async (incomeData: CreateIncome) => {
    try {
      setSubmittingIncome(true);
      const response = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incomeData),
      });
      
      if (response.ok) {
        const data = await response.json();
        setIncome(prev => [data.income, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Failed to add income:', error);
    } finally {
      setSubmittingIncome(false);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (id: number) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setExpenses(prev => prev.filter(expense => expense.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  // Delete income
  const handleDeleteIncome = async (id: number) => {
    try {
      const response = await fetch(`/api/income/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setIncome(prev => prev.filter(incomeItem => incomeItem.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete income:', error);
    }
  };

  // Calculate quick stats for recent items
  const recentExpenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const recentIncomeTotal = income.reduce((sum, incomeItem) => sum + incomeItem.amount, 0);
  const netBalance = recentIncomeTotal - recentExpenseTotal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 paper-texture">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-2xl shadow-lg">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Mintary
                </h1>
                <p className="text-gray-600">Smart expense tracking with AI insights</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Navigation />
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Income</p>
                <p className="text-2xl font-bold text-gray-900">
                  {recentIncomeTotal.toFixed(2)} zł
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-red-500 to-orange-600 p-3 rounded-xl">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Expenses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {recentExpenseTotal.toFixed(2)} zł
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center gap-4">
              <div className={`bg-gradient-to-br p-3 rounded-xl ${
                netBalance >= 0 
                  ? 'from-emerald-500 to-teal-600' 
                  : 'from-red-500 to-orange-600'
              }`}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Net Balance</p>
                <p className={`text-2xl font-bold ${
                  netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {netBalance >= 0 ? '+' : ''}{netBalance.toFixed(2)} zł
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <div className="space-y-8">
            <IncomeForm onSubmit={handleAddIncome} loading={submittingIncome} />
            <IncomeList 
              income={income} 
              onDelete={handleDeleteIncome}
              loading={loading}
            />
          </div>
          
          <div className="space-y-8">
            <ExpenseForm onSubmit={handleAddExpense} loading={submittingExpense} />
            <ExpenseList 
              expenses={expenses} 
              onDelete={handleDeleteExpense}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
