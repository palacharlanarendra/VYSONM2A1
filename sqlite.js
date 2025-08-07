const sqlite  = require('sqlite3').verbose();
const path  =  require('path');

const db  = new sqlite.Database(path.resolve(__dirname, 'sqlite.db'), (err) => {
    if(err) {
        console.log('Error occured while connected to db' + `${err.message}`);
    } else {
        console.log('Connected to the db');
    }
})

module.exports = db;