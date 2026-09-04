import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

type QRDisplayProps = {
  etiqueta: string;
  payload: string;
  size?: number;
};

export function QRDisplay({ etiqueta, payload, size = 220 }: QRDisplayProps) {
  return (
    <View className="items-center rounded-3xl bg-[#f97316] p-5">
      <Text className="mb-4 text-center text-xl font-bold text-white">
        {etiqueta}
      </Text>
      <View className="rounded-2xl bg-[#fed7aa] p-4">
        <QRCode
          value={payload}
          size={size}
          color="#7c2d12"
          backgroundColor="#fed7aa"
        />
      </View>
    </View>
  );
}
