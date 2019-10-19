import {
    AccountsResponse,
    API,
    CategoriesResponse,
    MonthDetail,
    MonthSummariesResponse,
    MonthSummary,
    TransactionsResponse,
} from 'ynab';

import moment from 'moment';
import { getConfig } from '../../configuration';
import { IConfiguration, IEntry } from '../../types';
import { entrySort, findbyId, uniqueElements } from '../../utils';
import { initializeApi } from './api';
import { YNABEntryBuilder } from './transactionEntrybuilder';

export async function getEntries(): Promise<IEntry[]> {
    const config: IConfiguration = await getConfig();

    const api: API = await initializeApi();

    const budgetResponse = await api.budgets.getBudgets();
    const budget = findbyId(budgetResponse.data.budgets, config.ynab.primary_budget_id);

    const accountResponse: AccountsResponse = await api.accounts.getAccounts(budget.id);
    const accounts = accountResponse.data.accounts;

    const categoryResponse: CategoriesResponse = await api.categories.getCategories(budget.id);
    const categoryGroups = categoryResponse.data.category_groups;
    const categories = categoryGroups.map(e => e.categories).reduce((a, b) => a.concat(b), []);

    const monthsResponse: MonthSummariesResponse = await api.months.getBudgetMonths(budget.id);
    const months: MonthSummary[] = monthsResponse.data.months;
    const today = moment();
    const activeMonths: MonthSummary[] = months.filter(month => moment(month.month) < today || month.activity !== 0);
    const monthCategories: MonthDetail[] = await Promise.all(activeMonths.map(async month =>
        (await api.months.getBudgetMonth(budget.id, month.month)).data.month
    ));
    console.log(monthCategories);

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

    return uniqueEntries.sort(entrySort);
}
