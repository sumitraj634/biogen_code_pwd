import { WebWorkerInput } from './model/WebWorkerInput';

const autoGenFields = ['TransactionCode', 'DomainName'];
const autoGenDisplayFields = ['Item ID', 'Party ID', 'Location ID', 'Transaction ID', 'Line ID'];

interface Response {
  data: any[];
  error: any[];
  csvHeader: any[];
  csvHeaderAll: any[];
  csvRow: any[];
  csvRowAll: any[];
}

const getAutoGenDefaultValue = (field, counter, autoGenIds) => {
  if (field.name.includes('Item'))
    return autoGenIds.item.str + '' + String(autoGenIds.item.counter + counter).padStart(5, '0');
  if (field.name.includes('Party'))
    return autoGenIds.contact.str + '-' + String(autoGenIds.contact.counter + counter).padStart(8, '0');
  if (field.name.includes('Location'))
    return autoGenIds.location.str + '-' + String(autoGenIds.location.counter + counter).padStart(8, '0');
  if (field.name.includes('Transaction ID'))
    return autoGenIds.transaction.str + '-' + String(autoGenIds.transaction.counter + counter).padStart(8, '0');
  if (field.name.includes('Line ID'))
    return autoGenIds.transactionLine.str + '-' + String(autoGenIds.transactionLine.counter + counter).padStart(8, '0');
};

const csvDataToObject = (
  fileData,
  dragdropList,
  containLines,
  parentGidIdentifierPathString,
  lineIdentifierPathString,
  validationData
) => {
  const autoGenIds = validationData.autoGen;
  const csvHeaderPaths = [];
  const _csvHeader = fileData[0];
  const csvHeader = getUniqueCsvHeaders(fileData, dragdropList);
  const csvRow = fileData.slice(1, fileData.length);
  const response: Response = { data: [], error: [], csvHeader: [], csvHeaderAll: [], csvRow: [], csvRowAll: [] };
  if (!csvRow.length) return emptyCsvError(response, _csvHeader);
  getCsvHeaderPaths(csvHeader, dragdropList, csvHeaderPaths, response);
  if (response.error.length) return invalidCsvHeaderError(response, _csvHeader, csvRow);
  const objectPaths = getObjectPaths(
    csvRow,
    csvHeader,
    csvHeaderPaths,
    response,
    dragdropList,
    validationData,
    autoGenIds
  );
  // console.log(csvHeaderPaths);
  if (response.error.length) return otherErrors(response, _csvHeader, csvRow);
  getLinesMerged(
    containLines,
    objectPaths,
    parentGidIdentifierPathString,
    lineIdentifierPathString,
    response,
    _csvHeader,
    csvRow
  );
  response.csvHeaderAll = objectPaths.map((d) => Object.keys(d));
  response.csvRowAll = objectPaths.map((d) => Object.values(d));
  return response;
};

addEventListener('message', async (msg) => {
  const {
    fileData,
    dragdropList,
    containLines,
    parentGidIdentifierPathString,
    lineIdentifierPathString,
    validationData,
  } = msg.data as WebWorkerInput;
  const result = csvDataToObject(
    fileData,
    dragdropList,
    containLines,
    parentGidIdentifierPathString,
    lineIdentifierPathString,
    validationData
  );
  postMessage({
    result: result.data,
    error: result.error,
    csvHeader: result.csvHeader,
    csvHeaderAll: result.csvHeaderAll,
    csvRow: result.csvRow,
    csvRowAll: result.csvRowAll,
  });
});

function otherErrors(response: Response, _csvHeader: any, csvRow: any) {
  response[`csvHeader`] = _csvHeader;
  response[`csvRow`] = csvRow;
  return response;
}

function invalidCsvHeaderError(response: Response, _csvHeader: any, csvRow: any) {
  response[`csvHeader`] = _csvHeader;
  response[`csvRow`] = csvRow;
  return response;
}

function emptyCsvError(response: Response, _csvHeader: any) {
  response.error.push(`csv must contain data`);
  response[`csvHeader`] = _csvHeader;
  return response;
}

