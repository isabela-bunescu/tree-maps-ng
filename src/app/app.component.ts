import { Component } from '@angular/core';
import { DataFetcherService } from './data-fetcher.service';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'tree-maps-ng';

  constructor(public dfs: DataFetcherService, private afs: AuthService){
    
  }

  public canEdit(){
    return this.afs.canEdit();
  }
  public isAuthentificated(){
    return this.afs.isAuthenticated();
  }
  public isRoot(){
    return this.afs.isRoot();
  }
  public logout(){
    this.dfs.logout();
    this.afs.logout()
  }
}
