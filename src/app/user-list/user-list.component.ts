import { Component } from '@angular/core';
import { UserData } from '../user-data';
import { DataFetcherService } from '../data-fetcher.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})

export class UserListComponent {
  public errorMessage: string = "";
  public statusMessage: string = "";
  public displayError: boolean = false;
  public displayStatus: boolean = false;
  public loaded = false;

  public users: UserData[] = [];

  constructor(private dfs: DataFetcherService) {


  }
}
