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

@NgModule({
  declarations: [
    AppComponent,
    TreeMapViewComponent,
    TreeMapViewAmchartsComponent,
    TreeMapViewD3Component
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AgChartsAngularModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
