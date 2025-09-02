import { useState, useEffect } from 'react';
import { Filter, TrendingUp, TrendingDown, Wallet, DollarSign, Target } from 'lucide-react';
import ExpenseGraphs from '@/react-app/components/ExpenseGraphs';
import AIInsights from '@/react-app/components/AIInsights';
import Navigation from '@/react-app/components/Navigation';
import { Expense, Income } from '@/shared/types';

type DateFilter = 'this_month' | 'last_month' | 'this_year' | 'all';

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [refreshInsights, setRefreshInsights] = useState(false);

  useEffect(() => {
    fetchData();
    setRefreshInsights(prev => !prev);
  }, [dateFilter]);

  const fetchData = async () => {
    try {
      const [expensesRes, incomeRes] = await Promise.all([
        fetch(`/api/expenses?filter=${dateFilter}`),
        fetch(`/api/income?filter=${dateFilter}`)
      ]);
      
      const expensesData = await expensesRes.json();
      const incomeData = await incomeRes.json();
      
      setExpenses(expensesData.expenses || []);
      setIncome(incomeData.income || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const getDateLabel = () => {
    switch (dateFilter) {
      case 'this_month':
        return 'This Month';
      case 'last_month':
        return 'Last Month';
      case 'this_year':
        return 'This Year';
      case 'all':
        return 'All Time';
      default:
        return 'This Month';
    }
  };

  // Calculate stats
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netIncome = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100) : 0;

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
                  Dashboard
                </h1>
                <p className="text-gray-600">Financial overview and insights</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Navigation />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Filter */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Date Range: {getDateLabel()}</h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {(['this_month', 'last_month', 'this_year', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    dateFilter === filter
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {filter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalIncome.toFixed(2)} zł
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
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalExpenses.toFixed(2)} zł
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center gap-4">
              <div className={`bg-gradient-to-br p-3 rounded-xl ${
                netIncome >= 0 
                  ? 'from-emerald-500 to-teal-600' 
                  : 'from-red-500 to-orange-600'
              }`}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Net Income</p>
                <p className={`text-2xl font-bold ${
                  netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {netIncome >= 0 ? '+' : ''}{netIncome.toFixed(2)} zł
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center gap-4">
              <div className={`bg-gradient-to-br p-3 rounded-xl ${
                savingsRate >= 20 
                  ? 'from-emerald-500 to-teal-600'
                  : savingsRate >= 10 
                  ? 'from-yellow-500 to-orange-500'
                  : 'from-red-500 to-orange-600'
              }`}>
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Savings Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Insights */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <ExpenseGraphs expenses={expenses} />
          <AIInsights refresh={refreshInsights} />
        </div>
      </div>
    </div>
  );
}
