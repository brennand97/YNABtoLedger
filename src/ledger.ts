import { Entry, LedgerEntry, LedgerRowType, LedgerRow, Split } from "./types";
import { entrySort } from "./utils";

export async function compile(entries: Entry[]) : Promise<string> {
    // Sort to make sure there is a deterministic output
    entries = entries.sort(entrySort);

    //const ledgerEntries = buildLedgerEntries(entries);

    const output = []
    for (let entry of entries) {
        entry.splits = entry.splits.sort((a, b) => a.amount < b.amount ? 1 : -1);
        output.push({
            header: `${entry.recordDate} ${entry.cleared ? '*' : '!'} ${entry.payee}${entry.memo ? ` ; ${entry.memo}` : ''}`,
            rows: entry.splits.map(split => {
                return [`(${split.group}:${split.account})`, `\$${split.amount}`];
            })
        });
    }

    const maxRowWidth = output.reduce((a, e) => a.concat(e.rows.reduce((b, r) => b.concat(r), [])), []).reduce((max, r) => max > r.length ? max : r.length, 0);

    let output_string: string = '';

    const columnSpacing = 4;
    const splitPadding = 4;
    for (let row of output) {
        output_string += `${row.header}\n`;
        for (let sub_row of row.rows) {
            let str = ' '.repeat(splitPadding);
            str += sub_row[0];
            str += ' '.repeat(maxRowWidth - sub_row[0].length + columnSpacing);
            str += sub_row[1];
            
            output_string += `${str}\n`;
        }
        output_string += '\n';
    }

    return output_string;
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
                // Example split row: '({account name}) ${amount}'
                ...buildLedgerRowSplits(entry.splits)
            ]
        };
    });
}

function buildLedgerRowSplits(splits: Split[]) : LedgerRow[] {
    splits = splits.sort((a, b) => a.amount < b.amount ? 1 : -1);
    return splits.map(split => {
        return {
            type: LedgerRowType.Split,
            values: [
                `(${split.group}:${split.account})`,
                `\$${split.amount}`
            ]
        }
    });
}
