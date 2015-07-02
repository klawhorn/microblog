// Update with your config settings.
var config = require('./config.js');

module.exports = {

  client: 'postgresql',
  connection: {
  host     : process.env.APP_DB_HOST     || config.dbHost,
  user     : process.env.APP_DB_USER     || config.dbUser,
  password : process.env.APP_DB_PASSWORD || config.dbPassword,
  database : process.env.APP_DB_NAME     || config.dbName
},
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: 'knex_migrations'
  }

};


