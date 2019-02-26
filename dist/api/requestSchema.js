const mongoose = require('mongoose');
const { send } = require('micro');
const { parse } = require('url');
const request = require('request');

mongoose.connect(`mongodb://${process.env.DBUSER}:${process.env.DBPASS}@${process.env.DBURI}`, { useNewUrlParser: true });

const apiStatusSchema = mongoose.Schema({
  wdc: String,
  action: String,
  responseCode: Number,
  error: String,
}, { timestamps: { createdAt: 'createdAt' } });

const ApiStatus = mongoose.model('ApiStatus', apiStatusSchema);

function isInt(value) {
  if (isNaN(value)) {
    return false;
  }
  const x = parseFloat(value);
  return (x || 0) === x;
}

function getDataType(value) {
  const testValue = value;
  if (typeof testValue === 'object') {
    return 'ignore';
  }
  if (typeof testValue === 'number') {
    if (isInt(testValue)) {
      return 'int';
    }
    return 'float';
  }
  if (typeof testValue === 'boolean') {
    return 'bool';
  }
  if (((testValue.match(/\//g) || []).length === 2 || (testValue.match(/-/g) || []).length === 2) && (testValue.match(/:/g) || []).length === 2) {
    return 'datetime';
  }
  if (((testValue.match(/\//g) || []).length === 2 || (testValue.match(/-/g) || []).length === 2)) {
    return 'date';
  }
  return 'string';
}

// End Database config & schema

// API Routes

module.exports = async (req, res) => {
  const { query } = parse(req.url, true);
  const accountID = query.account;
  const { process } = query;
  const options = {
    method: 'GET',
    url: `https://${accountID}.appspot.com/api/1/${process}/list/p1/1`,
    headers: {
      api_key: query.key,
      email_id: query.runas,
    },
  };
  request(options, (error, response, body) => {
    const apiStatus = new ApiStatus();
    apiStatus.wdc = 'kissflow';
    apiStatus.action = 'GET-requestSchema';
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
      const resp = JSON.parse(body);
      if (resp && resp.length > 0) {
        const record = resp[0];
        const schema = [];
        Object.keys(record).forEach((key) => {
          const dataType = getDataType(record[key]);
          if (dataType !== 'ignore') {
            const col = {
              id: key.replace(/\s+/g, ''),
              alias: key.replace(/_+/g, ' '),
              dataType,
            };
            schema.push(col);
          }
        });
        send(res, 200, schema);
      } else {
        send(res, 200, []);
      }
    });
  });
};
