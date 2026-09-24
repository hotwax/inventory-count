import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const clients = require('./playwright/config/clients.js');
console.log(clients.getAllClients());
