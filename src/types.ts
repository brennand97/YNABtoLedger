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
}

export interface IEntry {
    id: number;
    recordDate: string;
    payee: string;
    memo: string;
    cleared: boolean;
    splits: ISplit[];
}

export interface ILedgerEntry {
    header: string;
    rows: ILedgerRow[];
}

export enum LedgerRowType {
    Comment = 'Comment',
    Split = 'Split',
}

export interface ILedgerRow {
    type: LedgerRowType;
    values: string[];
}
