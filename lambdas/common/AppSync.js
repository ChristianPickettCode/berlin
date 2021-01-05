const appsync = require('aws-appsync');
require('cross-fetch/polyfill');

const graphqlClient = new appsync.AWSAppSyncClient({
  url: 'https://bl7ainy7abfujjwo6nc3zew2hm.appsync-api.us-east-1.amazonaws.com/graphql',
  region: 'us-east-1',
  auth: {
    type: 'API_KEY',
    apiKey: 'da2-3wh3zalnj5bujpspphtfz5ukhi'
  },
  disableOffline: true
});

module.exports = {
    graphqlClient
};