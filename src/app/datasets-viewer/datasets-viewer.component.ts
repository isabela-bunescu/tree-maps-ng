import { Component } from '@angular/core';
import { IndexEntry } from '../index-entry';
import { DataFetcherService } from '../data-fetcher.service';



@Component({
  selector: 'app-datasets-viewer',
  templateUrl: './datasets-viewer.component.html',
  styleUrls: ['./datasets-viewer.component.css']
})

export class DatasetsViewerComponent {
  public Index: IndexEntry[] = [];
  public loaded: boolean = false;
  public status: string = "";
  public errorMessage: string = "";
  public displayStatus: boolean = false;
  public displayError: boolean = false;

  constructor(private dfs: DataFetcherService){

  }

  ngOnInit() {
    this.reload();
  }

  public reload(){
    this.loaded = false;
    this.dfs.fetch_index().subscribe(dta => {
      this.Index = dta;
      this.loaded = true;
    });
  }

  public remove(name: string){
    this.loaded = false;
    this.dfs.remove_entry(name).subscribe({
      next: data => {
          this.status = 'Delete successful';
          this.displayStatus = true;
          this.reload();
      },
      error: error => {
          this.errorMessage = "Error while deleting: " + error.message;
          this.displayError = true;
          console.error('There was an error!', error);
          this.loaded = true;
      }
  });
  }

  downloadFile(name: string) {

  }
}
