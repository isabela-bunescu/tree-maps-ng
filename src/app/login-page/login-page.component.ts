import { Component, Host, Optional, SkipSelf } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { DataFetcherService } from '../data-fetcher.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
})
export class LoginPageComponent {

  public errorMessage:string = "";
  public displayError:boolean = false;

  public statusMessage:string = "";
  public displayStatus:boolean = false;

  public userForm = new FormGroup({
    key: new FormControl(''),
    name: new FormControl(''),
    root: new FormControl(false),
    edit: new FormControl(false),
  });

  public constructor(public dfs: DataFetcherService, private afs: AuthService){

  }

  public onSubmit(data) {
    this.dfs.logout();
    this.dfs.login(data?.key).subscribe({
      next: (data) => {
        if(data.success){
          console.log('Login succeded');
          this.afs.login(data.root, data.edit);
        }
        else{
          console.log('Login failed');
          this.errorMessage = data.message;
          this.displayError = true;
        }
      },
      error: (error) => {
        console.log(error);
        this.errorMessage = error.error;
        this.displayError = true;
      },
    });

  }
}
