import { capitalize, getDomainName, getSequence, getTC, getXID } from '../other';
import { getDefaultValue, getMandatoryElement } from '../renamer';

const TRANSACTION_MANDATORY_FIELD = [
  'Transaction ID DomainName',
  'Transaction ID',
  'Transaction TransactionCode',
  'Line ID DomainName',
  'Line ID',
  'Line TransactionCode',
];

const getDisplayText = (prop, index, element) => {
  const displayText = capitalize(element.split('_').join(' '));
  return displayText.split('.')[1] ? displayText.split('.')[1] : displayText;
};

const getIndex = (prop, searchTerm) => {
  const getIndex = (d) => d.path.search(searchTerm) > -1;
  return prop.findIndex(getIndex);
};

export const mapHeader = (element, type, gtmVersion, xmlNs, domain) => {
  return {
    name: element.name,
    required: true,
    disabled: getMandatoryElement(element.name, TRANSACTION_MANDATORY_FIELD),
    display: getMandatoryElement(element.name, TRANSACTION_MANDATORY_FIELD),
    type: type,
    displayText: element.name,
    defaultValue: getDefaultValue(element.path, domain),
    isMandatory: getMandatoryElement(element.name, TRANSACTION_MANDATORY_FIELD),
    path: [element.path],
    gtmVersion,
    xmlNs,
  };
};

export const mapRefnum = (element, Refnum, type, gtmVersion, xmlNs, i, prefix, domain) => {
  const refIdIndex = getIndex(Refnum, 'Xid');
  const refDomainNameIndex = getIndex(Refnum, 'DomainName');
  const refValueIndex = getIndex(Refnum, 'RefnumValue');
  const remTransactionCodeIndex = getIndex(Refnum, 'TransactionCode');
  return {
    name: `${prefix} ${element}`.trim(),
    required: true,
    disabled: false,
    display: false,
    type: type,
    displayText: `${prefix} ${getDisplayText(Refnum, refIdIndex, element)}`.trim(),
    defaultValue: getDefaultValue(Refnum[refValueIndex].path, domain),
    path: [
      { path: Refnum[refValueIndex].path.replace('INDEX', i), value: '' },
      getDomainName(element, Refnum[refDomainNameIndex].path.replace('INDEX', i)),
      getTC(element, Refnum[remTransactionCodeIndex].path.replace('INDEX', i)),
      getXID(element, Refnum[refIdIndex].path.replace('INDEX', i)),
    ],
    gtmVersion,
    xmlNs,
  };
};

export const mapRemark = (element, Remark, type, gtmVersion, xmlNs, i, prefix, domain) => {
  const remIdIndex = getIndex(Remark, 'Xid');
  const remDomainNameIndex = getIndex(Remark, 'DomainName');
  const remTextIndex = getIndex(Remark, 'RemarkText');
  const remSequenceIndex = getIndex(Remark, 'RemarkSequence');
  const remTransactionCodeIndex = getIndex(Remark, 'TransactionCode');
  return {
    name: `${prefix} ${element}`.trim(),
    required: true,
    disabled: false,
    display: false,
    type: type,
    displayText: `${prefix} ${getDisplayText(Remark, remIdIndex, element)}`.trim(),
    defaultValue: getDefaultValue(Remark[remTextIndex].path, domain),
    path: [
      { path: Remark[remTextIndex].path.replace('INDEX', i), value: '' },
      getTC(element, Remark[remTransactionCodeIndex].path.replace('INDEX', i)),
      getSequence(element, Remark[remSequenceIndex].path.replace('INDEX', i), i),
      getDomainName(element, Remark[remDomainNameIndex].path.replace('INDEX', i)),
      getXID(element, Remark[remIdIndex].path.replace('INDEX', i)),
    ],
    gtmVersion,
    xmlNs,
  };
};
// export const mapQuantity = (element, Quantity, type, gtmVersion, xmlNs, i, prefix, domain, uoms) => {
//   return uoms[element.replace(/.*\[|\]/gi, '')].map((qUOM) => {
//     element = element.split('[')[0];
//     const qtyIdIndex = getIndex(Quantity, /QuantityTypeGid(.*?)Xid/);
//     const qtyDomainIndex = getIndex(Quantity, /QuantityTypeGid(.*?)DomainName/);
//     const qtyValueIndex = getIndex(Quantity, /Quantity(.*?)QuantityValue/);
//     // const qtySequenceIndex = getIndex(Quantity, /Quantity(.*?)SequenceNumber/);
//     const qtyTransactionCodeIndex = getIndex(Quantity, /Quantity(.*?)TransactionCode/);
//     const qtyUOMIndex = getIndex(Quantity, /Quantity(.*?)UOM/);

