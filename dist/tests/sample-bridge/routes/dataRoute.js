import { Router } from "../../../src/index.js";
import { newData } from "../methods/handleData.js";
/**
 * initialize plugin and return router;
 */
export default function (plugin) {
    const router = Router();
    /**
     * For your plugin, you may remove "/test" from the path
     * And adapt it to your needs
     * POST /data/{partnerUserId}/test
     * Simply forward data to api of the user
     */
    router.post('/test/:partnerUserId', async (req, res) => {
        plugin.assertFromPartner(req); // check if the request is from a partner
        const partnerUserId = req.params.partnerUserId;
        const data = req.body;
        if (!Array.isArray(data))
            plugin.errors.badRequest('data should be an array', data);
        // process the request with methods/handleData.newData
        const result = await newData(partnerUserId, data);
        res.json(result);
    });
    /**
     * This route is mainly for testing purpose you may remove it for your plugin
     * POST /data/test/{partnerUserId}/api
     * Simply forward data to api of the user
     */
    router.post('/test/:partnerUserId/api', async (req, res) => {
        plugin.assertFromPartner(req); // check if the request is from a partner
        const partnerUserId = req.params.partnerUserId;
        if (!partnerUserId)
            plugin.errors.badRequest('Missing partnerUserId');
        const hdsUser = await plugin.getPryvUserConnectionAndStatus(partnerUserId); // retrieve the user
        const result = await hdsUser.connection.api(req.body);
        res.json(result);
    });
    return router;
}
//# sourceMappingURL=dataRoute.js.map