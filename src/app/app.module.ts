import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AgChartsAngularModule } from 'ag-charts-angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TreeMapViewComponent } from './tree-map-view/tree-map-view.component';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { TreeMapViewAmchartsComponent } from './tree-map-view-amcharts/tree-map-view-amcharts.component';

@NgModule({
  declarations: [
    AppComponent,
    TreeMapViewComponent,
    TreeMapViewAmchartsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AgChartsAngularModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
