import {
    Account,
    AccountsResponse,
    API,
    BudgetSummary,
    CategoriesResponse,
    Category,
    MonthDetail,
    MonthSummariesResponse,
    MonthSummary,
    TransactionDetail,
    TransactionsResponse,
    CategoryGroupWithCategories,
} from 'ynab';

import moment from 'moment';
import { getConfig } from '../../configuration';
import { IConfiguration, IEntry } from '../../types';
import { entrySort, findbyId, uniqueElements } from '../../utils';
import { initializeApi } from './api';
import { YNABTransactionEntryBuilder } from './transactionEntrybuilder';

export async function getEntries(): Promise<IEntry[]> {
    const config: IConfiguration = await getConfig();

    const api: API = await initializeApi();
    const budgetId: string = config.ynab.primary_budget_id;

    const budget: BudgetSummary = await getBudget(api, budgetId);
    if (!budget) {
        throw new Error(`Buget Id '${budgetId}' couldn't be found`);
    }

    const accounts: Account[] = await getAccounts(api, budgetId);
    const categoryGroups: CategoryGroupWithCategories[] = await getCategoryGroups(api, budgetId);
    const categories: Category[] = getCategories(categoryGroups);
    const transactions: TransactionDetail[] = await getTransactions(api, budgetId);
    const monthCategories: MonthDetail[] = await getMonths(api, budgetId);

    const transactionEntryBuilder = new YNABTransactionEntryBuilder(
        (id: string) => findbyId(transactions, id),
        (id: string) => findbyId(accounts, id),
        (id: string) => findbyId(categories, id),
        (id: string) => findbyId(categoryGroups, id)
    );

    const entries: IEntry[] = transactions.map(t => transactionEntryBuilder.buildEntry(t));
    const uniqueEntries: IEntry[] = uniqueElements((e: IEntry) => e.id, entries);

    return uniqueEntries.sort(entrySort);
}

async function getBudget(api: API, budgetId: string): Promise<BudgetSummary> {
    const budgetResponse = await api.budgets.getBudgets();
    return findbyId(budgetResponse.data.budgets, budgetId);
}

async function getAccounts(api: API, budgetId: string): Promise<Account[]> {
    const accountResponse: AccountsResponse = await api.accounts.getAccounts(budgetId);
    return accountResponse.data.accounts;
}

async function getCategoryGroups(api: API, budgetId: string): Promise<CategoryGroupWithCategories[]> {
    const categoryResponse: CategoriesResponse = await api.categories.getCategories(budgetId);
    return categoryResponse.data.category_groups;
}

function getCategories(categoryGroups: CategoryGroupWithCategories[]): Category[] {
    return categoryGroups.map(e => e.categories).reduce((a, b) => a.concat(b), []);
}

async function getTransactions(api: API, budgetId: string): Promise<TransactionDetail[]> {
    const transactionResponse: TransactionsResponse = await api.transactions.getTransactions(budgetId);
    return transactionResponse.data.transactions;
}

async function getMonths(api: API, budgetId: string): Promise<MonthDetail[]> {
    const today = moment();

    const monthsResponse: MonthSummariesResponse = await api.months.getBudgetMonths(budgetId);
    const months: MonthSummary[] = monthsResponse.data.months;
    const activeMonths: MonthSummary[] = months.filter(month => moment(month.month) < today || month.activity !== 0);

    return await Promise.all(activeMonths.map(async month =>
        (await api.months.getBudgetMonth(budgetId, month.month)).data.month
    ));
}
