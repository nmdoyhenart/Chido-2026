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

import { useAppSession } from '../../contexts/AppSessionContext';
import { ErrorAcceso } from '../../services/auth.service';
import ChidoLoader from '../ui/ChidoLoader';
import { colores } from '../../theme/colores';
import { PERFILES_ACCESO_RAPIDO, type PerfilAccesoRapido } from '../../data/accesosRapidos';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSeleccionar?: (correo: string, password: string) => Promise<void> | void;
};

export default function AccesoRapidoModal({
  visible,
  onClose,
  onSeleccionar,
}: Props) {
  const { iniciarSesion } = useAppSession();
  const ocupado = useRef(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const seleccionarPerfil = async (perfil: PerfilAccesoRapido) => {
    if (ocupado.current) return;
    ocupado.current = true;
    setCargando(true);
    setError('');
    try {
      if (onSeleccionar) {
        await onSeleccionar(perfil.correo, perfil.password);
      } else {
        await iniciarSesion(perfil.correo, perfil.password);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ErrorAcceso ? err.message : 'No se pudo iniciar sesión. Revisá la conexión e intentá nuevamente.');
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
                Elegí un perfil para iniciar sesión
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
          {cargando && <ChidoLoader mensaje="Iniciando sesión…" />}
          <ScrollView showsVerticalScrollIndicator={false}>
            {PERFILES_ACCESO_RAPIDO.map((perfil) => (
              <Pressable
                key={perfil.correo}
                disabled={cargando}
                onPress={() => void seleccionarPerfil(perfil)}
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
                  {perfil.icono === 'room-service-outline' ? (
                    <MaterialCommunityIcons
                      name="room-service-outline"
                      size={28}
                      color={colores.textoSobreClaro}
                    />
                  ) : (
                    <Ionicons
                      name={perfil.icono}
                      size={28}
                      color={colores.textoSobreClaro}
                    />
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-chido-texto-sobre-oscuro text-xl font-bold">
                    {perfil.nombre}
                  </Text>
                  <Text className="text-chido-texto-secundario-sobre-oscuro mt-1">
                    {perfil.correo}
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
