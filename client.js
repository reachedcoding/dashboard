const Database = require('./database');

module.exports =class Client {
    constructor(domain, db_name) {
        this.domain = domain;
        this.db = new Database(db_name);
        this.db_name = db_name;
    }

    async initialize() {
        await this.db.initialize();
    }
}