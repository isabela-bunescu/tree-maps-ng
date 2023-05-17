import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeMapViewComponent } from './tree-map-view.component';

describe('TreeMapViewComponent', () => {
  let component: TreeMapViewComponent;
  let fixture: ComponentFixture<TreeMapViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TreeMapViewComponent]
    });
    fixture = TestBed.createComponent(TreeMapViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
