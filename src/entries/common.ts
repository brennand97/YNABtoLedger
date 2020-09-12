import { IOutputRow, OutputRowType, OutputType } from '../outputs/types';
import { EntryType, IEntry } from '../types';
import { splitSort } from '../utils';

export function buildLedgerEntryRows({type, splits, currency}: IEntry, outputType: OutputType): IOutputRow[] {
    splits = splits.sort(splitSort);
    switch (outputType) {
        case OutputType.Ledger:
            return splits.map(split => {
                const amount = Math.abs(split.amount);
                const sign = Math.sign(split.amount);
                const currencySymbol = currencyToSymbol(currency);
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
                const amountString = `${sign > 0 ? ' ' : '-'}${amount.toFixed(2)} ${currency}`;
                switch (type) {
                    case EntryType.Transaction:
                        return {
                            type: OutputRowType.Split,
                            values: [
                                `${split.group}:${split.account}`.replace(/ +/g, '-').replace(/(\.|')/g, ''),
                                amountString,
                                ...(split.memo
                                    ? [
                                        `; ${split.memo}`,
                                    ]
                                    : []),
                            ],
                        };
                    default:
                            throw Error(`Cannot compile '${type}' to row for '${outputType}'`);
                }
            });
        default:
            throw Error(`Cannot compile Splits to '${type}'`);
    }
}

export function currencyToSymbol(currency: string): string {
    // tslint:disable: object-literal-key-quotes
    return {
        'USD': '$',
    }[currency];
    // tslint:enable: object-literal-key-quotes
}
