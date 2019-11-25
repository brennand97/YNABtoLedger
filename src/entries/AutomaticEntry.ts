import { buildLedgerEntryRows } from '../outputs/ledger';
import { IOutputEntry, OutputRowType } from '../outputs/types';
import { EntryType, IEntry, ISplit } from '../types';

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

    public toOutputEntry(): IOutputEntry {
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
                ...buildLedgerEntryRows(this),
            ],
        };
    }
}
