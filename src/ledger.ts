import { StandardEntry } from './entries/StandardEntry';
import { EntryType, IEntry, ILedgerEntry, ILedgerRow, ISplit, LedgerRowType } from './types';
import { entrySort, splitSort, calculateMax, flatMap } from './utils';

export async function compile(entries: IEntry[]): Promise<string> {
    // Sort to make sure there is a deterministic output
    entries = entries.sort(entrySort);

    const ledgerEntries = entries.map(e => e.toLedgerEntry());
    const ledgerRows = flatMap(ledgerEntries.map(e => e.rows));
    const maxAccountWidth = calculateMax(
        ledgerRows,
        row => row.type === LedgerRowType.Split && row.values.length > 0,
        row => row.values[0].length);
    const maxAmountWidth = calculateMax(
        ledgerRows,
        row => row.type === LedgerRowType.Split && row.values.length > 1,
        row => row.values[1].length);
    const amountDecimalOffset = calculateMax(
        ledgerRows,
        row => row.type === LedgerRowType.Split && row.values.length > 1 && row.values[1].includes('.'),
        row => row.values[1].indexOf('.'));
    const finalString = ledgerEntries
        .map(entry => ledgerEntryToString(
            entry,
            maxAccountWidth,
            maxAmountWidth,
            amountDecimalOffset,
            2))
        .reduce((memo, s) => memo.concat(s, '\n'), '');

    return finalString;
}

function ledgerEntryToString(
    entry: ILedgerEntry,
    maxAccountWidth: number,
    maxAmountWidth: number,
    decimalOffset: number,
    columnSpacing: number = 4,
    splitPadding: number = 4): string {

    let outputString: string = '';
    outputString += `${entry.header}\n`;
    for (const subRow of entry.rows) {
        let str = ' '.repeat(splitPadding);
        str += ledgerRowToString(
            subRow,
            maxAccountWidth,
            maxAmountWidth,
            decimalOffset,
            columnSpacing);
        outputString += `${str}\n`;
    }
    return outputString;
}

function ledgerRowToString(
    row: ILedgerRow,
    maxAccountWidth: number,
    maxAmountWidth: number,
    decimalOffset: number,
    columnSpacing: number): string {

    switch(row.type) {
        case LedgerRowType.Comment:
            return row.values[0];
        case LedgerRowType.Split:
            const accountName = row.values[0];
            const formatedAmount = row.values[1];
            const memo = row.values[2] ? row.values[2] : '';

            const decimalIndex = formatedAmount.indexOf('.');
            const decimalLocation = decimalIndex >= 0 ? decimalIndex : formatedAmount.length;
            const amountOffset = decimalOffset - decimalLocation;

            const accountSpacing = ' '.repeat(maxAccountWidth - accountName.length + columnSpacing + amountOffset);
            const amountSpacing = ' '.repeat(maxAmountWidth - amountOffset - formatedAmount.length + columnSpacing);

            return `${accountName}${accountSpacing}${formatedAmount}${amountSpacing}${memo}`;
    }
    return '';
}

export function buildLedgerEntryRows({type, splits, currencySymbol}: IEntry): ILedgerRow[] {
    splits = splits.sort(splitSort);
    return splits.map(split => {
        const amount = Math.abs(split.amount);
        const sign = Math.sign(split.amount);
        const amountString = `${sign > 0 ? ' ' : '-'}${currencySymbol}${amount.toFixed(2)}`;
        switch (type) {
            case EntryType.Transaction:
                    return {
                        type: LedgerRowType.Split,
                        values: [
                            `${split.group}:${split.account}`,
                            amountString,
                            ...(split.memo
                                ? [
                                    `; ${split.memo}`,
                                ]
                                : []),
                        ],
                    };
            case EntryType.Budget:
                    return {
                        type: LedgerRowType.Split,
                        values: [
                            `[${split.group}:${split.account}]`,
                            amountString,
                            ...(split.memo
                                ? [
                                    `; ${split.memo}`,
                                ]
                                : []),
                        ],
                    };
        }
    });
}
