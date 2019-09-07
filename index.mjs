import dotenv from 'dotenv';
dotenv.config();

//require('dotenv').config();

import * as ynab from 'ynab';

const ynab_access_token = process.env.YNAB_ACCESS_TOKEN;

console.log(ynab_access_token);