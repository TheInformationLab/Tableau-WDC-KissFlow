const {
  Stitch,
  AnonymousCredential,
} = require('mongodb-stitch-browser-sdk');
const flatten = require('flat');

const client = Stitch.initializeDefaultAppClient('til-wdc-dev-fwbxx');

const auth = () => new Promise((resolve, reject) => {
  if (client.auth.isLoggedIn) {
    resolve();
  } else {
    client.auth
      .loginWithCredential(new AnonymousCredential())
      .then(resolve)
      .catch(reject);
  }
});

const recordStat = (wdc, action) => new Promise((resolve, reject) => auth()
  .then(() => client.callFunction('recordWdcStatistic', [wdc, action]))
  .then((result) => {
    resolve(result);
  })
  .catch(reject));

const getProcesses = (accountID, apikey, runas) => new Promise((resolve, reject) => auth()
  .then(() => client.callFunction('kissflowGetProcesses', [accountID, apikey, runas]))
  .then((response) => {
    const res = response;
    const resStr = JSON.stringify(response);
    if (res.result === 'error') {
      if (res.status === 404 || res.status === 401) {
        reject(new Error('Invalid Credentials'));
      }
      return;
    }
    const cleanedResponse = resStr.replace(/\s(?=\w+":)/g, '');
    resolve(JSON.parse(cleanedResponse));
  })
  .catch(reject));

const getEachRequestSchema = (accountID, apikey, runas, process) => new Promise(resolve => client.callFunction('kissflowGetRequestSchema', [accountID, apikey, runas, process])
  .then((response) => {
    const headers = response;
    if (headers.result === 'error') {
      if (headers.status === 404 || headers.status === 401) {
        resolve({
          result: 'error',
          status: headers.status,
          error: 'Invalid Credentials',
        });
      }
      resolve({
        result: 'error',
        status: headers.status,
        error: headers.body,
      });
      return;
    }
    resolve({
      result: 'success',
      headers,
    });
  }));

const getReqSchema = (accountID, apikey, runas, processes) => new Promise((resolve, reject) => auth()
  .then(() => {
    const promises = [];
    for (let j = 0; j < processes.length; j += 1) {
      promises.push(getEachRequestSchema(accountID, apikey, runas, processes[j].Id));
    }
    Promise.all(promises).then((values) => {
      let headers = [];
      for (let j = 0; j < values.length; j += 1) {
        if (values[j].result === 'success') {
          headers = headers.concat(values[j].headers);
        }
      }
      const existingCols = [];
      const ret = [];
      headers.forEach((e, i) => {
        if (existingCols.indexOf(headers[i].id) === -1) {
          ret.push(headers[i]);
          existingCols.push(headers[i].id);
        }
      });
      resolve(ret);
    });
  })
  .catch(reject));

const requestAjax = (accountID, apikey, runas, process, page, data) => new Promise(resolve => client.callFunction('kissflowGetRequests', [accountID, apikey, runas, process, page])
  .then((response) => {
    if (response.result === 'error') {
      if (response.status === 404 || response.status === 401) {
        resolve({
          result: 'error',
          status: response.status,
          error: 'Invalid Credentials',
        });
      }
      resolve({
        result: 'error',
        status: response.status,
        error: response.body,
      });
      return;
    }
    let requests = response;
    if (requests && requests.length > 0) {
      requests.forEach((e, i) => {
        // Iterate over the keys of object
        Object.keys(e).forEach((key) => {
          // Copy the value
          const val = e[key];
          const newKey = key.replace(/\s+/g, '');
          // Remove key-value from object
          delete requests[i][key];
          // Add value with new key
          requests[i][newKey] = val;
          requests[i].ProcessId = process;
        });
      });
    }
    const anotherPage = requests.length === 50;
    if (data) {
      requests = requests.concat(data);
    }
    if (anotherPage) {
      requestAjax(accountID, apikey, runas, process, page + 1, requests);
    } else {
      resolve({
        result: 'success',
        requests,
      });
    }
  }));

const getEachRequest = (accountID, apikey, runas, process) => new Promise(resolve => requestAjax(accountID, apikey, runas, process, 1, [])
  .then(requestData => resolve(requestData)));

const getRequests = (accountID, apikey, runas, processIds) => new Promise((resolve, reject) => auth()
  .then(() => {
    const promises = [];
    for (let i = 0; i < processIds.length; i += 1) {
      promises.push(getEachRequest(accountID, apikey, runas, processIds[i]));
    }
    Promise.all(promises).then((values) => {
      let requests = [];
      for (let j = 0; j < values.length; j += 1) {
        if (values[j].result === 'success') {
          requests = requests.concat(values[j].requests);
        }
      }
      resolve(requests);
    });
  })
  .catch(reject));

function processProgress(progress, requestId) {
  const context = {};
  let parkArr = [];
  const branchArr = [];
  Object.keys(progress).forEach((key) => {
    const keyArr = key.split('.');
    if (keyArr[0] === 'Steps' && keyArr[2] !== 'Branches') {
      let obj = {};
      if (parkArr[parseInt(keyArr[1], 10)]) {
        obj = parkArr[parseInt(keyArr[1], 10)];
      }
      if (keyArr[2] === 'AssignedTo') {
        obj.AssignedTo = progress[key];
      }
      if (keyArr[2] === 'ReassignAudit' && keyArr[4] === 'reassigned_by') {
        obj.reassignedBy = progress[key];
      } else if (keyArr[2] === 'ReassignAudit' && keyArr[4] === 'reassigned_to') {
        obj.reassignedTo = progress[key];
      } else {
        const objKey = key.replace(`${keyArr[0]}.${keyArr[1]}.`, '');
        const fixKey = objKey.replace(/\s+/g, '');
        obj[fixKey] = progress[key];
      }
      parkArr[parseInt(keyArr[1], 10)] = obj;
    } else if (keyArr[0] === 'Steps' && keyArr[2] === 'Branches') {
      const objKey = key.replace(`${keyArr[0]}.${keyArr[1]}.${keyArr[2]}.${keyArr[3]}.`, '');
      let branch = {};
      if (branchArr[parseInt(keyArr[3], 10)]) {
        branch = branchArr[parseInt(keyArr[3], 10)];
      }
      let fixKey = objKey.replace(/\s+/g, '');
      if (fixKey === 'CompletedPercentage') {
        fixKey = 'BranchCompletedPercentage';
      }
      if (fixKey === 'Type') {
        fixKey = 'BranchType';
      }
      branch[fixKey] = progress[key];
      branchArr[parseInt(keyArr[3], 10)] = branch;
    } else {
      const fixKey = key.replace(/\s+/g, '');
      context[fixKey] = progress[key];
    }
  });
  for (let i = 0; i < parkArr.length; i += 1) {
    parkArr[i] = Object.assign({}, context, parkArr[i]);
    parkArr[i].RequestId = requestId;
  }
  if (branchArr.length > 0) {
    for (let i = 0; i < branchArr.length; i += 1) {
      parkArr = parkArr.concat(processProgress(branchArr[i], requestId));
    }
  }
  console.log('[browser.js parkArr]', parkArr);
  return parkArr;
}

// Function getRequestProgress
//  - Gets available requests each process
// @callback      {array}   List of requests
const getRequestProgress = (account, apikey, runas, process, request) => new Promise(resolve => client.callFunction('kissflowRequestProgress', [account, apikey, runas, process, request])
  .then((resp) => {
    const response = flatten(resp);
    console.log('[broswer.js pre response]', response, request);
    const progress = processProgress(response, request);
    console.log('[broswer.js post progress]', response, request, progress);
    resolve({
      result: 'success',
      progress,
    });
  }));

const processRequestProgress = (account, apiKey, runas, reqArr) => new Promise(resolve => auth()
  .then(() => {
    const progress = [];
    for (let i = 0; i < reqArr.length; i += 1) {
      progress.push(getRequestProgress(account, apiKey, runas, reqArr[i].ProcessId, reqArr[i].Id));
    }
    Promise.all(progress).then((values) => {
      console.log('[browser.js values]', values);
      let retArr = [];
      for (let j = 0; j < values.length; j += 1) {
        if (values[j].result === 'success') {
          retArr = retArr.concat(values[j].progress);
        }
      }
      console.log('[browser.js retArr]', retArr);
      resolve(retArr);
    });
  }));

module.exports = {
  recordStat,
  getProcesses,
  getReqSchema,
  getRequests,
  processRequestProgress,
};
