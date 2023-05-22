import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeMapViewAmchartsComponent } from './tree-map-view-amcharts.component';

describe('TreeMapViewAmchartsComponent', () => {
  let component: TreeMapViewAmchartsComponent;
  let fixture: ComponentFixture<TreeMapViewAmchartsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TreeMapViewAmchartsComponent]
    });
    fixture = TestBed.createComponent(TreeMapViewAmchartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
