export interface WebWorkerInput {
  fileData: any[];
  dragdropList: any[];
  containLines: boolean;
  parentGidIdentifierPathString: string;
  lineIdentifierPathString: string;
  validationData?: any;
}

export type ViewUrl = (viewURL: string, csvRowIndex: number, statusInitial: string, no?: string) => string;

export interface WebWorkerInputService {
  currentInstanceOf: string;
  CSVfile: File;
  loader: { i: boolean; d: boolean };
  errors: { csv: any[]; server: string };
  xmlArray: any[];
  csvHeader: any[];
  csvHeaderAll: any[];
  csvRow: any[];
  csvRowAll: any[];
  uploadProgress: number;
  dragdropListTc: any[];
  dragdropList: any[];
  itemIdIndex: any;
  getViewUrl: ViewUrl;
  statusCount: {
    p: number;
    e: number;
    s: number;
    f: number;
  };
  showStatus: boolean;
  statusRequest: {
    transmission: any[];
    reProcess: boolean;
    xids: any[];
    considerXid?: boolean;
  };
}

export interface WebWorkerInputProps {
  dragdropList: any[];
  containLines: boolean;
  parentGidIdentifierPathString: string;
  lineIdentifierPathString: string;
  validationData?: any;
}
