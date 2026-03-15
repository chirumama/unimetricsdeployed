import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DollarSign, Landmark, Plus, Receipt, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toast, type ToastData } from '@/components/ui/toast';
import {
  createExpense,
  deleteExpense,
  getFinance,
  listStudents,
  updateExpense,
  type FinanceData,
  type FinanceExpense,
  type Student,
} from '@/lib/api';

type ExpenseFormValues = {
  title: string;
  category: FinanceExpense['category'];
  amount: string;
  paidTo: string;
  dueDate: string;
  frequency: FinanceExpense['frequency'];
  note: string;
};

const emptyExpenseForm: ExpenseFormValues = {
  title: '',
  category: 'operations',
  amount: '',
  paidTo: '',
  dueDate: '',
  frequency: 'monthly',
  note: '',
};

const expenseChartColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#0f766e', '#8b5cf6'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FinancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [finance, setFinance] = useState<FinanceData>({ revenues: [], expenses: [] });
  const [expenseForm, setExpenseForm] = useState<ExpenseFormValues>(emptyExpenseForm);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    async function load() {
      const [studentData, financeData] = await Promise.all([listStudents(), getFinance()]);
      setStudents(studentData);
      setFinance(financeData);
    }

    void load();
  }, []);

  const studentFeeRevenue = useMemo(
    () => students.reduce((sum, student) => sum + (student.feePaid ?? 0), 0),
    [students]
  );
  const otherRevenue = useMemo(
    () => finance.revenues.reduce((sum, revenue) => sum + revenue.amount, 0),
    [finance.revenues]
  );
  const totalRevenue = studentFeeRevenue + otherRevenue;
  const totalExpense = useMemo(
    () => finance.expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [finance.expenses]
  );
  const monthlySalary = useMemo(
    () =>
      finance.expenses
        .filter((expense) => expense.category === 'salary' && expense.frequency === 'monthly')
        .reduce((sum, expense) => sum + expense.amount, 0),
    [finance.expenses]
  );
  const netBalance = totalRevenue - totalExpense;

  const revenueChartData = [
    { name: 'Student Fees', amount: studentFeeRevenue },
    ...finance.revenues.map((revenue) => ({ name: revenue.title, amount: revenue.amount })),
  ];

  const expenseChartData = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const expense of finance.expenses) {
      byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount);
    }

    return Array.from(byCategory.entries()).map(([name, amount]) => ({ name, amount }));
  }, [finance.expenses]);

  const sortedExpenses = useMemo(
    () => [...finance.expenses].sort((first, second) => first.dueDate.localeCompare(second.dueDate)),
    [finance.expenses]
  );

  const resetForm = () => {
    setEditingExpenseId(null);
    setExpenseForm(emptyExpenseForm);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      title: expenseForm.title,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      paidTo: expenseForm.paidTo,
      dueDate: expenseForm.dueDate,
      frequency: expenseForm.frequency,
      note: expenseForm.note,
    };

    try {
      if (editingExpenseId) {
        const updated = await updateExpense(editingExpenseId, payload);
        setFinance((current) => ({
          ...current,
          expenses: current.expenses.map((expense) => (expense.id === updated.id ? updated : expense)),
        }));
        setToast({ id: Date.now(), message: 'Expense updated successfully.' });
      } else {
        const created = await createExpense(payload);
        setFinance((current) => ({
          ...current,
          expenses: [...current.expenses, created],
        }));
        setToast({ id: Date.now(), message: 'Expense added successfully.' });
      }
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense: FinanceExpense) => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      paidTo: expense.paidTo,
      dueDate: expense.dueDate,
      frequency: expense.frequency,
      note: expense.note ?? '',
    });
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    setFinance((current) => ({
      ...current,
      expenses: current.expenses.filter((expense) => expense.id !== id),
    }));
    if (editingExpenseId === id) {
      resetForm();
    }
    setToast({ id: Date.now(), message: 'Expense deleted successfully.' });
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Finance & Salary</h1>
        <p className="text-gray-500">Track revenue, monthly salary payouts, utility bills, and manage campus expenses.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Student Fee Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(studentFeeRevenue)}</div>
            <p className="mt-1 text-xs text-gray-500">Collected from {students.length} students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Other Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{formatCurrency(otherRevenue)}</div>
            <p className="mt-1 text-xs text-gray-500">Exam fees, donations, and grants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Salary Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(monthlySalary)}</div>
            <p className="mt-1 text-xs text-gray-500">Current monthly faculty salary payouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(netBalance)}
            </div>
            <p className="mt-1 text-xs text-gray-500">Revenue minus tracked expenses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-600" />
              Revenue Sources
            </CardTitle>
            <CardDescription>Student fees are counted automatically, with other sources tracked as dummy revenue records.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-indigo-600" />
              Expense Categories
            </CardTitle>
            <CardDescription>Salary, electricity, maintenance, and daily operations at a glance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseChartData} dataKey="amount" nameKey="name" innerRadius={55} outerRadius={95}>
                    {expenseChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={expenseChartColors[index % expenseChartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                {editingExpenseId ? 'Edit Expense' : 'Add Expense'}
              </CardTitle>
              <CardDescription>Create or update salary, electricity, maintenance, and other campus expenses.</CardDescription>
            </div>
            {editingExpenseId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                value={expenseForm.title}
                onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Expense title"
                disabled={submitting}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  value={expenseForm.category}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      category: event.target.value as FinanceExpense['category'],
                    }))
                  }
                  disabled={submitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="salary">Salary</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="operations">Operations</option>
                  <option value="scholarship">Scholarship</option>
                  <option value="other">Other</option>
                </select>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="Amount"
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={expenseForm.paidTo}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, paidTo: event.target.value }))}
                  placeholder="Paid to"
                  disabled={submitting}
                />
                <Input
                  type="date"
                  value={expenseForm.dueDate}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, dueDate: event.target.value }))}
                  disabled={submitting}
                />
              </div>
              <select
                value={expenseForm.frequency}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    frequency: event.target.value as FinanceExpense['frequency'],
                  }))
                }
                disabled={submitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="one-time">One-time</option>
              </select>
              <Input
                value={expenseForm.note}
                onChange={(event) => setExpenseForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Short note"
                disabled={submitting}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingExpenseId ? 'Save Changes' : 'Add Expense'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" />
              Expense Register
            </CardTitle>
            <CardDescription>Edit or delete any tracked expense.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{expense.title}</p>
                        <p className="text-xs text-gray-500">{expense.paidTo}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{expense.category}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.dueDate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(expense)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => void handleDelete(expense.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
