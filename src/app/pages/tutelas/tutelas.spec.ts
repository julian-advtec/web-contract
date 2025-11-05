import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tutelas } from './tutelas';

describe('Tutelas', () => {
  let component: Tutelas;
  let fixture: ComponentFixture<Tutelas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tutelas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tutelas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
