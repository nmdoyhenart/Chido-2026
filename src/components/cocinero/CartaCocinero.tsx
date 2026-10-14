import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../Header';
import { useAppSession } from '../../contexts/AppSessionContext';
import { getProductos } from '../../services/productos.service';
import { cartaPrueba } from '../mozo/datosPrueba';
import { colores } from '../../theme/colores';
import type { Producto } from '../../types/producto';

const CATEGORIAS = [
  { nombre: 'Platos', tipos: ['plato', 'comida'] },
  { nombre: 'Bebidas', tipos: ['bebida'] },
  { nombre: 'Postres', tipos: ['postre'] },
];

function productosDePrueba(): Producto[] {
  return cartaPrueba.flatMap((categoria, indiceCategoria) => categoria.productos.map((producto, indice) => ({
    id: `muestra-${indiceCategoria}-${indice}`,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: producto.precio,
    tiempo_elaboracion: 0,
    fotos: [],
    tipo: 'plato',
  })));
}

export default function CartaCocinero() {
  const router = useRouter();
  const { usuario, role, mode } = useAppSession();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activa = true;
    getProductos()
      .then(data => { if (activa) setProductos(data); })
      .catch(() => {
        if (!activa) return;
        if (mode === 'simulation') setProductos(productosDePrueba());
        else setError('No se pudo cargar la carta. Revisá la conexión e intentá nuevamente.');
      })
      .finally(() => { if (activa) setCargando(false); });
    return () => { activa = false; };
  }, [mode]);

  const nombre = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || 'Cocinero';
  const etiquetaRol = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)} · Carta` : 'Cocinero · Carta';

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={nombre} role={etiquetaRol} />
      <View className="px-5 pt-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-chido-cabecera">
            <Ionicons name="arrow-back" size={24} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-3xl font-extrabold text-chido-texto-sobre-oscuro">Carta general</Text>
          <View className="ml-3 h-12 w-12" />
        </View>
        <Text className="mb-3 mt-1 text-center text-base text-chido-texto-secundario-sobre-oscuro">Productos disponibles</Text>
      </View>
      {cargando ? (
        <ActivityIndicator className="mt-8" size="large" color={colores.textoSobreOscuro} />
      ) : error ? (
        <View className="mx-5 mt-6 rounded-2xl border border-white/40 bg-chido-superficieTerracota p-5">
          <Text className="text-center text-lg font-semibold text-chido-texto-sobre-oscuro">{error}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator>
          {CATEGORIAS.map(categoria => {
            const lista = productos.filter(producto => categoria.tipos.includes((producto.tipo || '').toLowerCase()));
            if (!lista.length) return null;
            return (
              <View key={categoria.nombre} className="mb-5">
                <Text className="mb-3 text-2xl font-extrabold text-chido-texto-sobre-oscuro">{categoria.nombre}</Text>
                <View className="gap-3">
                  {lista.map(producto => (
                    <View key={producto.id} className="flex-row items-center rounded-[24px] border border-white/30 bg-chido-superficieTerracota p-4">
                      {producto.fotos?.[0] ? (
                        <Image source={{ uri: producto.fotos[0] }} className="mr-4 h-[82px] w-[82px] rounded-2xl" resizeMode="cover" />
                      ) : (
                        <View className="mr-4 h-[82px] w-[82px] items-center justify-center rounded-2xl bg-chido-cabecera">
                          <Ionicons name={categoria.nombre === 'Bebidas' ? 'beer-outline' : categoria.nombre === 'Postres' ? 'ice-cream-outline' : 'restaurant-outline'} size={34} color={colores.textoSobreOscuro} />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-xl font-bold text-chido-texto-sobre-oscuro">{producto.nombre}</Text>
                        {!!producto.descripcion && <Text className="mt-1 text-base text-chido-texto-secundario-sobre-oscuro">{producto.descripcion}</Text>}
                        <Text className="mt-2 text-lg font-extrabold text-chido-texto-sobre-oscuro">${producto.precio}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          {productos.length === 0 && <Text className="mt-8 text-center text-lg text-chido-texto-sobre-oscuro">No hay productos para mostrar.</Text>}
        </ScrollView>
      )}
    </View>
  );
}
