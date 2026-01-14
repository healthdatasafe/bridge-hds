const memored = require('memored');

module.exports = {
  init,
  cacheSet,
  cacheGet,
  cacheDel,
  cacheGetDel
};

let isTest = false;
const testKV = { };

/**
 * Cluster Master only
 */
async function init (testMode = false) {
  isTest = testMode;
  // if (isTest) return;
  memored.setup({ purgeInterval: 1500 });
}

/**
 * @returns {Promise<Object>}
 */
function cacheSet (key, value, expirationMs = null) {
  if (isTest) { testKV[key] = value; return; }

  return new Promise((resolve, reject) => {
    memored.store(key, value, function done (err, expirationTime) {
      if (err) return reject(err);
      return resolve({ expirationTime });
    });
  });
}

/**
 * @returns {Promise<Object>}
 */
function cacheGet (key) {
  if (isTest) { return testKV[key]; }

  return new Promise((resolve, reject) => {
    memored.read(key, function done (err, value) {
      if (err) return reject(err);
      return resolve(value);
    });
  });
}

/**
 * @returns {Promise<void>}
 */
function cacheDel (key) {
  if (isTest) { delete testKV[key]; return; }
  return new Promise((resolve, reject) => {
    memored.remove(key, function done () {
      return resolve();
    });
  });
}

/**
 * @returns {Promise<object>}
 */
async function cacheGetDel (key) {
  const result = await cacheGet(key);
  await cacheDel(key);
  return result;
}
