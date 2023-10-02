import { Component } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home-view',
  templateUrl: './home-view.component.html',
  styleUrls: ['./home-view.component.css']
})
export class HomeViewComponent {
  ngOnInit() {
    document.body.className = "selector";
  }
  constructor(public afs: AuthService){}

ngOnDestroy(){
    document.body.className="";
  }
}
