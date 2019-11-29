import { IOutputEntry, OutputRowType, OutputType } from '../outputs/types';
import { EntryType, IEntry, ISplit } from '../types';
import { buildLedgerEntryRows } from './common';

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

    public toOutputEntry(type: OutputType): IOutputEntry {
        switch (type) {
            case OutputType.Ledger:
                return {
                    // Header format: '{record date} {* | !} {payee}'
                    header: `${this.recordDate} ${this.cleared ? '*' : '!'} ${this.payee}`,
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
            case OutputType.Beancount:
                break;
            default:
                throw Error(`Cannot compile StandardEntry to '${type}'`);
        }
    }
}
