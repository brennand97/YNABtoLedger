import { IOutputRow, OutputRowType, OutputType } from '../outputs/types';
import { EntryType, IEntry } from '../types';
import { splitSort } from '../utils';

export function buildLedgerEntryRows({type, splits, currencySymbol}: IEntry, outputType: OutputType): IOutputRow[] {
    splits = splits.sort(splitSort);
    switch (outputType) {
        case OutputType.Ledger:
            return splits.map(split => {
                const amount = Math.abs(split.amount);
                const sign = Math.sign(split.amount);
                const amountString = `${sign > 0 ? ' ' : '-'}${currencySymbol}${amount.toFixed(2)}`;
                switch (type) {
                    case EntryType.Transaction:
                            return {
                                type: OutputRowType.Split,
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
                                type: OutputRowType.Split,
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
        case OutputType.Beancount:
            return splits.map(split => {
                const amount = Math.abs(split.amount);
                const sign = Math.sign(split.amount);
                const currencyAbbreviation = currencySymbolToAbbreviation(currencySymbol);
                const amountString = `${sign > 0 ? ' ' : '-'}${amount.toFixed(2)} ${currencyAbbreviation}`;
                switch (type) {
                    case EntryType.Transaction:
                        return {
                            type: OutputRowType.Split,
                            values: [
                                `${split.group}:${split.account}`.replace(/ +/g, '-'),
                                amountString,
                                ...(split.memo
                                    ? [
                                        `; ${split.memo}`,
                                    ]
                                    : []),
                            ]
                        };
                    default:
                            throw Error(`Cannot compile '${type}' to row for '${outputType}'`);
                }
            });
        default:
            throw Error(`Cannot compile Splits to '${type}'`);
    }
}

export function currencySymbolToAbbreviation(currencySymbol: string): string {
    // tslint:disable: object-literal-key-quotes
    return {
        '$': 'USD',
    }[currencySymbol];
    // tslint:enable: object-literal-key-quotes
}
