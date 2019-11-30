import { getConfig } from '../configuration';
import { IConfiguration, IEntry } from '../types';
import { mapAccounts } from './accountMapping';
import { filterEntries } from './filtering';

export async function transform(entries: IEntry[]) {
    const config: IConfiguration = await getConfig();

    entries = mapAccounts(config, entries);
    entries = filterEntries(config, entries);

    return entries;
}
