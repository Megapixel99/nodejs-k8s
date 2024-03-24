const mongoose = require('mongoose');

function connect(mongoConnectString, logger = console) {
  mongoose.connect(mongoConnectString);
  const mongoDB = mongoose.connection;
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };

  mongoDB.on('error', (err) => {
    logger.error(`MongoDB error: \n${err}`);
    throw err;
  });
  mongoDB.once('connected', () => {
    logger.log('Connected to MongoDB!');
    return true;
  });
}

function closeConnection() {
  const mongoDB = mongoose.connection;
  if (mongoDB.readyState === 1) {
    mongoDB.close();

    mongoDB.on('error', (err) => {
      logger.emerg(`MongoDB error: ${err}`);
      throw err;
    });
    if (mongoDB.readyState === 3 || mongoDB.readyState === 0) {
      mongoDB.once('disconnected', () => {
        logger.log('\n' + 'Disconnected from MongoDB!');
        return true;
      });
    } else {
      throw (new Error('Unable to disconnect from MongoDB'));
    }
  }
}

function getConnectionStatus() {
  return mongoose.connection.readyState;
}

module.exports = {
  connect,
  closeConnection,
  connectionStatus: getConnectionStatus,
};
