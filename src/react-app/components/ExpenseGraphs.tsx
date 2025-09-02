import { useState } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import { Expense } from '@/shared/types';

interface ExpenseGraphsProps {
  expenses: Expense[];
}



export default function ExpenseGraphs({ expenses }: ExpenseGraphsProps) {
  const [activeChart, setActiveChart] = useState<'monthly' | 'daily' | 'category' | 'trend'>('monthly');

  // Process data for monthly spending
  const getMonthlyData = () => {
    const monthlySpending: Record<string, number> = {};
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + expense.amount;
    });

    return Object.entries(monthlySpending)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: Math.round(amount * 100) / 100
      }));
  };

  // Process data for daily spending (last 30 days)
  const getDailyData = () => {
    const dailySpending: Record<string, number> = {};
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      if (expenseDate >= last30Days) {
        const dayKey = expenseDate.toISOString().split('T')[0];
        dailySpending[dayKey] = (dailySpending[dayKey] || 0) + expense.amount;
      }
    });

    // Fill in missing days with 0
    const result = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
      result.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: Math.round((dailySpending[dayKey] || 0) * 100) / 100
      });
    }

    return result;
  };

  // Process data for category breakdown
  const getCategoryData = () => {
    const categorySpending: Record<string, number> = {};
    
    expenses.forEach(expense => {
      categorySpending[expense.category] = (categorySpending[expense.category] || 0) + expense.amount;
    });

    return Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)
      .map(([category, amount]) => ({
        category: category.length > 12 ? category.substring(0, 12) + '...' : category,
        fullCategory: category,
        amount: Math.round(amount * 100) / 100
      }));
  };

  // Process data for spending trend (cumulative)
  const getTrendData = () => {
    const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulative = 0;
    
    return sortedExpenses.map(expense => {
      cumulative += expense.amount;
      return {
        date: new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: Math.round(cumulative * 100) / 100
      };
    });
  };

  const monthlyData = getMonthlyData();
  const dailyData = getDailyData();
  const categoryData = getCategoryData();
  const trendData = getTrendData();

  const chartButtons = [
    { id: 'monthly', label: 'Monthly', icon: Calendar },
    { id: 'daily', label: 'Daily', icon: BarChart3 },
    { id: 'category', label: 'Categories', icon: PieChartIcon },
    { id: 'trend', label: 'Cumulative', icon: TrendingUp }
  ];

  const renderChart = () => {
    switch (activeChart) {
      case 'monthly':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value} zł`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)} zł`, 'Amount']}
                labelStyle={{ color: '#333' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'daily':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value} zł`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)} zł`, 'Amount']}
                labelStyle={{ color: '#333' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'category':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number" 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value} zł`}
              />
              <YAxis 
                type="category" 
                dataKey="category" 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip 
                formatter={(value: number, _name, props) => [
                  `${value.toFixed(2)} zł`, 
                  props.payload.fullCategory
                ]}
                labelStyle={{ color: '#333' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Bar dataKey="amount" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'trend':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value} zł`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)} zł`, 'Total Spent']}
                labelStyle={{ color: '#333' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No data to visualize</h3>
        <p className="text-gray-600">Add some expenses to see beautiful charts and graphs.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Expense Analytics</h2>
        </div>
        
        <div className="flex bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {chartButtons.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveChart(id as any)}
              className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeChart === id
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 break-words">
          {activeChart === 'monthly' && 'Monthly Spending Trends'}
          {activeChart === 'daily' && 'Daily Spending (Last 30 Days)'}
          {activeChart === 'category' && 'Spending by Category'}
          {activeChart === 'trend' && 'Cumulative Spending Over Time'}
        </h3>
        <p className="text-sm text-gray-600 break-words">
          {activeChart === 'monthly' && 'Track your spending patterns month by month'}
          {activeChart === 'daily' && 'See your daily spending habits for the past month'}
          {activeChart === 'category' && 'Understand where your money goes by category'}
          {activeChart === 'trend' && 'Watch your total spending accumulate over time'}
        </p>
      </div>

      {renderChart()}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Expenses</p>
          <p className="text-lg font-semibold text-gray-900">{expenses.length}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Categories</p>
          <p className="text-lg font-semibold text-gray-900">{categoryData.length}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Highest Day</p>
          <p className="text-lg font-semibold text-gray-900">
            {Math.max(...dailyData.map(d => d.amount)).toFixed(2)} zł
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Avg per Day</p>
          <p className="text-lg font-semibold text-gray-900">
            {(dailyData.reduce((sum, d) => sum + d.amount, 0) / dailyData.length).toFixed(2)} zł
          </p>
        </div>
      </div>
    </div>
  );
}