function getLinesMerged(
  containLines: any,
  objectPaths: any[],
  parentGidIdentifierPathString: any,
  lineIdentifierPathString: any,
  response: Response,
  _csvHeader: any,
  csvRow: any
) {
  if (containLines && objectPaths.length > 1) {
    loopAndMergeLines(objectPaths, parentGidIdentifierPathString, lineIdentifierPathString, response);
  } else {
    response[`data`] = objectPaths;
  }
  response[`csvHeader`] = _csvHeader;
  response[`csvRow`] = csvRow;
}

function loopAndMergeLines(
  objectPaths: any[],
  parentGidIdentifierPathString: any,
  lineIdentifierPathString: any,
  response: Response
) {
  let rowCounter = 0;
  let lineCounter = 0;
  while (lineCounter < objectPaths.length) {
    if (
      mergingRequired(
        objectPaths[rowCounter],
        objectPaths[lineCounter],
        parentGidIdentifierPathString,
        lineIdentifierPathString
      )
    ) {
      response[`data`].push(
        // getLineMergedObject(lineIdentifierPathString, lineCounter, objectPaths[lineCounter], objectPaths[lineCounter])
        getLineMergedObject(lineIdentifierPathString, rowCounter, objectPaths[rowCounter], objectPaths[lineCounter])
      );
      lineCounter++;
    } else {
      response[`data`].push(objectPaths[lineCounter]);
      rowCounter = lineCounter;
      lineCounter++;
    }
  }
}

function mergingRequired(currentRow: any, nextRow: any, parentGidIdentifierPathString, lineIdentifierPathString) {
  const pattern = getRexPatternForTrxAndLineIds(parentGidIdentifierPathString, lineIdentifierPathString);

  for (const key in currentRow) {
    if (currentRow.hasOwnProperty(key)) {
      // if not biogen comment below condition

      if (key.match(pattern)) {
        continue;
      }
      const current = currentRow[key];
      const next = nextRow[key];

      if (current !== next) {
        if (key.includes(lineIdentifierPathString + '.')) {
          return true;
        } else return false;
      }
    }
  }
  return true;
}

function getRexPatternForTrxAndLineIds(parentGidIdentifierPathString: any, lineIdentifierPathString: any) {
  const strRegExPattern =
    '\\b' + '(' + parentGidIdentifierPathString + '|' + lineIdentifierPathString + ')(.*?)Xid' + '\\b';
  const pattern = new RegExp(strRegExPattern, 'g');
  return pattern;
}

function getLineMergedObject(
  lineIdentifierPathString: any,
  lineCounter: number,
  transmission: any,
  linTransmission: any
) {
  const tempObj = {};
  for (const path in linTransmission) {
    if (linTransmission.hasOwnProperty(path)) {
      if (path.includes(lineIdentifierPathString + '.')) {
        tempObj[getNewKey(path, lineIdentifierPathString, lineCounter)] = linTransmission[path];
        // tempObj[getNewKey(path, lineIdentifierPathString, lineCounter + 1)] = transmission[path];
        // tempObj[getNewKey(path, lineIdentifierPathString, lineCounter)] = transmission[path];
      } else {
        tempObj[path] = transmission[path];
      }
    }
  }
  return tempObj;
}

function getNewKey(path: string, lineIdentifierPathString: any, lineCounter: number) {
  return path.replace(lineIdentifierPathString + '.', lineIdentifierPathString + '.' + lineCounter + '.');
}

