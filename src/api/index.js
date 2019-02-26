const app = require('express')();
const cors = require('cors');
const request = require('request');
const flatten = require('flat');
const morgan = require('morgan');

app.use(cors());
app.use(morgan('combined'));

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

app.get('/api/processes', (req, res) => {
  const accountID = req.query.account;
  console.log(accountID);
  const options = {
    method: 'GET',
    url: `https://${accountID}.appspot.com/api/1/process`,
    headers: {
      api_key: req.query.key,
      email_id: req.query.runas,
    },
  };
  request(options, (error, response, body) => {
    res.setHeader('Content-Type', 'application/json');
    if (response.statusCode !== 200) {
      res.end(JSON.stringify({
        result: 'error',
        status: response.statusCode,
        body,
      }));
      return;
    }
    res.end(body);
  });
});

app.get('/api/requestSchema', (req, res) => {
  const accountID = req.query.account;
  const { process } = req.query;
  const options = {
    method: 'GET',
    url: `https://${accountID}.appspot.com/api/1/${process}/list/p1/1`,
    headers: {
      api_key: req.query.key,
      email_id: req.query.runas,
    },
  };
  request(options, (error, response, body) => {
    res.setHeader('Content-Type', 'application/json');
    if (response.statusCode !== 200) {
      res.end(JSON.stringify({
        result: 'error',
        status: response.statusCode,
        body,
      }));
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
      res.end(JSON.stringify(schema));
    } else {
      res.end(JSON.stringify([]));
    }
  });
});

app.get('/api/requests', (req, res) => {
  const accountID = req.query.account;
  const { process } = req.query;
  const { page } = req.query;
  const options = {
    method: 'GET',
    url: `https://${accountID}.appspot.com/api/1/${process}/list/p${page}/50`,
    headers: {
      api_key: req.query.key,
      email_id: req.query.runas,
    },
  };
  request(options, (error, response, body) => {
    res.setHeader('Content-Type', 'application/json');
    if (response.statusCode !== 200) {
      res.end(JSON.stringify({
        result: 'error',
        status: response.statusCode,
        body,
      }));
      return;
    }
    res.end(body);
  });
});

app.get('/api/progress', (req, res) => {
  const accountID = req.query.account;
  const { process } = req.query;
  const reqID = req.query.request;
  const options = {
    method: 'GET',
    url: `https://${accountID}.appspot.com/api/1/${process}/${reqID}/progress`,
    headers: {
      api_key: req.query.key,
      email_id: req.query.runas,
    },
  };
  console.log(options.url);
  request(options, (error, response, body) => {
    res.setHeader('Content-Type', 'application/json');
    if (response.statusCode !== 200) {
      res.end(JSON.stringify({
        result: 'error',
        status: response.statusCode,
        body,
      }));
      return;
    }
    const jsonBody = JSON.parse(body);
    const progress = flatten(jsonBody);
    res.end(JSON.stringify(progress));
  });
});

app.listen(3001, () => {
  console.log('CORS-enabled web server listening on port 3001');
});
