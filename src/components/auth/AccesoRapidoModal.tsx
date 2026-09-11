import React, { useRef, useState } from 'react';

import {
  Modal,
  View,
  Text,
  Pressable,
  Vibration,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppSession } from '../../contexts/AppSessionContext';
import { AppRole } from '../../types/roles';
import ChidoLoader from '../ui/ChidoLoader';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const roles: {
  id: AppRole;
  nombre: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: 'cliente registrado',
    nombre: 'Cliente',
    descripcion: 'Simular vista de cliente',
    icono: 'person-outline',
  },
  {
    id: 'mozo',
    nombre: 'Empleado',
    descripcion: 'Simular vista general de empleado',
    icono: 'people-outline',
  },
  {
    id: 'cocinero',
    nombre: 'Cocina',
    descripcion: 'Simular gestión de pedidos',
    icono: 'restaurant-outline',
  },
  {
    id: 'supervisor',
    nombre: 'Encargado',
    descripcion: 'Simular supervisión del negocio',
    icono: 'briefcase-outline',
  },
  {
    id: 'dueño',
    nombre: 'Administrador',
    descripcion: 'Simular acceso completo',
    icono: 'settings-outline',
  },
];

export default function AccesoRapidoModal({
  visible,
  onClose,
}: Props) {
  const router = useRouter();

  const { enterSimulation } = useAppSession();
  const ocupado = useRef(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const seleccionarRol = async (rol: AppRole) => {
    if (ocupado.current) return;
    ocupado.current = true;
    setCargando(true);
    setError('');
    try {
      await enterSimulation(rol);
      onClose();
      router.replace('/(app)/home');
    } catch {
      setError('No se pudo abrir la simulación. Intentá nuevamente.');
      Vibration.vibrate(180);
    } finally {
      ocupado.current = false;
      setCargando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">

        <View
          className="
            bg-orange-950
            rounded-t-[32px]
            px-6
            pt-6
            pb-10
          "
        >

          <View className="flex-row items-center justify-between mb-6">

            <View>
              <Text className="text-white text-2xl font-extrabold">
                Acceso rápido
              </Text>

              <Text className="text-yellow-100 mt-1">
                Elegí un rol para simular
              </Text>
            </View>

            <Pressable onPress={onClose}>
              <Ionicons
                name="close"
                size={30}
                color="#FFF7ED"
              />
            </Pressable>

          </View>

          {!!error && <Text className="text-yellow-200 mb-3">{error}</Text>}
          {cargando && <ChidoLoader mensaje="Abriendo simulación…" />}
          {roles.map((rol) => (
            <Pressable
              key={rol.id}
              disabled={cargando}
              onPress={() => seleccionarRol(rol.id)}
              className="
                flex-row
                items-center
                p-4
                mb-3
                rounded-2xl
                bg-orange-900/60
                border
                border-orange-200/30
              "
            >

              <View
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-yellow-200
                  items-center
                  justify-center
                  mr-4
                "
              >
                <Ionicons
                  name={rol.icono}
                  size={28}
                  color="#7C2D12"
                />
              </View>

              <View className="flex-1">

                <Text className="text-white text-xl font-bold">
                  {rol.nombre}
                </Text>

                <Text className="text-yellow-100 mt-1">
                  {rol.descripcion}
                </Text>

              </View>

              <Ionicons
                name="chevron-forward"
                size={24}
                color="#FDE68A"
              />

            </Pressable>
          ))}

        </View>

      </View>
    </Modal>
  );
}
