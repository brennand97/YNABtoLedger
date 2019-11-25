export interface IOutputEntry {
    header: string;
    rows: IOutputRow[];
}

export enum OutputRowType {
    Comment = 'Comment',
    Split = 'Split',
}

export interface IOutputRow {
    type: OutputRowType;
    values: string[];
}
