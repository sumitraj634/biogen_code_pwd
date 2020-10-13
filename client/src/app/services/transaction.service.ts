import { TransmissionService } from './transmission.service';
import { Injectable } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { WebWorkerInputProps, ViewUrl, WebWorkerInputService } from 'src/app/model/WebWorkerInput';

@Injectable({
  providedIn: 'root',
})
export class TransactionService implements WebWorkerInputService {
  public currentInstanceOf = 'TransactionService';
  public dragdropList = [];
  public dragdropListTc = [];
  public ElementList = [];
  public releasedragdropList = [];
  public releaseElementList = [];
  public linedragdropList = [];
  public lineElementList = [];
  public csvHeader = [];
  public csvHeaderAll = [];
  public csvRow = [];
  public csvRowAll = [];
  public xmlArray = [];
  public loader = { i: false, d: false };
  public errors = { csv: [], server: '' };
  public uploadProgress = 0;
  public CSVfile: File;
  public itemIdIndex;
  public itemIdDomain;
  public statusRequest = { transmission: [], reProcess: true, xids: [] };
  public showStatus = false;
  public statusCount = { p: 0, e: 0, s: 0, f: 0 };

  constructor(public transmissionService: TransmissionService) {}

  async linedrop(event: CdkDragDrop<string[]>) {
    if (this.selfDragDrop(event)) return;
    this.loader.i = true;
    const { item1, item2 } = this.swapLine(event);
    moveItemInArray(this.linedragdropList, event.previousIndex, event.currentIndex);
    this.dragdropList = [...this.releasedragdropList, ...this.linedragdropList];
    await this.transmissionService.swapTrxs([item1, item2]);
    location.reload();
    this.loader.i = false;
  }
  async releasedrop(event: CdkDragDrop<string[]>) {
    if (this.selfDragDrop(event)) return;
    if ((this.loader.i = true)) {
      location.reload();
    }
    const { item1, item2 } = this.swap(event);
    moveItemInArray(this.releasedragdropList, event.previousIndex, event.currentIndex);
    this.dragdropList = [...this.releasedragdropList, ...this.linedragdropList];
    await this.transmissionService.swapTrxs([item1, item2]);

    this.loader.i = false;
  }

  private selfDragDrop(event: CdkDragDrop<string[], string[]>) {
    return this.dragdropList[event.currentIndex]._id === this.dragdropList[event.previousIndex]._id;
  }

  private swap(event: CdkDragDrop<string[], string[]>) {
    const item1 = {
      ...this.releasedragdropList[event.previousIndex],
      _id: this.releasedragdropList[event.currentIndex]._id,
    };
    const item2 = {
      ...this.releasedragdropList[event.currentIndex],
      _id: this.releasedragdropList[event.previousIndex]._id,
    };
    return { item1, item2 };
  }
  private swapLine(event: CdkDragDrop<string[], string[]>) {
    const item1 = { ...this.linedragdropList[event.previousIndex], _id: this.linedragdropList[event.currentIndex]._id };
    const item2 = { ...this.linedragdropList[event.currentIndex], _id: this.linedragdropList[event.previousIndex]._id };
    return { item1, item2 };
  }

  public async releaseValueChange(element) {
    if (element.required) {
      this.releasedragdropList = this.releaseElementList.filter((item) => item.required === true);
    } else this.releasedragdropList = this.releasedragdropList.filter((item) => item.name !== element.name);
    this.dragdropList = [...this.releasedragdropList, ...this.linedragdropList];
    return await this.transmissionService.updateTransaction(element);
  }
  public async lineValueChange(element) {
    if (element.required) {
      this.linedragdropList = this.lineElementList.filter((item) => item.required === true);
    } else this.linedragdropList = this.linedragdropList.filter((item) => item.name !== element.name);
    this.dragdropList = [...this.releasedragdropList, ...this.linedragdropList];
    return await this.transmissionService.updateTransaction(element);
  }

  async onUpload(InputFileEvent) {
    this.itemIdIndex = this.dragdropListTc.findIndex(
      (d) => String(d.path[0]).includes('GtmTransactionGid') && String(d.path[0]).includes('Xid')
    );
    this.itemIdDomain = this.dragdropListTc.findIndex(
      (d) => String(d.path[0]).includes('GtmTransactionGid') && String(d.path[0]).includes('DomainName')
    );

    const webWorkerProps: WebWorkerInputProps = {
      dragdropList: this.dragdropListTc,
      containLines: true,
      parentGidIdentifierPathString: 'GtmTransactionGid',
      lineIdentifierPathString: 'GtmTransactionLine',
    };
    await this.transmissionService.onUpload(InputFileEvent, webWorkerProps, this);
  }

  public async onRefreshStatus() {
    await this.transmissionService.onRefreshStatus(this);
  }

  public async sendDataToGtm() {
    await this.transmissionService.sendDataToGtm(this, 'GtmTransactionGid');
  }
  getViewUrl: ViewUrl = (viewURL, csvRowIndex, statusInitial) => {
    if (statusInitial !== 'P') return (viewURL = '');
    let isIdAutoGen = false;
    let itemIDIndex = this.csvHeader.findIndex(
      (d) => d === this.dragdropListTc[this.itemIdIndex].displayText.toUpperCase()
    );
    let itemDomainIndex = this.csvHeader.findIndex((d) => d === this.dragdropListTc[this.itemIdDomain].displayText);

    if (itemIDIndex === -1) {
      itemIDIndex = this.csvHeaderAll[csvRowIndex].findIndex(
        (d) => d === this.dragdropListTc[this.itemIdIndex].path[0]
      );
      itemDomainIndex = this.csvHeaderAll[csvRowIndex].findIndex(
        (d) => d === this.dragdropListTc[this.itemIdDomain].path[0]
      );

      if (itemIDIndex === -1) return (viewURL = '');
      else isIdAutoGen = true;
    }

    return viewURL
      .replace('GTM_OTM_OBJECT', 'GtmTransaction')
      .replace('GTM_OTM_MANAGER_LAYOUT_GID', 'GTM_TRANSACTION_VIEW')
      .replace('GTM_OTM_FINDER_SET', 'GTM_TRANSACTION')
      .replace(
        'GTM_OTM_OBJECT_GID',
        this.transmissionService.getViewLink(
          csvRowIndex,
          itemDomainIndex,
          itemIDIndex,
          isIdAutoGen ? this.csvRowAll : this.csvRow
        )
      );
  };

  getInitialState = (params: { table: boolean }) => {
    if (params.table) {
      this.csvHeader.length = 0;
      this.csvRow.length = 0;
      this.showStatus = false;
      this.statusCount = { p: 0, e: 0, s: 0, f: 0 };
    }
    this.xmlArray.length = 0;
    this.uploadProgress = 0;
    this.errors.csv.length = 0;
    this.errors.server = '';
  };
}
