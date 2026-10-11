import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv/config');
const { getAllClients } = require('./playwright/config/clients.js');
console.log(getAllClients().map(c => c.clientId));
