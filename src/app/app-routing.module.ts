import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TreeMapViewComponent } from './tree-map-view/tree-map-view.component';
import { TreeMapViewAmchartsComponent } from './tree-map-view-amcharts/tree-map-view-amcharts.component';
import { TreeMapViewD3Component } from './tree-map-view-d3/tree-map-view-d3.component';
import { DatasetsViewerComponent } from './datasets-viewer/datasets-viewer.component';
import { HomeViewComponent } from './home-view/home-view.component';
import { EditComponent } from './edit/edit.component';
const routes: Routes = [
  {path: 'tree-map-view', component: TreeMapViewComponent},
  {path: 'tree-map-view-amcharts', component: TreeMapViewAmchartsComponent},
  {path: 'tree-map-view-d3', component: TreeMapViewD3Component},
  {path: 'datasets-viewer', component: DatasetsViewerComponent},
  {path: '', component: HomeViewComponent},
  {path: 'edit-treemap/:id', component: EditComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
