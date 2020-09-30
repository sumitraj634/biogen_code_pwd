import express from 'express';
const router = express.Router();
import { CONSTS as consts, asyncHandler, asyncRouteHandler } from '../helper/other';
import { getPartyPropfromGtm } from '../helper/dbXmlQuery';
import { getPartyData, getPartySchema, getUpdatedProp } from '../helper/Party/getPartyData';
import { dbXml } from '../api/gtm';
import { Party } from '../models/party';
import auth from '../middleware/auth';
import { generatePartySchema } from './schemaParty';
import { RequestUser } from '../interfaces/User';

router.get(
  '/',
  [auth],
  asyncRouteHandler(async (req, res) => {
    const { display } = req.query;
    const { username, password, instance, url } = req.user;
    const domain = getDomainName(username);
    if (display) {
      const party = await getPartyDisplayDataFromDb(domain, instance, display);
      if (party.length) return res.status(200).json({ data: party });
    }
    const gtmVersion = getGtmVersion(req);
    let schemaParty = await getPartySchema(gtmVersion);
    if (!schemaParty) schemaParty = await generatePartySchema();
    const { data: gtmData, error } = await asyncHandler(dbXml(url, getPartyPropfromGtm, username, password));
    // console.log('gtm Data party');
    // console.log(gtmData);

    if (error) return res.status(400).send(error);
    const GtmContact = await getPartyData(schemaParty, gtmVersion, gtmData, domain);
    let party = await getPartyDataFromDb(domain, instance);
    if (isNull(party)) return res.status(200).json(await createAndSendPartyData(domain, instance, GtmContact));
    party = await getUpdatedProp(GtmContact, party, instance, domain);
    if (display) return res.status(200).json(getPartyDisplayData(party));
    return res.status(200).json({ data: party });
  })
);

router.put(
  '/',
  [auth],
  asyncRouteHandler(async (req, res) => {
    let { party } = req.body;
    const { username, instance } = req.user;
    const domain = getDomainName(username);
    if (!party) return res.status(400).send('Party prop value missing!');
    party = await Party(domain, instance).findByIdAndUpdate(party._id, party, { new: true });
    return res.status(200).json({ data: party });
  })
);

router.put(
  '/swap',
  [auth],
  asyncRouteHandler(async (req: RequestUser, res) => {
    const { instance, username } = req.user;
    const domain = getDomainName(username);
    let { partys } = req.body;
    if (!partys || partys.length == 0) return res.status(400).send('Not a valid item list!');
    partys[0] = await Party(domain, instance).findByIdAndUpdate({ _id: partys[0]._id }, partys[0], { new: true });
    partys[1] = await Party(domain, instance).findByIdAndUpdate({ _id: partys[1]._id }, partys[1], { new: true });
    return res.status(200).json({ data: partys });
  })
);

async function getPartyDisplayDataFromDb(domain: any, instance: any, display: any) {
  return await Party(domain, instance)
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

async function getPartyDataFromDb(domain: any, instance: any) {
  return await Party(domain, instance).find({}).sort({ _id: 1 });
}

function getPartyDisplayData(party: any): any {
  return { data: party.filter((d) => d.display) };
}

async function createAndSendPartyData(domain: any, instance: any, GtmContact: any) {
  return { data: await Party(domain, instance).insertMany(GtmContact) };
}

function isNull(party: any) {
  return !party || party.length === 0;
}

function getGtmVersion(req: any) {
  return +req.query.gtmVersion || +consts.GTMVERSION;
}

function getDomainName(username: any) {
  return username.split('.')[0];
}

export default router;
