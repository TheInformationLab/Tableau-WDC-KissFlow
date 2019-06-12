// jQuery
import 'jquery';
// PopperJS
import 'popper.js';
// Bootstrap 4
import 'bootstrap';
// Material Design Bootstrap
import '../vendors/mdb/js/mdb';

const {
  recordStat,
  getProcesses,
  getReqSchema,
  getRequests,
  processRequestProgress,
} = require('../assets/mongo/browser');

const tableauwdc = require('./tableauwdc/tableauwdc.js');

tableauwdc.init();

const { tableau } = window;

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
  recordStat('kissflow', 'view');
  initCallback();
};

kfConnector.shutdown = (shutdownCallback) => {
  shutdownCallback();
};

// Define the schema
kfConnector.getSchema = (schemaCallback) => {
  tableau.reportProgress('Getting KissFlow Request Schema');
  tableau.log('261 Getting KissFlow Request Schema');
  const connData = JSON.parse(tableau.connectionData);
  getProcesses(tableau.username, tableau.password, connData.runas)
    .then(retProcesses => getReqSchema(tableau.username, tableau.password, connData.runas, retProcesses))
    .then((schRequest) => {
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
  recordStat('kissflow', 'download');
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
        console.log('[app.js data]', data);
        table.appendRows(data);
        tableau.log(`363 ${data.length} request progress records written`);
        tableau.log('364 Getting progress for requests complete');
        doneCallback();
      })
      .catch((err) => {
        tableau.log('432  There was an error with getting process request progress');
        tableau.log(JSON.stringify(err));
        // tableau.abortWithError(err.message);
      });
  }
};

tableau.registerConnector(kfConnector);

function login(account, apikey, runas) {
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
    if ($('#account').val() !== '' && $('#apikey').val() !== '') {
      login($('#account').val().trim(), $('#apikey').val().trim(), $('#email').val().trim());
    }
  });
});
