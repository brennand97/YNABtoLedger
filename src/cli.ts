#!/usr/bin/env node

import { initializeApi } from './api';
import createLedger from './index';

(async function() {
    createLedger(await initializeApi());
})();
