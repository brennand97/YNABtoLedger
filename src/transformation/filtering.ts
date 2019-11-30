import { Moment } from 'moment';
import moment = require('moment');

import { IConfiguration, IEntry } from '../types';

export function filterEntries(config: IConfiguration, entries: IEntry[]): IEntry[] {

    if (config.account_filter && config.account_filter.length > 0) {

        entries = entries.filter(entry => entry.splits
            .some(split => config.account_filter
                .some(filter => `${split.group}:${split.account}`.match(filter))));

    }

    if (config.start_date) {

        const startMoment: Moment = moment(config.start_date);
        entries = entries.filter(entry => moment(entry.recordDate) >= startMoment);

    }

    return entries;
}
