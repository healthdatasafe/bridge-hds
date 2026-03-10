import boiler from '@pryv/boiler';
import { HDSService, initHDSModel } from 'hds-lib';
import ShortUniqueId from 'short-unique-id';
import { internalError } from "../errors/index.js";
const { getConfig, getLogger } = boiler;
let _logger = null;
function logger() { return _logger || (_logger = getLogger('pryvService')); }
const passwordGenerator = new ShortUniqueId({ dictionary: 'alphanum', length: 12 });
let serviceSingleton = null;
let infosSingleton = null;
let config = null;
/**
 * Get current HDSService service
 */
function service() {
    if (serviceSingleton == null)
        throw new Error('Init pryvService first');
    return serviceSingleton;
}
/**
 * Initialize Pryv service from config and creates a singleton
 * accessible via service()
 */
async function init() {
    if (infosSingleton)
        return infosSingleton;
    config = (await getConfig()).get('service');
    if (!config.appId)
        throw new Error('Cannot find appId in config');
    try {
        serviceSingleton = new HDSService(config.serviceInfoURL);
        infosSingleton = await serviceSingleton.info();
        await initHDSModel();
        return infosSingleton;
    }
    catch (err) {
        internalError('Failed connecting to service instance ' + err.message, config);
    }
    return null;
}
/**
 * Create a user on Pryv.io
 */
async function createuser(username, password, email) {
    const host = await getHost();
    password = password || passwordGenerator.rnd();
    username = username || getNewUserId('u');
    email = email || username + '@hds.bogus';
    try {
        // create user
        const res = await fetch(host + 'users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appId: config.appId,
                username,
                password,
                email,
                invitationtoken: 'enjoy',
                languageCode: 'en',
                referer: 'none'
            })
        });
        const resBody = await res.json();
        if (resBody.apiEndpoint == null)
            throw new Error('Cannot find apiEndpoint in response');
        return { apiEndpoint: resBody.apiEndpoint, username: resBody.username, password };
    }
    catch (e) {
        logger().error('Failed creating user ', e.message);
        throw new Error('Failed creating user ' + host + 'users');
    }
}
/**
 * Utility to check if a user exists on a Pryv pltafom
 */
async function userExists(userId) {
    const userExistsRes = await (await fetch(infosSingleton.register + userId + '/check_username')).json();
    if (typeof userExistsRes.reserved === 'undefined')
        throw Error('Pryv invalid user exists response ' + JSON.stringify(userExistsRes));
    return userExistsRes.reserved;
}
/**
 * Not really usefull for Open-Pryv.io kept if entreprise version becoms availble
 */
async function getHost() {
    // get available hosting
    const hostings = await (await fetch(infosSingleton.register + 'hostings')).json();
    let hostingCandidate = null;
    findOneHostingKey(hostings, 'N');
    function findOneHostingKey(o, parentKey) {
        for (const key of Object.keys(o)) {
            if (parentKey === 'hostings') {
                const hosting = o[key];
                if (hosting.available) {
                    hostingCandidate = hosting;
                }
                return;
            }
            if (typeof o[key] !== 'string') {
                findOneHostingKey(o[key], key);
            }
        }
    }
    if (hostingCandidate == null)
        throw Error('Cannot find hosting in: ' + JSON.stringify(hostings));
    return hostingCandidate.availableCore;
}
const userIdGenerator = new ShortUniqueId({ dictionary: 'alphanum_lower', length: 7 });
function getNewUserId(startWith = 'x') {
    const id = startWith + userIdGenerator.rnd();
    return id;
}
export { init, userExists, createuser, service };
//# sourceMappingURL=pryvService.js.map