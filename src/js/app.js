// jQuery
import 'jquery';
// PopperJS
import 'popper.js';
// Bootstrap 4
import 'bootstrap';
// Material Design Bootstrap
import '../vendors/mdb/js/mdb';

const tableauwdc = require('./tableauwdc/tableauwdc.js');

tableauwdc.init();

const { tableau } = window;

let serverBase = '';
let localDev = false;

if (window.location.host !== 'kissflow-wdc.theinformationlab.io') {
  serverBase = 'http://localhost:3001';
  localDev = true;
}

const schProcess = [{
  id: 'Description',
  alias: 'Description',
  dataType: tableau.dataTypeEnum.string,
}, {
  id: 'Id',
  alias: 'Process ID',
  dataType: tableau.dataTypeEnum.string,
}, {
  id: 'Name',
  alias: 'Name',
  dataType: tableau.dataTypeEnum.string,
}];

const schProgress = [
  {
    id: 'RequestId',
    alias: 'Request ID',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'ProcessName',
    alias: 'Procress Name',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'CompletedPercentage',
    alias: 'Completed Percentage',
    dataType: tableau.dataTypeEnum.int,
  },
  {
    id: 'MetadataVersion',
    alias: 'Metadata Version',
    dataType: tableau.dataTypeEnum.int,
  },
  {
    id: 'StepId',
    alias: 'Step ID',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'Status',
    alias: 'Status',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'Name',
    alias: 'Name',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'TimeTaken',
    alias: 'Time Taken',
    dataType: tableau.dataTypeEnum.float,
  },
  {
    id: 'Id',
    alias: 'Item ID',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'AssignedAt',
    alias: 'Assigned At',
    dataType: tableau.dataTypeEnum.datetime,
  },
  {
    id: 'CompletedAt',
    alias: 'Completed At',
    dataType: tableau.dataTypeEnum.datetime,
  },
  {
    id: 'Type',
    alias: 'Type',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'SLA',
    alias: 'SLA',
    dataType: tableau.dataTypeEnum.int,
  },
  {
    id: 'CompletedBy',
    alias: 'Completed By',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'BranchName',
    alias: 'Branch Name',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'BranchCompletedPercentage',
    alias: 'Branch Completed Percentage',
    dataType: tableau.dataTypeEnum.int,
  },
  {
    id: 'BranchType',
    alias: 'Branch Type',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'AssignedTo',
    alias: 'Assigned To',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'QueriedTo',
    alias: 'Queried To',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'Subject',
    alias: 'Subject',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'reassignedTo',
    alias: 'Reassigned To',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'reassignedBy',
    alias: 'Reassigned By',
    dataType: tableau.dataTypeEnum.string,
  },
  {
    id: 'IsDeletedStep',
    alias: 'Is Deleted Step',
    dataType: tableau.dataTypeEnum.bool,
  },
  {
    id: 'ETA',
    alias: 'ETA',
    dataType: tableau.dataTypeEnum.datetime,
  },
];

const tblProcesses = {
  id: 'processes',
  alias: 'Processes',
  columns: schProcess,
};

const tblRequestProgress = {
  id: 'requestProgress',
  alias: 'Request Progress',
  columns: schProgress,
};

const schema = {
  tables: [
    tblProcesses,
    tblRequestProgress,
  ],
};

// **
// START Utility functions
// **

