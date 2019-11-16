import { buildLedgerRowSplits } from '../ledger';
import { EntryType, IEntry, ILedgerEntry, ISplit, LedgerRowType } from '../types';

export class StandardEntry implements IEntry {
    public type: EntryType;
    public id: number;
    public recordDate: string;
    public memo: string;
    public currencySymbol: string;
    public splits: ISplit[];

    public payee: string;
    public cleared: boolean;

    constructor(data: Partial<StandardEntry>) {
        Object.assign(this, data);
    }

    public toLedgerEntry(): ILedgerEntry {
        return {
            // Header format: '{record date} {* | !} {payee}'
            header: `${this.recordDate} ${this.cleared ? '*' : '!'} ${this.payee}`,
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
