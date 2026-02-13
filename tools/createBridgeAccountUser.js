/**
 * This script creates a bridgeAccount master token to be used in the configuration file.
 */
const { getConfig } = require('../src/initBoiler')('createAccount');
const pryvService = require('../src/lib/pryvService');
const { pryv } = require('hds-lib');

const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function go () {
  const config = await getConfig();
  const appId = config.get('service:appId');

  await pryvService.init();
  console.log('If needed create the bridge user and a master pryvApiEndpoint');
  const userId = process.env.BRIDGE_USER || await ask('Username: ');
  const password = process.env.BRIDGE_PASS || await ask('Password (will be visible plain text): ');

  let personalConnection;
  if (await pryvService.userExists(userId)) {
    // user exists loggin-in
    console.log('User exists logging in.');
    personalConnection = await (pryvService.service()).login(userId, password, appId + '-personal');
  } else {
    const email = await ask('Email: ');
    console.log('Creating user');
    const newUser = await pryvService.createuser(userId, password, email);
    personalConnection = new pryv.Connection(newUser.apiEndpoint);
  }

  // check if access already exists
  const apiCallCheckApp = [{
    method: 'accesses.get',
    params: { }
  }];
  const resCheckApp = await personalConnection.api(apiCallCheckApp);
  // filter for app access
  const foundAccess = resCheckApp[0].accesses.find((a) => (a.name === appId && a.type === 'app'));
  if (foundAccess != null) {
    console.log('Found existing: ' + foundAccess.apiEndpoint);
    console.log('With permissions: ', foundAccess.permissions);
    const delYN = await ask('Delete and create a new one? y/n: ');
    if (delYN === 'y') {
      const apiCalls = [{
        method: 'accesses.delete',
        params: { id: foundAccess.id }
      }];
      const res = await personalConnection.api(apiCalls);
      console.log('Deleted: ', res[0]);
    } else {
      rl.close();
      return;
    }
  }
  // create master token
  const accessRequest = {
    method: 'accesses.create',
    params: {
      type: 'app',
      name: appId,
      permissions: [
        { streamId: 'bridge', defaultName: 'Bridge', level: 'manage' }
      ]
    }
  };
  const apiCalls = [accessRequest];
  const res = await personalConnection.api(apiCalls);
  const appApiEndpoint = res[0].access?.apiEndpoint;
  console.log('Created: ' + appApiEndpoint);
  rl.close();
}

go();

function ask (question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}
