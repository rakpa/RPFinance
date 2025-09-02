import { Trash2, Calendar, Tag, DollarSign } from 'lucide-react';
import { Income } from '@/shared/types';

interface IncomeListProps {
  income: Income[];
  onDelete: (id: number) => void;
  loading?: boolean;
}

export default function IncomeList({ income, onDelete, loading }: IncomeListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Salary': 'bg-blue-100 text-blue-800',
      'Freelance': 'bg-purple-100 text-purple-800',
      'Investment': 'bg-green-100 text-green-800',
      'Business': 'bg-orange-100 text-orange-800',
      'Gift': 'bg-pink-100 text-pink-800',
      'Other Income': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['Other Income'];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (income.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No income yet</h3>
        <p className="text-gray-600">Start tracking your income to see insights and trends.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Income</h2>
      
      <div className="space-y-4">
        {income.map((incomeItem) => (
          <div
            key={incomeItem.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-gray-900">{incomeItem.description}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(incomeItem.category)}`}>
                  <Tag className="w-3 h-3 inline mr-1" />
                  {incomeItem.category}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(incomeItem.date)}
                </span>
                <span className="font-semibold text-green-600 text-lg">
                  +{formatAmount(incomeItem.amount)}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => onDelete(incomeItem.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete income"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
