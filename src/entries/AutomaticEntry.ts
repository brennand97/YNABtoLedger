import { IOutputEntry, OutputRowType, OutputType } from '../outputs/types';
import { EntryType, IEntry, ISplit } from '../types';
import { buildLedgerEntryRows } from './common';

export class AutomaticEntry implements IEntry {
    public type: EntryType;
    public id: number;
    public recordDate: string;
    public memo: string;
    public currencySymbol: string = '';
    public splits: ISplit[];

    public accountMatcher: string;

    constructor(data: Partial<AutomaticEntry>) {
        Object.assign(this, data);
    }

    public toOutputEntry(type: OutputType): IOutputEntry {
        switch (type) {
            case OutputType.Ledger:
                return {
                    // Header format: '= {accountMatcher}'
                    header: `= ${this.accountMatcher}`,
                    rows: [
                        // Optional comment row: '; {memo}'
                        ...(this.memo
                            ? [{
                                type: OutputRowType.Comment,
                                values: [`; ${this.memo}`],
                            }]
                            : []),
                        // Example split row: '{account group}:{account name} ${amount}'
                        ...buildLedgerEntryRows(this, type),
                    ],
                };
            default:
                throw Error(`Cannot compile AutomaticEntry to '${type}'`);
        }
    }
}
