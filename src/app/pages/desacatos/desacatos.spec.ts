import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Desacatos } from './desacatos';

describe('Desacatos', () => {
  let component: Desacatos;
  let fixture: ComponentFixture<Desacatos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Desacatos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Desacatos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
