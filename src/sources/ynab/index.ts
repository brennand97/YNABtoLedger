import {
    Account,
    AccountsResponse,
    API,
    BudgetSummary,
    CategoriesResponse,
    Category,
    CategoryGroupWithCategories,
    MonthDetail,
    MonthSummariesResponse,
    MonthSummary,
    TransactionDetail,
    TransactionsResponse,
} from 'ynab';

import moment from 'moment';
import { getConfig } from '../../configuration';
import { AutomaticEntry } from '../../entries/AutomaticEntry';
import { StandardEntry } from '../../entries/StandardEntry';
import { IConfiguration, IEntry } from '../../types';
import { entrySort, findbyId, reduceToMap, uniqueElements } from '../../utils';
import { initializeApi } from './api';
import { YNABBudgetEntryBuilder } from './budgetEntryBuilder';
import { YNABTransactionEntryBuilder } from './transactionEntrybuilder';

const getId = elm => elm.id;
const defaultOptions: IYNABOptions = {
    budget: true,
};

export async function getEntries(options: IYNABOptions = defaultOptions): Promise<IEntry[]> {
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
    const months: MonthDetail[] = await getMonths(api, budgetId);
    const goalCategories: Map<MonthDetail, Category[]> = reduceToMap(
        months,
        (month: MonthDetail) => month,
        (month: MonthDetail) => month.categories.filter(category => category.goal_type && category.budgeted !== 0)
    );

    const totalEntries: IEntry[] = [];

    const transactionEntryBuilder = new YNABTransactionEntryBuilder(
        (id: string) => findbyId(transactions, getId, id),
        (id: string) => findbyId(accounts, getId, id),
        (id: string) => findbyId(categories, getId, id),
        (id: string) => findbyId(categoryGroups, getId, id)
    );
    const transcationEntries: StandardEntry[] = transactions.map(t => transactionEntryBuilder.buildEntry(t));
    totalEntries.push(...transcationEntries);

    if (options.budget) {
        const budgetEntryBuilder = new YNABBudgetEntryBuilder(
            (id: string) => findbyId(transactions, getId, id),
            (id: string) => findbyId(accounts, getId, id),
            (id: string) => findbyId(categories, getId, id),
            (id: string) => findbyId(categoryGroups, getId, id),
            (month: MonthDetail) => goalCategories.get(month)
        );
        const budgetEntries: StandardEntry[] = months.map(m => budgetEntryBuilder.buildEntry(m));
        const automaticBudgetEntries: AutomaticEntry[] = [
            ...uniqueElements(
                (category: Category) => {
                    const categoryGroupName: string = findbyId<CategoryGroupWithCategories, string>(
                        categoryGroups,
                        getId,
                        category.category_group_id).name;
                    const categoryName: string = category.name;
                    return `${categoryGroupName}:${categoryName}`;
                },
                Array.from(goalCategories.values()).reduce((array: Category[], innerArray: Category[]) =>
                    array.concat(innerArray), [])
            ).map(category => budgetEntryBuilder.buildAutomaticEntry(category)),
        ];
        totalEntries.push(...budgetEntries, ...automaticBudgetEntries);
    }

    const uniqueEntries: IEntry[] = uniqueElements((e: IEntry) => e.id, totalEntries);
    return uniqueEntries.sort(entrySort);
}

async function getBudget(api: API, budgetId: string): Promise<BudgetSummary> {
    const budgetResponse = await api.budgets.getBudgets();
    return findbyId(budgetResponse.data.budgets, getId, budgetId);
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
