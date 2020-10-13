import express from 'express';
const router = express.Router();
import { CONSTS as consts, asyncHandler, asyncRouteHandler } from '../helper/other';
import { getTransactionPropsfromGtm } from '../helper/dbXmlQuery';
import { getTransactionData, getTransactionSchema, getUpdatedProp, getIncotermsFromGtm } from '../helper/Transaction/getTransactionData';
import { dbXml } from '../api/gtm';
import { Transaction as TrxModel } from '../models/transaction';
import auth from '../middleware/auth';
import { generateTrxSchema } from './schemaTransaction';
import { RequestUser } from '../interfaces/User';

router.get(
  '/',
  [auth],
  asyncRouteHandler(async (req, res) => {
    const { display } = req.query;
    const { username, password, instance, url } = req.user;
    const domain = getDomainName(username);
    if (display) {
      const transaction = await getTrxDisplayDataFromDb(domain, instance, display);
      if (transaction.length) return res.status(200).json({ data: transaction });
    }
    const gtmVersion = getGtmVersion(req);
    let schemaTransaction = await getTransactionSchema(gtmVersion);
    password;
    if (!schemaTransaction) schemaTransaction = await generateTrxSchema();
    const { data: gtmData, error } = await asyncHandler(dbXml(url, getTransactionPropsfromGtm, username, password));
    if (error) return res.status(400).send(error);
    const GtmTransaction = await getTransactionData(schemaTransaction, gtmVersion, gtmData, domain);
    let transaction = await getTrxDataFromDb(domain, instance);
    if (isNull(transaction)) return res.status(200).json(await createAndSendTrxData(domain, instance, GtmTransaction));
    transaction = await getUpdatedProp(GtmTransaction, transaction, instance, domain);
    if (display) return res.status(200).json(getTrxDisplayData(transaction));
    return res.status(200).json({ data: transaction });
  })
);

router.put(
  '/',
  [auth],
  asyncRouteHandler(async (req, res) => {
    let { transaction } = req.body;
    const { username, instance } = req.user;
    const domain = getDomainName(username);
    if (!transaction) return res.status(400).send('Transaction prop value missing!');
    transaction = await updateAndGetTrxData(transaction, domain, instance);
    return res.status(200).json({ data: transaction });
  })
);

router.put(
  '/swap',
  [auth],
  asyncRouteHandler(async (req: RequestUser, res) => {
    const { instance, username } = req.user;
    const domain = getDomainName(username);
    let { transactions: trxs } = req.body;
    if (!trxs || trxs.length == 0) return res.status(400).send('Not a valid item list!');
    // trxs[0] = await TrxModel(domain, instance).findByIdAndUpdate({ _id: trxs[0]._id }, trxs[0], { new: true });
    // trxs[1] = await TrxModel(domain, instance).findByIdAndUpdate({ _id: trxs[1]._id }, trxs[1], { new: true });

    trxs[0] = await TrxModel(domain, instance).findByIdAndUpdate({ _id: trxs[0]._id }, trxs[0], { new: true }).exec();
    trxs[1] = await TrxModel(domain, instance).findByIdAndUpdate({ _id: trxs[1]._id }, trxs[1], { new: true }).exec();
    let x = await TrxModel(domain, instance).find({ name: trxs[1].name });
    let y = await TrxModel(domain, instance).find({ name: trxs[0].name });

    if (x.length > 1) {
      await TrxModel(domain, instance).findByIdAndDelete({ _id: x[1]._id }).exec();
    }

    if (y.length > 1) {
      await TrxModel(domain, instance).findByIdAndDelete({ _id: y[1]._id }).exec();
    }
    return res.status(200).json({ data: trxs });
  })
);

async function getTrxDisplayDataFromDb(domain: any, instance: any, display: any) {
  return await TrxModel(domain, instance)
    .find({
      $or: [
        {
          display: display,
        },
        {
          disabled: true,
        },
      ],
    })
    .sort({ _id: 1 });
}

async function updateAndGetTrxData(transaction: any, domain: any, instance: any) {
  transaction = await TrxModel(domain, instance).findByIdAndUpdate(transaction._id, transaction, {
    new: true,
  });
  return transaction;
}

async function getTrxDataFromDb(domain: any, instance: any) {
  return await TrxModel(domain, instance).find({}).sort({ _id: 1 });
}

function getTrxDisplayData(transaction: any): any {
  return { data: transaction.filter((d) => d.display) };
}

async function createAndSendTrxData(domain: any, instance: any, GtmTransaction: any) {
  return { data: await TrxModel(domain, instance).insertMany(GtmTransaction) };
}

function isNull(transaction: any) {
  return !transaction || transaction.length === 0;
}

function getGtmVersion(req: any) {
  return +req.query.gtmVersion || +consts.GTMVERSION;
}

function getDomainName(username: any) {
  return username.split('.')[0];
}

export default router;
