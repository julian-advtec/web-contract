import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DerechosPeticion } from './derechos-peticion';

describe('DerechosPeticion', () => {
  let component: DerechosPeticion;
  let fixture: ComponentFixture<DerechosPeticion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DerechosPeticion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DerechosPeticion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
