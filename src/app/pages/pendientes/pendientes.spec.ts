import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pendientes } from './pendientes';

describe('Pendientes', () => {
  let component: Pendientes;
  let fixture: ComponentFixture<Pendientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pendientes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pendientes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
