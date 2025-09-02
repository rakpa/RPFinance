import { useState, useEffect } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { CreateIncome, Category } from '@/shared/types';

interface IncomeFormProps {
  onSubmit: (income: CreateIncome) => void;
  loading?: boolean;
}

export default function IncomeForm({ onSubmit, loading }: IncomeFormProps) {
  const [income, setIncome] = useState<CreateIncome>({
    amount: 0,
    description: '',
    category: 'Salary',
    date: new Date().toISOString().split('T')[0],
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorizing, setCategorizing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?type=income');
      const data = await response.json();
      setCategories(data.categories || []);
      if (data.categories?.length > 0) {
        setIncome(prev => ({ ...prev, category: data.categories[0].name }));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(income);
    setIncome({
      amount: 0,
      description: '',
      category: categories[0]?.name || 'Salary',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const autoCategory = async () => {
    if (!income.description.trim()) return;
    
    setCategorizing(true);
    try {
      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: income.description, type: 'income' }),
      });
      const data = await response.json();
      if (data.category) {
        setIncome(prev => ({ ...prev, category: data.category }));
      }
    } catch (error) {
      console.error('Auto-categorization failed:', error);
    } finally {
      setCategorizing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl">
          <Plus className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Add Income</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                zł
              </span>
              <input
                type="number"
                step="0.01"
                value={income.amount || ''}
                onChange={(e) => setIncome(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={income.date}
              onChange={(e) => setIncome(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <div className="relative">
            <input
              type="text"
              value={income.description}
              onChange={(e) => setIncome(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              placeholder="What income did you receive?"
              required
            />
            <button
              type="button"
              onClick={autoCategory}
              disabled={categorizing || !income.description.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors"
              title="Auto-categorize with AI"
            >
              <Sparkles className={`w-5 h-5 ${categorizing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Category
          </label>
          <select
            value={income.category}
            onChange={(e) => setIncome(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            required
          >
            {categories.map(category => (
              <option key={category.id} value={category.name}>{category.name}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {loading ? 'Adding...' : 'Add Income'}
        </button>
      </form>
    </div>
  );
}
