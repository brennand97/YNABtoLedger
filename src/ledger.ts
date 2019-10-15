import { Entry, LedgerEntry, LedgerRowType, LedgerRow, Split } from "./types";
import { entrySort } from "./utils";

export async function compile(entries: Entry[]) : Promise<string> {
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
    entry: LedgerEntry, 
    maxAccountWidth: number, 
    columnSpacing: number = 4, 
    splitPadding: number = 4) : string {

    let output_string: string = '';
    output_string += `${entry.header}\n`;
    for (let sub_row of entry.rows) {
        let str = ' '.repeat(splitPadding);
        switch (sub_row.type) {
            case LedgerRowType.Comment:
                str += sub_row.values[0];
                break;
            case LedgerRowType.Split:
                str += sub_row.values[0];
                str += ' '.repeat(maxAccountWidth - sub_row.values[0].length + columnSpacing);
                str += sub_row.values[1];
                break;
        }
        output_string += `${str}\n`;
    }
    return output_string;
}

function calculateMaxAccountColumnWidth(ledgerEntries: LedgerEntry[]) : number {
    return Math.max(...ledgerEntries.reduce((array: number[], entry: LedgerEntry) => [
        ...array,
        ...entry.rows.filter(row => row.type === LedgerRowType.Split)
                     .filter(row => row.values.length > 0)
                     .map(row => row.values[0].length)
    ], []));
}

function buildLedgerEntries(entries: Entry[]) : LedgerEntry[] {
    return entries.map(entry => {
        return {
            // Header format: '{record date} {* | !} {payee}'
            header: `${entry.recordDate} ${entry.cleared ? '*' : '!'} ${entry.payee}`,
            rows: [
                // Optional comment row: '; {memo}'
                ...(entry.memo
                    ? [{
                        type: LedgerRowType.Comment,
                        values: [`; ${entry.memo}`] 
                    }]
                    : []),
                // Example split row: '{account group}:{account name} ${amount}'
                ...buildLedgerRowSplits(entry.splits)
            ]
        };
    });
}

function buildLedgerRowSplits(splits: Split[]) : LedgerRow[] {
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
                `\$${split.amount}`
            ]
        }
    });
}