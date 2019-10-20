import { IEntry, ILedgerEntry, ILedgerRow, ISplit, LedgerRowType, EntryType } from './types';
import { entrySort, splitSort } from './utils';

export async function compile(entries: IEntry[]): Promise<string> {
    // Sort to make sure there is a deterministic output
    entries = entries.sort(entrySort);

    const ledgerEntries = entries.map(e => buildLedgerEntry(e));
    const maxRowWidth = calculateMaxAccountColumnWidth(ledgerEntries);
    const finalString = ledgerEntries
        .map(entry => ledgerEntryToString(entry, maxRowWidth))
        .reduce((memo, s) => memo.concat(s, '\n'), '');

    return finalString;
}

function ledgerEntryToString(
    entry: ILedgerEntry,
    maxAccountWidth: number,
    columnSpacing: number = 4,
    splitPadding: number = 4): string {

    let outputString: string = '';
    outputString += `${entry.header}\n`;
    for (const subRow of entry.rows) {
        let str = ' '.repeat(splitPadding);
        switch (subRow.type) {
            case LedgerRowType.Comment:
                str += subRow.values[0];
                break;
            case LedgerRowType.Split:
                str += subRow.values[0];
                str += ' '.repeat(maxAccountWidth - subRow.values[0].length + columnSpacing);
                str += subRow.values[1];
                break;
        }
        outputString += `${str}\n`;
    }
    return outputString;
}

function calculateMaxAccountColumnWidth(ledgerEntries: ILedgerEntry[]): number {
    return Math.max(...ledgerEntries.reduce((array: number[], entry: ILedgerEntry) => [
        ...array,
        ...entry.rows.filter(row => row.type === LedgerRowType.Split)
                     .filter(row => row.values.length > 0)
                     .map(row => row.values[0].length),
    ], []));
}

function buildLedgerEntry(entry: IEntry): ILedgerEntry {
    return {
        // Header format: '{record date} {* | !} {payee}'
        header: `${entry.recordDate} ${entry.cleared ? '*' : '!'} ${entry.payee}`,
        rows: [
            // Optional comment row: '; {memo}'
            ...(entry.memo
                ? [{
                    type: LedgerRowType.Comment,
                    values: [`; ${entry.memo}`],
                }]
                : []),
            // Example split row: '{account group}:{account name} ${amount}'
            ...buildLedgerRowSplits(entry.type, entry.splits),
        ],
    };
}

function buildLedgerRowSplits(type: EntryType, splits: ISplit[]): ILedgerRow[] {
    splits = splits.sort(splitSort);
    return splits.map(split => {
        switch(type) {
            case EntryType.Transaction:
                    return {
                        type: LedgerRowType.Split,
                        values: [
                            `${split.group}:${split.account}`,
                            `\$${split.amount}`,
                        ],
                    };
            case EntryType.Budget:
                    return {
                        type: LedgerRowType.Split,
                        values: [
                            `[${split.group}:${split.account}]`,
                            `\$${split.amount}`,
                        ],
                    };
        }
    });
}