function getObjectPaths(
  csvRow: any,
  csvHeader: any[],
  csvHeaderPaths: any[],
  response: Response,
  dragdropList: any,
  validationData: any,
  autoGenIds
) {
  const objectPaths = [];
  for (let rowIndex = 0; rowIndex < csvRow.length; rowIndex++) {
    const pathCollector = {};
    for (let csvHeaderCounter = 0; csvHeaderCounter < csvHeader.length; csvHeaderCounter++) {
      const row = csvRow[rowIndex];
      const cellValue = row[csvHeaderCounter];
      if (cellValue && csvHeaderPaths[csvHeaderCounter].length > 1) {
        getObjAttributePropsFields(
          csvHeaderPaths,
          csvHeaderCounter,
          csvHeader,
          cellValue,
          response,
          rowIndex,
          pathCollector,
          validationData
        );
      } else if (cellValue) {
        getValidatedObjPathValue(
          csvHeader,
          csvHeaderCounter,
          validationData,
          cellValue,
          response,
          rowIndex,
          pathCollector,
          csvHeaderPaths
        );
      } else {
        getDefaultAndMandatoryFields(
          dragdropList,
          csvHeaderPaths,
          csvHeaderCounter,
          pathCollector,
          response,
          rowIndex,
          autoGenIds
        );
      }
    }
    objectPaths.push(pathCollector);
  }
  return objectPaths;
}

function getValidatedObjPathValue(
  csvHeader: any[],
  csvHeaderCounter: number,
  validationData: any,
  cellValue: any,
  response: Response,
  rowIndex: number,
  pathCollector: {},
  csvHeaderPaths: any[]
) {
  // not biogen -> comment out below start
  if (invalidIncoterm(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
    // not biogen -> comment out below start
  } else if (invalidLineIncoterm(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidShippingCondition(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidUOM(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidLineUOM(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidCurrencyCode(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidLineCurrencyCode(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidPartyCountryCode(csvHeaderPaths, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidPartyCountry(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidSpecialHandling(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  }
  //for Qty Qualifier Net Weight
  // else if (invalidNetWeightUOM(csvHeader, csvHeaderCounter, validationData, cellValue)) {
  //   response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  // }
  else {
    pathCollector[csvHeaderPaths[csvHeaderCounter]] = cellValue;
  }
}

function invalidPartyCountryCode(csvHeaderPaths: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    String(csvHeaderPaths[csvHeaderCounter][0]).match(/GtmContact(.*?)LocationRef(.*?)CountryCode3Gid(.*?)Xid/) &&
    !isEmpty(validationData.party.country) &&
    !validationData.party.country[cellValue]
  );
}

function invalidPartyCountry(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'Country Code 2' &&
    !isEmpty(validationData.party) &&
    !isEmpty(validationData.party.country) &&
    !validationData.party.country[cellValue]
  );
}

function invalidShippingCondition(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'Shipping Condition' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.other) &&
    !validationData.transaction.other[cellValue]
  );
}

function invalidUOM(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'UOM' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.quantity) &&
    !validationData.transaction.quantity[cellValue]
  );
}
function invalidLineUOM(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'Line UOM' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.quantity) &&
    !validationData.transaction.quantity[cellValue]
  );
}
//for Qty Qualifier Net Weight

function invalidNetWeightUOM(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  // console.log('check');
  // console.log(csvHeader);
  // console.log(csvHeaderCounter);
  // console.log(csvHeader[csvHeaderCounter]);
  // console.log('Validation Data');
  // console.log(validationData);
  // console.log('*******');
  // console.log('End');

  return (
    csvHeader[csvHeaderCounter] === 'Line Uom Net Weight' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.quantity) &&
    !validationData.transaction.quantity[cellValue]
  );
}
function invalidGrossWeightUOM(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'Line Uom Gross Weight' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.quantity) &&
    !validationData.transaction.quantity[cellValue]
  );
}
function invalidCurrencyCode(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'Global Currency Code' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.currencyCode) &&
    !validationData.transaction.currencyCode[cellValue]
  );
}
function invalidLineCurrencyCode(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'Line Currency' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.currencyCode) &&
    !validationData.transaction.currencyCode[cellValue]
  );
}

// function invalidUOM(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
//   return (
//     csvHeader[csvHeaderCounter].match('% UOM %') &&
//     !isEmpty(validationData.transaction) &&
//     !isEmpty(validationData.transaction.other) &&
//     !validationData.transaction.other[cellValue]
//   );
// }

function invalidSpecialHandling(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'Handling Instructions' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.other) &&
    !validationData.transaction.other[cellValue]
  );
}

