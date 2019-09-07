"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ynab = __importStar(require("ynab"));
const Entry_1 = require("./Entry");
const utils_1 = require("./utils");
const access_token = process.env.YNAB_ACCESS_TOKEN;
const api = new ynab.API(access_token);
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const budgetResponse = yield api.budgets.getBudgets();
        const budget = budgetResponse.data.budgets[1];
        console.log(`Budget Name: ${budget.name}`);
        const accountResponse = yield api.accounts.getAccounts(budget.id);
        const accounts = accountResponse.data.accounts.map(a => normalizeName(a));
        const categoryResponse = yield api.categories.getCategories(budget.id);
        const categoryGroups = categoryResponse.data.category_groups.map(cg => normalizeName(cg));
        const categories = categoryGroups.map(e => e.categories).reduce((a, b) => a.concat(b), []).map(c => normalizeName(c));
        const transactionResponse = yield api.transactions.getTransactions(budget.id);
        const transactions = transactionResponse.data.transactions.map(t => normalizeName(t, ['account_name', 'category_name']));
        const entryBuilder = new Entry_1.EntryBuilder((id) => utils_1.findbyId(transactions, id), (id) => utils_1.findbyId(accounts, id), (id) => utils_1.findbyId(categories, id), (id) => utils_1.findbyId(categoryGroups, id));
        const entries = transactions.map(t => entryBuilder.buildEntry(t));
    });
})();
function normalizeName(object, keys = ['name']) {
    return object;
    for (let key of keys) {
        if (key in object && object[key]) {
            const words = object[key].split(' ');
            const name = words.map((w) => {
                w = w.replace(/([\-_])/g, x => '');
                if (w.match(/[a-z]/i)) {
                    return w.replace(/(\b[a-z\-_](?!\s))/gi, x => x.toLocaleUpperCase());
                }
            }).join('');
            object[key] = name;
        }
    }
    return object;
}
//# sourceMappingURL=index.js.map