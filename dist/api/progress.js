const mongoose = require('mongoose');
const { send } = require('micro');
const { parse } = require('url');
const request = require('request');
const flatten = require('flat');

mongoose.connect(`mongodb://${process.env.DBUSER}:${process.env.DBPASS}@${process.env.DBURI}`, { useNewUrlParser: true });

const apiStatusSchema = mongoose.Schema({
  wdc: String,
  action: String,
  responseCode: Number,
  error: String,
}, { timestamps: { createdAt: 'createdAt' } });

const ApiStatus = mongoose.model('ApiStatus', apiStatusSchema);

// End Database config & schema

// API Routes

module.exports = async (req, res) => {
  const { query } = parse(req.url, true);
  const accountID = query.account;
  const { process } = query;
  const reqID = query.request;
  const options = {
    method: 'GET',
    url: `https://${accountID}.appspot.com/api/1/${process}/${reqID}/progress`,
    headers: {
      api_key: query.key,
      email_id: query.runas,
    },
  };
  request(options, (error, response, body) => {
    const apiStatus = new ApiStatus();
    apiStatus.wdc = 'kissflow';
    apiStatus.action = 'GET-progress';
    apiStatus.responseCode = response.statusCode;
    if (response.statusCode !== 200) {
      apiStatus.error = body;
    }
    apiStatus.save(() => {
      if (response.statusCode !== 200) {
        send(res, response.statusCode, {
          result: 'error',
          status: response.statusCode,
          body,
        });
        return;
      }
      const progress = flatten(JSON.parse(body));
      send(res, 200, progress);
    });
  });
};