// function invalidSpecialHandling(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
//   return (
//     csvHeader[csvHeaderCounter].match('% Handling %') &&
//     !isEmpty(validationData.transaction) &&
//     !isEmpty(validationData.transaction.other) &&
//     !validationData.transaction.other[cellValue]
//   );
// }

function invalidIncoterm(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'Inco Term ID' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.incoterm) &&
    !validationData.transaction.incoterm[cellValue]
  );
}

function invalidLineIncoterm(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    csvHeader[csvHeaderCounter] === 'Line Inco Term ID' &&
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.incoterm) &&
    !validationData.transaction.incoterm[cellValue]
  );
}

function getObjAttributePropsFields(
  csvHeaderPaths: any[],
  csvHeaderCounter: number,
  csvHeader: any[],
  cellValue: any,
  response: Response,
  rowIndex: number,
  pathCollector: {},
  validationData
) {
  const propPaths = csvHeaderPaths[csvHeaderCounter];
  propPaths.forEach((propPath, indice) => {
    if (indice === 0) {
      getValidatedObjAttributePathValue(
        csvHeader,
        csvHeaderCounter,
        cellValue,
        response,
        rowIndex,
        pathCollector,
        propPath,
        validationData
      );
    } else {
      if (propPath.value !== 'PUBLIC') {
        pathCollector[propPath.path] = propPath.value;
      }
    }
  });
}

function getDefaultAndMandatoryFields(
  dragdropList: any,
  csvHeaderPaths: any[],
  csvHeaderCounter: number,
  pathCollector: {},
  response: Response,
  rowIndex: number,
  autoGenIds
) {
  const autoField = dragdropList.find((d) => d.path === csvHeaderPaths[csvHeaderCounter]);

  if (autoField && autoField.defaultValue) {
    pathCollector[csvHeaderPaths[csvHeaderCounter]] = autoField.defaultValue;
  } else if (autoField.disabled) {
    if (autoField.disabled && autoGenDisplayFields.includes(autoField.name)) {
      const defaultGenValue = getAutoGenDefaultValue(autoField, rowIndex + 1, autoGenIds);
      pathCollector[csvHeaderPaths[csvHeaderCounter]] = defaultGenValue;
    } else response.error.push(`${autoField.displayText} is missing at row  ${rowIndex}`);
  }
}

function getUniqueCsvHeaders(fileData: any, dragdropList: any) {
  return Array.from(
    new Set(
      fileData[0].concat(
        dragdropList
          .filter((d) => autoGenFields.find((a) => d.name.includes(a)) || d.disabled)
          .map((e) => e.displayText)
      )
    )
  );
}

function getCsvHeaderPaths(csvHeader: any[], dragdropList: any, csvHeaderPaths: any[], response: Response) {
  for (let index = 0; index < csvHeader.length; index++) {
    const d = csvHeader[index];
    const CSVHeaderIndex = dragdropList.findIndex((el) => el.displayText === d);
    if (CSVHeaderIndex > -1) {
      csvHeaderPaths.push(dragdropList[CSVHeaderIndex].path);
    } else {
      response.error.push(`Column ${d} not allowed`);
    }
  }
}

