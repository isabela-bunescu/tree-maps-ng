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
/**
 * Creates an instance of the MyClass class.
 *
 * @param dfs - An instance of the DataFetcherService used for fetching data.
 * @param afs - An instance of the AuthService used for authentication operations.
 */
constructor(public dfs: DataFetcherService, private afs: AuthService) {

}

/**
 * Checks if the current user has permission to edit data.
 *
 * @returns True if the user can edit, false otherwise.
 */
public canEdit(): boolean {
  return this.afs.canEdit();
}

/**
 * Checks if the user is authenticated.
 *
 * @returns True if the user is authenticated, false otherwise.
 */
public isAuthenticated(): boolean {
  return this.afs.isAuth();
}

/**
 * Checks if the user has root access.
 *
 * @returns True if the user has root access, false otherwise.
 */
public isRoot(): boolean {
  return this.afs.isRoot();
}

/**
 * Logs out the user by calling the logout methods of both the DataFetcherService and AuthService.
 */
public logout(): void {
  this.dfs.logout();
  this.afs.logout();
}
}
