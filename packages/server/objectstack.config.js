"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { defineConfig } from '@objectstack/cli';
// @ts-ignore
const crm_1 = require("@hotcrm/crm");
// @ts-ignore
const finance_1 = require("@hotcrm/finance");
// @ts-ignore
const marketing_1 = require("@hotcrm/marketing");
// @ts-ignore
const products_1 = require("@hotcrm/products");
// @ts-ignore
const support_1 = require("@hotcrm/support");
/**
 * HotCRM Server Configuration
 *
 * Aggregates all business plugins into a single runtime application.
 */
exports.default = {
    // Project Metadata
    name: 'hotcrm-server',
    description: 'HotCRM Enterprise Server',
    // Database connection provided by environment variables
    // MONGODB_URI=mongodb://localhost:27017/hotcrm
    // datasources: ... (handled by env vars in standard ObjectStack)
    // Register all Plugins
    plugins: [
        crm_1.CRMPlugin,
        finance_1.FinancePlugin,
        marketing_1.MarketingPlugin,
        products_1.ProductsPlugin,
        support_1.SupportPlugin
    ],
    // Server Settings
    dev: {
        port: process.env.PORT ? parseInt(process.env.PORT) : 5000,
    },
    // Build Settings
    build: {
        outDir: './dist',
        target: 'node18'
    }
};
