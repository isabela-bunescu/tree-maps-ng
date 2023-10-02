import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DataFetcherService } from '../data-fetcher.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
  isLoggedIn = false;
  rootUser = false;
  editUser = false; 
  name: string = "";

  constructor( private router: Router, private dfs: DataFetcherService) { 
    this.dfs.check_login().subscribe({
        next: (data) => {
          if (data.success) {
            this.name=data.name;
            this.isLoggedIn=true;
            this.rootUser = data.root;
            this.editUser = data.edit;
          } 
        },
        error: (error) => {
          console.log(error.message);
        },
      });
  }

  public isAuth(){
    return this.isLoggedIn;
  }

  public isRoot(){
    return this.rootUser; 
  }

  public canEdit(){
    return this.editUser;
  }

  public getName(){
    return this.name;
  }

  public login(root: boolean, edit: boolean, name: string){
    console.log("login", root, edit)
    this.isLoggedIn = true;
    this.rootUser = root;
    this.editUser = edit;
    this.name = name;
    this.router.navigate(['/'])
  }

  public logout(){
    this.router.navigate(['/'])
    this.isLoggedIn = false;
    this.rootUser = false;
    this.editUser = false;
  }
}