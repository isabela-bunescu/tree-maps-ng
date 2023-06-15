import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetsViewerComponent } from './datasets-viewer.component';

describe('DatasetsViewerComponent', () => {
  let component: DatasetsViewerComponent;
  let fixture: ComponentFixture<DatasetsViewerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DatasetsViewerComponent]
    });
    fixture = TestBed.createComponent(DatasetsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
