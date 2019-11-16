import { buildLedgerRowSplits } from '../ledger';
import { EntryType, IEntry, ILedgerEntry, ISplit, LedgerRowType } from '../types';

export class AutomaticEntry implements IEntry {
    public type: EntryType;
    public id: number;
    public recordDate: string;
    public memo: string;
    public splits: ISplit[];

    public accountMatcher: string;

    constructor(data: Partial<AutomaticEntry>) {
        Object.assign(this, data);
    }

    public toLedgerEntry(): ILedgerEntry {
        return {
            // Header format: '= {accountMatcher}'
            header: `= ${this.accountMatcher}`,
            rows: [
                // Optional comment row: '; {memo}'
                ...(this.memo
                    ? [{
                        type: LedgerRowType.Comment,
                        values: [`; ${this.memo}`],
                    }]
                    : []),
                // Example split row: '{account group}:{account name} ${amount}'
                ...buildLedgerRowSplits(this),
            ],
        };
    }
}
