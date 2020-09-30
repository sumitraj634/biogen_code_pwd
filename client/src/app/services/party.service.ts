import { TransmissionService } from './transmission.service';
import { Injectable } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { WebWorkerInputProps, WebWorkerInputService, ViewUrl } from '../model/WebWorkerInput';

@Injectable({
  providedIn: 'root',
})
export class PartyService implements WebWorkerInputService {
  public currentInstanceOf = 'PartyService';
  public dragdropList = [];
  public dragdropListTc = [];
  public ElementList = [];
  public csvHeader = [];
  public csvHeaderAll = [];
  public csvRow = [];
  public csvRowAll = [];
  public xmlArray = [];
  public loader = { i: false, d: false };
  public errors = { csv: [], server: '' };
  public uploadProgress = 0;
  public CSVfile: File;
  public partyIdIndex;
  public partyIdDomain;
  public itemIdIndex;
  public itemIdDomain;
  public statusRequest = { transmission: [], reProcess: true, xids: [] };
  public statusCount = { p: 0, e: 0, s: 0, f: 0 };
  public showStatus = false;

  constructor(public transmissionService: TransmissionService) {}

  async drop(event: CdkDragDrop<string[]>) {
    if (this.selfDragDrop(event)) return;
    this.loader.i = true;
    const { item1, item2 } = this.swap(event);
    moveItemInArray(this.dragdropList, event.previousIndex, event.currentIndex);
    await this.transmissionService.swapPartys([item1, item2]);
    location.reload();
    this.loader.i = false;
  }
  private selfDragDrop(event: CdkDragDrop<string[], string[]>) {
    return this.dragdropList[event.currentIndex]._id === this.dragdropList[event.previousIndex]._id;
  }

  private swap(event: CdkDragDrop<string[], string[]>) {
    const item1 = { ...this.dragdropList[event.previousIndex], _id: this.dragdropList[event.currentIndex]._id };
    const item2 = { ...this.dragdropList[event.currentIndex], _id: this.dragdropList[event.previousIndex]._id };
    return { item1, item2 };
  }

  async valueChange(element) {
    if (element.required) {
      this.dragdropList = this.ElementList.filter((party) => party.required === true);
    } else this.dragdropList = this.dragdropList.filter((party) => party.name !== element.name);
    return await this.transmissionService.updateParty(element);
  }

  async onUpload(InputFileEvent) {
    this.itemIdIndex = this.dragdropListTc.findIndex(
      (d) => String(d.path[0]).includes('ContactGid') && String(d.path[0]).includes('Xid')
    );
    this.itemIdDomain = this.dragdropListTc.findIndex(
      (d) => String(d.path[0]).includes('ContactGid') && String(d.path[0]).includes('DomainName')
    );
    const webWorkerProps: WebWorkerInputProps = {
      dragdropList: this.dragdropListTc,
      containLines: false,
      parentGidIdentifierPathString: '',
      lineIdentifierPathString: '',
    };
    await this.transmissionService.onUpload(InputFileEvent, webWorkerProps, this);
  }

  public async onRefreshStatus() {
    await this.transmissionService.onRefreshStatus(this);
  }

  public async sendDataToGtm() {
    await this.transmissionService.sendDataToGtm(this, 'ContactGid');
  }

  getViewUrl: ViewUrl = (viewURL, csvRowIndex, statusInitial) => {
    if (statusInitial !== 'P') return (viewURL = '');
    let isIdAutoGen = false;
    let partyIDIndex = this.csvHeader.findIndex((d) => d === this.dragdropListTc[this.itemIdIndex].displayText.toUpperCase());
    let partyDomainIndex = this.csvHeader.findIndex((d) => d === this.dragdropListTc[this.itemIdDomain].displayText);

    if (partyIDIndex === -1) {
      partyIDIndex = this.csvHeaderAll[csvRowIndex].findIndex(
        (d) => d === this.dragdropListTc[this.itemIdIndex].path[0]
      );
      partyDomainIndex = this.csvHeaderAll[csvRowIndex].findIndex(
        (d) => d === this.dragdropListTc[this.itemIdDomain].path[0]
      );

      if (partyIDIndex === -1) return (viewURL = '');
      else isIdAutoGen = true;
    }

    return viewURL
      .replace('GTM_OTM_OBJECT', 'GtmContact')
      .replace('GTM_OTM_MANAGER_LAYOUT_GID', 'GTM_CONTACT_VIEW')
      .replace('GTM_OTM_FINDER_SET', 'BIIB.GTM_MSRR_CONTACT')
      .replace(
        'GTM_OTM_OBJECT_GID',
        this.transmissionService.getViewLink(
          csvRowIndex,
          partyDomainIndex,
          partyIDIndex,
          isIdAutoGen ? this.csvRowAll : this.csvRow
        )
      );
  };

  getInitialState(params: { table: boolean }) {
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
  }
}
