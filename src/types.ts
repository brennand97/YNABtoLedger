import { IOutputEntry, OutputType } from './outputs/types';

export interface IConfiguration {
    ynab: IYNABConfiguration;
}

export interface IYNABConfiguration {
    api_access_token: string;
    primary_budget_id: string;
}

export enum SplitGroup {
    Asset = 'Assets',
    Equity = 'Equity',
    Expense = 'Expenses',
    Income = 'Income',
    Liability = 'Liabilities',
}

export interface ISplit {
    group: SplitGroup;
    account: string;
    amount: number;
    memo: string;
}

export enum EntryType {
    Transaction = 'Transaction',
    Budget = 'Budget',
}

export interface IEntry {
    type: EntryType;
    id: number;
    recordDate: string;
    memo: string;
    currencySymbol: string;
    splits: ISplit[];

    toOutputEntry(type: OutputType): IOutputEntry;
}
