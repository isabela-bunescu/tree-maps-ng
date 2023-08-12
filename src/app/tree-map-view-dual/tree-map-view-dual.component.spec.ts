import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeMapViewDualComponent } from './tree-map-view-dual.component';

describe('TreeMapViewDualComponent', () => {
  let component: TreeMapViewDualComponent;
  let fixture: ComponentFixture<TreeMapViewDualComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TreeMapViewDualComponent]
    });
    fixture = TestBed.createComponent(TreeMapViewDualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
