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
//require('dotenv').config();
const ynab = __importStar(require("ynab"));
//const ynab = require("ynab");
const access_token = process.env.YNAB_ACCESS_TOKEN;
console.log(ynab.API);
const api = new ynab.API(access_token);
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const budgetResponse = yield api.budgets.getBudgets();
        const budgets = budgetResponse.data.budgets;
        for (let budget of budgets) {
            console.log(`Budget Name: ${budget.name}`);
        }
    });
})();
//# sourceMappingURL=index.js.map