import { IConfiguration, IEntry } from '../types';

export function filterByAccount(config: IConfiguration, entries: IEntry[]): IEntry[] {

    if (config.account_filter && config.account_filter.length > 0) {

        entries = entries.filter(entry => entry.splits
            .some(split => config.account_filter
                .some(filter => `${split.group}:${split.account}`.match(filter))));

    }

    return entries;
}
