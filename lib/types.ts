export type MoneyType = 'income' | 'expense';

export type User = {
  id: string;
  email: string;
  currency: string;
};

export type Category = {
  id: string;
  name: string;
  type: MoneyType;
};

export type Transaction = {
  id: string;
  type: MoneyType;
  amount: number;
  categoryId: string;
  date: string;
  note: string;
};
