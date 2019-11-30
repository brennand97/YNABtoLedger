import { IOutputEntry, OutputType } from './outputs/types';

export interface IConfiguration {
    ynab: IYNABConfiguration;
    account_name_map: Array<{ search: string, replace: string }>;
    account_filter: string[];
}

export interface IYNABConfiguration {
    api_access_token: string;
    primary_budget_id: string;
}

export enum SplitGroup {
    Assets = 'Assets',
    Equity = 'Equity',
    Expenses = 'Expenses',
    Income = 'Income',
    Liabilities = 'Liabilities',
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
