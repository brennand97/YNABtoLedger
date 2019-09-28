import { TransactionsResponse, CategoriesResponse, AccountsResponse, API } from 'ynab';
import { EntryBuilder } from '../../entry';
import { findbyId } from '../../utils';
import { Entry } from '../../types';
import { initializeApi } from './api';

export async function getEntries() : Promise<Array<Entry>> {
    const api: API = await initializeApi();

    const budgetResponse = await api.budgets.getBudgets();
    const budget = budgetResponse.data.budgets[1];

    const accountResponse : AccountsResponse = await api.accounts.getAccounts(budget.id);
    const accounts = accountResponse.data.accounts;

    const categoryResponse : CategoriesResponse = await api.categories.getCategories(budget.id);
    const categoryGroups = categoryResponse.data.category_groups;
    const categories = categoryGroups.map(e => e.categories).reduce((a, b) => a.concat(b), []);

    const transactionResponse : TransactionsResponse = await api.transactions.getTransactions(budget.id);
    const transactions = transactionResponse.data.transactions;

    const entryBuilder: EntryBuilder = new EntryBuilder(
        (id: string) => findbyId(transactions, id),
        (id: string) => findbyId(accounts, id),
        (id: string) => findbyId(categories, id),
        (id: string) => findbyId(categoryGroups, id)
    );

    const entries: Array<Entry> = transactions.map(t => entryBuilder.buildEntry(t));
    const uniqueEntries: Array<Entry> = Array.from(new Set(entries.map(e => e.id))).map(id => entries.find(e => e.id === id));

    return uniqueEntries;
}

