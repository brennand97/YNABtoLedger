export interface IOutputEntry {
    header: string;
    rows: IOutputRow[];
}

export enum OutputRowType {
    FlatRow = 'FlatRow',
    Split = 'Split',
}

export interface IOutputRow {
    type: OutputRowType;
    values: string[];
}

export enum OutputType {
    Ledger = 'ledger-cli',
    Beancount = 'beancount',
}
