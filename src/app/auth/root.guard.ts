import {Injectable} from '@angular/core';
import {Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';

import { AuthService } from './auth.service';


@Injectable({
    providedIn: 'root'
})
export class rootGuard implements CanActivate {

    constructor(private router: Router, private auth_service: AuthService) {
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        if (!this.auth_service.isRoot()) {
         // you can send them to some other route like this.
         // this.router.navigate(['/login']);
            return false;
        } else {
            return true;
        }
    }
}