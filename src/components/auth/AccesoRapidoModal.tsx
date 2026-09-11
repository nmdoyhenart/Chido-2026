import React from 'react';

import {
  Modal,
  View,
  Text,
  Pressable,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppSession } from '../../contexts/AppSessionContext';
import { AppRole } from '../../types/roles';

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
    id: 'dueño',
    nombre: 'Dueño',
    descripcion: 'Simular administración del restaurante',
    icono: 'business-outline',
  },
  {
    id: 'supervisor',
    nombre: 'Supervisor',
    descripcion: 'Simular supervisión del restaurante',
    icono: 'briefcase-outline',
  },
  {
    id: 'cliente registrado',
    nombre: 'Cliente registrado',
    descripcion: 'Simular vista de cliente registrado',
    icono: 'person-outline',
  },
  {
    id: 'cliente anónimo',
    nombre: 'Cliente anónimo',
    descripcion: 'Simular vista de cliente anónimo',
    icono: 'person-outline',
  },
  {
    id: 'metre',
    nombre: 'Metre',
    descripcion: 'Simular atención y asignación de mesas',
    icono: 'people-outline',
  },
  {
    id: 'mozo',
    nombre: 'Mozo',
    descripcion: 'Simular atención de pedidos',
    icono: 'people-outline',
  },
  {
    id: 'cocinero',
    nombre: 'Cocinero',
    descripcion: 'Simular elaboración de platos',
    icono: 'restaurant-outline',
  },
  {
    id: 'cantinero',
    nombre: 'Cantinero',
    descripcion: 'Simular elaboración de bebidas',
    icono: 'wine-outline',
  },
];

export default function AccesoRapidoModal({
  visible,
  onClose,
}: Props) {
  const router = useRouter();

  const { enterSimulation } = useAppSession();

  const seleccionarRol = (rol: AppRole) => {
    enterSimulation(rol);

    onClose();

    switch (rol) {
      case "supervisor":
        router.replace('../supervisor/home');
        break;
      default:
        router.replace('/(app)/home');
        break;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-orange-800/75">

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

          {roles.map((rol) => (
            <Pressable
              key={rol.id}
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
