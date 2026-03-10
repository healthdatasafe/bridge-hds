import boiler from '@pryv/boiler';
const { getConfig } = boiler;
let partnerAuthToken = null;
async function init() {
    const config = await getConfig();
    partnerAuthToken = config.get('partnerAuthToken');
}
async function checkIfPartner(req, _res, next) {
    if (req.headers.authorization === partnerAuthToken) {
        req.isPartner = true;
    }
    next();
}
export { init, checkIfPartner };
//# sourceMappingURL=checkAuth.js.map