import React, { useRef, useState } from 'react';

import {
  Modal,
  ScrollView,
  View,
  Text,
  Pressable,
  Vibration,
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppSession } from '../../contexts/AppSessionContext';
import { AppRole } from '../../types/roles';
import ChidoLoader from '../ui/ChidoLoader';
import { colores } from '../../theme/colores';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const roles: {
  id: AppRole;
  nombre: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap | 'room-service-outline';
}[] = [
  {
    id: 'cliente registrado',
    nombre: 'Cliente',
    descripcion: 'Simular vista de cliente',
    icono: 'people-outline',
  },
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
    id: 'cliente anónimo',
    nombre: 'Cliente anónimo',
    descripcion: 'Simular vista de cliente anónimo',
    icono: 'person-outline',
  },
  {
    id: 'metre',
    nombre: 'Metre',
    descripcion: 'Simular atención y asignación de mesas',
    icono: 'grid-outline',
  },
  {
    id: 'mozo',
    nombre: 'Mozo',
    descripcion: 'Simular atención de pedidos',
    icono: 'room-service-outline',
  },
  {
    id: 'cocinero',
    nombre: 'Cocinero',
    descripcion: 'Simular gestión de pedidos',
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

      switch (rol) {
        case "dueño":
        case "supervisor":
        case "mozo":
          router.replace('/(app)/home');
          break;
        case "cliente registrado":
          router.push('../cliente/home');
          break;
        case "cliente anónimo":
          router.push('../cliente-anonimo/alta')
          break;
        case "cocinero":
          router.push('../productos/alta');
          break;
        case "cantinero":
          router.push('/productos/alta-bebida');
          break;
        case "metre":
          router.push('../metre/home');
          break;
        default:
          router.push('/(app)/home');
          break;
      }
    } catch {
      setError('No se pudo iniciar la demostración. Intentá nuevamente.');
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
      onRequestClose={() => { if (!ocupado.current) onClose(); }}
    >
      <View className="flex-1 justify-end bg-chido-cabecera/75">

        <View
          style={{ maxHeight: '90%' }}
          className="
            bg-chido-cabecera
            rounded-t-[32px]
            px-6
            pt-6
            pb-10
          "
        >

          <View className="flex-row items-center justify-between mb-6">

            <View>
              <Text className="text-chido-texto-sobre-oscuro text-2xl font-extrabold">
                Acceso rápido
              </Text>

              <Text className="text-chido-texto-secundario-sobre-oscuro mt-1">
                Elegí un rol para simular
              </Text>
            </View>

            <Pressable onPress={() => { if (!ocupado.current) onClose(); }}>
              <Ionicons
                name="close"
                size={30}
                color={colores.textoSobreOscuro}
              />
            </Pressable>

          </View>

          {!!error && <Text className="text-chido-error mb-3">{error}</Text>}
          {cargando && <ChidoLoader mensaje="Abriendo simulación…" />}
          <ScrollView showsVerticalScrollIndicator={false}>
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
                bg-chido-acento/60
                border
                border-chido-texto-secundario-alternativo/30
              "
            >

              <View
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-chido-superficie
                  items-center
                  justify-center
                  mr-4
                "
              >
                {rol.icono === 'room-service-outline' ? <MaterialCommunityIcons
                  name="room-service-outline"
                  size={28}
                  color={colores.textoSobreClaro}
                /> : <Ionicons
                  name={rol.icono}
                  size={28}
                  color={colores.textoSobreClaro}
                />}
              </View>

              <View className="flex-1">

                <Text className="text-chido-texto-sobre-oscuro text-xl font-bold">
                  {rol.nombre}
                </Text>

                <Text className="text-chido-texto-secundario-sobre-oscuro mt-1">
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
          </ScrollView>

        </View>

      </View>
    </Modal>
  );
}
