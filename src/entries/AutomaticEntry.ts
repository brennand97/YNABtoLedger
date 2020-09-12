import { IOutputEntry, OutputRowType, OutputType } from '../outputs/types';
import { EntryType, IConfiguration, IEntry, ISplit } from '../types';
import { buildLedgerEntryRows } from './common';

export class AutomaticEntry implements IEntry {
    public type: EntryType;
    public id: string;
    public recordDate: string;
    public memo: string;
    public currency: string = '';
    public splits: ISplit[];
    public metadata: {[key: string]: string};

    public accountMatcher: string;

    constructor(data: Partial<AutomaticEntry>) {
        Object.assign(this, data);
    }

    public toOutputEntry(type: OutputType, config: IConfiguration = null): IOutputEntry {
        switch (type) {
            case OutputType.Ledger:
                return {
                    // Header format: '= {accountMatcher}'
                    header: `= ${this.accountMatcher}`,
                    rows: [
                        // Optional comment row: '; {memo}'
                        ...(this.memo
                            ? [{
                                type: OutputRowType.FlatRow,
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
