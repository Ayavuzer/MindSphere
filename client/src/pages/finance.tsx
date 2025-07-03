import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  PieChart,
  Wallet,
  CreditCard,
  ShoppingCart,
  Home as HomeIcon,
  Car,
  Utensils
} from 'lucide-react';

const financialSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

type FinancialForm = z.infer<typeof financialSchema>;

const expenseCategories = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Education',
  'Other'
];

const incomeCategories = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Rental',
  'Gift',
  'Other'
];

export default function Finance() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: financialEntries = [], isLoading } = useQuery({
    queryKey: ['/api/finances'],
  });

  const form = useForm<FinancialForm>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      type: 'expense',
      category: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const createFinancialEntryMutation = useMutation({
    mutationFn: async (data: FinancialForm) => {
      const entryData = {
        ...data,
        date: new Date(data.date),
      };
      const response = await apiRequest('POST', '/api/finances', entryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finances'] });
      setIsDialogOpen(false);
      form.reset({
        type: 'expense',
        category: '',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      toast({
        title: "Financial entry created",
        description: "Your transaction has been recorded successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create financial entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FinancialForm) => {
    createFinancialEntryMutation.mutate(data);
  };

  const selectedType = form.watch('type');

  const filteredEntries = financialEntries.filter((entry: any) => {
    return filter === 'all' || entry.type === filter;
  });

  // Calculate totals
  const totalIncome = financialEntries
    .filter((entry: any) => entry.type === 'income')
    .reduce((sum: number, entry: any) => sum + entry.amount, 0);
  
  const totalExpenses = financialEntries
    .filter((entry: any) => entry.type === 'expense')
    .reduce((sum: number, entry: any) => sum + entry.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  // Get category breakdown
  const categoryBreakdown = financialEntries.reduce((acc: any, entry: any) => {
    if (entry.type === 'expense') {
      acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
    }
    return acc;
  }, {});

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([,a]: any, [,b]: any) => b - a)
    .slice(0, 5);

  const getCategoryIcon = (category: string) => {
    if (category.toLowerCase().includes('food') || category.toLowerCase().includes('dining')) {
      return <Utensils className="text-orange-400" size={16} />;
    }
    if (category.toLowerCase().includes('transport') || category.toLowerCase().includes('car')) {
      return <Car className="text-blue-400" size={16} />;
    }
    if (category.toLowerCase().includes('shopping')) {
      return <ShoppingCart className="text-purple-400" size={16} />;
    }
    if (category.toLowerCase().includes('home') || category.toLowerCase().includes('rent')) {
      return <HomeIcon className="text-green-400" size={16} />;
    }
    return <CreditCard className="text-gray-400" size={16} />;
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--card-dark)] border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Finance Tracker</h1>
              <p className="text-[var(--text-secondary)]">Monitor your income and expenses</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-500 to-blue-600">
                  <Plus className="mr-2" size={16} />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[var(--card-dark)] border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Financial Entry</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              {(selectedType === 'income' ? incomeCategories : expenseCategories).map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Amount ($)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Optional description"
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Date</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date"
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createFinancialEntryMutation.isPending}>
                        {createFinancialEntryMutation.isPending ? 'Saving...' : 'Save Entry'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Total Income</p>
                    <p className="text-2xl font-bold text-green-400">${totalIncome.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="text-green-400" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-400">${totalExpenses.toFixed(2)}</p>
                  </div>
                  <TrendingDown className="text-red-400" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Net Balance</p>
                    <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${Math.abs(netBalance).toFixed(2)}
                    </p>
                  </div>
                  <Wallet className={netBalance >= 0 ? 'text-green-400' : 'text-red-400'} size={32} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card className="bg-[var(--card-dark)] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <PieChart className="text-purple-400" size={20} />
                <span>Top Expense Categories</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCategories.length > 0 ? (
                <div className="space-y-3">
                  {topCategories.map(([category, amount]: any) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(category)}
                        <span className="text-white">{category}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-purple-400 h-2 rounded-full" 
                            style={{ width: `${(amount / totalExpenses) * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-semibold">${amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[var(--text-secondary)] py-8">
                  No expense data to display
                </p>
              )}
            </CardContent>
          </Card>

          {/* Filter and Transactions */}
          <Card className="bg-[var(--card-dark)] border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Calendar className="text-indigo-400" size={20} />
                  <span>Recent Transactions</span>
                </CardTitle>
                <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                  <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : filteredEntries.length > 0 ? (
                <div className="space-y-3">
                  {filteredEntries.slice(0, 10).map((entry: any) => (
                    <div key={entry.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getCategoryIcon(entry.category)}
                          <div>
                            <p className="text-sm font-medium text-white">{entry.category}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {new Date(entry.date).toLocaleDateString()}
                            </p>
                            {entry.description && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1">
                                {entry.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${
                            entry.type === 'income' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {entry.type === 'income' ? '+' : '-'}${entry.amount.toFixed(2)}
                          </p>
                          <Badge variant={entry.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                            {entry.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
                  <h3 className="text-lg font-semibold text-white mb-2">No transactions yet</h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Start tracking your finances by adding your first transaction
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2" size={16} />
                    Add Transaction
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
