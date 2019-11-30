import { Moment } from 'moment';
import moment = require('moment');

import { IConfiguration, IEntry } from '../types';

export function filterEntries(config: IConfiguration, entries: IEntry[]): IEntry[] {

    if (config.account_filter && config.account_filter.length > 0) {

        const regexFilter: RegExp[] = config.account_filter.map(filter => new RegExp(filter, 'g'));

        entries = entries.filter(entry => {
            const accountNames =  entry.splits
                .map(split => `${split.group}:${split.account}`)
                .join('\n');
            return regexFilter.some(filter => accountNames.match(filter));
        });

    }

    if (config.start_date) {

        const startMoment: Moment = moment(config.start_date);
        entries = entries.filter(entry => moment(entry.recordDate) >= startMoment);

    }

    return entries;
}
