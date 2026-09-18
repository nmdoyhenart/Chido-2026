import { useLocalSearchParams } from 'expo-router';
import PantallaMozo from '../../../components/mozo/PantallaMozo';

export default function ChatMozo() {
  const { mesa } = useLocalSearchParams<{ mesa?: string | string[] }>();
  return <PantallaMozo key={String(mesa)} vista="chat" mesa={typeof mesa === 'string' ? mesa : ''} />;
}
