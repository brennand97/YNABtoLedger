#!/usr/bin/env node

import { initializeApi } from './sources/ynab/api';
import * as ynab from './sources/ynab/index';
import * as ledger from './ledger';
import { Entry } from './types';

(async function() {

    const ynabEntries: Entry[] = await ynab.getEntries();

    const ledgerOutput = await ledger.compile(ynabEntries);

    console.log(ledgerOutput);
    
})();
