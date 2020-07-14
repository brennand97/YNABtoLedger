import {
    Account,
    API,
    BudgetDetailResponse,
    BudgetDetailResponseData,
    Category,
    CategoryGroup,
    MonthDetail,
    SubTransaction,
    TransactionDetail,
    Payee,
} from 'ynab';

import { getConfig } from '../../configuration';
import { AutomaticEntry } from '../../entries/AutomaticEntry';
import { StandardEntry } from '../../entries/StandardEntry';
import { IConfiguration, IEntry } from '../../types';
import { entrySort, findAllById, findbyId, reduceToMap, uniqueElements } from '../../utils';
import { initializeApi } from './api';
import { YNABBudgetEntryBuilder } from './budgetEntryBuilder';
import { YNABTransactionEntryBuilder } from './transactionEntrybuilder';

const getId = elm => elm.id;
const defaultOptions: IYNABOptions = {
    budget: true,
};

export async function getEntries(options: IYNABOptions = defaultOptions): Promise<IEntry[]> {

    const config: IConfiguration = await getConfig();
    const budgetId: string = config.ynab.primary_budget_id;

    const api: API = await initializeApi();
    const budget: BudgetDetailResponse = await api.budgets.getBudgetById(budgetId);
    if (!budget || !budget.data) {
        throw new Error(`Buget Id '${budgetId}' couldn't be found`);
    }

    const accounts: Account[] = budget.data.budget.accounts;
    const categoryGroups: CategoryGroup[] = budget.data.budget.category_groups;
    const categories: Category[] = budget.data.budget.categories;
    const months: MonthDetail[] = budget.data.budget.months;

    const transactions: TransactionDetail[] = constructTransactionDetails(budget.data);
    const goalCategories: Map<MonthDetail, Category[]> = reduceToMap(
        months,
        (month: MonthDetail) => month,
        (month: MonthDetail) => month.categories.filter(category => category.goal_type && category.budgeted !== 0)
    );

    const entrySets: IEntry[][] = [];
    entrySets.push(buildTransactionEntries(
        transactions,
        accounts,
        categories,
        categoryGroups
    ));
    if (options.budget) {
        entrySets.push(buildBudgetEntries(
            transactions,
            accounts,
            categories,
            categoryGroups,
            goalCategories,
            months
        ));
    }

    const totalEntries: IEntry[] = entrySets.reduce((entries, entrySet) => entries.concat(entrySet), []);
    const uniqueEntries: IEntry[] = uniqueElements((e: IEntry) => e.id, totalEntries);
    return uniqueEntries.sort(entrySort);
}

function buildBudgetEntries(
    transactions: TransactionDetail[],
    accounts: Account[],
    categories: Category[],
    categoryGroups: CategoryGroup[],
    goalCategories: Map<MonthDetail, Category[]>,
    months: MonthDetail[]): IEntry[] {

    const budgetEntryBuilder = new YNABBudgetEntryBuilder(
        (id: string) => findbyId(transactions, getId, id),
        (id: string) => findbyId(accounts, getId, id),
        (id: string) => findbyId(categories, getId, id),
        (id: string) => findbyId(categoryGroups, getId, id),
        (month: MonthDetail) => goalCategories.get(month)
    );

    const budgetEntries: StandardEntry[] = months.map(m => budgetEntryBuilder.buildEntry(m));
    const automaticBudgetEntries: AutomaticEntry[] = [
        ...uniqueElements((category: Category) => {
            const categoryGroupName: string = findbyId<CategoryGroup, string>(
                categoryGroups,
                getId,
                category.category_group_id
            ).name;
            const categoryName: string = category.name;
            return `${categoryGroupName}:${categoryName}`;
        },
        Array.from(goalCategories.values())
            .reduce((array: Category[], innerArray: Category[]) => array.concat(innerArray), []))
            .map(category => budgetEntryBuilder.buildAutomaticEntry(category)),
    ];

    return [...budgetEntries, ...automaticBudgetEntries];
}

function buildTransactionEntries(
    transactions: TransactionDetail[],
    accounts: Account[],
    categories: Category[],
    categoryGroups: CategoryGroup[]): IEntry[] {

    const transactionEntryBuilder = new YNABTransactionEntryBuilder(
        (id: string) => findbyId(transactions, getId, id),
        (id: string) => findbyId(accounts, getId, id),
        (id: string) => findbyId(categories, getId, id),
        (id: string) => findbyId(categoryGroups, getId, id)
    );
    return transactions.map(t => transactionEntryBuilder.buildEntry(t));
}

function constructTransactionDetails(budgetDetail: BudgetDetailResponseData): TransactionDetail[] {
    return budgetDetail.budget.transactions.map(t => {
        const account: Account = t.account_id ? findbyId(
            budgetDetail.budget.accounts,
            getId,
            t.account_id
        ) : undefined;
        const category: Category = t.category_id ? findbyId(
            budgetDetail.budget.categories,
            getId,
            t.category_id
        ) : undefined;
        const payee: Payee = t.payee_id ? findbyId(
            budgetDetail.budget.payees,
            getId,
            t.payee_id
        ) : undefined;
        return {
            ...t,
            account_name: account ? account.name : undefined,
            category_name: category ? category.name : undefined,
            payee_name: payee ? payee.name : undefined,
            subtransactions: findAllById(
                budgetDetail.budget.subtransactions,
                (st: SubTransaction) => st.transaction_id,
                t.id
            ),
        };
    });
}
