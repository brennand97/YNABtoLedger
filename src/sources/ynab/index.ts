import { AccountsResponse, API, CategoriesResponse, TransactionsResponse } from 'ynab';
import { IEntry } from '../../types';
import { findbyId, uniqueElements } from '../../utils';
import { initializeApi } from './api';
import { YNABEntryBuilder } from './entrybuilder';

export async function getEntries(): Promise<IEntry[]> {
    const api: API = await initializeApi();

    const budgetResponse = await api.budgets.getBudgets();
    const budget = budgetResponse.data.budgets[1];

    const accountResponse: AccountsResponse = await api.accounts.getAccounts(budget.id);
    const accounts = accountResponse.data.accounts;

    const categoryResponse: CategoriesResponse = await api.categories.getCategories(budget.id);
    const categoryGroups = categoryResponse.data.category_groups;
    const categories = categoryGroups.map(e => e.categories).reduce((a, b) => a.concat(b), []);

    const transactionResponse: TransactionsResponse = await api.transactions.getTransactions(budget.id);
    const transactions = transactionResponse.data.transactions;

    const entryBuilder: YNABEntryBuilder = new YNABEntryBuilder(
        (id: string) => findbyId(transactions, id),
        (id: string) => findbyId(accounts, id),
        (id: string) => findbyId(categories, id),
        (id: string) => findbyId(categoryGroups, id)
    );

    const entries: IEntry[] = transactions.map(t => entryBuilder.buildEntry(t));
    const uniqueEntries: IEntry[] = uniqueElements((e: IEntry) => e.id, entries);

    return uniqueEntries;
}
