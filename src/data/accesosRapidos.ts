import type { Ionicons } from '@expo/vector-icons';
import type { AppRole } from '../types/roles';

export interface PerfilAccesoRapido {
  id: AppRole;
  nombre: string;
  correo: string;
  password: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap | 'room-service-outline';
}

export const PERFILES_ACCESO_RAPIDO: PerfilAccesoRapido[] = [
  {
    id: 'dueño',
    nombre: 'Dueño',
    correo: 'dueno@bar.com',
    password: 'dueño123',
    descripcion: 'dueno@bar.com',
    icono: 'business-outline',
  },
  {
    id: 'supervisor',
    nombre: 'Supervisor',
    correo: 'supervisor@mail.com',
    password: 'Supervisor123',
    descripcion: 'supervisor@mail.com',
    icono: 'briefcase-outline',
  },
  {
    id: 'metre',
    nombre: 'Metre',
    correo: 'metre@mail.com',
    password: 'Metre1234',
    descripcion: 'metre@mail.com',
    icono: 'grid-outline',
  },
  {
    id: 'mozo',
    nombre: 'Mozo',
    correo: 'mozo@mail.com',
    password: 'Mozo1234',
    descripcion: 'mozo@mail.com',
    icono: 'room-service-outline',
  },
  {
    id: 'cocinero',
    nombre: 'Cocinera',
    correo: 'cocinera@mail.com',
    password: 'Cocinera123',
    descripcion: 'cocinera@mail.com',
    icono: 'restaurant-outline',
  },
  {
    id: 'cantinero',
    nombre: 'Cantinero',
    correo: 'cantinero@mail.com',
    password: 'Cantinero123',
    descripcion: 'cantinero@mail.com',
    icono: 'wine-outline',
  },
  {
    id: 'cliente registrado',
    nombre: 'Cliente registrado',
    correo: 'juanxeneize555@gmail.com',
    password: 'Cliente77',
    descripcion: 'juanxeneize555@gmail.com',
    icono: 'people-outline',
  },
];

