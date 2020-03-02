import { IOutputEntry, OutputRowType, OutputType } from '../outputs/types';
import { EntryType, IConfiguration, IEntry, ISplit } from '../types';
import { buildLedgerEntryRows } from './common';

export class StandardEntry implements IEntry {
    public type: EntryType;
    public id: number;
    public recordDate: string;
    public memo: string;
    public currencySymbol: string;
    public splits: ISplit[];
    public metadata: {[key: string]: string};

    public payee: string;
    public cleared: boolean;

    constructor(data: Partial<StandardEntry>) {
        Object.assign(this, data);
    }

    public toOutputEntry(type: OutputType, config: IConfiguration = null): IOutputEntry {
        switch (type) {
            case OutputType.Ledger:
                    return {
                        // Header format: '{record date} {* | !} {payee}'
                        header: `${this.recordDate} ${this.cleared ? '*' : '!'} ${this.payee}`,
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
            case OutputType.Beancount:
                    const payee: string = this.payee ? `"${this.payee}"` : '';
                    const memo: string = this.memo
                        ? `"${this.memo
                                .replace(/( +[#^][a-z0-9-_]+)*$/gi, '') // handle trailing tags
                                .replace(/"+/g, "'")}"` // handle double quotes
                        : '';

                    let tags: string[] = [];
                    if (config !== null && config.beancount_tags) {
                        if (this.metadata.hasOwnProperty('ynab_id')) {
                            tags.push(`^ynab_${this.metadata.ynab_id}`);
                        }
                    }
                    if (this.memo) {
                        const matches: string[] = this.memo.match(/([#^][a-z0-9-_]+)/gi);
                        if (matches) {
                            tags = [
                                ...tags,
                                ...matches,
                            ];
                        }
                    }

                    return {
                        // Header format: '{record date} {* | !} "{payee}" "{memo}" {tags}'
                        header: `${this.recordDate} ${this.cleared ? '*' : '!'} ${payee} ${memo} ${tags ? tags.join(' ') : ''}`
                            .replace(/  +/g, ' '),
                        // Example split row: '{account group}:{account name} ${amount}'
                        rows: [
                            // Optional metadata rows: '{key}: "{value}""'
                            ...(this.metadata
                                ? Object.entries(this.metadata).map(([key, value]) => {
                                    return {
                                        type: OutputRowType.FlatRow,
                                        values: [`${key}: "${value}"`],
                                    };
                                })
                                : []),
                            ...buildLedgerEntryRows(this, type),
                        ],
                    };
            default:
                throw Error(`Cannot compile StandardEntry to '${type}'`);
        }
    }
}
