export interface Configuration {
    ynab: YNABConfiguration;
}

export interface YNABConfiguration {
    api_access_token: string;
    primary_budget_id: string;
}

export enum SplitGroup {
    Asset = "Assets",
    Equity = "Equity",
    Expense = "Expenses",
    Income = "Income",
    Liability = "Liabilities"
}

export interface Split {
    group: SplitGroup;
    account: string;
    amount: number;
}

export interface Entry {
    id: number;
    recordDate: string;
    payee: string;
    memo: string;
    cleared: boolean;
    splits: Array<Split>;
}

export interface LedgerEntry {
    header: string;
    rows: LedgerRow[];
}

export enum LedgerRowType {
    Comment = "Comment",
    Split = "Split"
}

export interface LedgerRow {
    type: LedgerRowType;
    values: string[];
}