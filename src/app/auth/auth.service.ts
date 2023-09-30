import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
  isLoggedIn = false;
  rootUser = false;
  editUser = false;

  constructor() { console.log('PDASDDDDDDDD') }

  isAuthenticated(){
    return this.isLoggedIn;
  }
  public isRoot(){
    return this.isRoot; 
  }
  public canEdit(){
    return this.editUser;
  }

  public login(root: boolean, edit: boolean){
    this.isLoggedIn = true;
    this.rootUser = root;
    this.editUser = edit;
  }

  public logout(){
    this.isLoggedIn=false;
    this.rootUser = false;
    this.editUser = false;
  }
}