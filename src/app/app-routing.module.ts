import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TreeMapViewComponent } from './tree-map-view/tree-map-view.component';
import { TreeMapViewAmchartsComponent } from './tree-map-view-amcharts/tree-map-view-amcharts.component';

const routes: Routes = [
  {path: 'tree-map-view', component: TreeMapViewComponent},
  {path: 'tree-map-view-amcharts', component: TreeMapViewAmchartsComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
