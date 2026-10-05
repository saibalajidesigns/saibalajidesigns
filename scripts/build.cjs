const fs = require('node:fs');
fs.rmSync('dist', {recursive:true, force:true});
fs.cpSync('public', 'dist', {recursive:true});
console.log('Static portfolio copied to dist. Vercel deploys api/contact.js as a function.');