//     return {
//       name: `${prefix} ${element} (${qUOM})`.trim(),
//       required: true,
//       disabled: false,
//       display: false,
//       type: type,
//       displayText: `${prefix} ${getDisplayText(Quantity, qtyIdIndex, element)} (${qUOM})`.trim(),
//       defaultValue: getDefaultValue(Quantity[qtyValueIndex].path, domain),
//       path: [
//         { path: Quantity[qtyValueIndex].path.replace('INDEX', i), value: '' },
//         getTC(element, Quantity[qtyTransactionCodeIndex].path.replace('INDEX', i)),
//         // getSequence(element, Quantity[qtySequenceIndex].path.replace('INDEX', i), i),
//         getDomainName(element, Quantity[qtyDomainIndex].path.replace('INDEX', i)),
//         { path: Quantity[qtyUOMIndex].path.replace('INDEX', i), value: qUOM },
//         getXID(element, Quantity[qtyIdIndex].path.replace('INDEX', i)),
//       ],
//       gtmVersion,
//       xmlNs,
//     };
//   });
// };
export const mapQuantity = (element, Quantity, type, gtmVersion, xmlNs, i, prefix, domain) => {
    element = element.split('[')[0];
    const qtyIdIndex = getIndex(Quantity, /QuantityTypeGid(.*?)Xid/);
    const qtyDomainIndex = getIndex(Quantity, /QuantityTypeGid(.*?)DomainName/);
    const qtyValueIndex = getIndex(Quantity, /Quantity(.*?)QuantityValue/);
    // const qtySequenceIndex = getIndex(Quantity, /Quantity(.*?)SequenceNumber/);
    const qtyTransactionCodeIndex = getIndex(Quantity, /Quantity(.*?)TransactionCode/);
    // const qtyUOMIndex = getIndex(Quantity, /Quantity(.*?)UOM/);

    return {
      name: `${prefix} ${element}`.trim(),
      required: true,
      disabled: false,
      display: false,
      type: type,
      displayText: `${prefix} ${getDisplayText(Quantity, qtyIdIndex, element)}`.trim(),
      defaultValue: getDefaultValue(Quantity[qtyValueIndex].path, domain),
      path: [
        { path: Quantity[qtyValueIndex].path.replace('INDEX', i), value: '' },
        getTC(element, Quantity[qtyTransactionCodeIndex].path.replace('INDEX', i)),
        // getSequence(element, Quantity[qtySequenceIndex].path.replace('INDEX', i), i),
        getDomainName(element, Quantity[qtyDomainIndex].path.replace('INDEX', i)),
        // { path: Quantity[qtyUOMIndex].path.replace('INDEX', i), value:''},
        getXID(element, Quantity[qtyIdIndex].path.replace('INDEX', i)),
      ],
      gtmVersion,
      xmlNs,
    };
};
export const mapCurrency = (element, Currency, type, gtmVersion, xmlNs, i, prefix, domain) => {
  const curIdIndex = getIndex(Currency, /GtmCurrencyTypeGid(.*?)Xid/);
  const curDomainIndex = getIndex(Currency, /GtmCurrencyTypeGid(.*?)DomainName/);
  const curAmountIndex = getIndex(Currency, /CurrencyValue(.*?)MonetaryAmount/);
  // const qtySequenceIndex = getIndex(Currency, /Quantity(.*?)SequenceNumber/);
  // const qtyTransactionCodeIndex = getIndex(Currency, /Quantity(.*?)TransactionCode/);
  const curCodeIndex = getIndex(Currency, /CurrencyValue(.*?)GlobalCurrencyCode/);

  return {
    name: `${prefix} ${element}`.trim(),
    required: true,
    disabled: false,
    display: false,
    type: type,
    displayText: `${prefix} ${getDisplayText(Currency, curIdIndex, element)}`.trim(),
    defaultValue: getDefaultValue(Currency[curAmountIndex].path, domain),
    path: [
      { path: Currency[curAmountIndex].path.replace('INDEX', i), value: '' },
      // getTC(element, Currency[qtyTransactionCodeIndex].path.replace('INDEX', i)),
      // getSequence(element, Currency[qtySequenceIndex].path.replace('INDEX', i), i),
      getDomainName(element, Currency[curDomainIndex].path.replace('INDEX', i)),
      { path: Currency[curCodeIndex].path.replace('INDEX', i), value: 'USD' },
      getXID(element, Currency[curIdIndex].path.replace('INDEX', i)),
    ],
    gtmVersion,
    xmlNs,
  };
};

