import express from 'express';
import multiparty from 'multiparty';
import xlsx from 'node-xlsx';
import { CONSTS as consts, asyncHandler, getReportUrl, getViewUrl, asyncRouteHandler, getFileData } from '../helper/other';
import { wmServlet } from '../api/gtm';
import { getTransmissionStatus, getAutoGenId } from '../helper/dbXmlQuery';
import { dbXml } from '../api/gtm';
import auth from './../middleware/auth';
import { Report } from '../models/report';
import { Setting } from '../models/setting';
import { RequestUser } from '../interfaces/User';
import path from 'path';
import { ROOT_DIR } from '../index';
import { validateItemAndContactFromGtm } from '../helper/Item/getItemData';
import { Logform } from 'winston';

const router = express.Router();

interface TransmissionStatus {
  xid: number;
  transmission: string;
  status: string;
  instanceURL: string;
  viewURL: string;
}

router.post(
  '/',
  [auth],
  asyncRouteHandler(async (req, res) => {
    const { username, password, url } = req.user;
    const { xml, xmlNs } = req.body;
    let finalXML = xml.toString();
    finalXML = modifyXmlNamespace(finalXML, xmlNs);
    const { data, error } = await asyncHandler(wmServlet(url, finalXML, username, password));
    if (error) return res.status(400).send(error);
    if (!data.includes('ReferenceTransmissionNo')) return res.status(400).send('Invalid csv Data');
    const no = getTransmissionNo(data);
    return res.send({ data: { ReferenceTransmissionNo: no } });
  })
);

router.post(
  '/filedata',
  [auth],
  asyncRouteHandler(async (req, res) => {
    const form = new multiparty.Form();
    form.parse(req, async function (err, fields, files) {
      const filePath = files[Object.keys(files)[0]][0].path;
      const data = await xlsx.parse(filePath, { raw: true });
      return res.status(200).send({ data: data[0].data });
    });
  })
);

router.post(
  '/status',
  [auth],
  asyncRouteHandler(async (req, res) => {
    const { username, password, url } = req.user;
    const { transmission, reProcess, xids, considerXid } = req.body;
    if (!transmission && !transmission.length) return res.status(400).send('Bad request!');
    const transmissionQuery = getTransmissionStatus(transmission, reProcess);
    const { data: gtmData, error } = await asyncHandler(dbXml(url, transmissionQuery, username, password));
    if (error) return res.status(400).send(error);
    const statusResponses = gtmData.match(/<TRANSACTION_STATUS(.*?)>/g);
    const mappedStatusArray: TransmissionStatus[] = [];
    let OBJ = '';
    for (let i = 0; i < statusResponses.length; i++) {
      OBJ = loopAndMapStatusToObj(statusResponses, i, OBJ, mappedStatusArray, considerXid, xids, url);
    }
    if (!reProcess) await updateSettingsAndReport(xids, OBJ, username);
    return res.send({ data: mappedStatusArray });
  })
);

router.get(
  '/validate/static',
  [auth],
  asyncRouteHandler(async (req: RequestUser, res) => {
    const staticFilePath = path.join(ROOT_DIR, 'XMLs', 'static.json');
    const fileData = await getFileData(staticFilePath);
    return res.status(200).json(JSON.parse(fileData));
  })
);

router.get(
  '/validate/autogen',
  [auth],
  asyncRouteHandler(async (req: RequestUser, res) => {
    const { username, password, url } = req.user;
    const autoGen = await getAutoGenIdFromGtm(url, username, password);
    const date = new Date();
    return res.status(200).json({ data: modifyAutogen(autoGen, date) });
  })
);

router.post(
  '/validate/dynamic',
  [auth],
  asyncRouteHandler(async (req: any, res) => {
    const { username, password, url } = req.user;
    const { items, contacts } = req.body;
    if (!items || !contacts) return res.status(400).send('Items or Contacts missing!');
    const data = await validateItemAndContactFromGtm(url, username, password, req.body);
    return res.status(200).json({ data });
  })
);

