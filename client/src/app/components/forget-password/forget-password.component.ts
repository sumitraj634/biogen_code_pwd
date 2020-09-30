import { Component, OnInit } from '@angular/core';
import { TransmissionService } from './../../services/transmission.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { validate } from 'fast-xml-parser';
import { LoginComponent } from '../login/login.component';
import { async } from '@angular/core/testing';

LoginComponent;
@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrls: ['./forget-password.component.scss'],
})
export class ForgetPasswordComponent implements OnInit {
  public transNo;
  passNotMatched = false;
  changePasswordForm: FormGroup;

  constructor(public transmissionService: TransmissionService, private formBuilder: FormBuilder) {}

  get formControls() {
    return this.changePasswordForm.controls;
  }
  ngOnInit() {
    this.changePasswordForm = this.formBuilder.group({
      newPassword: [
        '',
        Validators.compose([
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=[^A-Z]*[A-Z])(?=[^a-z]*[a-z])(?=\D*\d).{8,}$/),
        ]),
      ],
      confirmPassword: ['', Validators.required],
    });
  }

  async updatePassword() {
    if (this.changePasswordForm.status == 'INVALID') {
      alert('Invalid request');
      return;
    }
    (document.getElementById('button') as HTMLButtonElement).disabled = true;
    let currentPwd = this.changePasswordForm.value.newPassword;
    let retypePwd = this.changePasswordForm.value.confirmPassword;
    if (!currentPwd) {
      alert('Please provide all the correct details');
      (document.getElementById('button') as HTMLButtonElement).disabled = false;
      return;
    } else if (!retypePwd) {
      alert('Please provide all the correct details');
      (document.getElementById('button') as HTMLButtonElement).disabled = false;
      return;
    }

    let JSONdata = {
      current: currentPwd,
    };

    const { data: response } = (await this.transmissionService.sendTransmissionPwd(JSONdata)) as any;

    let JSONdata1 = {
      TranmissionNumber: response.ReferenceTransmissionNo,
    };
    this.transNo = JSONdata1;
    let data2 = await this.getTransmissionStatus(JSONdata1);

    let data3: any;
    if (data2 == 'FRESH') {
      alert('Processing ! Please click refresh button');
      (document.getElementById('a') as HTMLButtonElement).style.visibility = 'visible';
      return;
    }
    this.getStaus(data2);

    // if (!data2) {
    //   alert('Bad Request');
    //   (document.getElementById('button') as HTMLButtonElement).disabled = false;
    // }
    // //console.log(JSON.stringify(data2.ReferenceTransmissionStatus));
    // const resStat = JSON.stringify(data2.ReferenceTransmissionStatus);
    // if (resStat.includes('ERROR')) {
    //   alert('Something Failed !! Check with ADMIN');
    //   (document.getElementById('button') as HTMLButtonElement).disabled = false;
    // } else if (resStat.includes('FRESH') || resStat.includes('STAGED')) {
    //   alert('Processing ! ');
    // }
    // //else if (Statusresponse == 'PROCESSED') {
    // else if (resStat.includes('PROCESSED')) {
    //   alert('Password Changed Succesfully! Please Sign in again');
    //   setTimeout(function () {
    //     localStorage.removeItem('token');
    //     window.location.href = '/';
    //   }, 1000);
    // }
    // if (data2 == 'ERROR') {
    //   alert('Something Failed !! Check with ADMIN');
    //   (document.getElementById('button') as HTMLButtonElement).disabled = false;
    // } else if (data2 === 'FRESH') {
    //   alert('Processing ! ');
    // }
    // //else if (Statusresponse == 'PROCESSED') {
    // else if (data2 == 'PROCESSED') {
    //   alert('Password Changed Succesfully! Please Sign in again');
    //   setTimeout(function () {
    //     localStorage.removeItem('token');
    //     window.location.href = '/';
    //   }, 1000);
    // }
  }
  async getTransmissionStatus(JSONdata1) {
    const { data: data2 } = (await this.transmissionService.getPwdStatus(JSONdata1)) as any;
    const resStat = JSON.stringify(data2.ReferenceTransmissionStatus);
    if (resStat.includes('FRESH') || resStat.includes('STAGED')) {
      return 'FRESH';
    } else if (resStat.includes('PROCESSED')) {
      return 'PROCESSED';
    } else if (resStat.includes('ERROR')) {
      return 'ERROR';
    }
  }
  getStaus(data2) {
    if (data2 == 'ERROR') {
      alert('Something Failed');
      (document.getElementById('a') as HTMLButtonElement).style.visibility = 'hidden';
      (document.getElementById('button') as HTMLButtonElement).disabled = false;
    } else if (data2 == 'PROCESSED') {
      alert('Password Changed Succesfully! Please Sign in again');
      setTimeout(function () {
        localStorage.removeItem('token');
        window.location.href = '/';
      }, 1000);
    }
  }
  async getfreshStatuss() {
    (document.getElementById('a') as HTMLButtonElement).style.visibility = 'hidden';
    const data3 = await this.getTransmissionStatus(this.transNo);
    if (data3 != 'FRESH') {
      this.getStaus(data3);
    } else {
      alert('Try Again');
      (document.getElementById('a') as HTMLButtonElement).style.visibility = 'visible';
      return;
    }
  }

  matchPassword() {
    if (this.changePasswordForm.value.confirmPassword) {
      if (this.changePasswordForm.value.newPassword != this.changePasswordForm.value.confirmPassword) {
        (document.getElementById('button') as HTMLButtonElement).disabled = true;
        this.passNotMatched = true;
      } else {
        (document.getElementById('button') as HTMLButtonElement).disabled = false;
        this.passNotMatched = false;
      }
    }
  }
}