export const mapInvolvedParty = (element, InvolvedParty, type, gtmVersion, xmlNs, i, prefix, domain = '') => {
  const remIdIndex = getIndex(InvolvedParty, /InvolvedPartyQualifierGid(.*?)Xid/);
  const remDomainNameIndex = getIndex(InvolvedParty, 'DomainName');
  const remTextIndex = getIndex(InvolvedParty, /ContactGid(.*?)Xid/);
  const remTextIndexDomain = getIndex(InvolvedParty, /ContactGid(.*?)DomainName/);
  const remTransactionCodeIndex = getIndex(InvolvedParty, 'TransactionCode');
  return {
    name: `${prefix} ${element} (Party ID)`.trim(),
    required: true,
    disabled: false,
    display: false,
    type: type,
    displayText: `${prefix} ${getDisplayText(InvolvedParty, remIdIndex, element)} (Party ID)`.trim(),
    defaultValue: getDefaultValue(InvolvedParty[remTextIndex].path, domain),
    path: [
      { path: InvolvedParty[remTextIndex].path.replace('INDEX', i), value: '' },
      getTC(element, InvolvedParty[remTransactionCodeIndex].path.replace('INDEX', i)),
      { path: InvolvedParty[remTextIndexDomain].path.replace('INDEX', i), value: domain },
      getDomainName(element, InvolvedParty[remDomainNameIndex].path.replace('INDEX', i)),
      getXID(element, InvolvedParty[remIdIndex].path.replace('INDEX', i)),
    ],
    gtmVersion,
    xmlNs,
  };
};
export const mapDate = (element, TransDate, type, gtmVersion, xmlNs, i, prefix, domain = '') => {
  const dateIdIndex = getIndex(TransDate, /DateQualifierGid(.*?)Xid/);
  const glogDateIndex = getIndex(TransDate, /TransactionDate(.*?)GLogDate/);
  const dateIdDomain = getIndex(TransDate, /DateQualifierGid(.*?)DomainName/);
  return {
    name: `${prefix} ${element} (YYYY-MM-DD)`.trim(),
    required: true,
    disabled: false,
    display: false,
    type: type,
    displayText: `${prefix} ${getDisplayText(TransDate, dateIdIndex, element)} (YYYY-MM-DD)`.trim(),
    defaultValue: getDefaultValue(TransDate[glogDateIndex].path, domain),
    path: [
      { path: TransDate[glogDateIndex].path.replace('INDEX', i), value: '' },
      getDomainName(element, TransDate[dateIdDomain].path.replace('INDEX', i)),
      getXID(element, TransDate[dateIdIndex].path.replace('INDEX', i)),
    ],
    gtmVersion,
    xmlNs,
  };
};
export const mapTrxLineItemId = (element, LineItemGid, type, gtmVersion, xmlNs, i, prefix, domain = '') => {
  const LineItemGidXIdIndex = getIndex(LineItemGid, /ItemGid(.*?)Xid/);
  const LineItemGidDomainIndex = getIndex(LineItemGid, /ItemGid(.*?)DomainName/);
  return {
    name: `${prefix} Item ID`.trim(),
    required: true,
    disabled: false,
    display: false,
    type: type,
    displayText: `${prefix} Item ID`.trim(),
    defaultValue: '',
    path: [
      { path: LineItemGid[LineItemGidXIdIndex].path.replace('INDEX', i), value: '' },
      { path: LineItemGid[LineItemGidDomainIndex].path.replace('INDEX', i), value: domain },
    ],
    gtmVersion,
    xmlNs,
  };
};
