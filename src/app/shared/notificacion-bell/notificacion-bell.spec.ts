import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificacionBell } from './notificacion-bell';

describe('NotificacionBell', () => {
  let component: NotificacionBell;
  let fixture: ComponentFixture<NotificacionBell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificacionBell],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificacionBell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
