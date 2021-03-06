import { ROOT_DIR } from './../index';
import express from 'express';
const router = express.Router();
import path from 'path';
import parser from 'fast-xml-parser';
import flatten from 'flat';

import { getFileData, getXMlVersion, asyncRouteHandler } from '../helper/other';

import { getChilds } from '../helper/TrackingEvent/schemaTrackingEventProps';
import { SchemaTrackingEvent } from '../models/schemaTrackingEvent';

router.post(
  '/',
  asyncRouteHandler(async (req, res) => {
    const itemXmlPath = path.join(ROOT_DIR, 'XMLs', 'TrackingEvent.xml');
    const fileData = await getFileData(itemXmlPath);
    const tObj = parser.getTraversalObj(fileData, {});
    const jsonObj = parser.convertToJson(tObj, {});
    const flattenJson = flatten(jsonObj);
    const TrackingEventSchema = getChilds(flattenJson);
    const { gtmVersion, xmlNsOtm, xmlNsGtm } = getXMlVersion(fileData);
    if (!gtmVersion) return res.status(400).send('XML must contain Namespace');
    let trackingEvent = await SchemaTrackingEvent.findOne({ gtmVersion: gtmVersion });
    if (trackingEvent) {
      const inboundSchema = JSON.stringify(trackingEvent.ShipmentStatus);
      const outboundSchema = JSON.stringify(TrackingEventSchema.ShipmentStatus);
      if (inboundSchema === outboundSchema) return res.status(200).send(trackingEvent);
      await SchemaTrackingEvent.findByIdAndRemove(trackingEvent._id);
    }
    trackingEvent = new SchemaTrackingEvent({ xmlNs: [xmlNsOtm, xmlNsGtm], gtmVersion, ...TrackingEventSchema });
    trackingEvent = await trackingEvent.save();
    return res.status(200).send(trackingEvent);
  })
);

router.get(
  '/',
  asyncRouteHandler(async (req, res) => {
    const { gtmVersion } = req.query;
    if (!gtmVersion) {
      const trackingEvent = await SchemaTrackingEvent.find().sort({ gtmVersion: -1 });
      return res.status(200).send(trackingEvent);
    }
    const trackingEvent = await SchemaTrackingEvent.findOne({ gtmVersion: gtmVersion });
    if (!trackingEvent) return res.status(400).send(`gtmVersion:${gtmVersion} schema not available!`);
    return res.status(200).send(trackingEvent);
  })
);

export default router;
