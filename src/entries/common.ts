import { IOutputRow, OutputRowType, OutputType } from '../outputs/types';
import { EntryType, IEntry } from '../types';
import { splitSort } from '../utils';

export function buildLedgerEntryRows({type, splits, currencySymbol}: IEntry, outputType: OutputType): IOutputRow[] {
    splits = splits.sort(splitSort);
    switch(outputType) {
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
            break;
        default:
            throw Error(`Cannot compile Splits to '${type}'`);
    }
}
