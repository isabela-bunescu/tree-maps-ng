import { NgModule } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { RouterModule, Routes } from '@angular/router';
import { TreeMapViewComponent } from './tree-map-view/tree-map-view.component';
import { TreeMapViewAmchartsComponent } from './tree-map-view-amcharts/tree-map-view-amcharts.component';
import { TreeMapViewD3Component } from './tree-map-view-d3/tree-map-view-d3.component';
import { DatasetsViewerComponent } from './datasets-viewer/datasets-viewer.component';
import { HomeViewComponent } from './home-view/home-view.component';
import { EditComponent } from './edit/edit.component';
import { LoginPageComponent } from './login-page/login-page.component';
import { UserListComponent } from './user-list/user-list.component';
import { TreeMapViewDualComponent } from './tree-map-view-dual/tree-map-view-dual.component';
import { AuthGuard } from './auth/auth.guard';
import { editGuard } from './auth/edit.guard';
import { rootGuard } from './auth/root.guard';

const routes: Routes = [
  {path: 'tree-map-view', component: TreeMapViewComponent, canActivate:[AuthGuard]},
  {path: 'tree-map-view-amcharts', component: TreeMapViewAmchartsComponent, canActivate:[AuthGuard]},
  {path: 'tree-map-view-d3', component: TreeMapViewD3Component, canActivate:[AuthGuard]},
  {path: 'tree-map-view-dual', component: TreeMapViewDualComponent, canActivate:[AuthGuard]},
  {path: 'datasets-viewer', component: DatasetsViewerComponent, canActivate:[AuthGuard]},
  {path: '', component: HomeViewComponent},
  {path: 'edit-treemap/:id', component: EditComponent, canActivate:[AuthGuard, editGuard]},
  {path: 'login', component: LoginPageComponent},
  {path: 'user-list', component: UserListComponent, canActivate:[AuthGuard,rootGuard]},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
