import { getConfig } from '../configuration';
import { IConfiguration, IEntry } from '../types';
import { filterByAccount } from './accountFiltering';
import { mapAccounts } from './accountMapping';

export async function transform(entries: IEntry[]) {
    const config: IConfiguration = await getConfig();

    entries = mapAccounts(config, entries);
    entries = filterByAccount(config, entries);

    return entries;
}