// Function getProcesses
//  - Gets available processes for the KissFlow acccount
// @callback      {array}   List of processes
function getProcesses(accountID, apikey, runas) {
  return new Promise((resolve, reject) => {
    const settings = {
      url: `${serverBase}/api/processes?account=${accountID}&key=${apikey}&runas=${runas}`,
      method: 'GET',
    };
    $.ajax(settings)
      .done((response) => {
        // Remove spaces in object keys that are returned by KissFlow API
        const res = response;
        const resStr = JSON.stringify(response);
        if (res.result === 'error') {
          if (res.status === 404 || res.status === 401) {
            reject(new Error('Invalid Credentials'));
          }
          tableau.log(res.status);
          return;
        }
        const cleanedResponse = resStr.replace(/\s(?=\w+":)/g, '');
        resolve(JSON.parse(cleanedResponse));
      })
      .fail((err) => {
        reject(err);
      });
  });
}

function getEachRequestSchema(accountID, apikey, runas, process, callback) {
  const settings = {
    url: `${serverBase}/api/requestSchema?account=${accountID}&key=${apikey}&runas=${runas}&process=${process}`,
    method: 'GET',
  };
  $.ajax(settings)
    .done((response) => {
      const headers = response;
      if (headers.result === 'error') {
        if (headers.status === 404 || headers.status === 401) {
          callback({
            result: 'error',
            status: headers.status,
            error: 'Invalid Credentials',
          });
        }
        callback({
          result: 'error',
          status: headers.status,
          error: headers.body,
        });
        return;
      }
      callback({
        result: 'success',
        headers,
      });
    })
    .fail((err) => {
      callback({
        result: 'error',
        error: err,
      });
    });
}

function getReqSchema(accountID, apikey, runas, processes) {
  return new Promise((resolve) => {
    console.log(processes);
    console.log('process count', processes.length);
    let counter = 0;
    const existingCols = [];
    const req = [];
    for (let j = 0; j < processes.length; j += 1) {
      const id = processes[j].Id;
      getEachRequestSchema(accountID, apikey, runas, id, (res) => {
        counter += 1;
        console.log('counter', counter);
        if (res.result === 'error') {
          tableau.log(res.error);
          res.headers = [];
        }
        const columns = res.headers;
        columns.forEach((e, i) => {
          if (existingCols.indexOf(columns[i].id) === -1) {
            req.push(columns[i]);
            existingCols.push(columns[i].id);
          }
        });
        if (counter === processes.length) {
          console.log('Returning', req);
          resolve(req);
        }
      });
    }
  });
}

// Function getRequests
//  - Gets available requests each process
// @callback      {array}   List of requests
function getEachRequest(accountID, apikey, runas, process, callback, page, data) {
  let urlPage = 1;
  if (page) {
    urlPage = page;
  }
  const settings = {
    url: `${serverBase}/api/requests?account=${accountID}&key=${apikey}&runas=${runas}&process=${process}&page=${urlPage}`,
    method: 'GET',
  };
  $.ajax(settings)
    .done((response) => {
      let requests = response;
      if (requests.result === 'error') {
        if (requests.status === 404 || requests.status === 401) {
          callback({
            result: 'error',
            status: requests.status,
            error: 'Invalid Credentials',
          });
        }
        callback({
          result: 'error',
          status: requests.status,
          error: requests.body,
        });
        return;
      }
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
        getEachRequest(accountID, apikey, runas, process, callback, urlPage + 1, requests);
      } else {
        callback({
          result: 'success',
          requests,
        });
      }
    })
    .fail((err) => {
      callback({
        result: 'error',
        error: err,
      });
    });
}

function getRequests(accountID, apikey, runas, processIds) {
  return new Promise((resolve) => {
    const processCount = processIds.length;
    let counter = 0;
    let ret = [];
    for (let i = 0; i < processCount; i += 1) {
      const id = processIds[i];
      getEachRequest(accountID, apikey, runas, id, (res) => {
        counter += 1;
        if (res.result === 'error') {
          tableau.log(res.error);
          res.requests = [];
        }
        ret = ret.concat(res.requests);
        if (counter === processCount) {
          resolve(ret);
        }
      });
    }
  });
}

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
      if (keyArr[2] === 'ReassignAudit' && keyArr[4] === 'reassigned_by') {
        console.log('Reassign');
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
  return parkArr;
}

// Function getRequestProgress
//  - Gets available requests each process
// @callback      {array}   List of requests
function getRequestProgress(accountID, apikey, runas, process, request, callback) {
  const settings = {
    url: `${serverBase}/api/progress?account=${accountID}&key=${apikey}&runas=${runas}&process=${process}&request=${request}`,
    method: 'GET',
  };
  $.ajax(settings)
    .done((resp) => {
      const response = resp;
      if (response.result === 'error') {
        if (response.status === 404 || response.status === 401) {
          callback({
            result: 'error',
            status: response.status,
            error: 'Invalid Credentials',
          });
        }
        callback({
          result: 'error',
          status: response.status,
          error: response.body,
        });
        return;
      }
      if (response && response.error) {
        callback({
          result: 'empty',
          progress: [],
        });
      } else {
        const progress = processProgress(response, request);
        callback({
          result: 'success',
          progress,
        });
      }
    })
    .fail((err) => {
      callback({
        result: 'error',
        error: err,
      });
    });
}

function processRequestProgress(account, apiKey, runas, reqArr) {
  return new Promise((resolve) => {
    let retArr = [];
    const reqCount = reqArr.length;
    let counter = 0;
    for (let i = 0; i < reqArr.length; i += 1) {
      getRequestProgress(account, apiKey, runas, reqArr[i].ProcessId, reqArr[i].Id, (res) => {
        counter += 1;
        if (res.result === 'error') {
          tableau.log(res.error);
          res.progress = [];
        }
        retArr = retArr.concat(res.progress);
        if (reqCount === counter) {
          resolve(retArr);
        }
      });
    }
  });
}

// **
// END Utility functions
// **

// **
// START tabWDC WDC Code
// **

const kfConnector = tableau.makeConnector;

kfConnector.init = (initCallback) => {
  tableau.connectionName = 'KissFlow';
  if (parseFloat(tableau.platformVersion) < 2019.2) {
    $('#email').focus(() => {
      $('#emailLabel').addClass('ovrActive');
    });
    $('#account').focus(() => {
      $('#accountLabel').addClass('ovrActive');
    });
    $('#apikey').focus(() => {
      $('#apikeyLabel').addClass('ovrActive');
    });
    $('#email').blur(() => {
      if ($('#email').val() === '') {
        $('#emailLabel').removeClass('ovrActive');
      }
    });
    $('#account').blur(() => {
      if ($('#account').val() === '') {
        $('#accountLabel').removeClass('ovrActive');
      }
    });
    $('#apikey').blur(() => {
      if ($('#apikey').val() === '') {
        $('#apikeyLabel').removeClass('ovrActive');
      }
    });
  }
  $('.wdc-title').hide();
  $('#loginForm').show();
  if (!localDev) {
    const settings = {
      url: '/api/stats',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      processData: false,
      data: '{\n\t"wdc": "kissflow",\n\t"action": "view"\n}',
    };
    $.ajax(settings)
      .done((response) => {
        console.log(response);
        tableau.log(249, response);
      })
      .always(() => {
        // tableau.submit();
      });
    initCallback();
  } else {
    initCallback();
  }
};

kfConnector.shutdown = (shutdownCallback) => {
  shutdownCallback();
};

// Define the schema
kfConnector.getSchema = (schemaCallback) => {
  console.log('getSchama');
  tableau.reportProgress('Getting KissFlow Request Schema');
  tableau.log('261 Getting KissFlow Request Schema');
  const connData = JSON.parse(tableau.connectionData);
  getProcesses(tableau.username, tableau.password, connData.runas)
    .then(retProcesses => getReqSchema(tableau.username, tableau.password, connData.runas, retProcesses))
    .then((schRequest) => {
      console.log('Returned', schRequest);
      tableau.log('284 Finished getting process request schema');
      schRequest.push({
        id: 'ProcessId',
        alias: 'Process ID',
        dataType: tableau.dataTypeEnum.string,
      });
      const tblRequests = {
        id: 'requests',
        alias: 'Requests',
        columns: schRequest,
      };
      schema.tables.push(tblRequests);
      schemaCallback(schema.tables, schema.joins);
    })
    .catch((err) => {
      tableau.log(JSON.stringify(err));
      // tableau.abortWithError(err.message);
    });
};


// Download the data
kfConnector.getData = (table, doneCallback) => {
  if (!localDev) {
    const settings = {
      url: '/api/stats',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      processData: false,
      data: '{\n\t"wdc": "kissflow",\n\t"action": "download"\n}',
    };
    $.ajax(settings)
      .done((response) => {
        console.log(response);
        tableau.log('296 Stats recorded');
        tableau.log(response);
      });
  }
  const connData = JSON.parse(tableau.connectionData);
  if (table.tableInfo.id === 'processes') {
    tableau.reportProgress('Getting KissFlow Processes');
    tableau.log('303 Starting to get KissFlow Processes');
    getProcesses(tableau.username, tableau.password, connData.runas)
      .then((processes) => {
        table.appendRows(processes);
        tableau.log('306 Finished getting KissFlow Processes');
        tableau.log(`307 ${processes.length} processes written`);
        doneCallback();
      })
      .catch((err) => {
        tableau.log('447 There was an error with getting processes');
        tableau.log(JSON.stringify(err));
        // tableau.abortWithError(err.message);
      });
  } else if (table.tableInfo.id === 'requests') {
    tableau.reportProgress('Getting KissFlow Requests');
    tableau.log('312 Starting to get KissFlow Requests');
    tableau.log('313 Getting KissFlow Processes');
    getProcesses(tableau.username, tableau.password, connData.runas)
      .then(processes => new Promise((resolve) => {
        tableau.log(`315 ${processes.length} processes found`);
        const processIds = [];
        for (let i = 0; i < processes.length; i += 1) {
          processIds.push(processes[i].Id);
        }
        resolve(processIds);
      }))
      .then(processIds => getRequests(tableau.username,
        tableau.password, connData.runas, processIds))
      .then((requests) => {
        table.appendRows(requests);
        tableau.log(`322 ${requests.length} requests written`);
        tableau.log('331 Finished getting KissFlow Requests');
        doneCallback();
      })
      .catch((err) => {
        tableau.log('327 There was an error with getting process requests');
        tableau.log(JSON.stringify(err));
        // tableau.abortWithError(err.message);
      });
  } else if (table.tableInfo.id === 'requestProgress') {
    tableau.reportProgress('Getting KissFlow Request Progress');
    tableau.log('339 Starting to get KissFlow Request Progress');
    tableau.log('313 Getting KissFlow Processes');
    getProcesses(tableau.username, tableau.password, connData.runas)
      .then(processes => new Promise((resolve) => {
        tableau.log(`315 ${processes.length} processes found`);
        const processIds = [];
        for (let i = 0; i < processes.length; i += 1) {
          processIds.push(processes[i].Id);
        }
        resolve(processIds);
      }))
      .then(processIds => getRequests(tableau.username,
        tableau.password, connData.runas, processIds))
      .then(requests => processRequestProgress(tableau.username, tableau.password,
        connData.runas, requests))
      .then((data) => {
        table.appendRows(data);
        tableau.log(`363 ${data.length} request progress records written`);
        tableau.log('364 Getting progress for requests complete');
        doneCallback();
      })
      .catch((err) => {
        tableau.log('432 There was an error with getting process request progress');
        tableau.log(JSON.stringify(err));
        // tableau.abortWithError(err.message);
      });
  }
};

tableau.registerConnector(kfConnector);

function login(account, apikey, runas) {
  console.log('Login!');
  tableau.username = account;
  tableau.password = apikey;
  tableau.connectionData = JSON.stringify({
    runas,
  });
  tableau.submit();
}

// **
// END tabWDC WDC Code
// **

$(document).ready(() => {
  function enableLogin() {
    if ($('#email').val() !== '' && $('#account').val() !== '' && $('#apikey').val() !== '') {
      $('#login').removeAttr('disabled');
    } else {
      $('#login').attr('disabled', 'disabled');
    }
  }

  $('#email').bind({
    paste: enableLogin,
    keyup: enableLogin,
  });

  $('#account').bind({
    paste: enableLogin,
    keyup: enableLogin,
  });

  $('#apikey').bind({
    paste: enableLogin,
    keyup: enableLogin,
  });

  $('#login').on('click', () => {
    console.log('Login Click');
    if ($('#account').val() !== '' && $('#apikey').val() !== '') {
      login($('#account').val().trim(), $('#apikey').val().trim(), $('#email').val().trim());
    }
  });
});