function getTransmissionNo(data: any) {
  return data.match(/ReferenceTransmissionNo>(.*?)</)[1];
}

async function updateSettingsAndReport(xids: any, OBJ: string, username: any) {
  const uniqueXids = Array.from(new Set(xids));
  const update = { $inc: { [OBJ]: uniqueXids.length } };
  await Setting(consts.CURRENT_INSTANCE).findOneAndUpdate({ version: +consts.GTMVERSION }, update, { new: true });
  await Report(consts.CURRENT_INSTANCE).create({
    instance: consts.CURRENT_INSTANCE,
    user: username,
    [OBJ]: uniqueXids.length,
  });
}

function loopAndMapStatusToObj(
  statusResponses: any,
  i: number,
  OBJ: string,
  mappedStatusArray: TransmissionStatus[],
  considerXid: any,
  xids: any,
  url: any
) {
  const d = statusResponses[i];
  OBJ = d
    .match(/DATA_QUERY_TYPE_GID="(.*?)"/)[1]
    .toLowerCase()
    .replace('gtm', '')
    .replace('contact', 'party')
    .trim()
    .replace(' ', '-');
  const no = d.match(/I_TRANSACTION_NO="(.*?)"/)[1];
  const objId = d.match(/OBJECT_GID="(.*?)"/)[1];
  const status = d.match(/STATUS="(.*?)"/)[1];
  mappedStatusArray.push({
    xid: !considerXid ? (objId.includes('.') ? objId.split('.')[1] : objId) : xids[i],
    transmission: no,
    status,
    instanceURL: url + getReportUrl(no),
    viewURL: url + getViewUrl(),
  });
  return OBJ;
}

function modifyXmlNamespace(finalXML: any, xmlNs: any) {
  finalXML = finalXML.replace('<Transmission>', `<Transmission xmlns="${xmlNs[0]}" xmlns:otm="${xmlNs[0]}" xmlns:gtm="${xmlNs[1]}" >`);
  return finalXML;
}

async function getAutoGenIdFromGtm(url: string, username: string, password: string) {
  const { data } = await asyncHandler(dbXml(url, getAutoGenId, username, password));
  const codes = extractAutoGenIds(data);
  return codes;
}

function extractAutoGenIds(data: any) {
  const itemIdPattern = /ITEM="(.*?)"/;
  const lastItemId = data.match(itemIdPattern)[1];
  const contactIdPattern = /CONTACT="(.*?)"/;
  const lastContactId = data.match(contactIdPattern)[1];
  const trxIdPattern = /TRX="(.*?)"/;
  const lastTrxId = data.match(trxIdPattern)[1];
  return { item: lastItemId, contact: lastContactId, transaction: lastTrxId };
}

function modifyAutogen(whole_string: any, date) {
  const itemIdPattern = whole_string.item.split(/(\d+)/);
  const contactIdArr = whole_string.contact.split(/-/g);
  // const contactIdArr = whole_string.contact.split(/(\d+)/);
  const trxIdArr = whole_string.transaction.split(/-/g);
  const dateStr = '';
  // if dateStr required in id uncomment below
  // const dateStr = String(date.getFullYear()) + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
  const item = { str: itemIdPattern[0], counter: Number(itemIdPattern[1]) };
  const contact = getAutogenStr(contactIdArr, dateStr, '');
  const location = getAutogenStr(contactIdArr, dateStr, '');
  const transaction = getAutogenStr(trxIdArr, dateStr, '');
  const transactionLine = getAutogenStr(trxIdArr, dateStr, '');
  return { item, contact, transaction, location, transactionLine };
}

function getAutogenStr(arr: any, dateStr: string, defaultStr: string) {
  return arr.length === 2
    ? { str: arr[0], counter: Number(arr[1]) }
    : // if dateStr required in id uncomment below
      // ? { str: arr[0] + '_' + arr[1], counter: Number(arr[2]) }
      { str: defaultStr, counter: 0 };
  // { str: defaultStr + '_' + dateStr, counter: 0 };
}

export default router;
