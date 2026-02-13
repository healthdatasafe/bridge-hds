import Router from 'express-promise-router';
import type { Request, Response } from 'express';
import * as errors from '../errors/index.ts';
import { getErrorsOnBridgeAccount } from '../lib/bridgeAccount.ts';

const router = Router();

/**
 * List errors
 * query:
 *  - fromTime - (optional) EPOCH time
 *  - toTime - (optional) EPOCH time
 *  - limit - (optional) number of events to return
 * result: @see https://pryv.github.io/reference/#authenticate-your-app
 */
router.get('/errors/', async (req: Request, res: Response) => {
  errors.assertFromPartner(req as any);
  const params: Record<string, number> = { };
  for (const numKey of ['fromTime', 'toTime', 'limit']) {
    if (req.query[numKey] != null) {
      const val = Number.parseFloat(req.query[numKey] as string);
      if (isNaN(val)) errors.badRequest(`${numKey} value is not a number`, { [numKey]: req.query[numKey] });
      params[numKey] = val;
    }
  }
  const result = await getErrorsOnBridgeAccount(params);
  res.json(result);
});

export default router;
