import { Component, ElementRef, ViewChild } from '@angular/core';
import { IndexEntry } from '../index-entry';
import { DataFetcherService } from '../data-fetcher.service';
import { Router } from '@angular/router';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-datasets-viewer',
  templateUrl: './datasets-viewer.component.html',
  styleUrls: ['./datasets-viewer.component.css'],
})
export class DatasetsViewerComponent {
  public Index: IndexEntry[] = [];
  public loaded: boolean = false;
  public status: string = '';
  public errorMessage: string = '';
  public displayStatus: boolean = false;
  public displayError: boolean = false;
  public file_content: any = null;
  // modal for adding a new dataset

  public errorMessageForm: string = '';
  public displayErrorForm: boolean = false;
  public userForm = new FormGroup({
    name: new FormControl(''),
    display_name: new FormControl(''),
    description: new FormControl(''),
    json: new FormControl(''),
  });

  constructor(
    private dfs: DataFetcherService,
    private router: Router,
    private modalService: NgbModal,
    private formBuilder: FormBuilder
  ) {}

  @ViewChild('content') modalRef: ElementRef | undefined;

  ngOnInit() {
    this.reload();
  }

  public reload() {
    this.loaded = false;
    this.dfs.fetch_index().subscribe((dta) => {
      this.Index = dta;
      this.loaded = true;
    });
  }

  public remove(name: string) {
    this.loaded = false;
    this.dfs.remove_entry(name).subscribe({
      next: (data) => {
        this.status = 'Delete successful';
        this.displayStatus = true;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = 'Error while deleting: ' + error.message;
        this.displayError = true;
        console.error('There was an error!', error);
        this.loaded = true;
      },
    });
  }

  parseFile(event: any) {
    if (event.target.files.length > 0) {
      let fileReader = new FileReader();
      fileReader.onload = (e) => {
        this.file_content = JSON.parse(JSON.stringify(fileReader.result));
      };
      fileReader.readAsText(event.target.files[0]);
    }
    if (event.target.files.length > 1) {
      this.errorMessageForm = 'Only 1 file allowed';
      this.displayErrorForm = true;
    }
  }
  downloadFile(name: string) {
    window.open(this.dfs.base_url + 'data/json/' + name, '_blank');
  }
  editEntry(name: string) {
    let id = name;
    this.router.navigate(['edit-treemap', id]);
  }

  public onSubmit(data) {
    console.log(data);
    let name = data.name;
    let display_name = data.display_name;
    let description = data.description;
    this.dfs
      .post_index({
        name: name,
        display_name: display_name,
        description: description,
      } as IndexEntry)
      .subscribe({
        next: (data) => {
          if (data.success) {
            this.dfs.put_data(name, this.file_content).subscribe({
              next: (data) => {
                if (data.success) {
                  console.log('Uploaded JSON for', name);
                  this.status = 'Upload successful';
                  this.displayStatus = true;
                  this.modalService.dismissAll();
                  this.reload();
                }
                else{
                  this.errorMessageForm =
                  'Error while uploading JSON: ' + JSON.stringify(data.message);
                this.displayErrorForm = true;
                }
              },
              error: (error) => {
                //this.errorMessage = error.message;
                this.errorMessageForm =
                  'Error while uploading JSON: ' + JSON.stringify(error);
                this.displayErrorForm = true;
                console.error('There was an error!', error);
              },
            });
          }
          else{
            this.errorMessageForm =
            'Error while uploading index: ' + data.message;
          this.displayErrorForm = true;
          console.error('There was an error! '+data.message);
          }
        },
        error: (error) => {
          //this.errorMessage = error.message;
          this.errorMessageForm =
            'Error while uploading index: ' + JSON.stringify(error);
          this.displayErrorForm = true;
          console.error('There was an error!', error);
        },
      });
  }

  public open(content) {
    this.displayErrorForm = false;
    this.errorMessageForm = '';
    this.modalService
      .open(content, { ariaLabelledBy: 'modal-basic-title' })
      .result.then(
        (result) => {},
        (reason) => {}
      );
  }
}
