import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreeMapViewD3Component } from './tree-map-view-d3.component';

describe('TreeMapViewD3Component', () => {
  let component: TreeMapViewD3Component;
  let fixture: ComponentFixture<TreeMapViewD3Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TreeMapViewD3Component]
    });
    fixture = TestBed.createComponent(TreeMapViewD3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
