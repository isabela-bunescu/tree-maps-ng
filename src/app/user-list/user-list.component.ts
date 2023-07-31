import { Component } from '@angular/core';
import { UserData } from '../user-data';
import { DataFetcherService } from '../data-fetcher.service';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { keyProperty } from 'ag-charts-community/dist/cjs/es5/module-support';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css'],
})
export class UserListComponent {
  public errorMessage: string = '';
  public errorMessageForm: string = '';
  public statusMessage: string = '';
  public displayError: boolean = false;
  public displayErrorForm: boolean = false;
  public displayStatus: boolean = false;
  public loaded = false;

  public userForm = new FormGroup({
    key: new FormControl(''),
    name: new FormControl(''),
    root: new FormControl(false),
    edit: new FormControl(false),
  });

  public users: UserData[] = [];

  constructor(
    private dfs: DataFetcherService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder
  ) {
   this.load_users();
  }

  private load_users(){
    this.loaded = false;
    this.dfs.fetch_users().subscribe({
      next: (data) => {
        this.users = data;
        this.loaded = true;
      },
      error: (error) => {
        this.errorMessage = error;
        this.displayError = true;
      },
    });
  }
  public onSubmit(data) {
    this.dfs
      .create_user({
        key: data?.key,
        name: data?.name,
        root: data?.root,
        edit: data?.edit,
      } as UserData)
      .subscribe({
        next: (data) => {
          if(data.success){
            this.statusMessage = data.message;
            this.displayStatus = true;
            this.modalService.dismissAll();
            this.load_users();
            this.userForm.reset();
          }
          else{
            this.errorMessageForm = "Data cannot be saved: "+data.message;
            this.displayErrorForm = true;
          }
        },
        error: (error) => {
          this.errorMessageForm = "Error occured: "+error.message;
          this.displayErrorForm = true;
        },
      });
  }

  public open(content) {
    this.displayErrorForm = false;
    this.errorMessageForm = "";
    this.modalService
      .open(content, { ariaLabelledBy: 'modal-basic-title' })
      .result.then(
        (result) => {},
        (reason) => {}
      );
  }

  public remove(key: string) {
    this.dfs.remove_user(key).subscribe({
      next: (data) => {
          this.statusMessage = "User deleted";
          this.displayStatus = true;
          this.load_users();
      },
      error: (error) => {
        this.errorMessage= "Error occured: "+error.message;
        this.displayError = true;
        this.load_users();
      },
    })
  }
}
