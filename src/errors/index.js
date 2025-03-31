const expressErrorLogger = require('boiler').getLogger('expressError');

const REGEXP_URL = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-]*)*$/;

module.exports = {
  expressErrorHandler,
  assertValidEmail,
  assertValidPartnerUserId,
  assertFromPartner,
  assertValidURL,
  unkownRessource,
  unauthorized,
  badRequest,
  internalError
};

/**
 * Middleware for express to manage errors
 */
function expressErrorHandler (err, req, res, next) {
  expressErrorLogger.error(err, err);
  // console.log(err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = err.statusCode || 501;
  res.status(statusCode);
  const errorContent = { error: err.message };
  if (err.errorObject) errorContent.errorObject = err.errorObject;
  res.json(errorContent);
}

// ---------------- Errors ------------------ //

function unkownRessource (msg, obj) {
  const e = new Error('Ressource not found: ' + msg);
  e.statusCode = 400;
  if (obj) e.errorObject = obj;
  throw e;
}

function unauthorized (msg, obj) {
  const e = new Error('Unauthorized: ' + msg);
  e.statusCode = 404;
  if (obj) e.errorObject = obj;
  throw e;
}

function badRequest (msg, obj) {
  const e = new Error('Bad request: ' + msg);
  e.statusCode = 400;
  if (obj) e.errorObject = obj;
  throw e;
}

function internalError (msg, obj) {
  const e = new Error('Internal Error: ' + msg);
  e.statusCode = 501;
  if (obj) e.errorObject = obj;
  throw e;
}

// ----------------- Asserts ---------------- //

/**
 * Throw an error if call is not from Partner backend
 * @param {Request} req
 * @returns {void}
 * @throws 401 Unathorized
 */
function assertFromPartner (req) {
  if (req.isPartner) return;
  const e = new Error('Unathorized');
  e.statusCode = 401;
  throw e;
}

/**
 * Throws an error a string is not a url
 * @param {string} url
 * @returns {void}
 * @throws 400 Invalid URL
 */
function assertValidURL (url, extraMessage = '') {
  if (REGEXP_URL.test(url)) return;
  const e = new Error(`Invalid url "${url}" ${extraMessage}`);
  e.statusCode = 400;
  throw e;
}

/**
 * Throws an error if the partnerId is not in correct format
 * @param {string} patientId
 * @returns {void}
 * @throws 400 Invalid partnerId
 */
function assertValidPartnerUserId (partnerUserId) {
  if (partnerUserId != null && validateUserPartnerId(partnerUserId)) return;
  const e = new Error(`Invalid userPartnerId "${partnerUserId}"`);
  e.statusCode = 400;
  throw e;
}

/**
 * Throws an error if the email is not in correct format
 * @param {Request} req
 * @returns {void}
 * @throws 400 Invalid email
 */
function assertValidEmail (email) {
  if (email != null && validateEmail(email)) return;
  const e = new Error(`Invalid email "${email}"`);
  e.statusCode = 400;
  throw e;
}

// ----------------  Validators --------------//

/**
 * Helper to validate a userPartnerId
 * Maybe moved in a validator lib
 * @param {string} userPartnerId
 * @returns {boolean}
 */
function validateUserPartnerId (userPartnerId) {
  return (userPartnerId != null && userPartnerId.length > 3);
}

/**
 * Helper to validate an email
 * Maybe moved in a validator lib
 * @param {string} email
 * @returns {boolean}
 */
const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};
