import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { QRDisplay } from "../components/ui/QRDisplay";
import { QRScanner } from "../components/ui/QRScanner";
import {
  PORCENTAJES_PROPINA,
  type PropositoScannerQr,
} from "../types/qr";
import {
  createIngresoQr,
  createMesaQr,
  createPropinaQr,
  parseDniPdf417,
  parseQrPayload,
} from "../utils/qr";

const MESA_DE_PRUEBA_ID = "4b8e12fa-7f0d-4f48-8e44-76b8dfa3dd65";

const etiquetas: Record<PropositoScannerQr, string> = {
  dni: "Probar DNI PDF417",
  ingreso: "Escanear QR de ingreso",
  mesa: "Escanear QR de mesa",
  propina: "Escanear QR de propina",
};

export default function PruebaQr() {
  const [proposito, setProposito] = useState<PropositoScannerQr | null>(null);
  const [resultado, setResultado] = useState(
    "Todavía no se escaneó ningún código.",
  );

  const abrirScanner = (siguienteProposito: PropositoScannerQr) => {
    setProposito(siguienteProposito);
  };

  const procesarEscaneo = (raw: string) => {
    if (proposito === "dni") {
      const dni = parseDniPdf417(raw);
      if (!dni) {
        throw new Error("El código leído no tiene un formato de DNI reconocido.");
      }

      setResultado(
        `DNI válido\nNombres: ${dni.nombres}\nApellidos: ${dni.apellidos}\nDNI: ${dni.dni}`,
      );
      return;
    }

    const payload = parseQrPayload(raw);
    if (!payload) {
      throw new Error("El código leído no pertenece al protocolo QR de Chido.");
    }
    if (payload.tipo !== proposito) {
      throw new Error(
        `Este QR es de tipo ${payload.tipo}. Se esperaba un QR de tipo ${proposito}.`,
      );
    }

    setResultado(`QR válido\n${JSON.stringify(payload, null, 2)}`);
  };

  return (
    <View className="flex-1 bg-chido-fondo">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-14">
        <Text className="text-center text-3xl font-bold text-chido-texto-sobre-oscuro">
          Prueba de códigos QR
        </Text>
        <Text className="text-center text-base text-chido-texto-sobre-oscuro">
          Mostrá estos códigos en otro dispositivo o imprimilos antes de escanearlos.
        </Text>

        <View className="gap-3">
          {(["ingreso", "mesa", "propina", "dni"] as const).map((tipo) => (
            <Pressable
              key={tipo}
              className="rounded-2xl bg-chido-acento p-4"
              onPress={() => abrirScanner(tipo)}
            >
              <Text className="text-center text-lg font-bold text-chido-texto-sobre-oscuro">
                {etiquetas[tipo]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="rounded-2xl bg-[#facc15] p-4">
          <Text className="text-center font-semibold text-[#9a3412]">
            {resultado}
          </Text>
        </View>

        <QRDisplay etiqueta="Ingreso al local" payload={createIngresoQr()} size={180} />
        <QRDisplay
          etiqueta="Mesa de prueba"
          payload={createMesaQr(MESA_DE_PRUEBA_ID)}
          size={180}
        />

        {PORCENTAJES_PROPINA.map((porcentaje) => (
          <QRDisplay
            key={porcentaje}
            etiqueta={`Propina ${porcentaje}%`}
            payload={createPropinaQr(porcentaje)}
            size={150}
          />
        ))}
      </ScrollView>

      <QRScanner
        visible={proposito !== null}
        proposito={proposito ?? "ingreso"}
        onScan={procesarEscaneo}
        onClose={() => setProposito(null)}
      />
    </View>
  );
}
