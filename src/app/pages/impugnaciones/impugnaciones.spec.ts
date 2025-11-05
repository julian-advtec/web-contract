import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Impugnaciones } from './impugnaciones';

describe('Impugnaciones', () => {
  let component: Impugnaciones;
  let fixture: ComponentFixture<Impugnaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Impugnaciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Impugnaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
