import { AuthService } from './auth/auth.service';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AgChartsAngularModule } from 'ag-charts-angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TreeMapViewComponent } from './tree-map-view/tree-map-view.component';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { TreeMapViewAmchartsComponent } from './tree-map-view-amcharts/tree-map-view-amcharts.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TreeMapViewD3Component } from './tree-map-view-d3/tree-map-view-d3.component';
import { DatasetsViewerComponent } from './datasets-viewer/datasets-viewer.component';
import { HomeViewComponent } from './home-view/home-view.component';
import { AlertModule } from '@coreui/angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Text } from '@visx/text';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { EditComponent } from './edit/edit.component';
import { LoginPageComponent } from './login-page/login-page.component';
import { UserListComponent } from './user-list/user-list.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatIconModule} from '@angular/material/icon';
import { TreeMapViewDualComponent } from './tree-map-view-dual/tree-map-view-dual.component';

@NgModule({
  declarations: [
    AppComponent,
    TreeMapViewComponent,
    TreeMapViewAmchartsComponent,
    TreeMapViewD3Component,
    DatasetsViewerComponent,
    HomeViewComponent,
    EditComponent,
    LoginPageComponent,
    UserListComponent,
    TreeMapViewDualComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AgChartsAngularModule,
    HttpClientModule,
    FormsModule,
    AlertModule,
    BrowserAnimationsModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    NgbModule,
    ReactiveFormsModule,
    MatSidenavModule,
    MatIconModule,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