function getValidatedObjAttributePathValue(
  csvHeader: any[],
  csvHeaderCounter: number,
  cellValue: any,
  response: Response,
  rowIndex: number,
  pathCollector: {},
  propPath: any,
  validationData: any
) {
  if (String(csvHeader[csvHeaderCounter]).includes('YYYY-MM-DD') && !isValidDate(cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  }
  if (String(csvHeader[csvHeaderCounter]).includes('YYYY-MM-DD') && isValidDate(cellValue)) {
    pathCollector[propPath.path] = cellValue.replace(/-/gi, '').concat('080000');
    // not biogen -> comment out below start
  } else if (invalidClassCodeData(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidCooRemark(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  }
  //for Net Weight UOM
  else if (invalidNetWeightUOM(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidGrossWeightUOM(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidCooSubstance(csvHeader, csvHeaderCounter)) {
    if (!validationData.item.country[cellValue])
      response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
    else pathCollector[propPath.path] = validationData.item.country[cellValue];
  } else if (invalidTrxStaticData(validationData, csvHeader, csvHeaderCounter, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
    // not biogen -> comment out below end
  } else if (invalidQtyAndCurrencyValue(propPath, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidTrxLineItemId(propPath, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (invalidTrxContact(propPath, validationData, cellValue)) {
    response.error.push(commonErrorMessage(cellValue, csvHeader, csvHeaderCounter, rowIndex));
  } else if (itemCooIsValidValue(csvHeader, csvHeaderCounter, validationData, cellValue)) {
    pathCollector[propPath.path] = validationData.item.country[cellValue];
  } else {
    pathCollector[propPath.path] = cellValue;
  }
}
function itemCooIsValidValue(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return csvHeader[csvHeaderCounter] === 'Country Of Origin' && validationData.item.country[cellValue];
}

function invalidTrxLineItemId(propPath: any, validationData: any, cellValue: any) {
  return (
    propPath.path.match(/GtmTransactionLine(.*?)ItemGid(.*?)Xid/) &&
    !isEmpty(validationData.transaction) &&
    validationData.transaction.items &&
    !validationData.transaction.items[validationData.domain + '.' + cellValue]
  );
}
function invalidTrxContact(propPath: any, validationData: any, cellValue: any) {
  return (
    propPath.path.match(/GtmTransaction(.*?)ContactGid(.*?)Xid/) &&
    !isEmpty(validationData.transaction) &&
    validationData.transaction.contacts &&
    !validationData.transaction.contacts[validationData.domain + '.' + cellValue]
  );
}

function invalidQtyAndCurrencyValue(propPath: any, cellValue: any) {
  return (
    propPath.path.match(/GtmTransactionLine(.*?)(Quantity|Currency)(.*?)(QuantityValue|MonetaryAmount)/) &&
    isNaN(cellValue)
  );
}

function invalidTrxStaticData(validationData: any, csvHeader: any[], csvHeaderCounter: number, cellValue: any) {
  return (
    !isEmpty(validationData.transaction) &&
    !isEmpty(validationData.transaction.other) &&
    validationData.transaction.other &&
    validationData.transaction.other[csvHeader[csvHeaderCounter]] &&
    !validationData.transaction.other[csvHeader[csvHeaderCounter]][cellValue]
  );
}

function invalidClassCodeData(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    invalidClassCode(csvHeader, csvHeaderCounter, validationData, cellValue) && !isEmpty(validationData.item.codes)
  );
}

function invalidClassCode(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return (
    isclassCodeHeader(csvHeader, csvHeaderCounter) &&
    !validationData.item.codes[csvHeader[csvHeaderCounter] + ' - ' + cellValue]
  );
}

function invalidCooSubstance(csvHeader: any[], csvHeaderCounter: number) {
  return csvHeader[csvHeaderCounter] === 'Country Of Origin Substance';
}

function commonErrorMessage(cellValue: any, csvHeader: any[], csvHeaderCounter: number, rowIndex: number): any {
  return `${cellValue} value for ${csvHeader[csvHeaderCounter]} is invalid at row  ${rowIndex + 1}`;
}

function invalidCooRemark(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return csvHeader[csvHeaderCounter] === 'Country Of Origin' && !validationData.item.country[cellValue];
}

function translateCooRemark(csvHeader: any[], csvHeaderCounter: number, validationData: any, cellValue: any) {
  return csvHeader[csvHeaderCounter] === 'Country Of Origin' && validationData.item.country[cellValue];
}

function isclassCodeHeader(csvHeader: any[], csvHeaderCounter: number) {
  return csvHeader[csvHeaderCounter].match(/[HTS|ECCN] [A-Z][A-Z]/) || csvHeader[csvHeaderCounter] === 'SCHEDULE B';
}

function isValidDate(dateString: string) {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!String(dateString).match(regEx)) return false; // Invalid format
  const d = new Date(dateString);
  const dNum = d.getTime();
  if (!dNum && dNum !== 0) return false; // NaN value, Invalid date
  return d.toISOString().slice(0, 10) === dateString;
}

function isEmpty(obj) {
  for (const x in obj) if (obj.hasOwnProperty(x)) return false;
  return true;
}
