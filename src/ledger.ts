import { IEntry, ILedgerEntry, ILedgerRow, ISplit, LedgerRowType } from './types';
import { entrySort } from './utils';

export async function compile(entries: IEntry[]): Promise<string> {
    // Sort to make sure there is a deterministic output
    entries = entries.sort(entrySort);

    const ledgerEntries = buildLedgerEntries(entries);
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

function buildLedgerEntries(entries: IEntry[]): ILedgerEntry[] {
    return entries.map(entry => {
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
                ...buildLedgerRowSplits(entry.splits),
            ],
        };
    });
}

function buildLedgerRowSplits(splits: ISplit[]): ILedgerRow[] {
    splits = splits.sort((a, b) => {
        if (a.amount === b.amount) {
            return a.account > b.account ? 1 : -1;
        }
        return a.amount < b.amount ? 1 : -1;
    });
    return splits.map(split => {
        return {
            type: LedgerRowType.Split,
            values: [
                `${split.group}:${split.account}`,
                `\$${split.amount}`,
            ],
        };
    });
}
